// AplicativoFIber/controllers/authController.js
const jwt = require("jsonwebtoken");
const ixcService = require("../services/ixc");

// Chave Secreta do JWT (deve vir do .env)
const JWT_SECRET = process.env.JWT_SECRET || "sua_chave_secreta_padrao";

/**
 * @desc Autentica o cliente usando email/CPF e senha do hotsite.
 * @route POST /api/v1/auth/login
 */
exports.login = async (req, res) => {
  const { login, senha } = req.body;

  if (!login || !senha) {
    return res.status(400).json({ message: "Login e senha são obrigatórios." });
  }

  try {
    // Tenta autenticar via serviço IXC
    const clienteData = await ixcService.login(login, senha);

    if (!clienteData) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    // Geração do Token JWT (Expira em 24h)
    const token = jwt.sign(
      { ixcId: clienteData.id, email: clienteData.email },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Retorna o token e os dados essenciais do cliente
    res.json({
      token,
      cliente: {
        id: clienteData.id,
        nome: clienteData.nome,
        email: clienteData.email,
      },
    });
  } catch (error) {
    console.error("[AuthController] Erro durante o login:", error);
    res
      .status(500)
      .json({ error: "Erro interno no servidor de autenticação." });
  }
};
