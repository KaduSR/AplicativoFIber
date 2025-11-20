// services/downDetector.js
const axios = require("axios");
const cheerio = require("cheerio");

// Configuração do cliente HTTP para "enganar" o bloqueio do site
const browserClient = axios.create({
  timeout: 8000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  },
});

let cache = {
  lastUpdate: 0,
  data: [],
  ttl: 10 * 60 * 1000, // 10 minutos
};

const servicesToCheck = [
  { id: "discord", name: "Discord" },
  { id: "netflix", name: "Netflix" },
  { id: "youtube", name: "YouTube" },
  { id: "instagram", name: "Instagram" },
  { id: "facebook", name: "Facebook" },
  { id: "whatsapp-messenger", name: "WhatsApp" },
  { id: "tiktok", name: "TikTok" },
  { id: "roblox", name: "Roblox" },
];

async function checkService(serviceId, serviceName) {
  try {
    const { data } = await browserClient.get(
      `https://downdetector.com.br/fora-do-ar/${serviceId}/`
    );
    const $ = cheerio.load(data);

    const statusText = $(".entry-title").first().text().trim();
    const hasProblem =
      statusText.toLowerCase().includes("problema") ||
      statusText.toLowerCase().includes("falha");

    return {
      id: serviceId,
      name: serviceName,
      status: hasProblem ? "warning" : "operational",
      updatedAt: new Date().toISOString(),
    };
  } catch (e) {
    return {
      id: serviceId,
      name: serviceName,
      status: "operational",
      updatedAt: new Date().toISOString(),
    };
  }
}

async function getInstabilities() {
  const now = Date.now();

  // Retorna cache se válido
  if (now - cache.lastUpdate < cache.ttl && cache.data.length > 0) {
    return cache.data;
  }

  // Busca dados em paralelo
  const results = await Promise.all(
    servicesToCheck.map((s) => checkService(s.id, s.name))
  );

  // Filtra apenas quem tem problema
  const problems = results.filter((r) => r.status !== "operational");

  cache = { lastUpdate: now, data: problems };
  return problems;
}

module.exports = { getInstabilities };
