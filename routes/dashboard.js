// src/routes/dashboard.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
// O middleware de autenticação (verifyToken) será aplicado no server.js

// Rota principal: Agrega todos os dados do Dashboard (Conexão, Contrato, Financeiro)
router.get("/dados", dashboardController.getDashboardData);

// Rota de ação: Executa o Desbloqueio de Confiança
router.post("/desbloqueio-confianca", dashboardController.performUnlock);

module.exports = router;
