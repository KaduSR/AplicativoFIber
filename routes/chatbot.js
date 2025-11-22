// routes/chatbot.js
const express = require("express");
const router = express.Router();
// O middleware de autenticação é aplicado globalmente no server.js agora,
// mas se for aplicado individualmente, deve-se usar a importação correta.
// Aqui, importamos o controller e removemos a importação do middleware.
const chatbotController = require("../controllers/chatbotController");

// A rota do chatbot deve ser protegida (o middleware verifyToken está no server.js)
// Rota POST: /api/v1/chatbot/processar
router.post("/processar", chatbotController.processarIntencao); // Middleware removido daqui, pois foi para o server.js

module.exports = router;
