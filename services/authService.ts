// Em: services/authService.ts
import { api } from './ixcApi'; // <--- Importa o NOVO 'api.ts'
import { API_CONFIG } from '@/constants/config';
import type { AuthUserData, IXCLoginRequest } from '@/types/ixc';
import axios from 'axios';

export const authService = {
  
  /**
   * Função de login real.
   * Chama o *nosso backend* no Render.
   */
  async login(credentials: IXCLoginRequest): Promise<AuthUserData> {
    try {
      // O tipo de resposta esperado do nosso backend (server.js)
      type BackendAuthResponse = AuthUserData & { token: string };

      // 1. Chama o NOVO endpoint de login do *nosso backend*
      const response = await api.post<BackendAuthResponse>(
        API_CONFIG.ENDPOINTS.LOGIN, // Chama '/api/auth/login'
        credentials
      );

      // 2. O backend (server.js) retorna o nosso Token JWT e os dados do user
      if (response.token) {
        // 3. Salvamos o Token JWT no AsyncStorage (o 'api.ts' faz isso)
        await api.setToken(response.token);
      }
      
      // 4. Retorna os dados do utilizador para o AuthContext
      return response;

    } catch (error) {
      console.error('Erro no authService.login:', error);
      // Re-lança o erro para o AuthContext (Tarefa 12) poder mostrá-lo
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error || 'Erro de rede');
      }
      throw error;
    }
  },

  /**
   * O Logout agora limpa o nosso Token JWT
   */
  async logout() {
    await api.clearToken();
  },
};