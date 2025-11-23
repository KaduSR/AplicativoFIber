// src/services/ixc.js
const axios = require("axios");
const { Buffer } = require("node:buffer");
const md5 = require("md5");

// URL base para os PDF's de contrato
const CONTRACT_PDF_BASE_URL =
  process.env.CONTRACT_PDF_BASE_URL ||
  "https://central.seuprovedor.com.br/contratos/";

class IXCService {
  constructor() {
    const credentials = process.env.IXC_ADMIN_TOKEN;
    const baseURL = process.env.IXC_API_URL;

    if (!credentials || !baseURL) {
      throw new Error(
        "IXC_ADMIN_TOKEN ou IXC_API_URL estão faltando. Verifique as variáveis de ambiente."
      );
    }

    const tokenBase64 = Buffer.from(credentials).toString("base64");
    this.authHeader = `Basic ${tokenBase64}`;

    this.api = axios.create({
      baseURL: baseURL,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
  }

  // =========================================================
  // MÉTODOS BASE
  // =========================================================
  async list(endpoint, data) {
    try {
      const response = await this.api.post(endpoint, data, {
        headers: { ixcsoft: "listar" },
      });
      return response.data;
    } catch (error) {
      console.error(`[IXC] Erro ao listar ${endpoint}:`, error.message);
      return { total: 0, registros: [] };
    }
  }

  async post(endpoint, data, actionHeader = "") {
    try {
      const headers = actionHeader ? { ixcsoft: actionHeader } : {};
      const response = await this.api.post(endpoint, data, { headers });
      return response.data;
    } catch (error) {
      const errorMsg = error.response ? error.response.data : error.message;
      console.error(`[IXC] Erro no POST para ${endpoint}:`, errorMsg);
      return { error: true, status: error.response?.status, message: errorMsg };
    }
  }

  // =========================================================
  // AUTENTICAÇÃO
  // =========================================================
  async findClienteByLogin(login) {
    const data = await this.list("cliente", {
      qtype: "cliente.hotsite_email",
      query: login,
      oper: "=",
      limit: 1,
    });

    return data.registros && data.registros.length > 0
      ? data.registros[0]
      : null;
  }

  async authenticate(login, senha) {
    const cliente = await this.findClienteByLogin(login);

    if (!cliente) return null;

    let passwordMatches = false;
    const storedPassword = cliente.senha;
    const isStoredAsMD5 = cliente.senha_hotsite_md5 === "S";

    if (isStoredAsMD5) {
      passwordMatches = storedPassword === md5(senha);
    } else {
      passwordMatches = storedPassword === senha;
    }

    if (passwordMatches) {
      return {
        id: cliente.id,
        nome: cliente.razao,
        email: cliente.hotsite_email,
        nome_razaosocial: cliente.razao,
      };
    }

    return null;
  }

  // =========================================================
  // DASHBOARD - CONSUMO (CORRIGIDO E À PROVA DE ERRO)
  // =========================================================
  async getConsumption(clienteId) {
    try {
      const data = await this.list("cliente_consumo", {
        qtype: "cliente_consumo.id_cliente",
        query: clienteId,
        oper: "=",
        limit: 1,
      });

      if (!data.registros || data.registros.length === 0) {
        return {
          download: "0 GB",
          upload: "0 GB",
          totalDownloadBytes: 0,
          totalUploadBytes: 0,
        };
      }

      const consumo = data.registros[0];

      return {
        download: consumo.download || "0 GB",
        upload: consumo.upload || "0 GB",
        totalDownloadBytes: consumo.total_download_bytes || 0,
        totalUploadBytes: consumo.total_upload_bytes || 0,
      };
    } catch (error) {
      console.error("[IXC] Erro ao buscar consumo:", error.message);
      return {
        download: "Indisponível",
        upload: "Indisponível",
        totalDownloadBytes: 0,
        totalUploadBytes: 0,
      };
    }
  }

  // =========================================================
  // DASHBOARD - CONTRATO (CORRIGIDO)
  // =========================================================
  async getContractDetails(clienteId) {
    try {
      const data = await this.list("cliente_contrato", {
        qtype: "cliente_contrato.id_cliente",
        query: clienteId,
        oper: "=",
        limit: 1,
      });

      if (!data.registros || data.registros.length === 0) {
        return {
          contract_id: null,
          plan_speed: "Plano não encontrado",
          status: "Indisponível",
          address: "Endereço não informado",
        };
      }

      const contrato = data.registros[0];

      return {
        contract_id: contrato.id_contrato_seq || null,
        plan_speed: contrato.velocidade_kbps
          ? `${Math.round(contrato.velocidade_kbps / 1024)} Mbps`
          : "Indisponível",
        status: contrato.status_contrato || "Desconhecido",
        address: contrato.endereco || "Não informado",
      };
    } catch (error) {
      console.error("[IXC] Erro ao buscar contrato:", error.message);
      return {
        contract_id: null,
        plan_speed: "Erro de conexão",
        status: "Indisponível",
        address: "Tente novamente",
      };
    }
  }

  getContractPdfUrl(contractId) {
    return contractId
      ? `${CONTRACT_PDF_BASE_URL}contrato_${contractId}.pdf`
      : null;
  }

  // =========================================================
  // DESBLOQUEIO DE CONFIANÇA
  // =========================================================
  async getConfidenceUnlockStatus(clienteId) {
    try {
      const data = await this.list("desbloqueio_confianca", {
        qtype: "desbloqueio_confianca.id_cliente",
        query: clienteId,
        oper: "=",
        limit: 1,
      });

      const status =
        data.registros && data.registros.length > 0 ? data.registros[0] : {};

      return {
        is_eligible: status.pode_desbloquear === "S",
        is_blocked: status.status_bloqueio === "B",
        can_unlock_until: status.data_limite_desbloqueio || null,
        message: status.mensagem_alerta || "Desbloqueio não aplicável.",
      };
    } catch (error) {
      console.error("[IXC] Erro ao verificar desbloqueio:", error.message);
      return {
        is_eligible: false,
        is_blocked: false,
        can_unlock_until: null,
        message: "Serviço temporariamente indisponível.",
      };
    }
  }

  async performConfidenceUnlock(clienteId) {
    const now = new Date().toISOString().split("T")[0];

    const payload = {
      id_cliente: clienteId,
      data_solicitacao: now,
      status: "S",
      origem: "Central do Cliente",
    };

    const resultado = await this.post(
      "desbloqueio_confianca",
      payload,
      "inserir"
    );

    if (resultado.error) {
      return {
        success: false,
        message:
          "Falha ao solicitar desbloqueio: " +
          (resultado.message || "Erro desconhecido"),
      };
    }

    return {
      success: true,
      message: "Desbloqueio solicitado! Aguarde alguns minutos.",
      recordId: resultado.id || null,
    };
  }

  // =========================================================
  // PROTOCOLOS PPPoE
  // =========================================================
  async getProtocols(clienteId) {
    try {
      const data = await this.list("cliente", {
        qtype: "cliente.id_cliente",
        query: clienteId,
        oper: "=",
        limit: 1,
      });

      const cliente =
        data.registros && data.registros.length > 0 ? data.registros[0] : null;

      if (!cliente) return null;

      return {
        pppoe_login: cliente.login || "não_encontrado",
        pppoe_senha: "***********",
        protocol_type: cliente.protocolo_conexao || "PPPoE",
      };
    } catch (error) {
      console.error("[IXC] Erro ao buscar protocolos:", error.message);
      return null;
    }
  }

  // =========================================================
  // FINANCEIRO
  // =========================================================
  async getFaturas(clienteId) {
    try {
      const data = await this.list("cobranca", {
        qtype: "cobranca.id_cliente",
        query: clienteId,
        oper: "=",
        limit: 10,
      });

      if (!data.registros || data.registros.length === 0) {
        return [];
      }

      return data.registros.map((f) => ({
        id: f.id_cobranca,
        valor: parseFloat(f.valor || 0).toFixed(2),
        vencimento: f.data_vencimento || "Sem vencimento",
        status:
          f.status === "A"
            ? "Em Aberto"
            : f.status === "P"
            ? "Paga"
            : "Vencida",
      }));
    } catch (error) {
      console.error("[IXC] Erro ao buscar faturas:", error.message);
      return [];
    }
  }

  async getBoleto(cobrancaId) {
    const payload = {
      id_cobranca: cobrancaId,
      tipo_boleto: "arquivo",
      base64: "S",
    };

    const resultado = await this.post("get_boleto", payload);

    if (resultado.base64) {
      return {
        success: true,
        base64: resultado.base64,
        mimeType: "application/pdf",
      };
    }

    return {
      success: false,
      message: "Boleto indisponível no momento.",
    };
  }

  // =========================================================
  // SUPORTE
  // =========================================================
  async createTicket(idCliente, titulo, mensagem, idAssunto = 0) {
    const now = new Date()
      .toISOString()
      .split("T")[0]
      .split("-")
      .reverse()
      .join("/");

    const payload = {
      id_cliente: idCliente,
      id_assunto: idAssunto,
      titulo: titulo,
      menssagem: mensagem,
      tipo: "C",
      origem_cadastro: "P",
      id_ticket_origem: "I",
      status: "T",
      prioridade: "M",
      data_criacao: now,
      ultima_atualizacao: now,
      su_status: "N",
      mensagens_nao_lida_sup: "1",
    };

    const resultado = await this.post("su_ticket", payload, "inserir");

    if (resultado.error) {
      return {
        success: false,
        message: "Erro ao criar ticket: " + resultado.message,
      };
    }

    return {
      success: true,
      id_ticket: resultado.id_ticket || resultado.id,
      message: "Ticket criado com sucesso!",
    };
  }
}

module.exports = new IXCService();
