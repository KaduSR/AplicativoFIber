// services/ixcApi.ts
// (Substitua o ficheiro inteiro por este)

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { API_CONFIG } from '@/constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Chave para guardar o nosso Token JWT no telemóvel
const TOKEN_STORAGE_KEY = '@FiberApp:authToken';

class ApiClient {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL, // Usa a URL do nosso backend
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Esta parte (Interceptor) é crucial.
    // Ela adiciona o Token JWT (que o *nosso* backend gerou)
    // em TODAS as requisições futuras (faturas, contratos, etc.)
    this.api.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        // Envia o "Bearer Token" que o backend entende
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }, (error) => {
      return Promise.reject(error);
    });
  }

  /**
   * Função para salvar o Token JWT (recebido do /api/auth/login)
   */
  public async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  /**
   * Função para limpar o Token JWT no logout
   */
  public async clearToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  // Métodos de requisição (não precisamos mais do 'postList')
  public async get<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.get(endpoint, config);
    return response.data;
  }

  public async post<T = any>(endpoint: string, data: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.post(endpoint, data, config);
    return response.data;
  }
  
  // (Pode adicionar PUT, DELETE, etc. se necessário)
}

/**
 * ATENÇÃO: Renomeámos 'ixcApi' para 'api'.
 * Isto é o nosso novo cliente de API unificado que fala
 * APENAS com o nosso backend.
 */
export const api = new ApiClient();

// Mantém compatibilidade com código existente
export const ixcApi = api;
