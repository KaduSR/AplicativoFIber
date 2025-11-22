// src/cron/statusScheduler.js (Exemplo de Correção)
const cron = require("node-cron");
// Use uma variável global para rastrear o job
let statusCheckJob = null;

exports.startScheduler = () => {
  // 💡 SOLUÇÃO: Interrompe o agendador anterior se ele existir
  if (statusCheckJob) {
    console.log("[CRON] Interrompendo job anterior (Evitando Memory Leak)...");
    statusCheckJob.stop();
  }

  console.log("[CRON] Iniciando verificação automática de status...");

  // Agendamento real do job
  statusCheckJob = cron.schedule("*/15 * * * *", async () => {
    // ... sua lógica de verificação de status ...
    console.log("[CRON] Executando checagem de status...");
  });

  console.log(
    "[CRON] Agendador de status de serviços iniciado (a cada 15 minutos)."
  );
};
