// src/services/ixc.js
const axios = require("axios");
const { Buffer } = require("node:buffer");
const md5 = require("md5");

// URL base para os PDF's de contrato (Exemplo)
const CONTRACT_PDF_BASE_URL =
  process.env.CONTRACT_PDF_BASE_URL ||
  "https://central.seuprovedor.com.br/contratos/";

class IXCService {
  constructor() {
    // A variável IXC_ADMIN_TOKEN deve ser configurada no Render como "usuario:senha"
    const credentials = process.env.IXC_ADMIN_TOKEN;
    const baseURL = process.env.IXC_API_URL;

    if (!credentials || !baseURL) {
      throw new Error(
        "IXC_ADMIN_TOKEN ou IXC_API_URL estão faltando. Verifique as variáveis de ambiente."
      );
    } // ✅ Implementação de Autenticação BASIC (exigido pelo IXC)

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
  }  // ========================================================= // Métodos Base de Comunicação // =========================================================
  /**
   * Método base para listar (GET/READ - Usa POST com header 'listar')
   * @param {string} endpoint O endpoint do IXC (ex: 'cliente')
   * @param {object} data O payload de filtro (ex: { qry: id })
   */

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
  /**
   * Método base para postar ações (inserir/editar/get_boleto)
   * @param {string} endpoint O endpoint do IXC (ex: 'get_boleto')
   * @param {object} data O payload de dados
   * @param {string} actionHeader Ação específica (ex: 'inserir')
   */

  async post(endpoint, data, actionHeader = "") {
    try {
      const headers = actionHeader ? { ixcsoft: actionHeader } : {};
      const response = await this.api.post(endpoint, data, { headers });
      return response.data;
    } catch (error) {
      const errorMsg = error.response ? error.response.data : error.message;
      console.error(`[IXC] Erro no POST para ${endpoint}:`, errorMsg); // Retorna um objeto de erro com o status HTTP, se disponível
      return { error: true, status: error.response?.status, message: errorMsg };
    }
  }  // ========================================================= // 🔑 AUTENTICAÇÃO // =========================================================
  /**
   * 1. Busca um cliente pelo email (hotsite_email) [CORRIGIDO]
   */

  async findClienteByLogin(login) {
    const data = await this.list("cliente", {
      qtype: "cliente.hotsite_email", // Busca pelo e-mail
      query: login,
      oper: "=",
      limit: 1,
    });

    return data.registros[0] || null;
  }
  /**
   * 2. Realiza a autenticação completa (usado em authController)
   */

  async authenticate(login, senha) {
    const cliente = await this.findClienteByLogin(login);

    if (!cliente) {
      return null;
    }

    let passwordMatches = false; // Usa o campo 'senha' do JSON e a flag para determinar o formato
    const storedPassword = cliente.senha;
    const isStoredAsMD5 = cliente.senha_hotsite_md5 === "S"; // Verifica a flag

    if (isStoredAsMD5) {
      // LÓGICA 1: IXC está usando MD5 (padrão antigo/hotsite)
      const senhaHashed = md5(senha);
      if (storedPassword === senhaHashed) {
        passwordMatches = true;
      }
    } else {
      // LÓGICA 2: IXC está usando texto puro (seu caso atual)
      if (storedPassword === senha) {
        passwordMatches = true;
      }
    }
    if (passwordMatches) {
      // Retorna os dados essenciais do cliente para o token JWT e a resposta
      return {
        id: cliente.id, // O ID do cliente é o campo 'id' do registro
        nome: cliente.razao,
        email: cliente.hotsite_email,
        nome_razaosocial: cliente.razao,
      };
    }

    return null;
  }  // ========================================================= // 📊 MÉTODOS DO DASHBOARD // =========================================================
  /**
   * 3. Busca o consumo (Download/Upload) do cliente (Ex: WebService/v1/cliente_consumo)
   * Este método é crítico e simula a busca de dados em tempo real.
   */

  async getConsumption(clienteId) {
    // Endpoint simulado ou real do IXC para consumo
    const data = await this.list("cliente_consumo", {
      qtype: "cliente_consumo.id_cliente",
      query: clienteId,
      oper: "=",
      limit: 1,
    });

    const consumo = data.registros[0]; // Mock/Estrutura de dados esperada

    return {
      download: consumo?.download || "0 GB",
      upload: consumo?.upload || "0 GB", // Adicione a data de último reset do consumo, se disponível
    };
  }
  /**
   * 4. Busca detalhes do Contrato (Ex: WebService/v1/cliente_contrato)
   */

  async getContractDetails(clienteId) {
    const data = await this.list("cliente_contrato", {
      qtype: "cliente_contrato.id_cliente",
      query: clienteId,
      oper: "=",
      limit: 1,
    });

    const contrato = data.registros[0]; // Mock/Estrutura de dados esperada

    if (contrato) {
      return {
        contract_id: contrato.id_contrato_seq || null,
        plan_speed: contrato.velocidade_kbps
          ? `${contrato.velocidade_kbps / 1024} Mbps`
          : "Plano Indisponível",
        status: contrato.status_contrato || "Ativo",
        address: contrato.endereco || "Endereço não informado", // data de vencimento, valor, etc.
      };
    }

    return null;
  }
  /**
   * 5. Gera a URL do PDF do Contrato
   */

