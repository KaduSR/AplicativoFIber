// src/server.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");

// Serviços
// O GenieACSService foi removido do seu último envio, mas a declaração app.set foi mantida.
// Vou re-incluir o import para evitar um ReferenceError, assumindo que ele ainda existe.
const GenieACSService = require("./services/genieacs");

// Middleware de Autenticação
const { verifyToken } = require("./middleware/authMiddleware");

// Rotas
const speedtestRoute = require("./routes/speedtest");
const instabilidadeRoutes = require("./routes/instabilidade");
const ontRoutes = require("./routes/ont"); // Incluído de volta
const authRoutes = require("./routes/auth");
const financeiroRoutes = require("./routes/financeiro");
const dashboardRoutes = require("./routes/dashboard");

const app = express();
const PORT = process.env.PORT || 10000;

// =========================================================
// CONFIGURAÇÃO
// =========================================================

// Inicialização e Injeção do GenieACS no Express (app.set)
// Se você não precisar mais do GenieACS, pode remover esta seção
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
// Estas rotas não têm o middleware 'verifyToken' aplicado.
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/status", instabilidadeRoutes);

// =========================================================
// 2. ROTAS PROTEGIDAS (Middleware aplicado individualmente)
// =========================================================

// Agora o middleware 'verifyToken' é aplicado explicitamente a cada rota que precisa de autenticação.
app.use("/api/v1/dashboard", verifyToken, dashboardRoutes);
app.use("/api/v1/ont", verifyToken, ontRoutes);
app.use("/api/v1/financeiro", verifyToken, financeiroRoutes);
app.use("/api/v1/speedtest", verifyToken, speedtestRoute);

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});
