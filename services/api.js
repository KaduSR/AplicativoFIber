/*
 * backend/routes/api.js
 */
const express = require("express");
const router = express.Router();

// Importa os controllers
const AuthController = require("../controllers/authController");
const SpeedtestController = require("../controllers/speedtestController");

// Rota de Autenticação IXC
router.post("/auth/login", AuthController.login);

// Rota de Teste de Velocidade
router.post("/speedtest/run", SpeedtestController.run);

module.exports = router;

// No seu arquivo principal (server.js ou index.js):
// const apiRoutes = require('./routes/api');
// app.use('/api/v1', apiRoutes);
