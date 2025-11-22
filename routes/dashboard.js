// routes/dashboard.js
const express = require("express");
const router = express.Router();
// O middleware authenticate não é mais necessário aqui, pois verifyToken
// já está aplicado globalmente em server.js.
const dashboardController = require("../controllers/dashboardController");

// Rotas Dashboard protegidas pelo middleware verifyToken (aplicado em server.js)

/**
 * @route GET /api/v1/dashboard/dados
 * @desc Busca todos os dados do cliente para a tela principal (Dashboard).
 */
router.get("/dados", dashboardController.getDashboardData);

/**
 * @route POST /api/v1/dashboard/desbloqueio
 * @desc Solicita o Desbloqueio de Confiança do cliente.
 */
router.post("/desbloqueio", dashboardController.performUnlock);

module.exports = router;
