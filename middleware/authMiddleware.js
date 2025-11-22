// src/middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(403).json({ message: "Token de acesso não fornecido." });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(403).json({ message: "Formato de token inválido." });
  }

  try {
    // Decodifica o token usando a chave secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Anexa o payload decodificado (contendo o ID do cliente) ao request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token expirado ou inválido." });
  }
};
