/*
 * backend/services/ixc.js
 */
const axios = require("axios");
const { Buffer } = require("node:buffer");

class IXCService {
  constructor() {
    this.apiUrl =
      process.env.IXC_API_URL || "https://centralfiber.online/webservice/v1";
    this.adminToken = process.env.IXC_ADMIN_TOKEN;

    const tokenBase64 = this.adminToken
      ? Buffer.from(this.adminToken).toString("base64")
      : "";

    this.api = axios.create({
      baseURL: this.apiUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${tokenBase64}`,
      },
      timeout: 15000,
    });
  }

  async list(endpoint, data) {
    try {
      const response = await this.api.post(endpoint, data, {
        headers: { ixcsoft: "listar" },
      });
      return response.data;
    } catch (error) {
      console.error(`[IXC Service] Erro ao listar ${endpoint}:`, error.message);
      return { total: 0, registros: [] };
    }
  }

  async post(endpoint, data) {
    try {
      const response = await this.api.post(endpoint, data);
      return response.data;
    } catch (error) {
      console.error(
        `[IXC Service] Erro ao postar em ${endpoint}:`,
        error.message
      );
      throw error;
    }
  }

  async findClienteByLogin(login) {
    const apenasNumeros = login.replace(/\D/g, "");
    const isCpf = /^\d{11}$|^\d{14}$/.test(apenasNumeros);

    let campoBusca = isCpf ? "cliente.cnpj_cpf" : "cliente.hotsite_email";
    let valorBusca = isCpf ? apenasNumeros : login;

    const payload = {
      qtype: campoBusca,
      query: valorBusca,
      oper: "=",
      page: "1",
      rp: "1",
      sortname: "cliente.id",
      sortorder: "desc",
    };

    let resultado = await this.list("/cliente", payload);

    if (isCpf && resultado.total === 0) {
      const cpfFormatado = apenasNumeros.replace(
        /(\d{3})(\d{3})(\d{3})(\d{2})/,
        "$1.$2.$3-$4"
      );
      console.log(`[IXC] Tentando CPF formatado: ${cpfFormatado}`);
      payload.query = cpfFormatado;
      resultado = await this.list("/cliente", payload);
    }

    return resultado.total > 0 ? resultado.registros[0] : null;
  }

  // --- ESTA É A FUNÇÃO QUE ESTAVA FALTANDO ---
  async findContratoByClienteId(clienteId) {
    const payload = {
      qtype: "cliente_contrato.id_cliente",
      query: clienteId,
      oper: "=",
      page: "1",
      rp: "1",
      sortname: "cliente_contrato.data_ativacao",
      sortorder: "desc",
    };

    const resultado = await this.list("/cliente_contrato", payload);
    // Retorna o contrato ou null
    return resultado.total > 0 ? resultado.registros[0] : null;
  }
  // -------------------------------------------

  async getFaturas(clienteId) {
    const payload = {
      qtype: "fn_areceber.id_cliente",
      query: clienteId,
      oper: "=",
      page: "1",
      rp: "20",
      sortname: "fn_areceber.data_vencimento",
      sortorder: "desc",
    };

    const resultado = await this.list("/fn_areceber", payload);
    return resultado.registros || [];
  }

  async getBoleto(boletoId) {
    const payload = {
      boletos: boletoId,
      atualiza_boleto: "S",
      tipo_boleto: "arquivo",
      base64: "S",
    };
    return this.post("/get_boleto", payload);
  }
}

module.exports = new IXCService();
