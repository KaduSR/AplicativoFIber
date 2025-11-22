// src/server.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");

// Serviços
const GenieACSService = require("./services/genieacs");

// Middleware de Autenticação
// 💡 CORREÇÃO: Assumindo que o arquivo está em './middleware/authMiddleware.js'
// Se o seu caminho for './middlewares/authMiddleware', mude a linha de volta.
const { verifyToken } = require("./middleware/authMiddleware");

// Rotas
const speedtestRoute = require("./routes/speedtest");
const instabilidadeRoutes = require("./routes/instabilidade");
const ontRoutes = require("./routes/ont");
const authRoutes = require("./routes/auth");
const financeiroRoutes = require("./routes/financeiro");
const dashboardRoutes = require("./routes/dashboard");

// ❌ REMOVIDO: A importação do CRON foi removida
// const { startScheduler } = require("./cron/statusScheduler");

const app = express();
const PORT = process.env.PORT || 10000; // Usando a porta 10000 vista no seu log

// =========================================================
// CONFIGURAÇÃO
// =========================================================

// Inicialização e Injeção do GenieACS no Express (app.set)
const genieacs = new GenieACSService(
  process.env.GENIEACS_URL,
  process.env.GENIEACS_USER,
  process.env.GENIEACS_PASSWORD
);

app.set("genieacs", genieacs);
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
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/status", instabilidadeRoutes);

// =========================================================
// 2. MIDDLEWARE DE AUTENTICAÇÃO (Proteção de Rotas)
// =========================================================

// Aplica o middleware de autenticação a TODAS as rotas registradas ABAIXO.
app.use(verifyToken);

// =========================================================
// 3. ROTAS PROTEGIDAS (Acesso exclusivo ao Cliente)
// =========================================================
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/ont", ontRoutes);
app.use("/api/v1/financeiro", financeiroRoutes);
app.use("/api/v1/speedtest", speedtestRoute);

// ❌ REMOVIDO: A chamada do CRON foi removida
// startScheduler();

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});
