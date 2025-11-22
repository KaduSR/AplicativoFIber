// /opt/render/project/src/cron/statusScheduler.js
const cron = require("node-cron");
// ✅ CORREÇÃO: Importa SERVICES_TO_CHECK usando destructuring
const { SERVICES_TO_CHECK } = require("../routes/instabilidade");
const downdetectorService = require("../services/DowndetectorService");
const aiStatusService = require("../services/AIStatusService");

/**
 * @private
 * Função de checagem automática de status dos serviços.
 */
async function automatedCheck() {
  console.log(
    `[CRON] Iniciando verificação automática de status (${new Date().toISOString()})...`
  );

  // Acessa a lista SERVICES_TO_CHECK, que agora está definida
  const checks = SERVICES_TO_CHECK.map(async (id) => {
    let result = {};

    result = await downdetectorService.getStatus(id);

    if (result.status === "unknown") {
      if (process.env.GEMINI_API_KEY) {
        const aiResult = await aiStatusService.checkStatus(id);

        if (aiResult.status !== "error") {
          result = {
            ...result,
            status: aiResult.status,
            message: aiResult.message,
            source: "AI Backup (CRON)",
          };
        }
      }
    }
    return result;
  });

  await Promise.all(checks);
  console.log("[CRON] Verificação automática concluída.");
}

/**
 * Inicia o agendador de tarefas CRON para checar status.
 */
exports.startScheduler = () => {
  // Roda a cada 15 minutos
  cron.schedule("*/15 * * * *", () => {
    automatedCheck();
  });

  // Roda a checagem uma vez na inicialização para popular o cache
  automatedCheck();

  console.log(
    "[CRON] Agendador de status de serviços iniciado (a cada 15 minutos)."
  );
};
