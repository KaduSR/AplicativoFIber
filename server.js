// src/server.js
// ============================================================
// SERVIDOR FIBERNET - VERSÃO FINAL CORRIGIDA E OTIMIZADA
// CORS 100% FUNCIONAL COM VERCEL + RENDER
// ============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");

// =========================================================
// IMPORTS DE SERVIÇOS
// =========================================================
const {
  startScheduler,
  stopScheduler,
} = require("./cron/instabilidadeScheduler");
const { verifyToken } = require("./middleware/authMiddleware");

// =========================================================
// IMPORTS DE ROTAS
// =========================================================
const speedtestRoute = require("./routes/speedtest");
const instabilidadeRoutes = require("./routes/instabilidade");
const authRoutes = require("./routes/auth");
const financeiroRoutes = require("./routes/financeiro");
const dashboardRoutes = require("./routes/dashboard");
const chatbotRoutes = require("./routes/chatbot");

// =========================================================
// INICIALIZAÇÃO EXPRESS
// =========================================================
const app = express();
const PORT = process.env.PORT || 10000;

// =========================================================
// CONFIGURAÇÕES GERAIS
// =========================================================
app.set("trust proxy", 1);

// CORS CORRIGIDO E PERFEITO (funciona com Vercel + credentials)
app.use(
  cors({
    origin: true, // REFLETE automaticamente o origin da requisição (o que o navegador precisa!)
    credentials: true, // Permite cookies e Authorization header
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Body Parser
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// =========================================================
// RATE LIMITING
// =========================================================
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: "Muitas requisições. Tente novamente mais tarde.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// =========================================================
// HEALTH CHECKS
// =========================================================
app.get("/health", (req, res) => {
  res.json({ status: "online", timestamp: new Date().toISOString() });
});

app.get("/health/detailed", (req, res) => {
  res.json({
    status: "online",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "2.0.0",
    features: {
      auth: true,
      dashboard: true,
      financeiro: true,
      speedtest: true,
      chatbot: true,
      monitoring: true,
    },
  });
});

// =========================================================
// ROTAS PÚBLICAS
// =========================================================
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/status", instabilidadeRoutes);

// =========================================================
// ROTAS PROTEGIDAS (JWT)
// =========================================================
app.use("/api/v1/dashboard", verifyToken, dashboardRoutes);
app.use("/api/v1/financeiro", verifyToken, financeiroRoutes);
app.use("/api/v1/speedtest", verifyToken, speedtestRoute);
app.use("/api/v1/chatbot", verifyToken, chatbotRoutes);

// =========================================================
// 404 + ERRO GLOBAL
// =========================================================
app.use((req, res) => {
  res.status(404).json({
    error: "Rota não encontrada",
    path: req.originalUrl,
    method: req.method,
  });
});

app.use((err, req, res, next) => {
  console.error("[ERRO]", err.message, err.stack);
  res.status(err.statusCode || 500).json({
    error: err.message || "Erro interno do servidor",
    timestamp: new Date().toISOString(),
  });
});

// =========================================================
// INICIAR SERVIDOR
// =========================================================
const server = app.listen(PORT, () => {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                FIBERNET BACKEND ATIVO                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`\nServidor rodando na porta: ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || "development"}`);
  console.log(`CORS: ATIVO E FUNCIONANDO (origin: true + credentials)`);
  console.log(`Frontend permitido: qualquer Vercel, localhost e produção\n`);

  // Iniciar scheduler de monitoramento
  try {
    const interval = process.env.SCHEDULER_INTERVAL || "*/5 * * * *";
    startScheduler(interval);
    console.log(`Scheduler de instabilidade iniciado (${interval})`);
  } catch (e) {
    console.error("Erro ao iniciar scheduler:", e.message);
  }

  console.log("Tudo pronto! Seu portal do cliente agora loga 100%");
  console.log(
    "══════════════════════════════════════════════════════════════\n"
  );
});

// =========================================================
// GRACEFUL SHUTDOWN
// =========================================================
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("uncaughtException", (err) => {
  console.error("[FATAL] uncaughtException:", err);
  shutdown();
});
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] unhandledRejection:", reason);
  shutdown();
});

function shutdown() {
  console.log("\nEncerrando servidor...");
  stopScheduler();
  server.close(() => {
    console.log("Servidor encerrado com sucesso");
    process.exit(0);
  });
}

module.exports = app;
