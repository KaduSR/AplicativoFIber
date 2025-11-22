// ============================================================
// SERVIÇO SPEEDTEST FIBERNET (CORRIGIDO)
// src/services/SpeedTestService.js
// ============================================================

const fs = require("fs");
const path = require("path");
const NodeCacheModule = require("node-cache");

class SpeedTestService {
  constructor() {
    this.resultsDir = path.join(__dirname, "../data/speedtest_results");
    this.ensureDir();
    this.cache = new NodeCacheModule({ stdTTL: 1800 });
  }

  ensureDir() {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  recordResult(clientId, testData) {
    try {
      const result = {
        id: `test_${Date.now()}`,
        clientId,
        timestamp: new Date().toISOString(),
        download:
          Math.round(parseFloat(testData.downloadSpeed) * 100) / 100 || 0,
        upload: Math.round(parseFloat(testData.uploadSpeed) * 100) / 100 || 0,
        ping: Math.round(parseFloat(testData.ping) * 100) / 100 || 0,
        jitter: Math.round(parseFloat(testData.jitter) * 100) / 100 || 0,
        serverInfo: testData.serverInfo || "LibreSpeed",
        ip: testData.clientIp || "unknown",
      };

      const filePath = path.join(this.resultsDir, `${clientId}.json`);
      let results = [];

      if (fs.existsSync(filePath)) {
        results = JSON.parse(fs.readFileSync(filePath, "utf8"));
      }

      results.push(result);
      results = results.slice(-1000);

      fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
      this.cache.del(`stats_${clientId}`);

      return result;
    } catch (error) {
      console.error("[SpeedTest] Erro:", error.message);
      throw error;
    }
  }

  getHistory(clientId, limit = 50) {
    try {
      const filePath = path.join(this.resultsDir, `${clientId}.json`);

      if (!fs.existsSync(filePath)) return [];

      const results = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return results
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (error) {
      console.error("[SpeedTest] Erro ao ler histórico:", error.message);
      return [];
    }
  }

  getStats(clientId) {
    const cacheKey = `stats_${clientId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const history = this.getHistory(clientId, 100);

    if (history.length === 0) {
      return {
        totalTests: 0,
        lastTest: null,
        average: { download: 0, upload: 0, ping: 0, jitter: 0 },
        min: { download: 0, upload: 0, ping: 0 },
        max: { download: 0, upload: 0, ping: 0 },
        trend: "no_data",
      };
    }

    const avg = (arr) =>
      Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
    const min = (arr) => Math.min(...arr);
    const max = (arr) => Math.max(...arr);

    const downloads = history.map((r) => r.download);
    const uploads = history.map((r) => r.upload);
    const pings = history.map((r) => r.ping);
    const jitters = history.map((r) => r.jitter);

    const recent = history.slice(0, 5);
    const older = history.slice(10, 15);
    const recentAvg = avg(recent.map((r) => r.download));
    const olderAvg =
      older.length > 0 ? avg(older.map((r) => r.download)) : recentAvg;
    const trend =
      recentAvg > olderAvg * 1.1
        ? "improving"
        : recentAvg < olderAvg * 0.9
        ? "declining"
        : "stable";

    const stats = {
      totalTests: history.length,
      lastTest: history[0]?.timestamp || null,
      average: {
        download: avg(downloads),
        upload: avg(uploads),
        ping: avg(pings),
        jitter: avg(jitters),
      },
      min: {
        download: min(downloads),
        upload: min(uploads),
        ping: min(pings),
      },
      max: {
        download: max(downloads),
        upload: max(uploads),
        ping: max(pings),
      },
      trend,
    };

    this.cache.set(cacheKey, stats);
    return stats;
  }

  compareWithPlan(clientId, planDownload, planUpload) {
    const stats = this.getStats(clientId);

    if (stats.totalTests === 0) {
      return {
        status: "no_data",
        message: "Nenhum teste realizado ainda",
      };
    }

    const dlPct = Math.round((stats.average.download / planDownload) * 100);
    const ulPct = Math.round((stats.average.upload / planUpload) * 100);

    const dlOk = dlPct >= 80;
    const ulOk = ulPct >= 80;

    return {
      status: dlOk && ulOk ? "good" : "poor",
      download: {
        contracted: planDownload,
        measured: stats.average.download,
        percentage: dlPct,
        ok: dlOk,
      },
      upload: {
        contracted: planUpload,
        measured: stats.average.upload,
        percentage: ulPct,
        ok: ulOk,
      },
      recommendation:
        dlOk && ulOk
          ? "✅ Sua conexão está excelente!"
          : "⚠️ Abra um chamado de suporte",
    };
  }
}

module.exports = new SpeedTestService();
