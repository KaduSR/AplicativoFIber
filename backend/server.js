/*
 * FiberNet Backend API - Final Fixed (Order Corrected)
 */
require("dotenv").config();
const { Buffer } = require("node:buffer"); // Correção Buffer
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const cheerio = require("cheerio");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Serviços
const ixcService = require("./services/ixc");
const GenieACSService = require("./services/genieacs");
const ontRoutes = require("./routes/ont"); // Importando rotas ONT

// Speedtest Seguro
let speedTest;
try {
  speedTest = require("speedtest-net");
} catch (e) {
  console.warn("Speedtest missing");
}

// --- 1. INICIALIZAÇÃO ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- 2. CONFIGURAÇÃO ---
app.set("trust proxy", 1);
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
app.use(helmet());

// Rate Limiter
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use("/api/", limiter);

// Variáveis
const JWT_SECRET = process.env.JWT_SECRET || "secret_dev";
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GENIEACS_URL = process.env.GENIEACS_URL || "http://localhost:7557";

// Inicializa Serviços Externos
const genieacs = new GenieACSService(
  GENIEACS_URL,
  process.env.GENIEACS_USER,
  process.env.GENIEACS_PASSWORD
);
app.set("genieacs", genieacs);

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// ==========================================
// MIDDLEWARE DE AUTENTICAÇÃO (DEFINIDO ANTES DO USO)
// ==========================================
const checkAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token necessário" });
  }
  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: "Token inválido" });
  }
};

// ==========================================
// ROTAS PÚBLICAS
// ==========================================

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Login Padrão (Senha)
app.post("/api/auth/login", async (req, res, next) => {
  const { login, senha } = req.body;
  if (!login || !senha)
    return res.status(400).json({ error: "Dados incompletos." });

  try {
    const cliente = await ixcService.findClienteByLogin(login);
    if (!cliente)
      return res.status(401).json({ error: "Usuário não encontrado." });

    if (String(cliente.senha) !== String(senha)) {
      return res.status(401).json({ error: "Senha incorreta." });
    }

    const contrato = await ixcService.findContratoByClienteId(cliente.id);
    const statusContrato = contrato ? contrato.status : "Sem Contrato";
    const idContrato = contrato ? contrato.id : "0";

    const userData = {
      id_cliente: cliente.id,
      id_contrato: idContrato,
      nome_cliente: cliente.razao,
      email: cliente.hotsite_email,
      status_contrato: statusContrato,
    };

    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: userData });
  } catch (error) {
    next(error);
  }
});

// Login CPF (Acesso Rápido)
app.post("/api/auth/login-cpf", async (req, res, next) => {
  const { cpf } = req.body;
  if (!cpf) return res.status(400).json({ error: "CPF obrigatório." });

  try {
    const cliente = await ixcService.findClienteByLogin(cpf);
    if (!cliente) return res.status(404).json({ error: "CPF não encontrado." });

    if (cliente.ativo === "N")
      return res.status(403).json({ error: "Cadastro inativo." });

    const contrato = await ixcService.findContratoByClienteId(cliente.id);
    const statusContrato = contrato ? contrato.status : "Sem Contrato";
    const idContrato = contrato ? contrato.id : "0";

    const userData = {
      id_cliente: cliente.id,
      id_contrato: idContrato,
      nome_cliente: cliente.razao,
      email: cliente.hotsite_email,
      status_contrato: statusContrato,
    };

    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: userData });
  } catch (error) {
    next(error);
  }
});

// Speedtest
app.get("/api/speedtest", async (req, res) => {
  if (!speedTest) return res.status(503).json({ error: "Indisponível" });
  try {
    const result = await speedTest({ acceptLicense: true, acceptGdpr: true });
    res.json({
      download: (result.download.bandwidth / 125000).toFixed(2),
      upload: (result.upload.bandwidth / 125000).toFixed(2),
      ping: result.ping.latency.toFixed(0),
    });
  } catch (e) {
    res.status(500).json({ error: "Falha no teste" });
  }
});

// Bot (Gemini + DownDetector)
app.post("/api/bot", async (req, res) => {
  try {
    const { message } = req.body;
    let contextInfo = "";
    const apps = [
      "discord",
      "netflix",
      "youtube",
      "instagram",
      "facebook",
      "whatsapp",
    ];
    const appDetectado = apps.find((s) => message.toLowerCase().includes(s));

    if (appDetectado) {
      try {
        const { data } = await axios.get(
          `https://downdetector.com.br/fora-do-ar/${appDetectado}/`
        );
        const $ = cheerio.load(data);
        const status = $(".entry-title").first().text().trim();
        if (status.toLowerCase().includes("problema")) {
          contextInfo = `ALERTA: DownDetector reporta falhas no ${appDetectado}.`;
        } else {
          contextInfo = `STATUS: DownDetector diz que ${appDetectado} está normal.`;
        }
      } catch (e) {
        /* Ignora erro de scraping */
      }
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(
      `Você é o suporte da FiberNet. ${contextInfo} ${message}`
    );
    res.json({ reply: result.response.text() });
  } catch (e) {
    res.json({ reply: "Erro no bot." });
  }
});

// News
app.get("/api/news", async (req, res) => {
  if (!NEWS_API_KEY) return res.json([]);
  try {
    const { data } = await axios.get(
      `https://gnews.io/api/v4/search?q=tecnologia&lang=pt&apikey=${NEWS_API_KEY}`
    );
    res.json(data.articles || []);
  } catch (e) {
    res.json([]);
  }
});

// ==========================================
// ROTAS PROTEGIDAS (Usam checkAuth)
// ==========================================

app.get("/api/invoices", checkAuth, async (req, res, next) => {
  try {
    const faturas = await ixcService.getFaturas(req.user.id_cliente);

    // Formatação para o Frontend
    const faturasFormatadas = faturas.map((f) => ({
      id: f.id,
      valor: f.valor,
      vencimento: f.data_vencimento,
      status: f.status,
      linha_digitavel: f.linha_digitavel,
    }));

    res.json(faturasFormatadas);
  } catch (e) {
    next(e);
  }
});

app.get("/api/boleto/:id", checkAuth, async (req, res, next) => {
  try {
    const dadosBoleto = await ixcService.getBoleto(req.params.id);
    res.json(dadosBoleto);
  } catch (e) {
    next(e);
  }
});

// Rotas da ONT (GenieACS) - Usam o arquivo routes/ont.js
// Precisamos passar o checkAuth para dentro do router ou usar aqui
app.use("/api/ont", checkAuth, ontRoutes);

// --- ERROR HANDLING ---
app.use((req, res) => res.status(404).json({ error: "Rota não encontrada" }));
app.use((err, req, res, next) => {
  console.error("Erro Servidor:", err.message);
  res.status(500).json({ error: "Erro interno" });
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
