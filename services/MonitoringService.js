// ============================================================
// SERVIÇO DE MONITORAMENTO FIBERNET (CORRIGIDO)
// src/services/MonitoringService.js
// ============================================================

const axios = require("axios");
const cheerio = require("cheerio");
const NodeCache = require("node-cache");

class MonitoringService {
  constructor() {
    // Cache de 5 minutos para dados frescos
    this.cache = new NodeCache({ stdTTL: 300 });

    this.baseUrl = "https://downdetector.com.br";
    this.userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    ];

    // Serviços críticos
    this.criticalServices = [
      { slug: "whatsapp", name: "WhatsApp", priority: 1 },
      { slug: "facebook", name: "Facebook", priority: 2 },
      { slug: "instagram", name: "Instagram", priority: 2 },
      { slug: "google", name: "Google", priority: 1 },
      { slug: "youtube", name: "YouTube", priority: 2 },
      { slug: "netflix", name: "Netflix", priority: 3 },
      { slug: "cloudflare", name: "Cloudflare", priority: 1 },
      { slug: "amazon", name: "Amazon", priority: 2 },
      { slug: "twitter", name: "X/Twitter", priority: 2 },
      { slug: "discord", name: "Discord", priority: 2 },
      { slug: "microsoft", name: "Microsoft", priority: 1 },
      { slug: "telegram", name: "Telegram", priority: 2 },
      { slug: "github", name: "GitHub", priority: 1 },
      { slug: "aws", name: "AWS", priority: 1 },
    ];
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  async scrapeWithRetry(url, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Scraper] Tentativa ${attempt}/${maxRetries}: ${url}`);

        const response = await axios.get(url, {
          headers: {
            "User-Agent": this.getRandomUserAgent(),
            "Accept-Language": "pt-BR,pt;q=0.9",
            "Cache-Control": "no-cache",
          },
          timeout: 10000,
          maxRedirects: 5,
        });

        return response.data;
      } catch (error) {
        console.warn(`[Scraper] Tentativa ${attempt} falhou: ${error.message}`);

        if (attempt === maxRetries) throw error;

        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  async extractProblematicServices() {
    const cacheKey = "problematic_services_v2";
    const cached = this.cache.get(cacheKey);

    if (cached) {
      console.log("[Cache] Retornando serviços em cache");
      return cached;
    }

    try {
      const html = await this.scrapeWithRetry(this.baseUrl);
      const $ = cheerio.load(html);
      const services = [];

      $(".company-index").each((idx, element) => {
        try {
          const $el = $(element);

          const problemIcon = $el.find("svg.danger, svg.warning");
          if (problemIcon.length === 0) return;

          const nameEl = $el.find("h5");
          const name = nameEl.text().trim();

          const linkEl = $el.find("a[href*='status']");
          const href = linkEl.attr("href") || "";
          const slug = href.split("/").pop() || name.toLowerCase();

          const reports = parseInt($el.attr("data-day")) || 0;
          const severity = problemIcon.hasClass("danger")
            ? "critical"
            : "warning";

          if (name && slug) {
            const criticalService = this.criticalServices.find(
              (s) => s.slug === slug
            );
            const priority = criticalService ? criticalService.priority : 5;

            services.push({
              name,
              slug,
              url: `${this.baseUrl}/status/${slug}`,
              hasIssues: true,
              severity,
              reports,
              priority,
              detectedAt: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.warn("[Parser] Erro:", e.message);
        }
      });

      services.sort((a, b) => {
        if (a.severity !== b.severity) {
          return a.severity === "critical" ? -1 : 1;
        }
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return b.reports - a.reports;
      });

      const result = {
        timestamp: new Date().toISOString(),
        total: services.length,
        critical: services.filter((s) => s.severity === "critical").length,
        warning: services.filter((s) => s.severity === "warning").length,
        topCritical: services.slice(0, 10),
        summary: {
          statusMessage:
            services.filter((s) => s.severity === "critical").length > 0
              ? "🔴 SERVIÇOS CRÍTICOS DETECTADOS"
              : services.length > 0
              ? "🟡 ALGUNS SERVIÇOS COM PROBLEMAS"
              : "🟢 TODOS OS SERVIÇOS NORMAIS",
        },
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("[Scraper] Erro crítico:", error.message);
      return {
        timestamp: new Date().toISOString(),
        total: 0,
        critical: 0,
        warning: 0,
        topCritical: [],
        summary: { statusMessage: "⚠️ Scraper temporariamente indisponível" },
        error: true,
      };
    }
  }

  async getServiceDetails(slug) {
    const cacheKey = `service_${slug}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const url = `${this.baseUrl}/status/${slug}`;
      const html = await this.scrapeWithRetry(url);
      const $ = cheerio.load(html);

      const timeline = [];
      $("[data-value]").each((idx, el) => {
        const value = parseInt($(el).attr("data-value"));
        if (!isNaN(value)) timeline.push(value);
      });

      const incidents = [];
      $(".incident, .status-update").each((idx, el) => {
        if (idx >= 5) return;

        const time = $(el).find("time").text().trim();
        const title = $(el).find("h3, strong").text().trim();
        const desc = $(el).find("p").text().trim();

        if (title) incidents.push({ time, title, desc });
      });

      const result = {
        slug,
        timeline: timeline.slice(0, 24),
        incidents,
        fetchedAt: new Date().toISOString(),
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`[Service] Erro ao buscar ${slug}:`, error.message);
      return { slug, timeline: [], incidents: [], error: true };
    }
  }

  clearCache() {
    this.cache.flushAll();
    console.log("[Cache] Limpo");
  }
}

module.exports = new MonitoringService();
