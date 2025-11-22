require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");

const GenieACSService = require("./services/genieacs");
const speedtestRoute = require("./routes/speedtest");
const instabilidadeRoutes = require("./routes/instabilidade");
const ontRoutes = require("./routes/ont");
const authRoutes = require("./routes/auth");
const financeiroRoutes = require("./routes/financeiro");
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

app.use(cors({ origin: process.env.ALLOWED_ORIGINS.split(",") || "*" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 900000,
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
});
app.use(limiter);

app.get("/health", (req, res) =>
  res.json({ status: "online", uptime: process.uptime() })
);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/status", instabilidadeRoutes);
app.use("/api/v1/ont", ontRoutes);
app.use("/api/v1/speedtest", speedtestRoute);
app.use("/api/v1/financeiro", financeiroRoutes);

app.use((req, res) => res.status(404).json({ error: "Rota não encontrada." }));

app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
  startScheduler();
});
