// ============================================================
// 3. ROTAS MONITORAMENTO (Substituir instabilidade.js)
// ============================================================
// src/routes/monitoring.js

const express = require("express");
const router = express.Router();
const MonitoringService = require("../services/MonitoringService");

/**
 * GET /api/v1/monitoring/status
 * Retorna o status geral de todos os serviços
 */
router.get("/status", async (req, res) => {
  try {
    const allServices = await MonitoringService.getAllServicesFromHomepage();
    const issues = allServices.filter((s) => s.hasIssues);

    res.json({
      timestamp: new Date().toISOString(),
      totalServices: allServices.length,
      servicesWithIssues: issues.length,
      issuePercentage: ((issues.length / allServices.length) * 100).toFixed(2),
      status:
        issues.length === 0
          ? "🟢 TODOS OS SERVIÇOS NORMAIS"
          : issues.length > 5
          ? "🔴 MÚLTIPLAS INSTABILIDADES"
          : "🟡 ALGUNS SERVIÇOS COM PROBLEMAS",
      details: allServices.slice(0, 20), // Top 20
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao verificar status" });
  }
});

/**
 * GET /api/v1/monitoring/top-critical
 * Retorna os TOP 10 serviços críticos
 */
router.get("/top-critical", async (req, res) => {
  try {
    const critical = await MonitoringService.getTop10CriticalServices();
    res.json(critical);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar serviços críticos" });
  }
});

/**
 * GET /api/v1/monitoring/service/:slug
 * Obtém detalhes de um serviço específico
 */
router.get("/service/:slug", async (req, res) => {
  try {
    const details = await MonitoringService.getServiceDetails(req.params.slug);
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar detalhes do serviço" });
  }
});

module.exports = router;
