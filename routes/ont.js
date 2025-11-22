// src/routes/ont.js
const express = require("express");
const router = express.Router();
const ontController = require("../controllers/ontController");
// O middleware de autenticação (verifyToken) será aplicado no server.js

// Rota para buscar o status em tempo real da ONT (GenieACS)
router.get("/status", ontController.getStatus);

// Rota de ação: Reiniciar a ONT
router.post("/reboot", ontController.reboot);

// Rota de ação: Trocar a senha Wi-Fi (via GenieACS)
router.post("/wifi-password", ontController.changeWifiPassword);

module.exports = router;
