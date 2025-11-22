// src/routes/auth.js

const express = require("express");
const router = express.Router();
// 💡 Garanta que este caminho e o nome do arquivo (authController.js) estão corretos.
// Em ambientes Linux (Render), o nome deve ser exato (case-sensitive).
const AuthController = require("../controllers/authController");

// Rota POST: /api/v1/auth/login
// O prefixo /api/v1/auth é definido no server.js
router.post("/login", AuthController.login);

module.exports = router;
