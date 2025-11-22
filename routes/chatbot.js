// routes/chatbot.js
const express = require("express");
const router = express.Router();
// O middleware authenticate não é importado, pois verifyToken é aplicado no server.js.
const chatbotController = require("../controllers/chatbotController");

// Rota POST: /api/v1/chatbot/processar
router.post("/processar", chatbotController.processarIntencao);

module.exports = router;
