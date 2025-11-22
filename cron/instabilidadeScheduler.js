// src/cron/instabilidadeScheduler.js
const axios = require("axios");
const cron = require("node-cron");

let task = null;

const API_URL = process.env.API_BASE_URL || "https://api.centralfiber.online";
const ENDPOINT = "/api/v1/status";

/**
 * Inicia o scheduler de keep-alive + cache
 * @param {string} interval - Cron pattern (padrão: a cada 5 minutos)
 */
function startScheduler(interval = "*/5 * * * *") {
  if (task) {
    console.log("[Scheduler] Já está rodando.");
    return;
  }

  console.log(
    `[Scheduler] Iniciando keep-alive a cada ${
      interval === "*/5 * * * *" ? "5 minutos" : "personalizado"
    }...`
  );

  // Primeiro hit imediato
  hitEndpoint();

  // Depois agenda
  task = cron.schedule(interval, () => {
    hitEndpoint();
  });

  console.log(`[Scheduler] Keep-alive ativo → ${API_URL}${ENDPOINT}`);
}

async function hitEndpoint() {
  try {
    await axios.get(`${API_URL}${ENDPOINT}`, {
      timeout: 15000,
      headers: { "User-Agent": "FiberNet-KeepAlive/2.0" },
    });
    console.log(
      `[KeepAlive] Cache aquecido • ${new Date().toLocaleTimeString("pt-BR")}`
    );
  } catch (err) {
    // É normal falhar durante quedas reais
    console.warn(
      `[KeepAlive] Falha ao aquecer cache (pode ser normal): ${err.message}`
    );
  }
}

function stopScheduler() {
  if (task) {
    task.stop();
    task = null;
    console.log("[Scheduler] Parado com sucesso.");
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
};
