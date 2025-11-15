// Em: services/ixcApi.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { API_CONFIG } from '@/constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_STORAGE_KEY = '@FiberApp:authToken';

class ApiClient {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL, // Usa a URL do nosso backend
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000, // Aumentado para 20s (Speedtest e Gemini podem demorar)
    });

    // Interceptor que adiciona o Token JWT em todas as requisições
    this.api.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }, (error) => Promise.reject(error));
  }

  // Salva o Token JWT (recebido do /api/auth/login)
  public async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  // Limpa o Token JWT no logout
  public async clearToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  // Métodos de requisição
  public async get<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.get(endpoint, config);
    return response.data;
  }

  public async post<T = any>(endpoint: string, data: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.post(endpoint, data, config);
    return response.data;
  }
}

// Renomeámos 'ixcApi' para 'api' (o nosso cliente unificado)
export const api = new ApiClient();