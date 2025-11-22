// ============================================================
// 5. SCHEDULER ROBUSTO
// ============================================================
// src/scheduler/MonitoringScheduler.js

const cron = require("node-cron");
const MonitoringService = require("../services/MonitoringService");

class MonitoringScheduler {
  constructor() {
    this.isRunning = false;
    this.jobs = [];
  }

  start() {
    if (this.isRunning) {
      console.log("[Scheduler] Já está rodando");
      return;
    }

    // A cada 5 minutos: atualiza TOP 10 críticos
    const job1 = cron.schedule("*/5 * * * *", async () => {
      try {
        const critical = await MonitoringService.getTop10CriticalServices();
        console.log(
          `[Scheduler] ✅ TOP 10 atualizado: ${critical.topCritical.length} serviços com problemas`
        );

        // WEBHOOK: Enviar alertas se houver críticos
        if (critical.summary.critical > 0) {
          this.sendAlert("CRITICAL", critical);
        }
      } catch (error) {
        console.error("[Scheduler] Erro na verificação:", error.message);
      }
    });

    // A cada 30 minutos: limpa cache para dados frescos
    const job2 = cron.schedule("0 */30 * * * *", () => {
      MonitoringService.flushCache();
      console.log("[Scheduler] 🧹 Cache limpo");
    });

    this.jobs = [job1, job2];
    this.isRunning = true;
    console.log("[Scheduler] ✅ Monitoramento iniciado");
  }

  stop() {
    this.jobs.forEach((job) => job.stop());
    this.isRunning = false;
    console.log("[Scheduler] ⏹️ Monitoramento parado");
  }

  sendAlert(level, data) {
    // Implementar webhook, Slack, Discord, email, etc.
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (!webhookUrl) return;

    axios
      .post(webhookUrl, {
        level,
        timestamp: new Date().toISOString(),
        data,
      })
      .catch((err) => console.error("[Webhook] Erro:", err.message));
  }
}

module.exports = new MonitoringScheduler();
