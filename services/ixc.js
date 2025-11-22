// /opt/render/project/src/services/ixc.js
const axios = require("axios");

class IXCService {
  constructor() {
    // THIS is the likely problem spot (line 7)
    const credentials = `${process.env.IXC_USER}:${process.env.IXC_PASSWORD}`;
    this.authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`; // If IXC_USER or IXC_PASSWORD is undefined, this fails.
    this.api = axios.create({
      baseURL: process.env.IXC_BASE_URL,
      headers: {
        Authorization: this.authHeader,
      },
    });
  }

  // ... other methods
}

module.exports = new IXCService(); // Or similar export
