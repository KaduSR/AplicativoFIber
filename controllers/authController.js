// controllers/authController.js
const ixcService = require("../services/ixc");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { login, senha } = req.body; // login pode ser email ou cpf/cnpj

  if (!login || !senha) {
    return res.status(400).json({ message: "Login e senha obrigatórios" });
  }

  try {
    // Aqui você usa seu token admin do IXC para validar as credenciais do cliente
    const cliente = await ixcService.login(login, senha);

    if (!cliente) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    // Agora gera SEU JWT (do seu backend)
    const token = jwt.sign(
      { id: cliente.id, email: cliente.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.json({
      token,
      user: {
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.email,
        cpf_cnpj: cliente.cpf_cnpj,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
};
