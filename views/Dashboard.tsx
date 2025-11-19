import React, { useEffect, useState } from 'react';
import { Zap, Activity, Settings, Headphones, FileText, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/api';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [ontStatus, setOntStatus] = useState<any>(null);

  useEffect(() => {
    dataService.getOntStatus().then(setOntStatus);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 max-w-md mx-auto border-x border-zinc-900 shadow-2xl animate-fade-in">
       {/* Header */}
       <div className="p-6 pt-8 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
          <div>
             <h1 className="text-2xl font-bold tracking-tight">Olá, {user?.name?.split(' ')[0] || 'Cliente'}</h1>
             <p className="text-blue-400 text-xs font-medium mt-0.5 uppercase tracking-wider">{user?.planName || 'Ativo'}</p>
          </div>
          <button onClick={signOut} className="p-2 bg-zinc-800 rounded-full hover:bg-red-900/30 transition-colors">
            <LogOut size={20} className="text-zinc-400 hover:text-red-400" />
          </button>
       </div>

       <div className="p-6 space-y-6">
          {/* Status Card (Onda Verde) */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-emerald-900/20">
             <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
             
             <div className="flex justify-between items-start mb-8">
                <div className="flex items-center space-x-2">
                   <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                      <Zap className="text-white w-5 h-5 fill-current" />
                   </div>
                   <span className="font-bold text-lg text-white">Sua Conexão</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${ontStatus?.status === 'Offline' ? 'bg-red-500' : 'bg-emerald-400/20 text-emerald-100'}`}>
                  {ontStatus?.status || 'Online'}
                </span>
             </div>
             
             <div className="flex justify-between items-end">
                 <div>
                    <p className="text-emerald-100 text-xs mb-1">Sinal Óptico</p>
                    <p className="text-3xl font-bold text-white">{ontStatus?.signal || '-19.5'} <span className="text-sm font-normal opacity-70">dBm</span></p>
                 </div>
                 <div className="text-right">
                    <p className="text-emerald-100 text-xs mb-1">Download</p>
                    <p className="text-xl font-bold text-white">500 <span className="text-sm font-normal opacity-70">Mbps</span></p>
                 </div>
             </div>
          </div>

          {/* Quick Actions Grid */}
          <div>
             <h3 className="font-bold text-lg mb-4 text-zinc-100">Acesso Rápido</h3>
             <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => navigate('/profile')} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group">
                    <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                      <FileText size={24} className="text-blue-400" />
                    </div>
                    <span className="font-medium text-sm text-zinc-300">2ª Via Fatura</span>
                 </button>
                 
                 <button onClick={() => navigate('/connection')} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group">
                    <div className="p-3 bg-orange-500/10 rounded-xl group-hover:bg-orange-500/20 transition-colors">
                      <Activity size={24} className="text-orange-400" />
                    </div>
                    <span className="font-medium text-sm text-zinc-300">Teste Velocidade</span>
                 </button>

                 <button onClick={() => navigate('/support')} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group">
                    <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
                      <Headphones size={24} className="text-green-400" />
                    </div>
                    <span className="font-medium text-sm text-zinc-300">Suporte Técnico</span>
                 </button>

                 <button onClick={() => navigate('/profile')} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group">
                    <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                      <User size={24} className="text-purple-400" />
                    </div>
                    <span className="font-medium text-sm text-zinc-300">Meu Perfil</span>
                 </button>
             </div>
          </div>
       </div>
    </div>
  );
};