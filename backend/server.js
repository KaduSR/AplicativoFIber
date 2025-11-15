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
const speedTest = require("speedtest-net");

// --- 1. IMPORTAÇÃO DO GEMINI ---
// Adiciona a biblioteca do Google
const { GoogleGenerativeAI } = require("@google/generative-ai");

    // --- ADICIONE ESTAS LINHAS ---
    const axios = require('axios');
    const jwt = require('jsonwebtoken');
    const base64 = require('react-native-base64');
    const cheerio = require('cheerio'); // Para o DownDetector
    // --- FIM DAS ADIÇÕES ---

const app = express();
const PORT = process.env.PORT || 3000;
app.set("trust proxy", 1);

// --- 2. INICIALIZAÇÃO DO GEMINI ---
// Carrega a chave da API a partir das variáveis de ambiente (do Render)
// Certifique-se de adicionar 'GEMINI_API_KEY' no painel do Render.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// (Adicione IXC_API_URL, IXC_ADMIN_TOKEN, JWT_SECRET, NEWS_API_KEY)
    const IXC_API_URL = process.env.IXC_API_URL || 'https://centralfiber.online/webservice/v1';
    const IXC_ADMIN_TOKEN = process.env.IXC_ADMIN_TOKEN; 
    const JWT_SECRET = process.env.JWT_SECRET;
    const NEWS_API_KEY = process.env.NEWS_API_KEY; // <-- ADICIONE (Obtenha em gnews.io)

// Cliente de API para falar com o IXC
const ixcApi = axios.create({
  baseURL: IXC_API_URL,
  headers: {
    "Content-Type": "application/json",
    // O Token de Admin é o padrão para TODAS as requisições do backend
    Authorization: `Basic ${Buffer.from(IXC_ADMIN_TOKEN || "").toString(
      "base64"
    )}`,
  },
  timeout: 10000,
});

