/*
 * server.js - Backend FiberNet Integrado
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

// --- IMPORTAÇÃO DE SERVIÇOS ---
const GenieACSService = require("./services/genieacs");

// --- IMPORTAÇÃO DAS ROTAS ---
const speedtestRoute = require("./routes/speedtest");
const instabilidadeRoutes = require("./routes/instabilidade");
const ontRoutes = require("./routes/ont");
// const financeiroRoutes = require("./routes/financeiro");

// --- CONFIGURAÇÃO DO APP ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- INICIALIZAÇÃO DE SERVIÇOS ---
const genieacs = new GenieACSService(
  process.env.GENIEACS_URL,
  process.env.GENIEACS_USER,
  process.env.GENIEACS_PASSWORD
);

app.set("genieacs", genieacs);

// --- MIDDLEWARES GERAIS ---
app.set("trust proxy", 1);
app.use(cors({ origin: "*" }));
app.use(express.json()); // Parse JSON para rotas normais

// --- CONFIGURAÇÃO SPEEDTEST (IMPORTANTE) ---
// 1. Serve os arquivos visuais (HTML/JS do velocímetro) na raiz
app.use(express.static("public"));

// 2. Configuração especial para UPLOAD (permite blobs grandes apenas nesta rota)
app.use(
  "/api/speedtest",
  express.raw({ limit: "100mb", type: "application/octet-stream" })
);
app.use(
  "/api/speedtest",
  express.urlencoded({ extended: true, limit: "20mb" })
);

// Rate Limit (Proteção básica)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "Muitas requisições. Tente novamente mais tarde." },
});
app.use("/api/", limiter);

// --- DEFINIÇÃO DAS ROTAS ---
app.get("/health", (req, res) =>
  res.json({ status: "online", uptime: process.uptime() })
);

// Rotas da Aplicação
app.use("/api/status", instabilidadeRoutes);
app.use("/api/ont", ontRoutes);
app.use("/api/speedtest", speedtestRoute); // Conecta a rota de teste

// Handler 404
app.use((req, res) => res.status(404).json({ error: "Rota não encontrada." }));

// --- START ---
app.listen(PORT, () => {
  console.log(`🚀 Backend FiberNet rodando na porta ${PORT}`);
  console.log(`📡 Serviços Ativos: Instabilidade, ONT, SpeedTest`);
});
