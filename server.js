// src/server.js
// ============================================================
// SERVIDOR FIBERNET - VERSÃO FINAL COM MONITORAMENTO
// ============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");

// =========================================================
// IMPORTS DE SERVIÇOS
// =========================================================

// Scheduler de Monitoramento
const {
  startScheduler,
  stopScheduler,
} = require("./cron/instabilidadeScheduler");

// Middleware de Autenticação
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

// CORS - Configuração segura
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((url) => url.trim())
  : ["*"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body Parser
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// =========================================================
// RATE LIMITING - PROTEÇÃO CONTRA ABUSO
// =========================================================

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requisições por IP
  message: "Muitas requisições deste IP, tente novamente mais tarde.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// =========================================================
// ROTAS DE HEALTH CHECK (PÚBLICA)
// =========================================================

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: "2.0.0",
  });
});

// Health check com detalhes
app.get("/health/detailed", (req, res) => {
  res.json({
    status: "online",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || "development",
    features: {
      monitoring: true,
      speedtest: true,
      authentication: true,
      ixc: true,
      chatbot: true,
    },
    scheduler: {
      running: true,
      interval: "*/5 * * * *",
    },
  });
});

// =========================================================
// 1. ROTAS PÚBLICAS (Sem autenticação JWT)
// =========================================================

console.log("[Server] Configurando rotas públicas...");

// Autenticação
app.use("/api/v1/auth", authRoutes);

// Monitoramento de Status (Público)
app.use("/api/v1/status", instabilidadeRoutes);

// =========================================================
// 2. ROTAS PROTEGIDAS (Com autenticação JWT)
// =========================================================

console.log("[Server] Configurando rotas protegidas...");

// Dashboard
app.use("/api/v1/dashboard", verifyToken, dashboardRoutes);

// Financeiro
app.use("/api/v1/financeiro", verifyToken, financeiroRoutes);

// SpeedTest
app.use("/api/v1/speedtest", verifyToken, speedtestRoute);

// Chatbot
app.use("/api/v1/chatbot", verifyToken, chatbotRoutes);

// =========================================================
// TRATAMENTO DE ERROS GLOBAL
// =========================================================

// 404 - Rota não encontrada
app.use((req, res) => {
  res.status(404).json({
    error: "Rota não encontrada",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Erro global
app.use((err, req, res, next) => {
  console.error("[Error Handler] Erro capturado:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || "Erro interno do servidor";

  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
    path: req.path,
  });
});

// =========================================================
// INICIAÇÃO DO SERVIDOR
// =========================================================

const server = app.listen(PORT, () => {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                   🚀 FIBERNET BACKEND                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`✅ Servidor rodando na porta: ${PORT}`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 CORS permitido de: ${allowedOrigins.join(", ")}`);
  console.log("");
  console.log("📊 Serviços ativados:");
  console.log("  ✓ Autenticação (IXC)");
  console.log("  ✓ Dashboard");
  console.log("  ✓ Financeiro");
  console.log("  ✓ SpeedTest");
  console.log("  ✓ Chatbot com IA");
  console.log("  ✓ Monitoramento (DownDetector)");
  console.log("");

  // =========================================================
  // INICIAR SCHEDULER DE MONITORAMENTO
  // =========================================================

  try {
    const schedulerInterval = process.env.SCHEDULER_INTERVAL || "*/5 * * * *";
    console.log("[Scheduler] Iniciando...");
    startScheduler(schedulerInterval);
    console.log(`✅ Scheduler iniciado: ${schedulerInterval}`);
    console.log("");
  } catch (error) {
    console.error("❌ Erro ao iniciar scheduler:", error.message);
  }

  console.log("🎯 API endpoints:");
  console.log("");
  console.log("  📱 PÚBLICAS:");
  console.log("    GET  /health");
  console.log("    GET  /health/detailed");
  console.log("    POST /api/v1/auth/login");
  console.log("    GET  /api/v1/status");
  console.log("    GET  /api/v1/status/:slug");
  console.log("");
  console.log("  🔒 PROTEGIDAS (requer JWT):");
  console.log("    GET  /api/v1/dashboard/dados");
  console.log("    POST /api/v1/dashboard/desbloqueio");
  console.log("    GET  /api/v1/financeiro/faturas");
  console.log("    GET  /api/v1/financeiro/boleto/:id");
  console.log("    POST /api/v1/speedtest/record");
  console.log("    GET  /api/v1/speedtest/history");
  console.log("    GET  /api/v1/speedtest/stats");
  console.log("    GET  /api/v1/speedtest/compare");
  console.log("    POST /api/v1/chatbot/processar");
  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
});

// =========================================================
// TRATAMENTO DE SINAIS DE ENCERRAMENTO
// =========================================================

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\n[Server] SIGTERM recebido, encerrando...");
  stopScheduler();
  server.close(() => {
    console.log("✅ Servidor encerrado com sucesso");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\n[Server] SIGINT recebido, encerrando...");
  stopScheduler();
  server.close(() => {
    console.log("✅ Servidor encerrado com sucesso");
    process.exit(0);
  });
});

// Tratamento de exceções não capturadas
process.on("uncaughtException", (error) => {
  console.error("[Fatal] Exceção não capturada:", error);
  stopScheduler();
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Fatal] Promise rejeitada não tratada:", reason);
  stopScheduler();
  process.exit(1);
});

module.exports = app;
