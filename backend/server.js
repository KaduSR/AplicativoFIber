/*
 * FiberNet Backend API - Modo Seguro & Debug
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const base64 = require('react-native-base64');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Importação segura do Speedtest (evita crash se falhar a instalação)
let speedTest;
try {
  speedTest = require('speedtest-net');
} catch (e) {
  console.warn("⚠️ Aviso: Módulo 'speedtest-net' não carregado:", e.message);
}

const ontRoutes = require('./routes/ont');
const GenieACSService = require('./services/genieacs');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURAÇÃO CRÍTICA: CORS LIBERADO ---
// Permite qualquer origem para garantir que o erro não é bloqueio
app.use(cors({ origin: '*' }));
app.set('trust proxy', 1);
// app.use(helmet()); // Desativado temporariamente para debug

// Variáveis
const IXC_API_URL = process.env.IXC_API_URL || 'https://centralfiber.online/webservice/v1';
const IXC_ADMIN_TOKEN = process.env.IXC_ADMIN_TOKEN || "";
const JWT_SECRET = process.env.JWT_SECRET || "secret_debug_temporario";
const GENIEACS_URL = process.env.GENIEACS_URL || 'http://localhost:7557';

// Verificação de Variáveis no Log
console.log("--- INICIANDO SERVIDOR ---");
console.log(`IXC URL: ${IXC_API_URL}`);
console.log(`Token IXC Definido? ${IXC_ADMIN_TOKEN ? "SIM" : "NÃO (Login vai falhar)"}`);
console.log(`JWT Secret Definido? ${process.env.JWT_SECRET ? "SIM" : "NÃO (Usando padrão inseguro)"}`);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Cliente IXC (com tratamento de erro se token estiver vazio)
let ixcApi;
try {
  ixcApi = axios.create({
    baseURL: IXC_API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${base64.encode(IXC_ADMIN_TOKEN)}`
    },
    timeout: 15000, // Aumentado para 15s
  });
} catch (e) {
  console.error("Erro ao criar cliente IXC:", e.message);
}

const ixcPostList = async (endpoint, data) => {
  if (!ixcApi) throw new Error("Cliente IXC não inicializado");
  const config = { headers: { 'ixcsoft': 'listar' } };
  const response = await ixcApi.post(endpoint, data, config);
  return response.data;
};

// Serviços
const genieacs = new GenieACSService(GENIEACS_URL, process.env.GENIEACS_USER, process.env.GENIEACS_PASSWORD);
app.set('genieacs', genieacs);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// --- ROTAS ---

// Health Check (Teste isto no navegador!)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server_time: new Date().toISOString() });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  console.log(`[Login] Tentativa de login para: ${req.body.login}`);
  const { login, senha } = req.body;
  
  if (!login || !senha) return res.status(400).json({ error: 'Dados incompletos.' });
  if (!IXC_ADMIN_TOKEN) return res.status(500).json({ error: 'Servidor mal configurado (Token IXC).' });

  try {
    const campoBusca = login.includes('@') ? 'cliente.hotsite_email' : 'cliente.cnpj_cpf';
    const searchBody = {
      qtype: campoBusca, query: login, oper: '=',
      page: '1', rp: '1', sortname: 'cliente.id', sortorder: 'asc',
    };
    
    console.log(`[Login] Consultando IXC em ${IXC_API_URL}...`);
    const clienteRes = await ixcPostList('/cliente', searchBody);

    if (clienteRes.total === 0 || !clienteRes.registros[0]) {
      console.log("[Login] Cliente não encontrado no IXC.");
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }
    
    const cliente = clienteRes.registros[0];
    
    // Comparação de senha (com log de segurança mascarado)
    if (cliente.senha !== senha) {
      console.log("[Login] Senha incorreta.");
      return res.status(401).json({ error: 'Senha incorreta.' });
    }
    
    // Busca contrato
    const contratoBody = {
      qtype: 'cliente_contrato.id_cliente', query: cliente.id, oper: '=',
      page: '1', rp: '1', sortname: 'cliente_contrato.data_ativacao', sortorder: 'desc',
    };
    const contratoRes = await ixcPostList('/cliente_contrato', contratoBody);
    const contrato = contratoRes.registros[0] || { id: '0', status: 'Indefinido' };

    const userData = {
      id_cliente: cliente.id,
      id_contrato: contrato.id,
      nome_cliente: cliente.razao,
      email: cliente.hotsite_email,
      status_contrato: contrato.status,
    };
    
    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '1d' });
    console.log("[Login] Sucesso. Token gerado.");
    res.json({ token, user: userData });

  } catch (error) { 
    console.error("[Login] Erro fatal:", error.message);
    if (error.response) console.error("[Login] Resposta IXC:", error.response.status, error.response.data);
    res.status(500).json({ error: 'Erro interno no servidor ao tentar logar.' });
  }
});

// Speedtest (Protegido contra falha de módulo)
app.get('/api/speedtest', async (req, res) => {
  if (!speedTest) return res.status(503).json({ error: 'Speedtest não disponível no servidor.' });
  try {
    const result = await speedTest({ acceptLicense: true, acceptGdpr: true });
    res.json({
      download: (result.download.bandwidth / 125000).toFixed(2),
      upload: (result.upload.bandwidth / 125000).toFixed(2),
      ping: result.ping.latency.toFixed(0)
    });
  } catch (error) {
    console.error("Erro Speedtest:", error);
    res.status(500).json({ error: 'Falha no teste.' });
  }
});

// Middlewares de Erro
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }));
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno crítico' });
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));