/*
 * FiberNet Backend API - V6 (Correção Base64 Definitiva)
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
// REMOVIDO: const base64 = require('react-native-base64'); <--- O CULPADO
const axios = require("axios");
const cheerio = require("cheerio");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Speedtest Seguro
let speedTest;
try {
  speedTest = require("speedtest-net");
} catch (e) {}

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURAÇÃO ---
app.set("trust proxy", 1);
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

// Variáveis
const IXC_API_URL =
  process.env.IXC_API_URL || "https://centralfiber.online/webservice/v1";
const IXC_ADMIN_TOKEN = process.env.IXC_ADMIN_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || "secret_dev";
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- CLIENTE IXC (CORRIGIDO) ---
// Usamos Buffer (Nativo do Node.js) em vez de bibliotecas externas
const tokenBase64 = Buffer.from(IXC_ADMIN_TOKEN || "").toString("base64");

const ixcApi = axios.create({
  baseURL: IXC_API_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Basic ${tokenBase64}`, // <--- CORREÇÃO AQUI
  },
  timeout: 15000,
});

// Helper de Pesquisa IXC
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

// --- ROTAS (O resto do código permanece igual) ---

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Login CPF
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

// Speedtest
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

// Chatbot
app.post("/api/bot", async (req, res) => {
  try {
    const { message } = req.body;
    // ... (Lógica simplificada para teste)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(message);
    res.json({ reply: result.response.text() });
  } catch (e) {
    res.json({ reply: "Erro no bot." });
  }
});

app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
