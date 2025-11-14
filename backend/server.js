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

// --- 1. IMPORTAÇÃO DO GEMINI ---
// Adiciona a biblioteca do Google
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

// --- 2. INICIALIZAÇÃO DO GEMINI ---
// Carrega a chave da API a partir das variáveis de ambiente (do Render)
// Certifique-se de adicionar 'GEMINI_API_KEY' no painel do Render.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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
║                                                            ║
║  Ready to manage ONTs! 📡                                  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
