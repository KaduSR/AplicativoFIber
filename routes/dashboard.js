// src/routes/dashboard.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

// Dados do dashboard
router.get("/dados", dashboardController.getDashboardData);

// NOVA ROTA: Trocar senha
router.post("/trocar-senha", dashboardController.trocarSenha);

module.exports = router;
