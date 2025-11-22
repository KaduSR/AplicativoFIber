// src/cron/statusScheduler.js

const cron = require("node-cron");
const ixc = require("../services/ixc");
// A classe do GenieACS não deve ser importada aqui para evitar dependência circular
// (ela deve ser acessada via app.get('genieacs') se necessário).

// Variável global para rastrear o job CRON ativo
let statusCheckJob = null;

/**
 * @desc Inicia o agendador de status de serviços.
 * A cada 15 minutos, ele pode ser usado para checar a saúde do IXC ou
 * o status de instabilidade global.
 */
exports.startScheduler = () => {
  // IMPORTANTE: Interrompe o job anterior se ele existir (CORREÇÃO DE MEMORY LEAK)
  if (statusCheckJob) {
    console.log("[CRON] Interrompendo job anterior (Evitando Memory Leak)...");
    statusCheckJob.stop();
  }

  console.log(
    `[CRON] Iniciando verificação automática de status (${new Date().toISOString()})...`
  );

  // Define o novo job CRON para rodar a cada 15 minutos ('*/15 * * * *')
  statusCheckJob = cron.schedule("*/15 * * * *", async () => {
    try {
      // Exemplo de lógica CRON: Checar a saúde do IXC
      // const health = await ixc.checkHealth();
      // console.log(`[CRON] IXC Health Check: ${health.status}`);

      // Adicione aqui qualquer lógica de monitoramento periódico
      console.log(`[CRON] Executando checagem de status de serviços...`);
    } catch (error) {
      console.error(
        "[CRON ERROR] Falha na execução do agendador:",
        error.message
      );
    }
  });

  console.log(
    "[CRON] Agendador de status de serviços iniciado (a cada 15 minutos)."
  );
};
