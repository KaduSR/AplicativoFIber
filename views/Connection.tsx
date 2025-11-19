import React, { useState, useEffect } from 'react';
import { dataService } from '../services/api';
import { Wifi, RefreshCw, Smartphone, Tv, Gamepad, Laptop, Tablet, Ban, RotateCcw, Activity } from 'lucide-react';

export const Connection: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [ontData, setOntData] = useState<any>({ status: '...', signal: '...' });
  
  useEffect(() => {
      dataService.getOntStatus().then(setOntData);
  }, []);

  const runTest = async () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => setLoading(false), 3000);
  };

  const devices = [
      { name: 'iPhone 13 Pro', ip: '192.168.100.100', type: 'mobile', signal: '92%', icon: Smartphone },
      { name: 'Samsung Smart TV', ip: '192.168.100.101', type: 'tv', signal: 'Ethernet', icon: Tv },
      { name: 'PlayStation 5', ip: '192.168.100.102', type: 'game', signal: 'Ethernet', icon: Gamepad },
      { name: 'Notebook Dell', ip: '192.168.100.103', type: 'laptop', signal: '78%', icon: Laptop },
      { name: 'Galaxy Tab S8', ip: '192.168.100.105', type: 'tablet', signal: '56%', icon: Tablet },
  ];

  return (
    <div className="p-6 space-y-8 text-white pb-24 animate-fade-in bg-black min-h-screen">
        
        <div className="pt-4">
           <h1 className="text-2xl font-bold">Gerenciamento de Rede</h1>
           <p className="text-zinc-400 text-sm">Controle total da sua conexão FiberNET</p>
        </div>

        {/* ONT Status Card - Black/Dark Grey */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden shadow-lg">
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
                        <Activity className="text-[#0066FF]" size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg leading-tight">Status da ONT Huawei</h3>
                        <p className="text-zinc-500 text-xs">Huawei HG8245H5</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                   <button className="text-[#0066FF] hover:text-blue-400 transition-colors flex flex-col items-center">
                      <RotateCcw size={20} />
                      <span className="text-[10px] mt-1">Reboot</span>
                   </button>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 px-2">
                <div>
                    <p className="text-zinc-500 text-xs mb-1">Tempo Ativo</p>
                    <p className="font-bold text-white text-sm">14d 6h</p>
                </div>
                <div className="text-right">
                    <p className="text-zinc-500 text-xs mb-1">Sinal RX</p>
                    <p className={`font-mono font-bold text-sm ${parseFloat(ontData.signal) < -25 ? 'text-red-500' : 'text-green-500'}`}>
                        {ontData.signal} dBM
                    </p>
                </div>
                <div>
                    <p className="text-zinc-500 text-xs mb-1">Temperatura</p>
                    <p className="font-bold text-white text-sm">42°C</p>
                </div>
            </div>
        </div>

        {/* Speedtest Button Area */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-5">
             <div className="flex items-center space-x-2 mb-4">
                 <Activity size={18} className="text-[#0066FF]" />
                 <h3 className="font-bold text-white">Teste de Velocidade Ookla</h3>
             </div>
             
             <button 
                onClick={runTest}
                className="w-full bg-[#0066FF] hover:bg-blue-600 text-white font-bold py-3.5 rounded-full shadow-lg shadow-blue-900/30 transition-all active:scale-95 flex items-center justify-center"
                disabled={loading}
            >
                {loading ? <RefreshCw className="animate-spin mr-2" size={20} /> : <RefreshCw className="mr-2" size={20} />}
                {loading ? 'Executando Teste...' : 'Executar Novo Teste'}
            </button>
        </div>

        {/* Devices List */}
        <div>
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-xl font-bold">Dispositivos Conectados({devices.length})</h3>
                <Activity size={18} className="text-[#0066FF] animate-pulse" />
            </div>
            
            <div className="space-y-3">
                {devices.map((dev, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                                <dev.icon className="text-[#0066FF]" size={24} />
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">{dev.name}</p>
                                <p className="text-xs text-zinc-500 font-mono mb-1">{dev.ip}</p>
                                {dev.signal === 'Ethernet' ? (
                                    <span className="text-[10px] text-zinc-400 flex items-center">Ethernet</span>
                                ) : (
                                    <span className="text-[10px] text-green-500 flex items-center">
                                        <Wifi size={10} className="mr-1"/> Sinal {dev.signal}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-red-500 hover:border-red-500 transition-colors">
                            <Ban size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};