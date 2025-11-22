// middleware/auth.js
const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token não enviado" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err)
      return res.status(401).json({ message: "Token inválido ou expirado" });
    req.user = decoded; // { id, email }
    next();
  });
};

module.exports = authenticate;
