/*
 * backend/controllers/authController.js
 */
const ixcService = require("../services/ixc");
const jwt = require("jsonwebtoken"); // Para gerar tokens JWT de sessão
const { env } = require("process"); // Para usar variáveis de ambiente

class AuthController {
  // POST /api/v1/auth/login
  async handleLogin(req, res) {
    // A. Recebe credenciais
    const { login, senha } = req.body;

    if (!login || !senha) {
      return res.status(400).json({
        message: "Login e senha são obrigatórios.",
        status: 400,
      });
    }

    try {
      // B. Chama o serviço de login
      const clienteAutenticado = await ixcService.login(login, senha);

      if (!clienteAutenticado) {
        // C. Falha de Autenticação
        return res.status(401).json({
          message: "Credenciais inválidas. Verifique seu login ou senha.",
          status: 401,
        });
      }

      // D. Sucesso: Gera o Token de Sessão (JWT)
      const token = jwt.sign(
        { clienteId: clienteAutenticado.id },
        env.JWT_SECRET || "SEGREDO_MUITO_SEGURO", // Use uma variável de ambiente!
        { expiresIn: "1d" } // Token expira em 1 dia
      );

      // E. Retorna o Token e dados do Cliente (sem a senha, é claro)
      return res.status(200).json({
        message: "Login bem-sucedido.",
        token,
        cliente: clienteAutenticado,
      });
    } catch (error) {
      console.error(
        "[AuthController] Erro durante o processo de login:",
        error
      );
      return res.status(500).json({
        message: "Erro interno no servidor ao tentar login.",
        status: 500,
      });
    }
  }
}

module.exports = new AuthController();
