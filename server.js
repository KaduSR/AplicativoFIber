require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

// --- 1. IMPORTAÇÃO DAS ROTAS ---
const instabilidadeRoutes = require("/routes/instabilidade");
// const botRoutes = require("./routes/bot");           <-- COMENTADO: Ainda não criado
// const speedtestRoutes = require("./routes/speedtest"); <-- COMENTADO: Ainda não criado
// const ontRoutes = require("./routes/ont");           <-- COMENTADO: Ainda não criado

// --- 2. INICIALIZAÇÃO DO APP ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- 3. MIDDLEWARES ---
app.set("trust proxy", 1);
app.use(cors({ origin: "*" }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "Muitas requisições." },
});
app.use("/api/", limiter);

// --- 4. DEFINIÇÃO DAS ROTAS ---
app.get("/health", (req, res) => res.json({ status: "online" }));

// Apenas a rota de instabilidade está ativa
app.use("/api/status", instabilidadeRoutes);

// app.use("/api/bot", botRoutes);             <-- Desativado
// app.use("/api/speedtest", speedtestRoutes); <-- Desativado
// app.use("/api/ont", ontRoutes);             <-- Desativado

app.use((req, res) => res.status(404).json({ error: "Rota não encontrada." }));

// --- 5. START ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`✅ Módulo DownDetector carregado com sucesso.`);
});
