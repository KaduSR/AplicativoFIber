// /opt/render/project/src/routes/instabilidade.js
const express = require("express");
const router = express.Router();
const downdetectorService = require("../services/DowndetectorService");
const aiStatusService = require("../services/AIStatusService");

// Importar dependências para o Web Scraping (Terceiro Recurso)
const axios = require("axios");
const cheerio = require("cheerio");

// Lista de serviços prioritários
const SERVICES_TO_CHECK = [
  "whatsapp",
  "facebook",
  "instagram",
  "google",
  "youtube",
  "netflix",
  "cloudflare",
];

// URL da página inicial do Downdetector Brasil (ponto de scraping)
const URL_DOWNDETECTOR = "https://downdetector.com.br/";

/**
 * @private
 * Função de Web Scraping de ÚLTIMO RECURSO (tertiary fallback).
 * Busca o status do serviço diretamente na homepage do Downdetector.
 * @param {string} serviceSlug O slug do serviço (ex: 'whatsapp').
 * @returns {object} O status encontrado via scraping.
 */
async function scrapeStatusFromHomepage(serviceSlug) {
  try {
    const headers = {
      // User-Agent é crucial para simular um navegador real e evitar bloqueios
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    };
    // Requisição com timeout curto para não travar a rota
    const response = await axios.get(URL_DOWNDETECTOR, {
      headers,
      timeout: 5000,
    });
    const $ = cheerio.load(response.data);

    // Seletor: encontra o bloco de empresa pelo atributo href (que contém o slug)
    const $element = $(
      `.company-index a[href*="/fora-do-ar/${serviceSlug}/"]`
    ).closest(".company-index");

    if ($element.length === 0) {
      return {
        service: serviceSlug,
        status: "unknown",
        message: "Serviço não listado na homepage (Scraper)",
        source: "Web Scraper",
      };
    }

    const nomeServico = $element.find("h5").text().trim();
    const $statusSvg = $element.find("svg.warning, svg.danger");

    if ($statusSvg.length) {
      let status = $statusSvg.hasClass("danger") ? "unstable" : "unstable";
      const relatorios24h = $element.attr("data-day") || "N/A";

      return {
        service: nomeServico,
        hasIssues: true,
        status: status,
        message: `Instabilidade detectada via Scraper. Relatórios: ${relatorios24h}`,
        source: "Web Scraper",
      };
    }

    return {
      service: nomeServico,
      hasIssues: false,
      status: "stable",
      message: "Estável (via Scraper)",
      source: "Web Scraper",
    };
  } catch (error) {
    console.error(
      `[Scraper Fallback] Erro ao buscar ${serviceSlug}:`,
      error.message
    );
    return {
      service: serviceSlug,
      hasIssues: false,
      status: "error",
      message: "Falha no Web Scraper de Último Recurso",
      source: "Web Scraper Error",
    };
  }
}

router.get("/", async (req, res) => {
  try {
    const promises = SERVICES_TO_CHECK.map(async (id) => {
      let result = {};
      result = await downdetectorService.getStatus(id);

      if (result.status === "unknown") {
        if (process.env.GEMINI_API_KEY) {
          const aiResult = await aiStatusService.checkStatus(id);

          if (aiResult.status !== "error") {
            result = {
              ...result,
              hasIssues: aiResult.hasIssues,
              message: aiResult.message,
              source: "AI Backup",
              status: aiResult.status,
            };
          }
        }
      }

      if (result.status === "unknown") {
        const scraperResult = await scrapeStatusFromHomepage(id);

        if (
          scraperResult.status !== "error" &&
          scraperResult.status !== "unknown"
        ) {
          result = {
            ...result,
            service: scraperResult.service,
            hasIssues: scraperResult.hasIssues,
            status: scraperResult.status,
            message: scraperResult.message,
            source: scraperResult.source,
          };
        } else if (scraperResult.status === "error") {
          result.status = "error";
          result.message = scraperResult.message;
        }
      }

      return result;
    });

    const results = await Promise.all(promises);
    const problems = results.filter((r) => r.hasIssues);
    const unknownOrError = results.filter(
      (r) => r.status === "unknown" || r.status === "error"
    );

    res.json({
      status:
        problems.length > 0
          ? "Instabilidade detectada"
          : "Nenhuma instabilidade crítica detectada.",
      message:
        problems.length > 0
          ? `${problems.length} serviço(s) com instabilidade detectada. ${unknownOrError.length} serviço(s) com status desconhecido/erro.`
          : `Todos os ${results.length} serviços checados estão estáveis.`,
      checked: results.length,
      details: results,
    });
  } catch (error) {
    console.error("Erro na rota de status:", error);
    res.status(500).json({ error: "Erro interno ao verificar status" });
  }
});

// ✅ CORREÇÃO: Exporta o router E a lista de serviços para o scheduler
module.exports = router;
module.exports.SERVICES_TO_CHECK = SERVICES_TO_CHECK;
