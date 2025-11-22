// AplicativoFIber/routes/dashboard.js
const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const dashboardController = require("../controllers/dashboardController");

// Rotas Dashboard
// Todas as rotas do dashboard exigem autenticação
router.get("/dados", authenticate, dashboardController.getDashboardData);

module.exports = router;
