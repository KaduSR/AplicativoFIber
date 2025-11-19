import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/api';
import { Invoice } from '../types';
import { LogOut, CheckCircle, Clock, User, CreditCard } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dataService.getInvoices()
      .then((data) => {
         // Ensure data is always an array to prevent map errors
         if (Array.isArray(data)) {
            setInvoices(data);
         } else {
            console.warn("Invalid invoice data format", data);
            setInvoices([]);
         }
      })
      .catch((err) => {
         console.error("Error fetching invoices", err);
         setInvoices([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      
      {/* User Info */}
      <div className="flex items-center space-x-4">
         <div className="w-16 h-16 bg-zinc-200 rounded-full flex items-center justify-center text-2xl font-bold text-zinc-400">
            <User />
         </div>
         <div>
            <h2 className="text-xl font-bold text-zinc-800">{user?.nome_cliente}</h2>
            <p className="text-sm text-zinc-500">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-md border border-green-200">
               {user?.planName || user?.status_contrato || 'Plano Ativo'}
            </span>
         </div>
      </div>

      {/* Invoices */}
      <div>
         <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center">
            <CreditCard size={16} className="mr-2" /> Faturas Recentes
         </h3>
         
         <div className="space-y-3">
            {loading ? (
               <div className="text-center py-4 text-zinc-400">Carregando faturas...</div>
            ) : invoices.length === 0 ? (
               <div className="text-center py-8 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <p className="text-zinc-400 text-sm">Nenhuma fatura encontrada.</p>
               </div>
            ) : invoices.map((inv) => (
               <div key={inv.id} className="bg-white border border-zinc-100 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                     <div className={`p-2 rounded-full ${
                        inv.status === 'paid' ? 'bg-green-100 text-green-600' : 
                        inv.status === 'open' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
                     }`}>
                        {inv.status === 'paid' ? <CheckCircle size={20} /> : <Clock size={20} />}
                     </div>
                     <div>
                        <p className="text-xs text-zinc-500">Vencimento</p>
                        <p className="font-bold text-zinc-800">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('pt-BR') : 'N/A'}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-lg font-bold text-zinc-800">
                        R$ {inv.amount ? Number(inv.amount).toFixed(2) : '0.00'}
                     </p>
                     <span className={`text-[10px] uppercase font-bold ${
                         inv.status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                     }`}>
                        {inv.status === 'paid' ? 'Pago' : 'Aberto'}
                     </span>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* Logout */}
      <button 
        onClick={signOut}
        className="w-full bg-red-50 text-red-600 font-bold py-4 rounded-xl border border-red-100 flex items-center justify-center hover:bg-red-100 transition-colors"
      >
         <LogOut size={20} className="mr-2" />
         SAIR DA CONTA
      </button>

    </div>
  );
};