// src/services/ixc.js
const axios = require("axios");
const md5 = require("md5"); // Necessário para autenticar a senha do hotsite

class IXCService {
  constructor() {
    // A variável IXC_ADMIN_TOKEN deve ser configurada no Render como "usuario:senha"
    const credentials = process.env.IXC_ADMIN_TOKEN;
    const baseURL = process.env.IXC_API_URL;

    if (!credentials || !baseURL) {
      throw new Error(
        "IXC_ADMIN_TOKEN (deve ser 'usuario:senha') ou IXC_API_URL estão faltando."
      );
    }

    this.authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;

    this.api = axios.create({
      baseURL: baseURL,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
  }

  // =========================================================
  // Métodos Utilitários (Para comunicação com o IXC)
  // =========================================================

  // Método base para listar (GET/READ - Usa POST com header 'listar')
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

  // Método base para postar ações (inserir, alterar)
  async postAction(endpoint, data, actionHeader) {
    try {
      const response = await this.api.post(endpoint, data, {
        headers: { ixcsoft: actionHeader },
      });
      return response.data;
    } catch (error) {
      console.error(
        `[IXC] Erro ao postar ${endpoint} (${actionHeader}):`,
        error.message
      );
      throw error;
    }
  }

  // =========================================================
  // 🔑 AUTENTICAÇÃO
  // =========================================================

  async findClienteByLogin(login) {
    const apenasNumeros = login.replace(/\D/g, "");
    const isCpf = /^\d{11}$|^\d{14}$/.test(apenasNumeros);

    let campoBusca = isCpf ? "cliente.cnpj_cpf" : "cliente.hotsite_email";
    let valorBusca = isCpf ? apenasNumeros : login;

    const payload = {
      qtype: campoBusca,
      query: valorBusca,
      oper: "=",
      rp: "1",
      campos:
        "cliente.id, cliente.nome, cliente.hotsite_email, cliente.cnpj_cpf, cliente.hotsite_senha, cliente.status_hot",
    };

    let resultado = await this.list("/cliente", payload);

    return resultado.total > 0 ? resultado.registros[0] : null;
  }

  async login(login, senha) {
    const cliente = await this.findClienteByLogin(login);

    if (!cliente) {
      return null;
    }

    const senhaHashed = md5(senha);

    if (cliente.hotsite_senha === senhaHashed) {
      return {
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.hotsite_email,
        cpf_cnpj: cliente.cnpj_cpf,
        status_hotsite: cliente.status_hot,
      };
    }

    return null;
  }

  // =========================================================
  // 💰 FINANCEIRO (USADO EM financeiro.js E DASHBOARD)
  // =========================================================

  async getFaturas(clienteId) {
    // Simulação: Use a lógica real de busca
    console.log(`[IXC] Buscando faturas para o cliente: ${clienteId}`);
    // Adapte este mock para a busca real via this.list("/fn_areceber", payload)
    return [
      {
        id: 1,
        valor: 120.0,
        vencimento: "2025-10-15",
        status: "Paga",
        documento: "FAT001",
      },
      {
        id: 2,
        valor: 120.0,
        vencimento: "2025-11-15",
        status: "Vencida",
        documento: "FAT002",
      },
      {
        id: 3,
        valor: 120.0,
        vencimento: "2025-12-15",
        status: "Em Aberto",
        documento: "FAT003",
      },
    ];
  }

  async getBoleto(boletoId) {
    console.log(`[IXC] Buscando boleto/pix: ${boletoId}`);
    const payload = {
      boletos: boletoId,
      atualiza_boleto: "S",
      tipo_boleto: "arquivo",
      base64: "S",
    };
    // return this.post("/get_boleto", payload); // Descomente para IXC real
    return {
      base64_pdf: "JVBERi0xLjQKJ...", // PDF em base64
      url_boleto: `https://ixc.online/boleto/${boletoId}`,
    };
  }

  // =========================================================
  // 📈 DASHBOARD & CONTRATO (NOVOS)
  // =========================================================

  async getConsumption(clienteId) {
    // Busca Consumo Mensal (Download/Upload)
    try {
      // Adapte este mock para a busca real via this.list("/cliente/consumo", payload)
      return {
        download: "150 GB",
        upload: "20 GB",
        limit: "Ilimitado",
      };
    } catch (error) {
      return { download: "N/A", upload: "N/A", limit: "N/A" };
    }
  }

  async getContractDetails(clienteId) {
    // Busca detalhes do Contrato (Plano e Endereço)
    try {
      // Adapte este mock para a busca real via this.list("/cliente_contrato", payload)
      return {
        plan_speed: "500 Mega",
        address: "Rua A, 123 - Centro",
        contract_id: "12345",
        data_instalacao: "2024-01-01",
      };
    } catch (error) {
      return null;
    }
  }

  getContractPdfUrl(contractId) {
    // Gera a URL do PDF (Não precisa de requisição, apenas constrói a URL)
    return `https://ixc.online/contrato/pdf/${contractId}`;
  }

  async getProtocols(clienteId) {
    // Busca lista de protocolos/tickets
    try {
      // Adapte este mock para a busca real via this.list("/su_ticket", payload)
      return [
        {
          id: 102,
          data: "20/11/2025",
          assunto: "Bloqueio",
          status: "Em Aberto",
        },
        { id: 101, data: "15/11/2025", assunto: "Lentidão", status: "Fechado" },
      ];
    } catch (error) {
      return [];
    }
  }

  // =========================================================
  // 🔓 DESBLOQUEIO DE CONFIANÇA (NOVOS)
  // =========================================================

  async getConfidenceUnlockStatus(clienteId) {
    // Checa status do bloqueio e elegibilidade
    const faturas = await this.getFaturas(clienteId);
    const hasOverdue = faturas.some((f) => f.status === "Vencida");

    return {
      is_blocked: hasOverdue,
      is_eligible: hasOverdue,
      available: true,
      days_remaining: 48,
    };
  }

  async performConfidenceUnlock(clienteId) {
    // Executa a liberação de confiança no IXC
    try {
      const payload = { id_cliente: clienteId };
      // const response = await this.postAction('/cliente/liberacao_confianca_executar', payload, 'executar'); // IXC Real
      console.log(
        `[IXC] Executando desbloqueio de confiança para ${clienteId}`
      );
      return {
        success: true,
        message: "Liberação de 48h realizada com sucesso.",
      };
    } catch (error) {
      return { success: false, message: "Falha na comunicação com o IXC." };
    }
  }
}

module.exports = new IXCService();
