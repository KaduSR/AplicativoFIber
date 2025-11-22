// src/controllers/authController.js

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const ixc = require("../services/ixc");

exports.login = async (req, res) => {
  const { login, senha } = req.body;
  if (!login || !senha)
    return res.status(400).json({ message: "Login e senha obrigatórios" });

  try {
    // CORREÇÃO: Chama o método correto 'authenticate' do serviço IXC
    const cliente = await ixc.authenticate(login, senha);

    if (!cliente)
      return res.status(401).json({ message: "Credenciais inválidas" });

    const token = jwt.sign(
      // id, email, e nome do cliente são usados no payload do JWT
      { id: cliente.id, email: cliente.email, nome: cliente.nome },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    // nome: cliente.nome_razaosocial é usado na resposta para o cliente
    res.json({ token, nome: cliente.nome_razaosocial, email: cliente.email });
  } catch (error) {
    // LOG DETALHADO
    console.error(
      "========================================",
      "!!! ERRO CRÍTICO 500 NO LOGIN !!!",
      "MENSAGEM:",
      error.message,
      "STACK TRACE:",
      error.stack,
      "========================================"
    );
    res.status(500).json({ message: "Erro interno" });
  }
};

module.exports = exports;