// Função de Helper (para chamadas 'listar')
const ixcPostList = async (endpoint, data) => {
  const config = { headers: { ixcsoft: "listar" } };
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

    const contratoResponse = await ixcPostList(
      "/cliente_contrato",
      contratoBody
    );
    if (contratoResponse.total === 0 || !contratoResponse.registros[0]) {
      return res
        .status(404)
        .json({ error: "Cliente validado, mas nenhum contrato encontrado." });
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
      ...userData, // Envia os dados do usuário para o app
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
      base64: "S",
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

// --- SUBSTITUA A ROTA /api/bot ---
    app.post('/api/bot', async (req, res, next) => {
      try {
        const { message, history, id_cliente } = req.body;
        if (!process.env.GEMINI_API_KEY) throw new Error('Chave Gemini não configurada.');

        // --- LÓGICA DO DOWNDETECTOR ---
        let downDetectorInfo = "";
        // Verifica se a mensagem menciona um serviço (ex: Discord, Netflix, etc.)
        const servicos = ['discord', 'netflix', 'youtube', 'iptv', 'instagram', 'facebook', 'whatsapp'];
        const servicoMencionado = servicos.find(s => message.toLowerCase().includes(s));

        if (servicoMencionado) {
          console.log(`[Bot] Verificando DownDetector para: ${servicoMencionado}`);
          try {
            // Alternativa: Raspagem do site (Scraping)
            const { data } = await axios.get(`https://downdetector.com.br/fora-do-ar/${servicoMencionado}/`);
            const $ = cheerio.load(data);
            const status = $('.entry-title').first().text().trim();
            if (status) {
              downDetectorInfo = `Informação do DownDetector para ${servicoMencionado}: ${status}.`;
            }
          } catch (scrapeError) {
            console.error("[Bot] Falha ao raspar DownDetector:", scrapeError.message);
            downDetectorInfo = `Não consegui verificar o status do ${servicoMencionado} no DownDetector.`;
          }
        }
        // --- FIM DA LÓGICA DOWNDETECTOR ---

        // (Simulação de contexto do cliente - substitua por chamadas reais ao IXC/Genie)
        const userContext = {
          nome: "Carlos",
          plano: "Fiber Game 500MB",
          sinal_optico: "-19.2 dBm" 
        };

        const systemPrompt = `
    [Persona]
    Aja como o 'FiberBot', um assistente técnico especialista da FiberNet.

    [Contexto do Cliente]
    - Nome: ${userContext.nome}
    - Plano: ${userContext.plano}
    - Sinal Óptico (ONT): ${userContext.sinal_optico}

    [Contexto Externo]
    - ${downDetectorInfo || "Nenhuma informação externa solicitada."}

    [Tarefa]
    Diagnostique o problema do cliente com base no contexto.

    [Instruções]
    - A regra mais importante: O sinal óptico ideal é acima de -25 dBm. O sinal do cliente é ${userContext.sinal_optico}.
    - Se o sinal óptico estiver bom (ex: -19 dBm), o problema NÃO é o sinal físico.
    - Se o sinal estiver bom E o DownDetector reportar problemas (como o 'downDetectorInfo' mostra), informe ao cliente que o problema é externo.
    - Se a mensagem for sobre IPTV/Streaming (Netflix, YouTube, Discord) E o sinal óptico estiver bom, SEMPRE use o contexto do DownDetector.
    `;

        // (O resto da chamada ao Gemini continua igual)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const chatHistory = history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        }));
        const chat = model.startChat({ history: chatHistory, systemInstruction: systemPrompt });
        const result = await chat.sendMessage(message);
        const text = result.response.text();
        res.json({ reply: text });

      } catch (error) {
        next(error);
      }
    });
    // --- FIM DA SUBSTITUIÇÃO ---

// --- ROTA DE NOTÍCIAS (ITEM 4) ---
    app.get('/api/news', async (req, res, next) => {
      if (!NEWS_API_KEY) {
        return next(new Error("API de Notícias não configurada no servidor."));
      }
      try {
        // Tópicos: IPTV, Jogos, Tecnologia, Fibra Óptica, Séries e Filmes
        const query = "IPTV OR gaming OR technology OR 'fibra óptica' OR series OR movies";
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=pt&apikey=${NEWS_API_KEY}`;
        
        const { data } = await axios.get(url);
        res.json(data.articles || []);
      
      } catch (error) {
        console.error("Erro ao buscar notícias:", error.message);
        next(error);
      }
    });

    // --- ROTAS PROTEGIDAS (Precisam de JWT) ---
    // Middleware para verificar o nosso Token JWT
    const checkAuth = (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido.' });
      }
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Adiciona os dados do user (id_cliente, etc.) ao 'req'
        next();
      } catch (error) {
        return res.status(401).json({ error: 'Token inválido.' });
      }
    };

    // --- ROTA DE FATURAS (ITEM 2) ---
    app.get('/api/invoices', checkAuth, async (req, res, next) => {
      try {
        const requestBody = {
          qtype: 'fn_areceber.id_cliente',
          query: req.user.id_cliente, // Pega o ID do cliente (do JWT)
          oper: '=',
          page: '1', rp: '50',
          sortname: 'fn_areceber.data_vencimento', sortorder: 'desc',
        };
        const data = await ixcPostList('/fn_areceber', requestBody);
        res.json(data.registros || []);
      } catch (error) { next(error); }
    });

    // --- ROTA DE CONTRATOS (ITEM 2) ---
    app.get('/api/contracts', checkAuth, async (req, res, next) => {
      try {
        const requestBody = {
          qtype: 'cliente_contrato.id_cliente',
          query: req.user.id_cliente, // Pega o ID do cliente (do JWT)
          oper: '=',
          page: '1', rp: '10',
          sortname: 'cliente_contrato.id', sortorder: 'desc',
        };
        const data = await ixcPostList('/cliente_contrato', requestBody);
        res.json(data.registros || []);
      } catch (error) { next(error); }
    });

    // --- ROTA DE BOLETO (ITEM 2) ---
    app.get('/api/boleto/:id', checkAuth, async (req, res, next) => {
       try {
        const requestBody = {
          boletos: req.params.id, // Pega o ID da fatura (da URL)
          atualiza_boleto: 'S',
          tipo_boleto: 'arquivo',
          base64: 'S'
        };
        // '/get_boleto' não é 'listar', então usamos o 'ixcApi.post' normal
        const data = await ixcApi.post('/get_boleto', requestBody);
        res.json(data); // Retorna o JSON com o { file: "base64..." }
      } catch (error) { next(error); }
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
║  IXC Token: ${
    IXC_ADMIN_TOKEN ? "Carregado" : "NÃO CONFIGURADO!"
  }              ║
║  JWT Secret: ${JWT_SECRET ? "Carregado" : "NÃO CONFIGURADO!"}               ║
║                                                            ║
║  Ready to manage ONTs! 📡                                  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
