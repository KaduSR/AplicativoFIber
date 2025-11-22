// /opt/render/project/src/services/ixc.js (CORRIGIDO)
const axios = require("axios");

class IXCService {
  constructor() {
    // A variável IXC_ADMIN_TOKEN deve conter a string "usuario:senha"
    const credentials = process.env.IXC_ADMIN_TOKEN;
    const baseURL = process.env.IXC_API_URL;

    if (!credentials || !baseURL) {
      throw new Error(
        "IXC_ADMIN_TOKEN (deve ser 'usuario:senha') ou IXC_API_URL estão faltando."
      );
    }

    // 2. Formate o cabeçalho para autenticação BASIC (exigido pelo IXC)
    // O Buffer.from() codifica a string "usuario:senha" em Base64
    this.authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;

    this.api = axios.create({
      baseURL: baseURL,
      headers: {
        Authorization: this.authHeader, // Agora usa Basic Auth
        "Content-Type": "application/json",
      },
    });
  }

  // ... other methods
}

module.exports = new IXCService();
