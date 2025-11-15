/**
 * FiberNet Backend API
 * Servidor Express para integração com GenieACS, IXC e Gemini AI
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const GenieACSService = require("./services/genieacs");
const ontRoutes = require("./routes/ont");
const speedTest = require('speedtest-net')

// --- 1. IMPORTAÇÃO DO GEMINI ---
// Adiciona a biblioteca do Google
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- IMPORTAÇÕES IXC E JWT ---
const axios = require("axios");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;

// --- 2. INICIALIZAÇÃO DO GEMINI ---
// Carrega a chave da API a partir das variáveis de ambiente (do Render)
// Certifique-se de adicionar 'GEMINI_API_KEY' no painel do Render.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// --- 3. CONFIGURAÇÃO IXC E JWT ---
// Variáveis de Ambiente (Adicione estas ao Render)
const IXC_API_URL = process.env.IXC_API_URL || "https://centralfiber.online/webservice/v1";
const IXC_ADMIN_TOKEN = process.env.IXC_ADMIN_TOKEN; // O seu "ID:TOKEN" do IXC
const JWT_SECRET = process.env.JWT_SECRET; // Um segredo forte que VOCÊ cria (ex: "meu-segredo-de-32-bits")

// Cliente de API para falar com o IXC
const ixcApi = axios.create({
  baseURL: IXC_API_URL,
  headers: {
    "Content-Type": "application/json",
    // O Token de Admin é o padrão para TODAS as requisições do backend
    "Authorization": `Basic ${Buffer.from(IXC_ADMIN_TOKEN || "").toString("base64")}`
  },
  timeout: 10000,
});

// Função de Helper (para chamadas 'listar')
const ixcPostList = async (endpoint, data) => {
  const config = { headers: { "ixcsoft": "listar" } };
  const response = await ixcApi.post(endpoint, data, config);
  return response.data;
};

// Middleware de segurança
app.use(helmet());

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:8081"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (mobile apps, Postman) ou do Expo Go
      if (!origin || origin.startsWith("exp://")) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: "Too many requests from this IP, please try again later.",
});
// Aplicar o limiter a todas as rotas da API
app.use("/api/", limiter);

// Body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- ROTA DE LOGIN ---
app.post("/api/auth/login", async (req, res, next) => {
  const { login, senha } = req.body;

  if (!login || !senha) {
    return res.status(400).json({ error: "Login e senha são obrigatórios." });
  }

  try {
    // --- PASSO 1: PESQUISAR O CLIENTE (A "Alternativa") ---
    const campoBusca = login.includes("@") 
      ? "cliente.hotsite_email" 
      : "cliente.cnpj_cpf";

    const searchBody = {
      qtype: campoBusca,
      query: login,
      oper: "=",
      page: "1",
      rp: "1",
      sortname: "cliente.id",
      sortorder: "asc",
    };

    const clienteResponse = await ixcPostList("/cliente", searchBody);

    if (clienteResponse.total === 0 || !clienteResponse.registros[0]) {
      return res.status(401).json({ error: "Usuário ou senha inválidos (C1)" });
    }

    const cliente = clienteResponse.registros[0];

    // --- PASSO 2: VALIDAR A SENHA (No Backend!) ---
    if (cliente.senha !== senha) {
      return res.status(401).json({ error: "Usuário ou senha inválidos (C2)" });
    }

    // --- PASSO 3: BUSCAR O CONTRATO (Chamada Adicional) ---
    const contratoBody = {
      qtype: "cliente_contrato.id_cliente",
      query: cliente.id,
      oper: "=",
      page: "1",
      rp: "1",
      sortname: "cliente_contrato.data_ativacao",
      sortorder: "desc",
    };

    const contratoResponse = await ixcPostList("/cliente_contrato", contratoBody);
    if (contratoResponse.total === 0 || !contratoResponse.registros[0]) {
      return res.status(404).json({ error: "Cliente validado, mas nenhum contrato encontrado." });
    }
    const contrato = contratoResponse.registros[0];

    // --- PASSO 4: CRIAR O NOSSO PRÓPRIO TOKEN (JWT) ---
    const userData = {
      id_cliente: cliente.id,
      id_contrato: contrato.id,
      nome_cliente: cliente.razao,
      status_contrato: contrato.status,
    };

    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: "1d" }); // Token válido por 1 dia

    // --- PASSO 5: ENVIAR O TOKEN E OS DADOS PARA O APP ---
    res.json({
      token: token, // O NOSSO token de sessão
      ...userData // Envia os dados do usuário para o app
    });

  } catch (error) {
    next(error);
  }
});

// --- MIDDLEWARE DE VALIDAÇÃO JWT ---
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido." });
  }

  const token = authHeader.split(" ")[1]; // Formato: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Adiciona os dados do usuário à requisição para uso nas rotas
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Token inválido ou expirado." });
  }
};

// Inicializa GenieACS Service
const genieacs = new GenieACSService(
  process.env.GENIEACS_URL || "http://localhost:7557",
  process.env.GENIEACS_USER,
  process.env.GENIEACS_PASSWORD
);

// Disponibiliza GenieACS para as rotas
app.set("genieacs", genieacs);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Rotas da API (Existentes)
app.use("/api/ont", ontRoutes);

// --- ENDPOINTS PROXY IXC (Protegidos por JWT) ---
// GET /api/invoices - Busca faturas do cliente autenticado
app.get("/api/invoices", authenticateJWT, async (req, res, next) => {
  try {
    const { id_cliente } = req.user;

    const requestBody = {
      qtype: "fn_areceber.id_cliente",
      query: id_cliente,
      oper: "=",
      page: "1",
      rp: "50",
      sortname: "fn_areceber.data_vencimento",
      sortorder: "desc",
    };

    const response = await ixcPostList("/fn_areceber", requestBody);

    if (response.total > 0) {
      return res.json({ invoices: response.registros });
    }

    return res.json({ invoices: [] });

  } catch (error) {
    next(error);
  }
});

// GET /api/boleto/:id - Busca boleto em base64
app.get("/api/boleto/:id", authenticateJWT, async (req, res, next) => {
  try {
    const { id } = req.params;

    const requestBody = {
      boletos: id,
      atualiza_boleto: "S",
      tipo_boleto: "arquivo",
      base64: "S"
    };

    const response = await ixcApi.post("/get_boleto", requestBody);

    if (response.data.file) {
      return res.json({ file: response.data.file });
    }

    return res.status(404).json({ error: "Boleto não encontrado." });

  } catch (error) {
    next(error);
  }
});

// --- 3. NOVA ROTA DO FIBERBOT (GEMINI) ---
// Esta é a rota que o seu app irá chamar
app.post("/api/bot", async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Chave da API do Gemini não configurada no servidor.");
    }

    // Pega o prompt do sistema do seu guia
    const systemPrompt = `
      Você é o FiberBot, assistente da FiberNet.
      PERSONALIDADE:
      - Sempre questionador e curioso
      - Aprende hábitos do cliente
      - Proativo em diagnosticar problemas
      REGRAS DE DIAGNÓSTICO:
      1. IPTV/Streaming travando:
         - SEMPRE pergunte qual serviço específico
         - Verifique o sinal óptico
         - Se sinal bom (> -25 dBm), pode ser problema do serviço
         - Sugira verificar no DownDetector
      2. Internet lenta:
         - Pergunte qual dispositivo
         - Sugira teste de velocidade
    `;

    // Inicializa o modelo Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Constrói o histórico para o Gemini
    const chatHistory = history.map((msg) => ({
      role: msg.role === "user" ? "user" : "model", // Garante os papéis corretos
      parts: [{ text: msg.content }],
    }));

    // Inicia o chat com o histórico e o prompt do sistema
    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: systemPrompt,
    });

    // Envia a nova mensagem do usuário para o Gemini
    const result = await chat.sendMessage(message);
    const response = result.response;
    const text = response.text();

    // Devolve a resposta do Gemini para o aplicativo
    res.json({ reply: text });
  } catch (error) {
    // Passa o erro para o handler de erro global
    next(error);
  }
});

// 404 handler (Sempre por último, antes do Error handler)
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Error handler (Seu handler existente)
app.use((err, req, res, next) => {
  console.error("Error:", err);

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  🚀 FiberNet Backend API                                   ║
║                                                            ║
║  Server running on: http://localhost:${PORT}                 ║
║  Environment: ${process.env.NODE_ENV || "development"}                     ║
║  GenieACS URL: ${process.env.GENIEACS_URL || "http://localhost:7557"}   ║
║  FiberBot (Gemini): ${
    process.env.GEMINI_API_KEY ? "Ativo" : "Inativo (Sem Chave)"
  }        ║
║  Speedtest: Ativo em /api/speedtest                       ║
║  IXC API URL: ${IXC_API_URL}                    ║
║  IXC Token: ${IXC_ADMIN_TOKEN ? "Carregado" : "NÃO CONFIGURADO!"}              ║
║  JWT Secret: ${JWT_SECRET ? "Carregado" : "NÃO CONFIGURADO!"}               ║
║                                                            ║
║  Ready to manage ONTs! 📡                                  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
