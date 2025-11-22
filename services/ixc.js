// /opt/render/project/src/services/ixc.js
const axios = require("axios");

class IXCService {
  constructor() {
    // A variável IXC_ADMIN_TOKEN deve ser configurada no Render como "usuario:senha"
    const credentials = process.env.IXC_ADMIN_TOKEN;
    const baseURL = process.env.IXC_API_URL;

    if (!credentials || !baseURL) {
      // ⚠️ ATENÇÃO: Verifique as variáveis no Render
      throw new Error(
        "IXC_ADMIN_TOKEN (deve ser 'usuario:senha') ou IXC_API_URL estão faltando."
      );
    }

    // ✅ Implementação de Autenticação BASIC (exigido pelo IXC)
    this.authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;

    this.api = axios.create({
      baseURL: baseURL,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
    });
  }

  async login(login, senha) {
    try {
      // Mock ou lógica real de requisição de login
      // Substitua pelo endpoint correto do IXC para login do cliente.
      const response = await this.api.post("/auth/login", { login, senha });

      if (response.data && response.data.cliente) {
        return response.data.cliente;
      }
      return null;
    } catch (error) {
      console.error(
        "IXC Login Error:",
        error.response ? error.response.data : error.message
      );
      return null;
    }
  }

  // Métodos usados em financeiro.js (Mock)
  async getFaturas(clienteId) {
    console.log(`Buscando faturas para o cliente: ${clienteId} (IXC Mock)`);
    return [];
  }

  async getBoleto(boletoId) {
    console.log(`Buscando boleto: ${boletoId} (IXC Mock)`);
    return {};
  }
}

module.exports = new IXCService();
