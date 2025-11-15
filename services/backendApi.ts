// services/backendApi.ts
//
// Cliente HTTP para fazer requisições autenticadas ao backend
// Inclui automaticamente o token JWT nos headers quando disponível
//

import { BACKEND_API_URL } from "@/constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_TOKEN_KEY = "@fibernet:auth_token";

/**
 * Cliente HTTP para comunicação com o backend
 */
class BackendApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BACKEND_API_URL;
  }

  /**
   * Obtém o token JWT do storage
   */
  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error("Erro ao obter token:", error);
      return null;
    }
  }

  /**
   * Salva o token JWT no storage
   */
  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch (error) {
      console.error("Erro ao salvar token:", error);
    }
  }

  /**
   * Remove o token JWT do storage
   */
  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error("Erro ao remover token:", error);
    }
  }

  /**
   * Faz uma requisição GET autenticada
   */
  async get<T>(endpoint: string): Promise<T> {
    const token = await this.getToken();
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.handleError(response.status, errorData);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Erro desconhecido ao comunicar com o servidor");
    }
  }

  /**
   * Faz uma requisição POST autenticada
   */
  async post<T>(endpoint: string, data: Record<string, unknown> = {}): Promise<T> {
    const token = await this.getToken();
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.handleError(response.status, errorData);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Erro desconhecido ao comunicar com o servidor");
    }
  }

  /**
   * Tratamento de erros HTTP
   */
  private handleError(status: number, errorData: any): Error {
    const message = errorData.error || errorData.message || `Erro ${status}: Não foi possível completar a operação.`;

    switch (status) {
      case 401:
        return new Error("Sessão expirada. Por favor, faça login novamente.");
      case 403:
        return new Error("Token inválido ou expirado. Por favor, faça login novamente.");
      case 404:
        return new Error("Recurso não encontrado.");
      case 500:
        return new Error(message || "Erro no servidor. Tente novamente mais tarde.");
      default:
        return new Error(message);
    }
  }
}

export const backendApi = new BackendApiClient();

