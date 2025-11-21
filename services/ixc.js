/*
 * backend/services/ixc.js - Versão Corrigida e Completa
 */
const axios = require("axios");
const { Buffer } = require("node:buffer");

class IXCService {
  constructor() {
    this.apiUrl =
      process.env.IXC_API_URL || "https://centralfiber.online/webservice/v1";
    this.adminToken = process.env.IXC_ADMIN_TOKEN;

    // Garante autenticação segura
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

  // Método base para listar (adiciona o header obrigatório)
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

  // Método base para postar ações
  async post(endpoint, data) {
    try {
      const response = await this.api.post(endpoint, data);
      return response.data;
    } catch (error) {
      console.error(`[IXC] Erro ao postar ${endpoint}:`, error.message);
      throw error;
    }
  }

  // 1. BUSCA CLIENTE (Lógica Inteligente: Limpo vs Formatado)
  async findClienteByLogin(login) {
    const apenasNumeros = login.replace(/\D/g, "");
    // Verifica se parece um CPF (11) ou CNPJ (14)
    const isCpf = /^\d{11}$|^\d{14}$/.test(apenasNumeros);

    let campoBusca = isCpf ? "cliente.cnpj_cpf" : "cliente.hotsite_email";
    let valorBusca = isCpf ? apenasNumeros : login;

    // Tentativa 1: Busca Exata
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

    // Tentativa 2: Se for CPF e falhou, tenta formatado (XXX.XXX.XXX-XX)
    if (isCpf && resultado.total === 0) {
      let cpfFormatado = apenasNumeros;
      if (apenasNumeros.length === 11) {
        cpfFormatado = apenasNumeros.replace(
          /(\d{3})(\d{3})(\d{3})(\d{2})/,
          "$1.$2.$3-$4"
        );
      }

      console.log(`[IXC Service] Tentando busca formatada: ${cpfFormatado}`);
      payload.query = cpfFormatado;
      resultado = await this.list("/cliente", payload);
    }

    return resultado.total > 0 ? resultado.registros[0] : null;
  }

  // 2. BUSCA CONTRATO (A FUNÇÃO QUE FALTAVA!)
  async findContratoByClienteId(clienteId) {
    const payload = {
      qtype: "cliente_contrato.id_cliente",
      query: clienteId,
      oper: "=",
      page: "1",
      rp: "1",
      // Ordena por data de ativação para pegar o mais recente/ativo
      sortname: "cliente_contrato.data_ativacao",
      sortorder: "desc",
    };

    const resultado = await this.list("/cliente_contrato", payload);

    // Retorna o contrato ou null se não achar
    return resultado.total > 0 ? resultado.registros[0] : null;
  }

  // 3. BUSCA FATURAS
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

  // 4. BUSCA BOLETO PDF
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
