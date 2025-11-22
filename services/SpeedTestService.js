// ============================================================
// 2. SERVIÇO DE SPEEDTEST ROBUSTO (OOKLA)
// ============================================================
// src/services/SpeedTestService.js

const fs = require("fs");
const path = require("path");

class SpeedTestService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 3600 }); // Cache de 1 hora
    this.resultsFile = path.join(__dirname, "speedtest_results.json");
    this.loadResults();
  }

  /**
   * Carrega histórico de resultados do arquivo
   */
  loadResults() {
    try {
      if (fs.existsSync(this.resultsFile)) {
        const data = fs.readFileSync(this.resultsFile, "utf8");
        this.allResults = JSON.parse(data);
      } else {
        this.allResults = [];
      }
    } catch (error) {
      console.warn("[SpeedTest] Erro ao carregar resultados:", error.message);
      this.allResults = [];
    }
  }

  /**
   * Salva resultados no arquivo
   */
  saveResults() {
    try {
      fs.writeFileSync(
        this.resultsFile,
        JSON.stringify(this.allResults, null, 2)
      );
    } catch (error) {
      console.error("[SpeedTest] Erro ao salvar resultados:", error.message);
    }
  }

  /**
   * Registra novo resultado de speedtest
   */
  recordResult(clientId, testData) {
    const result = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clientId,
      timestamp: new Date().toISOString(),
      download: {
        speed: parseFloat(testData.downloadSpeed) || 0,
        unit: "Mbps",
      },
      upload: {
        speed: parseFloat(testData.uploadSpeed) || 0,
        unit: "Mbps",
      },
      ping: {
        latency: parseFloat(testData.ping) || 0,
        jitter: parseFloat(testData.jitter) || 0,
        unit: "ms",
      },
      serverInfo: testData.serverInfo || "Unknown",
      userAgent: testData.userAgent,
      ip: testData.clientIp,
    };

    this.allResults.push(result);
    this.saveResults();

    return result;
  }

  /**
   * Obtém histórico de testes do cliente
   */
  getClientHistory(clientId, limit = 30) {
    return this.allResults
      .filter((r) => r.clientId === clientId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Calcula estatísticas do cliente
   */
  getClientStats(clientId) {
    const results = this.allResults.filter((r) => r.clientId === clientId);

    if (results.length === 0) {
      return {
        totalTests: 0,
        average: { download: 0, upload: 0, ping: 0 },
        min: { download: 0, upload: 0, ping: 0 },
        max: { download: 0, upload: 0, ping: 0 },
      };
    }

    const downloads = results.map((r) => r.download.speed);
    const uploads = results.map((r) => r.upload.speed);
    const pings = results.map((r) => r.ping.latency);

    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const min = (arr) => Math.min(...arr);
    const max = (arr) => Math.max(...arr);

    return {
      totalTests: results.length,
      lastTest: results[0].timestamp,
      average: {
        download: avg(downloads).toFixed(2),
        upload: avg(uploads).toFixed(2),
        ping: avg(pings).toFixed(2),
      },
      min: {
        download: min(downloads).toFixed(2),
        upload: min(uploads).toFixed(2),
        ping: min(pings).toFixed(2),
      },
      max: {
        download: max(downloads).toFixed(2),
        upload: max(uploads).toFixed(2),
        ping: max(pings).toFixed(2),
      },
    };
  }

  /**
   * Compara com baseline do ISP
   */
  compareWithISPBaseline(clientId, ispBaseline) {
    const stats = this.getClientStats(clientId);

    if (stats.totalTests === 0) {
      return { analysis: "Nenhum teste realizado", status: "unknown" };
    }

    const downloadStatus =
      stats.average.download >= ispBaseline.download * 0.8 ? "good" : "poor";
    const uploadStatus =
      stats.average.upload >= ispBaseline.upload * 0.8 ? "good" : "poor";
    const pingStatus = stats.average.ping <= 50 ? "good" : "poor";

    return {
      status: [downloadStatus, uploadStatus, pingStatus].every(
        (s) => s === "good"
      )
        ? "excellent"
        : "needs_improvement",
      analysis: {
        download: {
          expected: ispBaseline.download,
          actual: stats.average.download,
          percentage: (
            (stats.average.download / ispBaseline.download) *
            100
          ).toFixed(2),
          status: downloadStatus,
        },
        upload: {
          expected: ispBaseline.upload,
          actual: stats.average.upload,
          percentage: (
            (stats.average.upload / ispBaseline.upload) *
            100
          ).toFixed(2),
          status: uploadStatus,
        },
        ping: {
          value: stats.average.ping,
          status: pingStatus,
        },
      },
    };
  }
}

module.exports = new SpeedTestService();
