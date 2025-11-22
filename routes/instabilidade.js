// routes/instabilidade.js
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
    // Usamos .closest() para pegar o contêiner principal do serviço
    const $element = $(
      `.company-index a[href*="/fora-do-ar/${serviceSlug}/"]`
    ).closest(".company-index");

    if ($element.length === 0) {
      // Serviço não listado na homepage (ex: é um serviço menor)
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
      // Se tiver classes warning ou danger, está instável
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

    // Se o elemento existe, mas não tem warning/danger, está estável.
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

      // 1. PRIMEIRO RECURSO: Downdetector API (Cache-First)
      result = await downdetectorService.getStatus(id);

      // 2. SEGUNDO RECURSO: Se API falhou (status: unknown), tenta a IA
      if (result.status === "unknown") {
        if (process.env.GEMINI_API_KEY) {
          const aiResult = await aiStatusService.checkStatus(id);

          // Se a IA respondeu com sucesso/estável/instável (e não erro)
          if (aiResult.status !== "error") {
            result = {
              ...result, // Mantém estrutura base (reports/baseline)
              hasIssues: aiResult.hasIssues,
              message: aiResult.message, // Ex: "Nenhuma instabilidade grave reportada hoje"
              source: "AI Backup",
              status: aiResult.status,
            };
          }
        }
      }

      // 3. TERCEIRO RECURSO: Se ainda for 'unknown', tenta o Web Scraper
      if (result.status === "unknown") {
        const scraperResult = await scrapeStatusFromHomepage(id);

        // Se o scraper retornou um status válido (stable ou unstable)
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
          // Se o scraper falhou com erro (não deve acontecer)
          result.status = "error";
          result.message = scraperResult.message;
        }
      }

      return result;
    });

    const results = await Promise.all(promises);

    // Filtra serviços com instabilidade ou erros de checagem
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

module.exports = router;