  getContractPdfUrl(contractId) {
    if (!contractId) return null; // Exemplo de URL de geração de PDF
    return `${CONTRACT_PDF_BASE_URL}contrato_${contractId}.pdf`;
  }
  /**
   * 6. Busca Status do Desbloqueio de Confiança (Ex: WebService/v1/desbloqueio_confianca)
   */

  async getConfidenceUnlockStatus(clienteId) {
    // Endpoint simulado, pois o IXC pode ter um módulo específico ou ser via API
    const data = await this.list("desbloqueio_confianca", {
      qtype: "desbloqueio_confianca.id_cliente",
      query: clienteId,
      oper: "=",
      limit: 1,
    });

    const status = data.registros[0]; // Mock/Estrutura de dados esperada

    return {
      is_eligible: status?.pode_desbloquear === "S" || false, // 'S' ou 'N'
      is_blocked: status?.status_bloqueio === "B" || false, // 'B' (Bloqueado) ou 'D' (Desbloqueado)
      can_unlock_until: status?.data_limite_desbloqueio || null, // Data limite
      message:
        status?.mensagem_alerta || "Status de desbloqueio não aplicável.",
    };
  }
  /**
   * 7. Realiza o Desbloqueio de Confiança (WebService/v1/desbloqueio_confianca - Ação 'inserir')
   */

  async performConfidenceUnlock(clienteId) {
    const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD // Payload de inserção/acionamento de desbloqueio no IXC

    const payload = {
      id_cliente: clienteId,
      data_solicitacao: now,
      status: "S", // Solicitado
      origem: "App Móvel", // Outros campos necessários para a ação de desbloqueio no IXC
    };

    const resultado = await this.post(
      "desbloqueio_confianca",
      payload,
      "inserir"
    );

    if (resultado.error) {
      // Se a API IXC falhar ou a regra de negócio impedir (retornando erro HTTP)
      return {
        success: false,
        message:
          "Falha ao solicitar desbloqueio. Motivo: " +
          (resultado.message || "Erro desconhecido."),
      };
    } // IXC normalmente retorna um ID ou um objeto de sucesso na inserção

    return {
      success: true,
      message:
        "Desbloqueio de confiança solicitado com sucesso. Aguarde alguns minutos.",
      recordId: resultado.id || null,
    };
  }
  /**
   * 8. Busca os Protocolos de Conexão (PPPoE/IKEv2)
   */

  async getProtocols(clienteId) {
    // Endpoint simulado para dados de protocolos (Pode ser o "cliente" principal)
    const data = await this.list("cliente", {
      qtype: "cliente.id_cliente",
      query: clienteId,
      oper: "=",
      limit: 1,
    });

    const cliente = data.registros[0]; // Mock/Estrutura de dados esperada

    if (cliente) {
      return {
        pppoe_login: cliente.login || "login_nao_encontrado",
        pppoe_senha: "***********", // Nunca retorne a senha real
        protocol_type: cliente.protocolo_conexao || "PPPoE", // Adicione a porta, login IKEv2, etc., se disponíveis
      };
    }
    return null;
  }  // ========================================================= // 💵 MÉTODOS FINANCEIROS (Usados em financeiro.js E dashboard.js) // =========================================================
  /**
   * 9. Busca Faturas Abertas/Recentes (Ex: WebService/v1/cobranca)
   */

  async getFaturas(clienteId) {
    const data = await this.list("cobranca", {
      qtype: "cobranca.id_cliente",
      query: clienteId,
      oper: "=", // Filtrar apenas faturas abertas ou com vencimento próximo (depende do IXC) // filter: [{ campo: "status", valor: "A" }]
      limit: 5,
    }); // Mock/Estrutura de dados esperada

    return data.registros.map((f) => ({
      id: f.id_cobranca,
      valor: parseFloat(f.valor).toFixed(2),
      vencimento: f.data_vencimento,
      status: f.status === "A" ? "Em Aberto" : f.status, // Traduzir status // Adicione link para 2a via, se aplicável
    }));
  }
  /**
   * 10. Gera o Boleto/Pix (Ex: WebService/v1/get_boleto - Ação 'arquivo')
   */

  async getBoleto(cobrancaId) {
    const payload = {
      id_cobranca: cobrancaId,
      tipo_boleto: "arquivo",
      base64: "S",
    }; // O retorno deve ser o PDF em Base64, ou link de PIX/Código de barras

    const resultado = await this.post("get_boleto", payload); // Mock/Estrutura de dados esperada // CORREÇÃO: Usamos 'base64' para padronizar o retorno

    if (resultado.base64) {
      return {
        success: true,
        base64: resultado.base64,
        mimeType: "application/pdf",
      };
    }

    return {
      success: false,
      message:
        "Não foi possível gerar o boleto/Pix. Tente novamente mais tarde.",
    };
  }
  /**
   * 11. Cria um novo Ticket de Suporte (Baseado em su_ticket.php)
   */

  async createTicket(idCliente, titulo, mensagem, idAssunto) {
    const now = new Date()
      .toISOString()
      .split("T")[0]
      .split("-")
      .reverse()
      .join("/"); // Formato DD/MM/AAAA

    const payload = {
      id_cliente: idCliente,
      id_assunto: idAssunto || 0,
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
        message: "Falha ao criar ticket: " + resultado.message,
      };
    } // IXC retorna o ID do novo ticket

    return {
      success: true,
      id_ticket: resultado.id_ticket,
      message: "Ticket de suporte criado com sucesso.",
    };
  }
}

module.exports = new IXCService();
