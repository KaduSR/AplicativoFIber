// src/server.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");

// Serviços (GenieACS e dependência removidos)

// Middleware de Autenticação
const { verifyToken } = require("./middleware/authMiddleware");

// Rotas
const speedtestRoute = require("./routes/speedtest");
const instabilidadeRoutes = require("./routes/instabilidade");
// const ontRoutes = require("./routes/ont"); // REMOVIDO
const authRoutes = require("./routes/auth");
const financeiroRoutes = require("./routes/financeiro");
const dashboardRoutes = require("./routes/dashboard");
const chatbotRoutes = require("./routes/chatbot"); // Adicionado rota do chatbot

const app = express();
const PORT = process.env.PORT || 10000;

// =========================================================
// CONFIGURAÇÃO
// =========================================================

// Configuração GenieACS removida
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

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/status", instabilidadeRoutes);

// =========================================================
// 2. ROTAS PROTEGIDAS (Middleware aplicado)
// =========================================================

app.use("/api/v1/dashboard", verifyToken, dashboardRoutes);
app.use("/api/v1/financeiro", verifyToken, financeiroRoutes);
app.use("/api/v1/speedtest", verifyToken, speedtestRoute);
app.use("/api/v1/chatbot", verifyToken, chatbotRoutes); // Proteção da rota do chatbot

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});
