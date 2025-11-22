// src/server.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");

// Serviços
// O GenieACSService foi removido e não está sendo mais importado.

// Middleware de Autenticação
const { verifyToken } = require("./middleware/authMiddleware");

// Rotas
const speedtestRoute = require("./routes/speedtest");
const instabilidadeRoutes = require("./routes/instabilidade");
// const ontRoutes = require("./routes/ont"); // Rota removida
const authRoutes = require("./routes/auth");
const financeiroRoutes = require("./routes/financeiro");
const dashboardRoutes = require("./routes/dashboard");

const app = express();
const PORT = process.env.PORT || 10000;

// =========================================================
// CONFIGURAÇÃO
// =========================================================

// A inicialização e injeção do GenieACS foram removidas.
app.set("trust proxy", 1);

app.use(cors({ origin: process.env.ALLOWED_ORIGINS.split(",") || "*" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuração de Rate Limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 900000, // 15 minutos
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // 100 requisições por IP
});
app.use(limiter);

// Rota de Health Check (Pública)
app.get("/health", (req, res) =>
  res.json({ status: "online", uptime: process.uptime() })
);

// =========================================================
// 1. ROTAS PÚBLICAS (Acesso sem Token JWT)
// =========================================================

// Rotas de Autenticação e Status Externo NÃO PRECISAM de token.
// Estas rotas não têm o middleware 'verifyToken' aplicado.
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/status", instabilidadeRoutes);

// =========================================================
// 2. ROTAS PROTEGIDAS (Middleware aplicado individualmente)
// =========================================================

// Agora o middleware 'verifyToken' é aplicado explicitamente a cada rota que precisa de autenticação.
app.use("/api/v1/dashboard", verifyToken, dashboardRoutes);
// A rota da ONT foi removida.
app.use("/api/v1/financeiro", verifyToken, financeiroRoutes);
app.use("/api/v1/speedtest", verifyToken, speedtestRoute);

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});
