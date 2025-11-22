// app.js (Arquivo que você forneceu - Versão ATUALIZADA)
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const net = require("net");

const GenieACSService = require("./services/genieacs");
const speedtestRoute = require("./routes/speedtest");
const instabilidadeRoutes = require("./routes/instabilidade");
const ontRoutes = require("./routes/ont");
const authRoutes = require("./routes/auth"); // <-- NOVO: Importação das rotas de Autenticação

const app = express();
const PORT = process.env.PORT || 3000;

// ... (Restante das configurações e GenieACS) ...

app.use(cors({ origin: "*" }));

// Aumentei o limite global de JSON para receber dados do login
app.use(express.json({ limit: "700mb" }));
app.use(express.static("public"));

// Configuração Específica para Speedtest (mantido)
app.use(
  "/api/speedtest",
  express.raw({ limit: "700mb", type: "application/octet-stream" }),
  express.urlencoded({ extended: true, limit: "700mb" })
);

// ... (Configuração do Rate Limiter) ...

app.use("/api/", limiter);

// --- ROTA DE IDENTIFICAÇÃO DO CLIENTE (IPV4/IPV6) ---
// ... (código da rota /api/whoami) ...

app.get("/health", (req, res) =>
  res.json({ status: "online", uptime: process.uptime() })
);

// Rotas existentes
app.use("/api/status", instabilidadeRoutes);
app.use("/api/ont", ontRoutes);
app.use("/api/speedtest", speedtestRoute);

// --- NOVO: ROTA DE AUTENTICAÇÃO IXC ---
app.use("/api/auth", authRoutes); // <-- NOVO: Monta as rotas de Autenticação

app.use((req, res) => res.status(404).json({ error: "Rota não encontrada." }));

app.listen(PORT, () => {
  console.log(`🚀 Backend FiberNet rodando na porta ${PORT}`);
});
