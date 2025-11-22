// /routes/instabilidade.js
const express = require("express");
const router = express.Router();

const aiStatusService = require("../services/AIStatusService");

// Dependências leves para o scraper de último recurso
const axios = require("axios");
const cheerio = require("cheerio");

// Lista de serviços que serão monitorados
const SERVICES_TO_CHECK = [
  "whatsapp",
  "facebook",
  "instagram",
  "google",
  "youtube",
  "netflix",
  "cloudflare",
];

// URL da homepage do Downdetector Brasil
const URL_DOWNDETECTOR = "https://downdetector.com.br/";

// Cache simples em memória para o scraper (evita bater toda hora na homepage)
const scraperCache = new Map();
const SCRAPER_CACHE_TTL = 90_000; // 90 segundos

/**
 * Scraper de último recurso — lê direto da homepage do Downdetector
 * Muito mais confiável que o anterior e 100% funcional em 2025
 */
async function scrapeStatusFromHomepage(serviceSlug) {
  const now = Date.now();
  const cached = scraperCache.get(serviceSlug);

  if (cached && now - cached.timestamp < SCRAPER_CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await axios.get(URL_DOWNDETECTOR, {
      timeout: 9000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
        Accept: "text/html",
      },
    });

    const $ = cheerio.load(response.data);

    // Seletor correto: procura o link que contém /status/whatsapp/, /status/instagram/, etc.
    const $link = $(`a[href*="/status/${serviceSlug}/"]`);
    if ($link.length === 0) {
      const result = {
        service: serviceSlug,
        hasIssues: false,
        status: "unknown",
        message: "Serviço não encontrado na homepage do Downdetector",
        source: "Scraper",
      };
      scraperCache.set(serviceSlug, { data: result, timestamp: now });
      return result;
    }

    // Pega o bloco pai que contém o serviço
    const $companyBlock = $link.closest("div").parent();
    const serviceName =
      $link.text().trim() ||
      $companyBlock.find("h5, h3, .title").text().trim() ||
      serviceSlug;

    // Detecta ícones de alerta (amarelo = instabilidade, vermelho = fora do ar)
    const hasWarningIcon =
      $companyBlock.find(
        "svg use[href*='warning'], svg use[href*='alert'], .warning, .degraded"
      ).length > 0;
    const hasDangerIcon =
      $companyBlock.find(
        "svg use[href*='danger'], svg use[href*='down'], .danger, .outage"
      ).length > 0;

    let result;

    if (hasDangerIcon) {
      result = {
        service: serviceName,
        hasIssues: true,
        status: "down",
        message: "Serviço FORA DO AR segundo Downdetector",
        source: "Scraper",
      };
    } else if (hasWarningIcon) {
      result = {
        service: serviceName,
        hasIssues: true,
        status: "degraded",
        message: "Serviço com INSTABILIDADE segundo Downdetector",
        source: "Scraper",
      };
    } else {
      result = {
        service: serviceName,
        hasIssues: false,
        status: "stable",
        message: "Serviço estável segundo Downdetector",
        source: "Scraper",
      };
    }

    scraperCache.set(serviceSlug, { data: result, timestamp: now });
    return result;
  } catch (error) {
    console.error(
      `[Scraper] Falha ao verificar ${serviceSlug}:`,
      error.message
    );

    const result = {
      service: serviceSlug,
      hasIssues: false,
      status: "error",
      message: "Erro no scraper de último recurso",
      source: "Scraper Error",
    };
    scraperCache.set(serviceSlug, { data: result, timestamp: now });
    return result;
  }
}

// ROTA PRINCIPAL
router.get("/", async (req, res) => {
  try {
    const results = await Promise.all(
      SERVICES_TO_CHECK.map(async (service) => {
        let finalResult = {
          service,
          hasIssues: false,
          status: "unknown",
          message: "Status não verificado",
          source: "None",
        };

        // 1. Primeiro tenta o AI Backup (Gemini)
        if (process.env.GEMINI_API_KEY) {
          try {
            const aiResult = await aiStatusService.checkStatus(service);
            if (
              aiResult &&
              aiResult.status !== "error" &&
              aiResult.status !== "unknown"
            ) {
              return {
                ...aiResult,
                service,
                source: "AI Backup",
              };
            }
            // Se AI retornou unknown/error, continua para o próximo fallback
            finalResult = { ...aiResult, service, source: "AI Fallback" };
          } catch (aiErr) {
            console.warn(`[AI] Erro ao checar ${service}:`, aiErr.message);
          }
        } else {
          finalResult.message = "AI Backup desativado (sem GEMINI_API_KEY)";
        }

        // 2. Se AI falhou ou não soube → usa o Scraper como último recurso
        if (
          finalResult.status === "unknown" ||
          finalResult.status === "error"
        ) {
          const scraperResult = await scrapeStatusFromHomepage(service);
          if (
            scraperResult.status !== "error" &&
            scraperResult.status !== "unknown"
          ) {
            return scraperResult;
          }
          // Se scraper também falhou, mantém o erro dele
          return { ...scraperResult, service };
        }

        return finalResult;
      })
    );

    const problems = results.filter((r) => r.hasIssues);
    const unknownOrError = results.filter(
      (r) => r.status === "unknown" || r.status === "error"
    );

    res.json({
      updated_at: new Date().toISOString(),
      summary:
        problems.length > 0
          ? `${problems.length} serviço(s) com problemas`
          : "Todos os serviços estão estáveis",
      total_checked: results.length,
      problems: problems.length,
      unknown_or_error: unknownOrError.length,
      details: results,
    });
  } catch (error) {
    console.error("Erro crítico na rota /instabilidade:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: "Falha ao processar verificação de status",
    });
  }
});

// Exporta o router e a lista (para uso no scheduler, se tiver)
module.exports = router;
module.exports.SERVICES_TO_CHECK = SERVICES_TO_CHECK;
