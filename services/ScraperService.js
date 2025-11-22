// /opt/render/project/src/services/ScraperService.js
const axios = require("axios");
const cheerio = require("cheerio");

class ScraperService {
  constructor() {
    this.baseUrl = "https://downdetector.com.br";
    this.headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9",
    };
  }

  async scrapeServiceStatus(serviceSlug) {
    try {
      const response = await axios.get(this.baseUrl, {
        headers: this.headers,
        timeout: 6000,
      });

      const $ = cheerio.load(response.data);
      const $service = $(`a[href*="/status/${serviceSlug}"]`).first().parent();

      if ($service.length === 0) {
        return { status: "unknown", message: "Serviço não encontrado" };
      }

      const statusClass = $service.attr("class") || "";
      const statusText = $service
        .find(".status-up, .status-down, .status-issue")
        .text()
        .trim();
      const reportCount =
        $service.find("[data-reports]").attr("data-reports") || "0";

      const status = statusClass.includes("down")
        ? "down"
        : statusClass.includes("issue")
        ? "unstable"
        : "stable";

      return {
        status,
        hasIssues: status !== "stable",
        message: `${statusText || status}. Relatórios: ${reportCount}`,
        reports: parseInt(reportCount) || 0,
      };
    } catch (error) {
      console.error(`[Scraper] Erro para ${serviceSlug}:`, error.message);
      return {
        status: "error",
        message: `Erro no scraper: ${error.message}`,
        hasIssues: false,
      };
    }
  }

  async scrapeMultipleServices(services) {
    const results = await Promise.all(
      services.map(async (service) => ({
        service,
        ...(await this.scrapeServiceStatus(service)),
      }))
    );
    return results;
  }
}

module.exports = new ScraperService();
