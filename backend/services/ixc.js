/* backend/services/ixc.js */
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
      console.error(`[IXC] Erro listar ${endpoint}:`, error.message);
      return { total: 0, registros: [] };
    }
  }

  // --- BUSCA CLIENTE ---
  async findClienteByLogin(login) {
    const apenasNumeros = login.replace(/\D/g, "");
    const isCpf = /^\d{11}$|^\d{14}$/.test(apenasNumeros);

    // 1. Tenta busca exata (CPF limpo ou Email)
    let payload = {
      qtype: isCpf ? "cliente.cnpj_cpf" : "cliente.hotsite_email",
      query: isCpf ? apenasNumeros : login,
      oper: "=",
      page: "1",
      rp: "1",
      sortname: "cliente.id",
      sortorder: "desc",
    };

    let resultado = await this.list("/cliente", payload);

    // 2. Se falhar e for CPF, tenta formatado (xxx.xxx.xxx-xx)
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

  // --- BUSCA CONTRATO (A Função que faltava) ---
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
    return resultado.total > 0 ? resultado.registros[0] : null;
  }

  // --- OUTROS ---
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
    return this.api
      .post("/get_boleto", {
        boletos: boletoId,
        atualiza_boleto: "S",
        tipo_boleto: "arquivo",
        base64: "S",
      })
      .then((r) => r.data);
  }
}

module.exports = new IXCService();
