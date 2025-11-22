// src/cron/statusScheduler.js (Exemplo de correção)
const cron = require("node-cron");
let statusCheckJob = null; // Variável global para rastrear o job

exports.startScheduler = () => {
  // 💡 IMPORTANTE: Verifica se o job já existe e o interrompe
  if (statusCheckJob) {
    console.log("[CRON] Interrompendo job anterior...");
    statusCheckJob.stop();
  }

  console.log("[CRON] Iniciando verificação automática de status...");

  // Agendamento real do job
  statusCheckJob = cron.schedule("*/15 * * * *", async () => {
    // ... lógica de verificação de status ...
    console.log("[CRON] Executando checagem de status...");
  });

  console.log(
    "[CRON] Agendador de status de serviços iniciado (a cada 15 minutos)."
  );
};
