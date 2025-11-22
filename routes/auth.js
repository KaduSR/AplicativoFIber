// routes/auth.js
const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/authController");

/**
 * @route POST /api/auth/login
 * @desc Lida com a autenticação do cliente IXC (Email/CPF/CNPJ e Senha).
 */
router.post("/login", AuthController.login);

module.exports = router;
