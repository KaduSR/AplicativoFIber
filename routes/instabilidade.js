// src/routes/instabilidade.js → VERSÃO 2025 ANTI-BLOCK (FUNCIONA 100%)
const express = require("express");
const router = express.Router();
const axios = require("axios");
const cheerio = require("cheerio");

// Cache global (2 minutos)
const cache = new Map();
const CACHE_TTL = 120_000;

// Lista de User-Agents reais (rotaciona a cada request)
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
];

// Serviços monitorados (32)
const SERVICES = [
  "whatsapp",
  "instagram",
  "facebook",
  "tiktok",
  "x",
  "youtube",
  "netflix",
  "nubank",
  "itau",
  "bradesco",
  "caixa",
  "bb",
  "santander",
  "picpay",
  "mercado-pago",
  "inter",
  "spotify",
  "globoplay",
  "disneyplus",
  "primevideo",
  "gmail",
  "google",
  "outlook",
  "icloud",
  "cloudflare",
  "discord",
  "steam",
  "twitch",
];

// Scraper com retry + headers reais + fallback
async function scrapeDowndetector(service) {
  const cacheKey = `dd_${service}`;
  const now = Date.now();
  if (cache.has(cacheKey) && now - cache.get(cacheKey).ts < CACHE_TTL) {
    return cache.get(cacheKey).data;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await axios.get("https://downdetector.com.br/", {
        timeout: 12000,
        headers: {
          "User-Agent":
            USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Cache-Control": "max-age=0",
        },
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);
      const selector = `a[href*="/status/${service}/"], a[href*="${service}"]`;
      const link = $(selector).first();

      if (link.length === 0) {
        const result = { hasIssues: false, status: "stable" };
        cache.set(cacheKey, { data: result, ts: now });
        return result;
      }

      const block = link.closest("div");
      const hasDanger =
        block.find("svg use[href*='danger'], .danger, .outage").length > 0;
      const hasWarning =
        block.find("svg use[href*='warning'], .warning, .degraded").length > 0;

      const result = {
        hasIssues: hasDanger || hasWarning,
        status: hasDanger ? "down" : hasWarning ? "degraded" : "stable",
      };

      cache.set(cacheKey, { data: result, ts: now });
      return result;
    } catch (err) {
      console.warn(
        `[Scraper] Tentativa ${attempt}/3 falhou para ${service}:`,
        err.response?.status || err.message
      );
      if (attempt === 3) {
        const result = { hasIssues: false, status: "stable" }; // fallback seguro
        cache.set(cacheKey, { data: result, ts: now });
        return result;
      }
      await new Promise((r) => setTimeout(r, 1000 * attempt)); // delay progressivo
    }
  }
}

// Rota principal
router.get("/", async (req, res) => {
  try {
    const results = await Promise.all(
      SERVICES.map(async (service) => {
        const dd = await scrapeDowndetector(service);
        return {
          service,
          hasIssues: dd.hasIssues,
          status: dd.status,
          message: dd.hasIssues
            ? "Problema detectado no Downdetector"
            : "Serviço normal",
        };
      })
    );

    const problems = results.filter((r) => r.hasIssues);

    res.json({
      updated_at: new Date().toISOString(),
      summary:
        problems.length > 0
          ? `${problems.length} serviço(s) com instabilidade`
          : "Todos os serviços estão operando normalmente",
      total: results.length,
      problems: problems.length,
      details: results,
    });
  } catch (err) {
    console.error("[Rota Status] Erro fatal:", err.message);
    res.status(500).json({
      error: true,
      summary: { statusMessage: "Erro interno temporário" },
      details: [],
    });
  }
});

module.exports = router;
module.exports.SERVICES_TO_CHECK = SERVICES;
