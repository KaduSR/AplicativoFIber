// Em: constants/config.ts

/**
 * A URL principal do seu backend (hospedado no Render).
 * * 🛑 IMPORTANTE: Substitua pela sua URL pública do Render.
 */
const API_BASE_URL = 'https://api.centralfiber.online'; // <-- COLOQUE A SUA URL DO RENDER AQUI

// Exportamos as rotas que o app vai consumir do *nosso* backend
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  
  ENDPOINTS: {
    // Autenticação
    LOGIN: '/api/auth/login',

    // Rotas do IXC (Item 2)
    INVOICES: '/api/invoices',     // <-- ADICIONADO
    CONTRACTS: '/api/contracts',    // <-- ADICIONADO
    BOLETO: '/api/boleto',        // (Já existia na Tarefa 02)
    
    // Rotas de Serviços
    ONT: '/api/ont',              // (Item 7)
    BOT: '/api/bot',              // (Item 5)
    SPEEDTEST: '/api/speedtest',
    NEWS: '/api/news',            // <-- ADICIONADO (Item 4)
  }
};