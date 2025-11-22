const axios = require("axios");
const crypto = require("crypto");

class IXCService {
  constructor() {
    this.apiUrl = process.env.IXC_API_URL;
    this.token = Buffer.from(process.env.IXC_TOKEN).toString("base64");

    this.api = axios.create({
      baseURL: this.apiUrl,
      headers: {
        Authorization: `Basic ${this.token}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
  }

  async list(endpoint, params) {
    try {
      const response = await this.api.post(endpoint, params, {
        headers: { ixcsoft: "listar" },
      });
      return response.data;
    } catch (error) {
      throw new Error(`IXC list error: ${error.message}`);
    }
  }

  // Outros métodos como login, getFaturas, getBoleto (mantenha como está)
}

module.exports = new IXCService();
