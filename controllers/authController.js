// controllers/AuthController.js
const crypto = require("crypto");
// IMPORTANTE: Mantenha este caminho para o seu arquivo de conexão com o banco.
const db = require("../config/database");
const jwt = require("jsonwebtoken");
const { env } = require("process");

exports.login = async (req, res) => {
  const { login, senha } = req.body;

  if (!login || !senha) {
    return res.status(400).json({ message: "Login e senha são obrigatórios" });
  }

  try {
    // Gera o hash MD5 da senha (padrão IXC)
    const senhaHash = crypto.createHash("md5").update(senha).digest("hex");

    // Busca cliente pelo login e senha com hash
    const query = `
            SELECT id, nome_razaosocial, email, cnpj_cpf, hotsite_senha
            FROM cliente 
            WHERE (email = ? OR cnpj_cpf = ?) 
            AND hotsite_senha = ? 
            LIMIT 1
        `;

    const [rows] = await db.execute(query, [login, login, senhaHash]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const user = rows[0];

    // Busca faturas em aberto
    const [faturas] = await db.execute(
      `
            SELECT id, data_vencimento as vencimento, valor, 'aberto' as status, linha_digitavel 
            FROM fn_areceber 
            WHERE id_cliente = ? AND status = 'A'
        `,
      [user.id]
    );

    // Gerar Token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      env.JWT_SECRET || "SEGREDO_DEVE_SER_DEFINIDO_NO_DOTENV",
      { expiresIn: "1d" }
    );

    return res.json({
      token,
      nome: user.nome_razaosocial,
      email: user.email,
      faturas: faturas,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
};
