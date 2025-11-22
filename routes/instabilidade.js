// ============================================================
// ROTAS MONITORAMENTO
// src/routes/instabilidade.js (SUBSTITUA COMPLETAMENTE)
// ============================================================

const express = require("express");
const router = express.Router();

let MonitoringService;
try {
  MonitoringService = require("../services/MonitoringService");
} catch (error) {
  console.error("[Route] Erro ao carregar MonitoringService:", error.message);
}

/**
 * GET /api/v1/instabilidade
 * TOP 10 serviços com problemas
 */
router.get("/", async (req, res) => {
  try {
    if (!MonitoringService) {
      return res.status(503).json({ error: "Serviço indisponível" });
    }

    const result = await MonitoringService.extractProblematicServices();

    res.json({
      ...result,
      details: result.topCritical,
    });
  } catch (error) {
    console.error("[Route] Erro:", error.message);
    res.status(500).json({
      error: "Erro ao verificar instabilidades",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/instabilidade/:slug
 * Detalhes de um serviço
 */
router.get("/:slug", async (req, res) => {
  try {
    if (!MonitoringService) {
      return res.status(503).json({ error: "Serviço indisponível" });
    }

    const details = await MonitoringService.getServiceDetails(req.params.slug);
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/instabilidade/cache/clear
 * Limpa cache (admin only)
 */
router.post("/cache/clear", (req, res) => {
  try {
    if (!MonitoringService) {
      return res.status(503).json({ error: "Serviço indisponível" });
    }

    MonitoringService.clearCache();
    res.json({ success: true, message: "Cache limpo com sucesso" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;