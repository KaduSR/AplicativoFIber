// ============================================================
// 1. SERVIÇO DE MONITORAMENTO INTELIGENTE (DOWNDETECTOR)
// ============================================================
// src/services/MonitoringService.js

const axios = require("axios");
const cheerio = require("cheerio");
const NodeCache = require("node-cache");

class MonitoringService {
  constructor() {
    // Cache de 5 minutos para evitar bloqueios
    this.cache = new NodeCache({ stdTTL: 300 });

    // Lista expandida de serviços críticos
    this.priorityServices = [
      "whatsapp",
      "facebook",
      "instagram",
      "google",
      "youtube",
      "netflix",
      "cloudflare",
      "amazon",
      "microsoft",
      "twitter",
      "telegram",
      "discord",
      "github",
      "aws",
      "azure",
    ];

    this.baseUrl = "https://downdetector.com.br";
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    };
  }

  /**
   * Scrape a homepage do Downdetector e extrai todos os serviços
   */
  async getAllServicesFromHomepage() {
    const cacheKey = "all_services_homepage";
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(this.baseUrl, {
        headers: this.headers,
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const services = [];

      // Seletor melhorado para encontrar todos os serviços
      $(".company-index").each((idx, el) => {
        const $el = $(el);

        // Extrai informações de status
        const statusSvg = $el.find("svg.danger, svg.warning");
        const hasIssues = statusSvg.length > 0;
        const isDanger = statusSvg.hasClass("danger");

        // Extrai nome e URL
        const nameEl = $el.find("h5");
        const name = nameEl.text().trim();
        const link = $el.find("a").attr("href") || "";
        const slug =
          link.split("/").filter(Boolean).pop() || name.toLowerCase();

        // Extrai número de relatórios
        const reports = parseInt($el.attr("data-day") || "0");

        // Extrai percentual de problemas
        const percentEl = $el.find(".percentage");
        const percentage = parseInt(percentEl.text() || "0");

        if (name && slug) {
          services.push({
            name,
            slug,
            url: `${this.baseUrl}${link}`,
            hasIssues,
            severity: isDanger ? "critical" : "warning", // critical > warning > normal
            reports,
            percentage,
            lastUpdate: new Date().toISOString(),
          });
        }
      });

      // Ordena por número de relatórios (descending)
      services.sort((a, b) => b.reports - a.reports);

      this.cache.set(cacheKey, services);
      return services;
    } catch (error) {
      console.error(
        "[Monitoring] Erro ao fazer scrape da homepage:",
        error.message
      );
      return [];
    }
  }

  /**
   * Obtém detalhes de um serviço específico
   */
  async getServiceDetails(slug) {
    const cacheKey = `service_details_${slug}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.baseUrl}/status/${slug}`, {
        headers: this.headers,
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      // Extrai gráfico de atividade (últimas 24h)
      const graphPoints = [];
      $(".chart-point").each((idx, el) => {
        const value = $(el).attr("data-value");
        if (value) graphPoints.push(parseInt(value));
      });

      // Extrai comentários/problemas recentes
      const incidents = [];
      $(".incident-item").each((idx, el) => {
        const $inc = $(el);
        incidents.push({
          title: $inc.find(".incident-title").text().trim(),
          time: $inc.find(".incident-time").text().trim(),
          description: $inc.find(".incident-desc").text().trim(),
        });
      });

      const details = {
        slug,
        timeline: graphPoints,
        incidents: incidents.slice(0, 5), // Top 5 incidents
        lastUpdate: new Date().toISOString(),
      };

      this.cache.set(cacheKey, details);
      return details;
    } catch (error) {
      console.error(
        `[Monitoring] Erro ao buscar detalhes de ${slug}:`,
        error.message
      );
      return { slug, timeline: [], incidents: [] };
    }
  }

  /**
   * Retorna os TOP 10 serviços com problemas críticos
   */
  async getTop10CriticalServices() {
    try {
      const allServices = await this.getAllServicesFromHomepage();

      // Filtra e classifica por severidade
      const problematic = allServices
        .filter((s) => s.hasIssues)
        .sort((a, b) => {
          // Primeiro por severidade (critical > warning)
          if (a.severity !== b.severity) {
            return a.severity === "critical" ? -1 : 1;
          }
          // Depois por número de relatórios
          return b.reports - a.reports;
        })
        .slice(0, 10);

      // Enriquece com detalhes
      const enriched = await Promise.all(
        problematic.map(async (service) => {
          const details = await this.getServiceDetails(service.slug);
          return { ...service, ...details };
        })
      );

      return {
        timestamp: new Date().toISOString(),
        totalIssues: allServices.filter((s) => s.hasIssues).length,
        topCritical: enriched,
        summary: {
          critical: enriched.filter((s) => s.severity === "critical").length,
          warning: enriched.filter((s) => s.severity === "warning").length,
        },
      };
    } catch (error) {
      console.error("[Monitoring] Erro ao buscar TOP 10:", error.message);
      return {
        timestamp: new Date().toISOString(),
        totalIssues: 0,
        topCritical: [],
        summary: { critical: 0, warning: 0 },
      };
    }
  }

  /**
   * Monitora um serviço específico em tempo real
   */
  async monitorService(slug, interval = 60000) {
    const history = [];
    let isRunning = true;

    const check = async () => {
      if (!isRunning) return;

      try {
        const details = await this.getServiceDetails(slug);
        history.push({ ...details, timestamp: Date.now() });

        // Mantém apenas últimas 24 horas
        if (history.length > 1440) history.shift();
      } catch (error) {
        console.error(`[Monitoring] Erro ao monitorar ${slug}:`, error.message);
      }

      setTimeout(check, interval);
    };

    check(); // Inicia a verificação

    return {
      stop: () => {
        isRunning = false;
      },
      getHistory: () => history,
    };
  }

  /**
   * Limpa o cache
   */
  flushCache() {
    this.cache.flushAll();
  }
}

module.exports = new MonitoringService();
