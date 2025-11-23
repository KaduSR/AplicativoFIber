// src/routes/dashboard.js
const express = require("express");
const router = express.Router();

// IMPORTA O CONTROLLER CORRETO
const dashboardController = require("../controllers/dashboardController");

// ROTA PROTEGIDA - DADOS DO DASHBOARD
router.get("/dados", dashboardController.getDashboardData);

// ROTA PARA DESBLOQUEIO DE CONFIANÇA (se tiver)
router.post(
  "/desbloqueio",
  dashboardController.performUnlock ||
    ((req, res) => {
      res.status(501).json({ error: "Funcionalidade em desenvolvimento" });
    })
);

module.exports = router;
