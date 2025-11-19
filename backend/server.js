/*
 * FiberNet Backend API - Lint Fixed & Optimized
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet"); // Agora usado
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const cheerio = require("cheerio"); // Agora usado no Bot
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Agora usado

// Speedtest Seguro
let speedTest;
try {
  speedTest = require("speedtest-net");
} catch (e) {
  console.warn("Speedtest module missing");
}

const ontRoutes = require("./routes/ont");
const GenieACSService = require("./services/genieacs");

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURAÇÃO ---
app.set("trust proxy", 1);
app.use(cors({ origin: "*" }));
app.use(helmet()); // Ativando segurança básica
app.use(bodyParser.json());

// Rate Limiter
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use("/api/", limiter);

// Variáveis
const IXC_API_URL =
  process.env.IXC_API_URL || "https://centralfiber.online/webservice/v1";
const IXC_ADMIN_TOKEN = process.env.IXC_ADMIN_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || "secret_dev";
const GENIEACS_URL = process.env.GENIEACS_URL || "http://localhost:7557";
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Agora usado

// Inicializa IA (Correção do erro 'genAI is not defined')
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// Cliente IXC com Buffer explícito
const ixcApi = axios.create({
  baseURL: IXC_API_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Basic ${Buffer.from(IXC_ADMIN_TOKEN || "").toString(
      "base64"
    )}`,
  },
  timeout: 15000,
});

const ixcPostList = async (endpoint, data) => {
  try {
    const config = { headers: { ixcsoft: "listar" } };
    const response = await ixcApi.post(endpoint, data, config);
    return response.data;
  } catch (error) {
    console.error(`Erro IXC [${endpoint}]:`, error.message);
    return { total: 0, registros: [] };
  }
};

const genieacs = new GenieACSService(
  GENIEACS_URL,
  process.env.GENIEACS_USER,
  process.env.GENIEACS_PASSWORD
);
app.set("genieacs", genieacs);

// --- ROTAS ---

app.get("/health", (req, res) => res.json({ status: "ok" }));

// 1. LOGIN
app.post("/api/auth/login-cpf", async (req, res) => {
  const { cpf } = req.body;
  if (!cpf) return res.status(400).json({ error: "CPF obrigatório" });

  try {
    const cpfLimpo = cpf.replace(/\D/g, "");
    let searchBody = {
      qtype: "cliente.cnpj_cpf",
      query: cpfLimpo,
      oper: "=",
      page: "1",
      rp: "1",
      sortname: "cliente.id",
      sortorder: "desc",
    };

    let clienteRes = await ixcPostList("/cliente", searchBody);

    if (clienteRes.total === 0 || !clienteRes.registros[0]) {
      return res.status(404).json({ error: "CPF não encontrado." });
    }

    const cliente = clienteRes.registros[0];
    const contratoBody = {
      qtype: "cliente_contrato.id_cliente",
      query: cliente.id,
      oper: "=",
      page: "1",
      rp: "1",
      sortname: "cliente_contrato.data_ativacao",
      sortorder: "desc",
    };
    const contratoRes = await ixcPostList("/cliente_contrato", contratoBody);
    const contrato = contratoRes.registros[0] || {
      id: "0",
      status: "Sem Contrato",
    };

    const userData = {
      id_cliente: cliente.id,
      id_contrato: contrato.id,
      nome_cliente: cliente.razao,
      email: cliente.hotsite_email,
    };
    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: "30d" });

    res.json({ token, user: userData });
  } catch (error) {
    res.status(500).json({ error: "Erro interno." });
  }
});

// 2. SPEEDTEST
app.get("/api/speedtest", async (req, res) => {
  if (!speedTest)
    return res.status(503).json({ error: "Speedtest indisponível" });
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

// 3. CHATBOT (Gemini + DownDetector) - Correção de uso do genAI e cheerio
app.post("/api/bot", async (req, res) => {
  try {
    const { message, history } = req.body;
    let contextInfo = "";

    const servicos = ["discord", "netflix", "youtube", "instagram", "facebook"];
    const alvo = servicos.find((s) => message.toLowerCase().includes(s));

    if (alvo) {
      try {
        const { data } = await axios.get(
          `https://downdetector.com.br/fora-do-ar/${alvo}/`
        );
        const $ = cheerio.load(data); // Cheerio agora é usado
        const status = $(".entry-title").first().text().trim();

        if (status.toLowerCase().includes("problema")) {
          contextInfo = `ALERTA: O DownDetector reporta problemas no ${alvo}.`;
        } else {
          contextInfo = `STATUS: O DownDetector diz que o ${alvo} está normal.`;
        }
      } catch (e) {
        contextInfo = `Não foi possível verificar o ${alvo}.`;
      }
    }

    // Uso correto do genAI (que agora está definido)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const chat = model.startChat({
      history:
        history?.map((h) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }],
        })) || [],
    });

    const prompt = `Você é o suporte da FiberNet. Contexto técnico: ${contextInfo}. Responda de forma breve.`;
    const result = await chat.sendMessage(prompt + " " + message);

    res.json({ reply: result.response.text() });
  } catch (error) {
    console.error("Erro Bot:", error);
    res.json({ reply: "Desculpe, estou indisponível no momento." });
  }
});

// 4. ROTAS PROTEGIDAS
const checkAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token necessário" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: "Token inválido" });
  }
};

app.use("/api/ont", checkAuth, ontRoutes);

// Notícias
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

app.use((req, res) => res.status(404).json({ error: "Rota não encontrada" }));

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
