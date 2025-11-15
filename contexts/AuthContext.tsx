// Em: contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { authService } from '@/services/authService';
import type { IXCLoginRequest, AuthUserData } from '@/types/ixc';
import AsyncStorage from '@react-native-async-storage/async-storage';

// (O tipo do contexto muda para guardar AuthUserData)
interface AuthContextData {
  isLoading: boolean;
  user: AuthUserData | null;
  signIn: (credentials: IXCLoginRequest) => Promise<void>;
  signOut: () => void;
}

const USER_STORAGE_KEY = '@FiberApp:user';

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Começa true

  // Efeito para carregar o utilizador salvo ao iniciar o app
  useEffect(() => {
    async function loadStorageData() {
      try {
        const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error("Falha ao carregar dados do utilizador", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadStorageData();
  }, []);


  const signIn = async (credentials: IXCLoginRequest) => {
    setIsLoading(true);
    try {
      // 1. Tenta o login REAL (Tarefa 08)
      console.log("Tentando login real...");
      // O 'authService.login' agora chama o nosso backend
      const userData = await authService.login(credentials); 
      
      // 2. Se funcionar, define o utilizador e salva no storage
      setUser(userData);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));

    } catch (error) {
      // 3. Se falhar, mostra o erro real (Tarefa 12)
      console.error("Falha no login real:", error);
      const errorMessage = (error instanceof Error) ? error.message : "Ocorreu um erro desconhecido.";
      Alert.alert("Erro no Login", errorMessage);
      
      // Limpa qualquer dado antigo
      setUser(null);
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // 1. Chama o authService para limpar o Token JWT (Tarefa 09)
      await authService.logout(); 
    } catch (error) {
      console.error("Erro ao limpar o token no logout:", error);
    } finally {
      // 2. ATUALIZA O ESTADO (O PASSO MAIS IMPORTANTE)
      setUser(null);
      // 3. Limpa os dados do utilizador do storage
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  return (
    <AuthContext.Provider value={{ isLoading, user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};