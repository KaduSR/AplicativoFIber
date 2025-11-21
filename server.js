require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const net = require("net"); // Importação do módulo nativo para validação de IP

const GenieACSService = require("./services/genieacs");
const speedtestRoute = require("./routes/speedtest");
const instabilidadeRoutes = require("./routes/instabilidade");
const ontRoutes = require("./routes/ont");

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

// Aumentei o limite global de JSON
app.use(express.json({ limit: "700mb" }));
app.use(express.static("public"));

// Configuração Específica para Speedtest (700MB conforme seu ajuste)
app.use(
  "/api/speedtest",
  express.raw({ limit: "700mb", type: "application/octet-stream" }),
  express.urlencoded({ extended: true, limit: "700mb" })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "Muitas requisições. Tente novamente mais tarde." },
});

app.use("/api/", limiter);

// --- ROTA DE IDENTIFICAÇÃO DO CLIENTE (IPV4/IPV6) ---
app.get("/api/whoami", (req, res) => {
  // 1. Captura o IP considerando Proxy do Render
  let rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  // Pega o primeiro IP se houver uma lista (x-forwarded-for: client, proxy1...)
  if (rawIp && rawIp.includes(",")) {
    rawIp = rawIp.split(",")[0].trim();
  }

  // 2. Limpeza do prefixo IPv6-mapped-IPv4 (::ffff:)
  let cleanIp = rawIp;
  if (cleanIp && cleanIp.startsWith("::ffff:")) {
    cleanIp = cleanIp.replace("::ffff:", "");
  }

  // 3. Classificação Técnica (IPv4 ou IPv6)
  let ipv4 = null;
  let ipv6 = null;
  let connectionType = "Desconhecido";

  if (net.isIPv6(cleanIp)) {
    ipv6 = cleanIp;
    connectionType = "IPv6";
  } else if (net.isIPv4(cleanIp)) {
    ipv4 = cleanIp;
    connectionType = "IPv4";
  }

  // 4. Identificação do Provedor
  let provider = "Provedor Desconhecido";

  // Lógica para reconhecer a Fiber Net (tanto v4 quanto v6)
  if (
    (ipv4 && ipv4.startsWith("45.181")) ||
    (ipv6 && ipv6.startsWith("2804:60fc"))
  ) {
    provider = "Telecom Fiber Net Ltda";
  }

  // 5. Captura de User Agent (Navegador/Sistema)
  const userAgent = req.headers["user-agent"] || "Desconhecido";

  res.json({
    provider: provider,
    connectionType: connectionType,
    ipv4: ipv4 || "Não detectado nesta conexão",
    ipv6: ipv6 || "Não detectado nesta conexão",
    asn: "269204", // ASN Fixo da Fiber Net
    userAgent: userAgent,
  });
});

app.get("/health", (req, res) =>
  res.json({ status: "online", uptime: process.uptime() })
);

app.use("/api/status", instabilidadeRoutes);
app.use("/api/ont", ontRoutes);
app.use("/api/speedtest", speedtestRoute);

app.use((req, res) => res.status(404).json({ error: "Rota não encontrada." }));

app.listen(PORT, () => {
  console.log(`🚀 Backend FiberNet rodando na porta ${PORT}`);
});
