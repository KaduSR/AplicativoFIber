// ============================================================
// 4. ROTAS SPEEDTEST
// ============================================================
// src/routes/speedtest.js (ATUALIZADO)

const express = require("express");
const router = express.Router();
const SpeedTestService = require("../services/SpeedTestService");

/**
 * POST /api/v1/speedtest/record
 * Registra novo resultado de speedtest
 * Body: { downloadSpeed, uploadSpeed, ping, jitter, serverInfo, clientIp }
 */
router.post("/record", async (req, res) => {
  try {
    const clientId = req.user.id;
    const result = SpeedTestService.recordResult(clientId, req.body);

    res.json({
      success: true,
      result,
      message: "Resultado de speedtest registrado com sucesso",
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao registrar resultado" });
  }
});

/**
 * GET /api/v1/speedtest/history
 * Obtém histórico de testes do cliente
 */
router.get("/history", async (req, res) => {
  try {
    const clientId = req.user.id;
    const limit = parseInt(req.query.limit) || 30;
    const history = SpeedTestService.getClientHistory(clientId, limit);

    res.json({ history, total: history.length });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar histórico" });
  }
});

/**
 * GET /api/v1/speedtest/stats
 * Obtém estatísticas do cliente
 */
router.get("/stats", async (req, res) => {
  try {
    const clientId = req.user.id;
    const stats = SpeedTestService.getClientStats(clientId);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Erro ao calcular estatísticas" });
  }
});

/**
 * GET /api/v1/speedtest/compare
 * Compara com baseline do ISP
 */
router.get("/compare", async (req, res) => {
  try {
    const clientId = req.user.id;
    // Buscar baseline do ISP do contrato do cliente
    const ispBaseline = {
      download: 100, // Mbps (exemplo)
      upload: 50, // Mbps (exemplo)
    };

    const comparison = SpeedTestService.compareWithISPBaseline(
      clientId,
      ispBaseline
    );
    res.json(comparison);
  } catch (error) {
    res.status(500).json({ error: "Erro ao comparar com baseline" });
  }
});

module.exports = router;
