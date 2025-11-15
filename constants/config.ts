// constants/config.ts
//
// 1. Este arquivo foi simplificado.
// 2. Agora só precisamos de UMA URL base: a do nosso backend no Render.
// 3. Todas as outras configurações (Tokens do IXC, URLs do GenieACS)
//    agora vivem APENAS no backend.

/**
 * A URL principal do seu backend (hospedado no Render).
 * 🛑 IMPORTANTE: Substitua pela sua URL pública do Render.
 */
const API_BASE_URL = "https://api.centralfiber.online"; // <-- COLOQUE A SUA URL DO RENDER AQUI

// Exportamos as rotas que o app vai consumir do *nosso* backend
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  
  ENDPOINTS: {
    // Rotas de Autenticação
    LOGIN: "/api/auth/login",      // O novo endpoint de login que criámos no backend

    // Rotas do IXC (que o backend agora faz o proxy)
    INVOICES: "/api/invoices",
    CONTRACTS: "/api/contracts",
    BOLETO: "/api/boleto",
    SUPPORT: "/api/support",

    // Rotas de Serviços
    ONT: "/api/ont",               // O endpoint do GenieACS
    BOT: "/api/bot",               // O endpoint do FiberBot/Gemini
    SPEEDTEST: "/api/speedtest",   // O endpoint do Speedtest
  }
};

// Manter compatibilidade com código existente (será removido gradualmente)
export const BACKEND_API_URL = API_BASE_URL;

export const GENIE_ACS_CONFIG = {
  BASE_URL: `${API_BASE_URL}/api/ont`
};

export const DOWNDETECTOR_CONFIG = {
  BASE_URL: `${API_BASE_URL}/api/status`
};

export const FIBERBOT_CONFIG = {
  BASE_URL: `${API_BASE_URL}/api/bot`
};

export const SPEED_TEST_CONFIG = {
  // Nenhuma configuração de URL necessária
};