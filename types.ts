
export enum UserRole {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
}

export interface User {
  id: number;
  nome_cliente: string; // Atualizado conforme solicitado
  email: string;
  contractId?: number;
  status_contrato?: string; // Atualizado conforme solicitado
  planName?: string; // Mantido para compatibilidade visual
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Invoice {
  id: number;
  amount: number;
  dueDate: string;
  status: 'paid' | 'open' | 'overdue';
  pdfUrl?: string;
}

export interface Contract {
  id: number;
  plan: string;
  status: string;
  address: string;
  ontSignal?: string; // dBm
}

export interface OntData {
  status: string;
  signal: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isLoading?: boolean;
}

export interface SpeedTestResult {
  download: number;
  upload: number;
  ping: number;
  jitter: number;
}

export interface NewsItem {
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}
