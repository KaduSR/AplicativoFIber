// services/authService.ts
//
// Simplificado para chamar o backend em vez do IXC diretamente
// O backend gerencia a autenticação e retorna um JWT
//

import { api } from "./ixcApi";
import { API_CONFIG } from "@/constants/config";
import type { IXCLoginRequest, AuthUserData } from "@/types/ixc";

interface BackendLoginResponse {
  token: string;
  id_cliente: string;
  id_contrato: string;
  nome_cliente: string;
  status_contrato: string;
}

export const authService = {
  async login(credentials: IXCLoginRequest): Promise<AuthUserData & { token: string }> {
    try {
      // Chama o endpoint de login do backend
      const response = await api.post<BackendLoginResponse>(API_CONFIG.ENDPOINTS.LOGIN, {
        login: credentials.login,
        senha: credentials.senha,
      });

      // Salva o token JWT no api para uso em requisições futuras
      await api.setToken(response.token);

      // Retorna os dados do usuário com o token
      return {
        token: response.token,
        id_cliente: response.id_cliente,
        id_contrato: response.id_contrato,
        nome_cliente: response.nome_cliente,
        email: credentials.login.includes("@") ? credentials.login : "",
        telefone: "",
        status_contrato: response.status_contrato,
      };

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Erro no login: ${error.message}`);
      }
      throw new Error("Erro desconhecido ao fazer login");
    }
  },

  async logout() {
    // Remove o token JWT do storage
    await api.clearToken();
  },
  
  // Função mockLogin mantida para testes (pode ser removida depois)
  async mockLogin(email: string, senha: string): Promise<AuthUserData & { token: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      token: "mock-token",
      id_cliente: "1",
      id_contrato: "1",
      nome_cliente: "Cliente Teste",
      email: email,
      telefone: "(11) 99999-9999",
      status_contrato: "Ativo",
    };
  },
};
