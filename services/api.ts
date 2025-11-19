
import axios from 'axios';
import { AuthResponse, Invoice, SpeedTestResult, OntData, NewsItem } from '../types';
import { API_CONFIG } from '../constants/config';

const TOKEN_KEY = '@FiberApp:jwt';

const storage = {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, val: string) => localStorage.setItem(key, val),
    removeItem: (key: string) => localStorage.removeItem(key)
};

export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 segundos conforme solicitado
});

// Interceptor para injetar o Token
api.interceptors.request.use(
  (config) => {
    const token = storage.getItem(TOKEN_KEY);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Resposta para tratamento global de erros (opcional, mas recomendado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expirado ou inválido
      authService.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string) => {
  storage.setItem(TOKEN_KEY, token);
};

export const clearAuthToken = () => {
  storage.removeItem(TOKEN_KEY);
};

export const authService = {
  loginCpf: async (cpf: string): Promise<AuthResponse> => {
      const cleanCpf = cpf.replace(/\D/g, '');
      const payload = { cpf: cleanCpf };
      
      // Chamada real à API - Sem Mocks
      const response = await api.post(API_CONFIG.ENDPOINTS.LOGIN_CPF, payload);
      
      if (response.data.token) {
          setAuthToken(response.data.token);
      }
      return response.data;
  },
  
  logout: () => {
    clearAuthToken();
  }
};

export const dataService = {
  getInvoices: async (): Promise<Invoice[]> => {
    const response = await api.get(API_CONFIG.ENDPOINTS.INVOICES);
    return Array.isArray(response.data) ? response.data : [];
  },

  getOntStatus: async (): Promise<OntData> => {
    const response = await api.get(API_CONFIG.ENDPOINTS.ONT);
    return response.data;
  },
  
  getNews: async (): Promise<NewsItem[]> => {
    const response = await api.get(API_CONFIG.ENDPOINTS.NEWS);
    return Array.isArray(response.data) ? response.data : [];
  },
  
  runSpeedTest: async (): Promise<SpeedTestResult> => {
    const response = await api.get(API_CONFIG.ENDPOINTS.SPEEDTEST);
    return response.data;
  },

  sendMessageToBot: async (message: string): Promise<string> => {
    const response = await api.post(API_CONFIG.ENDPOINTS.BOT, { message });
    return response.data.reply;
  }
};
