// ============================================================
// ROTAS SPEEDTEST
// src/routes/speedtest.js (SUBSTITUA COMPLETAMENTE)
// ============================================================

const express = require("express");
const routerSpeed = express.Router();

let SpeedTestService;
let IXCService;

try {
  SpeedTestService = require("../services/SpeedTestService");
  IXCService = require("../services/ixc");
} catch (error) {
  console.error("[SpeedTest Route] Erro ao carregar serviços:", error.message);
}

/**
 * POST /api/v1/speedtest/record
 * Registra resultado do teste
 * Body: { downloadSpeed, uploadSpeed, ping, jitter, serverInfo, clientIp }
 */
routerSpeed.post("/record", async (req, res) => {
  try {
    if (!SpeedTestService) {
      return res.status(503).json({ error: "Serviço indisponível" });
    }

    const clientId = req.user?.id;
    if (!clientId) {
      return res.status(401).json({ error: "Cliente não autenticado" });
    }

    const result = SpeedTestService.recordResult(clientId, req.body);

    res.json({
      success: true,
      result,
      message: "Teste registrado com sucesso",
    });
  } catch (error) {
    console.error("[SpeedTest] Erro:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/speedtest/history
 * Histórico de testes do cliente
 */
routerSpeed.get("/history", async (req, res) => {
  try {
    if (!SpeedTestService) {
      return res.status(503).json({ error: "Serviço indisponível" });
    }

    const clientId = req.user?.id;
    if (!clientId) {
      return res.status(401).json({ error: "Cliente não autenticado" });
    }

    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const history = SpeedTestService.getHistory(clientId, limit);

    res.json({ total: history.length, history });
  } catch (error) {
    console.error("[SpeedTest] Erro:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/speedtest/stats
 * Estatísticas do cliente
 */
routerSpeed.get("/stats", async (req, res) => {
  try {
    if (!SpeedTestService) {
      return res.status(503).json({ error: "Serviço indisponível" });
    }

    const clientId = req.user?.id;
    if (!clientId) {
      return res.status(401).json({ error: "Cliente não autenticado" });
    }

    const stats = SpeedTestService.getStats(clientId);
    res.json(stats);
  } catch (error) {
    console.error("[SpeedTest] Erro:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/speedtest/compare
 * Compara com plano contratado
 */
routerSpeed.get("/compare", async (req, res) => {
  try {
    if (!SpeedTestService || !IXCService) {
      return res.status(503).json({ error: "Serviço indisponível" });
    }

    const clientId = req.user?.id;
    if (!clientId) {
      return res.status(401).json({ error: "Cliente não autenticado" });
    }

    // Busca plano do IXC
    const contrato = await IXCService.getContractDetails(clientId);

    if (!contrato) {
      return res.status(400).json({ error: "Plano não encontrado" });
    }

    // Parse velocidade (ex: "100 Mbps" -> 100)
    const planSpeed = parseInt(contrato.plan_speed);
    if (isNaN(planSpeed)) {
      return res.status(400).json({ error: "Velocidade do plano inválida" });
    }

    const comparison = SpeedTestService.compareWithPlan(
      clientId,
      planSpeed,
      Math.round(planSpeed / 2)
    );

    res.json(comparison);
  } catch (error) {
    console.error("[SpeedTest] Erro:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = routerSpeed;
