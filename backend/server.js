/*
 * FiberNet Backend API - V5 (Correção CPF & Integração ONT Real)
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const base64 = require("react-native-base64");
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
const GENIEACS_URL = process.env.GENIEACS_URL || "http://191.242.206.234:7557"; // Exemplo
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Cliente IXC
const ixcApi = axios.create({
  baseURL: IXC_API_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Basic ${base64.encode(IXC_ADMIN_TOKEN || "")}`,
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

// Helper Formata CPF
const formatarCPF = (cpf) => {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

// --- ROTAS ---

app.get("/health", (req, res) => res.json({ status: "ok" }));

// 1. LOGIN CPF (Com tentativa Dupla: Limpo vs Formatado)
app.post("/api/auth/login-cpf", async (req, res) => {
  const { cpf } = req.body;
  if (!cpf) return res.status(400).json({ error: "CPF obrigatório" });

  try {
    const cpfLimpo = cpf.replace(/\D/g, "");
    const cpfFormatado = formatarCPF(cpfLimpo);

    console.log(`[Login] Tentando CPF Limpo: ${cpfLimpo}`);

    // TENTATIVA 1: CPF Limpo
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

    // TENTATIVA 2: CPF Formatado (Se a 1 falhar)
    if (clienteRes.total === 0) {
      console.log(`[Login] Falhou. Tentando Formatado: ${cpfFormatado}`);
      searchBody.query = cpfFormatado;
      clienteRes = await ixcPostList("/cliente", searchBody);
    }

    if (clienteRes.total === 0 || !clienteRes.registros[0]) {
      return res.status(404).json({ error: "CPF não encontrado na base." });
    }

    const cliente = clienteRes.registros[0];

    // Busca contrato
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

    // Gera Token
    const userData = {
      id_cliente: cliente.id,
      id_contrato: contrato.id,
      nome_cliente: cliente.razao,
      email: cliente.hotsite_email,
    };
    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: "30d" });

    res.json({ token, user: userData });
  } catch (error) {
    res.status(500).json({ error: "Erro interno no login." });
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

// 3. NOTÍCIAS
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

// Middleware Auth
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

// 4. STATUS DA ONT (IXC -> GenieACS)
app.get("/api/ont/status", checkAuth, async (req, res) => {
  try {
    // Passo A: Achar o Login PPPoE do cliente no IXC
    // Tabela radusuarios liga o id_cliente ou id_contrato ao login PPPoE
    const radBody = {
      qtype: "radusuarios.id_cliente",
      query: req.user.id_cliente,
      oper: "=",
      page: "1",
      rp: "1",
    };
    const radRes = await ixcPostList("/radusuarios", radBody);

    if (radRes.total === 0) {
      return res.json({
        status: "Offline",
        signal: "N/A",
        reason: "Login PPPoE não encontrado",
      });
    }

    const pppoeLogin = radRes.registros[0].login;
    console.log(`[ONT] Buscando ONT para login: ${pppoeLogin}`);

    // Passo B: Buscar no GenieACS pelo PPPoE
    // A query do GenieACS depende de como seus dispositivos estão mapeados.
    // Padrão: Buscar onde o parâmetro de Username do WAN é igual ao login.
    const genieQuery = {
      "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username":
        pppoeLogin,
    };

    // Encode da query para URL do Genie
    const queryStr = encodeURIComponent(JSON.stringify(genieQuery));
    const genieUrl = `${GENIEACS_URL}/devices/?query=${queryStr}&projection=_lastInform,InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username`;

    const deviceRes = await axios.get(genieUrl, { timeout: 5000 });

    if (!deviceRes.data || deviceRes.data.length === 0) {
      return res.json({
        status: "Desconectado",
        signal: "Sem Sinal",
        reason: "ONT não encontrada no ACS",
      });
    }

    const deviceId = deviceRes.data[0]._id;
    const lastInform = deviceRes.data[0]._lastInform;

    // Passo C: Pegar o Sinal (Você precisa ter um Preset/VirtualParam no GenieACS para isso)
    // Tentando pegar parâmetro comum de fibra (RX Power)
    const paramUrl = `${GENIEACS_URL}/devices/${deviceId}/tasks?timeout=3000&connection_request`;

    // Dispara atualização (Refresh)
    await axios.post(paramUrl, {
      name: "refreshObject",
      objectName:
        "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPonInterfaceConfig",
    });

    // (Na prática, o refresh é assíncrono, então aqui retornamos o último valor conhecido ou um status base)
    // Para produção real, você precisaria ler o VirtualParameter criado.

    // Simulando resposta baseada no LastInform
    const isOnline = new Date() - new Date(lastInform) < 5 * 60 * 1000; // 5 minutos

    res.json({
      status: isOnline ? "Online" : "Offline",
      signal: isOnline ? "-19.5 dBm" : "Sem Sinal", // Placeholder até configurar VirtualParam
      last_seen: lastInform,
    });
  } catch (error) {
    console.error("Erro ONT:", error.message);
    res.json({ status: "Erro", signal: "N/A" });
  }
});

// Outras rotas protegidas
app.get("/api/invoices", checkAuth, async (req, res) => {
  try {
    const body = {
      qtype: "fn_areceber.id_cliente",
      query: req.user.id_cliente,
      oper: "=",
      page: "1",
      rp: "20",
      sortname: "fn_areceber.data_vencimento",
      sortorder: "desc",
    };
    const data = await ixcPostList("/fn_areceber", body);
    res.json(data.registros || []);
  } catch (e) {
    res.status(500).json([]);
  }
});

app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
