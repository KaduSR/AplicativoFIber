// ============================================================
// SCHEDULER MONITORAMENTO
// src/cron/instabilidadeScheduler.js (SUBSTITUA COMPLETAMENTE)
// ============================================================

const cron = require("node-cron");
const axios = require("axios");

let MonitoringServiceScheduler;
try {
  MonitoringServiceScheduler = require("../services/MonitoringService");
} catch (error) {
  console.error(
    "[Scheduler] Erro ao carregar MonitoringService:",
    error.message
  );
}

let statusCheckJob = null;

function startScheduler(interval = "*/5 * * * *") {
  if (statusCheckJob) {
    console.log("[Scheduler] Já está rodando");
    return;
  }

  if (!MonitoringServiceScheduler) {
    console.error("[Scheduler] MonitoringService não carregado");
    return;
  }

  console.log(`[Scheduler] Iniciando monitoramento a cada: ${interval}`);

  statusCheckJob = cron.schedule(interval, async () => {
    try {
      const result =
        await MonitoringServiceScheduler.extractProblematicServices();

      console.log(
        `[Scheduler] ✅ Verificado: ${result.critical} críticos, ${result.warning} warnings`
      );

      // Envia alerta se houver críticos
      if (result.critical > 0 && process.env.ALERT_WEBHOOK_URL) {
        try {
          await axios.post(process.env.ALERT_WEBHOOK_URL, {
            type: "instability_alert",
            timestamp: result.timestamp,
            critical: result.critical,
            warning: result.warning,
            services: result.topCritical.slice(0, 5),
            statusMessage: result.summary.statusMessage,
          });
          console.log("[Scheduler] ✅ Alerta enviado");
        } catch (e) {
          console.warn("[Webhook] Erro:", e.message);
        }
      }
    } catch (error) {
      console.error("[Scheduler] Erro:", error.message);
    }
  });

  console.log("[Scheduler] ✅ Iniciado com sucesso");
}

function stopScheduler() {
  if (statusCheckJob) {
    statusCheckJob.stop();
    statusCheckJob = null;
    console.log("[Scheduler] ⏹️ Parado");
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
};
