import React, { useState, useEffect } from 'react';
import { dataService } from '../services/api';
import { Wifi, RefreshCw, Upload, Download, Zap, Activity } from 'lucide-react';

export const Connection: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [ontData, setOntData] = useState<any>({ status: '...', signal: '...' });
  
  useEffect(() => {
      dataService.getOntStatus().then(setOntData);
  }, []);

  const runTest = async () => {
    if (testing) return;
    setTesting(true);
    setResults(null);
    
    try {
      const data = await dataService.runSpeedTest();
      // Simula delay visual se a API for muito rápida (opcional)
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 pb-24 animate-fade-in min-h-screen bg-zinc-950 text-white">
        
        <div className="flex items-center space-x-3 mb-4">
           <div className="p-3 bg-[#0066FF]/10 rounded-xl text-[#0066FF]">
             <Wifi size={24} />
           </div>
           <div>
             <h1 className="text-xl font-bold">Diagnóstico</h1>
             <p className="text-zinc-400 text-xs">Análise técnica da conexão</p>
           </div>
        </div>

        {/* ONT Detail Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-4">
                <span className="text-zinc-400 text-sm">Equipamento</span>
                <span className="font-bold text-white">Huawei HG8245H5</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                   <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Status</p>
                   <p className={`font-bold ${ontData.status === 'Online' ? 'text-emerald-400' : 'text-red-400'}`}>
                     {ontData.status}
                   </p>
               </div>
               <div className="text-right">
                   <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Potência (Sinal)</p>
                   <p className={`font-mono font-bold ${parseFloat(ontData.signal) < -27 ? 'text-red-400' : 'text-emerald-400'}`}>
                     {ontData.signal} dBm
                   </p>
               </div>
            </div>
        </div>

        {/* Speedtest Area */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
            
            {testing ? (
                <div className="py-10">
                    <div className="w-24 h-24 border-4 border-zinc-800 border-t-[#0066FF] rounded-full animate-spin mb-6 mx-auto"></div>
                    <p className="text-zinc-300 font-bold animate-pulse">Testando sua velocidade...</p>
                    <p className="text-zinc-500 text-xs mt-2">Isso pode levar alguns segundos</p>
                </div>
            ) : results ? (
                <div className="w-full animate-fade-in">
                    <div className="mb-8">
                        <span className="text-zinc-500 text-xs uppercase tracking-widest">Resultado do Teste</span>
                        <h2 className="text-5xl font-black text-white mt-2">{results.download} <span className="text-xl font-medium text-zinc-500">Mbps</span></h2>
                        <div className="inline-flex items-center bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-bold mt-2">
                           <Zap size={12} className="mr-1" /> Internet Excelente
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 w-full">
                        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                            <Download size={20} className="text-blue-500 mb-2 mx-auto" />
                            <p className="text-[10px] text-zinc-500 uppercase">Download</p>
                            <p className="font-bold text-white">{results.download}</p>
                        </div>
                        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                            <Upload size={20} className="text-purple-500 mb-2 mx-auto" />
                            <p className="text-[10px] text-zinc-500 uppercase">Upload</p>
                            <p className="font-bold text-white">{results.upload}</p>
                        </div>
                        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                            <Activity size={20} className="text-orange-500 mb-2 mx-auto" />
                            <p className="text-[10px] text-zinc-500 uppercase">Ping</p>
                            <p className="font-bold text-white">{results.ping}ms</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="py-8">
                    <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-600">
                        <Wifi size={32} />
                    </div>
                    <p className="text-zinc-400 text-sm max-w-[200px] mx-auto">Execute um teste para verificar a qualidade da sua conexão.</p>
                </div>
            )}

            {!testing && (
                <button 
                    onClick={runTest}
                    className="mt-8 w-full bg-[#0066FF] hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center"
                >
                    <RefreshCw className="mr-2" size={20} />
                    {results ? 'Testar Novamente' : 'INICIAR TESTE'}
                </button>
            )}
        </div>
    </div>
  );
};