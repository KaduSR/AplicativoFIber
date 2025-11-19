
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, AuthResponse } from '../types';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInCpf: (cpf: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = '@FiberApp:user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('@FiberApp:jwt');
        const storedUser = localStorage.getItem(USER_KEY);
        
        if (token && storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          // Se não tem token, limpa tudo
          localStorage.removeItem('@FiberApp:jwt');
          localStorage.removeItem(USER_KEY);
          setUser(null);
        }
      } catch (e) {
        console.error("Erro ao restaurar sessão", e);
        signOut();
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const signInCpf = async (cpf: string) => {
    setIsLoading(true);
    try {
      const data: AuthResponse = await authService.loginCpf(cpf);
      
      // Garantir que o objeto user tenha as propriedades esperadas
      // Caso a API retorne 'name' em vez de 'nome_cliente', fazemos um fallback
      const mappedUser: User = {
        ...data.user,
        nome_cliente: data.user.nome_cliente || (data.user as any).name || 'Cliente',
        status_contrato: data.user.status_contrato || 'Ativo'
      };

      setUser(mappedUser);
      localStorage.setItem(USER_KEY, JSON.stringify(mappedUser));
      navigate('/'); // Redireciona para Dashboard
    } catch (error: any) {
      console.error("Login Failed", error);
      throw error; // Repassa o erro para a tela de Login tratar
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    authService.logout();
    localStorage.removeItem(USER_KEY);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signInCpf, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
