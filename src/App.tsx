
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Dashboard } from './views/Dashboard'; 
import { Login } from './views/Login';
import { Connection } from './views/Connection';
import { Support } from './views/Support';
import { News } from './views/News';
import { Invoices } from './views/Invoices'; 
import { Home, Wifi, MessageSquare, Newspaper, FileText } from 'lucide-react';

// Componente para rotas protegidas
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-[#0066FF]">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Layout Principal com Tab Bar
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: '/', icon: Home, label: 'Início' },
    { id: '/faturas', icon: FileText, label: 'Faturas' },
    { id: '/conexao', icon: Wifi, label: 'Conexão' },
    { id: '/noticias', icon: Newspaper, label: 'Notícias' },
    { id: '/suporte', icon: MessageSquare, label: 'Suporte' },
  ];

  return (
    <div className="min-h-screen bg-black flex justify-center">
      <div className="w-full max-w-md bg-zinc-950 h-full min-h-screen shadow-2xl shadow-zinc-900 relative flex flex-col border-x border-zinc-900">
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
          {children}
        </div>
        
        {/* Bottom Tab Bar */}
        <div className="absolute bottom-0 w-full bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-1 py-3 flex justify-around items-center z-50 max-w-md">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={`flex flex-col items-center space-y-1 transition-all duration-200 w-16 ${
                    isActive ? 'text-[#0066FF] -translate-y-1' : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                  <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[9px] font-bold uppercase tracking-wide">{tab.label}</span>
                  {isActive && <div className="w-1 h-1 bg-[#0066FF] rounded-full mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Rotas Protegidas com Layout */}
            <Route path="/" element={<PrivateRoute><MainLayout><Dashboard /></MainLayout></PrivateRoute>} />
            <Route path="/conexao" element={<PrivateRoute><MainLayout><Connection /></MainLayout></PrivateRoute>} />
            <Route path="/suporte" element={<PrivateRoute><MainLayout><Support /></MainLayout></PrivateRoute>} />
            <Route path="/noticias" element={<PrivateRoute><MainLayout><News /></MainLayout></PrivateRoute>} />
            <Route path="/faturas" element={<PrivateRoute><MainLayout><Invoices /></MainLayout></PrivateRoute>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
};

export default App;
