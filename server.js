// app.js (Arquivo Corrigido)
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const net = require("net");

const GenieACSService = require("./services/genieacs");
const speedtestRoute = require("./routes/speedtest");
const instabilidadeRoutes = require("./routes/instabilidade");
const ontRoutes = require("./routes/ont");
const authRoutes = require("./routes/auth");
const { startScheduler } = require("./cron/statusScheduler");

const app = express();
const PORT = process.env.PORT || 3000;

const genieacs = new GenieACSService(
  process.env.GENIEACS_URL,
  process.env.GENIEACS_USER,
  process.env.GENIEACS_PASSWORD
);

app.set("genieacs", genieacs);
app.set("trust proxy", 1);

app.use(cors({ origin: "*" }));

// ... (Restante do código de middlewares e whoami) ...

app.get("/health", (req, res) =>
  res.json({ status: "online", uptime: process.uptime() })
);

app.use("/api/v1/status", instabilidadeRoutes);
app.use("/api/v1/faturas", authenticate, faturasRoutes);
app.use("/api/v1/ont", authenticate, ontRoutes);
app.use("/api/v1/speedtest", speedtestRoute); // <-- Montagem Corrigida
app.use("/api/v1/auth", authRoutes);

app.use((req, res) => res.status(404).json({ error: "Rota não encontrada." }));

app.listen(PORT, () => {
  console.log(`🚀 Backend FiberNet rodando na porta ${PORT}`);
  startScheduler();
});
