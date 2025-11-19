import React, { useEffect, useState } from 'react';
import { dataService } from '../services/api';
import { Invoice } from '../types';
import { FileText, Download, Copy, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dataService.getInvoices()
      .then((data) => {
         if (Array.isArray(data)) setInvoices(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const copyBarcode = (id: number) => {
      alert(`Código de barras da fatura ${id} copiado!`);
  };

  return (
    <div className="p-6 space-y-6 pb-24 min-h-screen bg-zinc-950 text-white animate-fade-in">
        <div className="flex items-center space-x-3 mb-4">
           <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
             <FileText size={24} />
           </div>
           <div>
             <h1 className="text-xl font-bold">Financeiro</h1>
             <p className="text-zinc-400 text-xs">Gerencie suas faturas</p>
           </div>
        </div>

        {loading ? (
            <div className="text-center py-10 text-zinc-500">Carregando faturas...</div>
        ) : invoices.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                <p className="text-zinc-400">Nenhuma fatura encontrada.</p>
            </div>
        ) : (
            <div className="space-y-4">
                {invoices.map((inv) => {
                    const isPaid = inv.status === 'paid';
                    const isOverdue = !isPaid && new Date(inv.dueDate) < new Date();
                    
                    return (
                        <div key={inv.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-md relative overflow-hidden">
                            {/* Status Stripe */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                                isPaid ? 'bg-emerald-500' : isOverdue ? 'bg-red-500' : 'bg-yellow-500'
                            }`}></div>

                            <div className="flex justify-between items-start mb-4 pl-3">
                                <div>
                                    <p className="text-xs text-zinc-500 uppercase">Vencimento</p>
                                    <p className="font-bold text-zinc-200">{new Date(inv.dueDate).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center ${
                                    isPaid 
                                    ? 'bg-emerald-500/10 text-emerald-500' 
                                    : isOverdue 
                                    ? 'bg-red-500/10 text-red-500'
                                    : 'bg-yellow-500/10 text-yellow-500'
                                }`}>
                                    {isPaid ? <CheckCircle2 size={12} className="mr-1" /> : <AlertCircle size={12} className="mr-1" />}
                                    {isPaid ? 'PAGO' : isOverdue ? 'VENCIDO' : 'ABERTO'}
                                </span>
                            </div>

                            <div className="flex justify-between items-end pl-3 border-t border-zinc-800 pt-4">
                                <div>
                                    <p className="text-xs text-zinc-500">Valor Total</p>
                                    <p className="text-xl font-bold text-white">R$ {inv.amount.toFixed(2)}</p>
                                </div>
                                
                                {!isPaid && (
                                    <div className="flex space-x-2">
                                        <button 
                                            onClick={() => copyBarcode(inv.id)}
                                            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors"
                                            title="Copiar Código de Barras"
                                        >
                                            <Copy size={18} />
                                        </button>
                                        <button 
                                            className="p-2 bg-[#0066FF] hover:bg-blue-600 rounded-lg text-white transition-colors"
                                            title="Baixar PDF"
                                        >
                                            <Download size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );
};