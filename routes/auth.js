// src/routes/auth.js

const express = require("express");
const router = express.Router();
// 💡 CORREÇÃO: Certifique-se de que a letra inicial é MINÚSCULA ('authController')
// ou o nome exato do seu arquivo dentro da pasta 'controllers'.
const AuthController = require("../controllers/authController");

// Rota POST para /api/v1/auth/login
router.post("/login", AuthController.login);

module.exports = router;
