const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const ixc = require("../services/ixc");

exports.login = async (req, res) => {
  const { login, senha } = req.body;
  if (!login || !senha)
    return res.status(400).json({ message: "Login e senha obrigatórios" });

  try {
    const cliente = await ixc.login(login, senha);
    if (!cliente)
      return res.status(401).json({ message: "Credenciais inválidas" });

    const token = jwt.sign(
      { id: cliente.id, email: cliente.email, nome: cliente.nome },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.json({ token, nome: cliente.nome_razaosocial, email: cliente.email });
  } catch (error) {
    res.status(500).json({ message: "Erro interno" });
  }
};
