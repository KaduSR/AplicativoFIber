import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, UserCheck } from 'lucide-react';
import { Button } from '../components/Button';

const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const Login: React.FC = () => {
  const { signInCpf, isLoading } = useAuth();
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState('');

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cpf.replace(/\D/g, '');
    
    if (clean.length < 11) {
      setError('Por favor, digite o CPF completo.');
      return;
    }

    try {
      await signInCpf(clean);
    } catch (err: any) {
      setError('CPF não encontrado ou inativo.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in">
        
        {/* Logo / Branding */}
        <div className="text-center mb-10">
           <h1 className="text-4xl font-black tracking-tighter text-white italic">
             FIBER<span className="text-[#0066FF]">.NET</span>
           </h1>
           <p className="text-zinc-500 text-sm mt-2 font-medium">Portal do Assinante</p>
        </div>

        {/* Card de Login */}
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl shadow-black">
           <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#0066FF]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#0066FF]">
                <UserCheck size={32} />
              </div>
              <h2 className="text-xl font-bold text-white">Bem-vindo de volta!</h2>
              <p className="text-zinc-400 text-sm">Digite seu CPF para acessar</p>
           </div>

           <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">CPF do Titular</label>
                <input 
                  type="tel"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={handleCpfChange}
                  maxLength={14}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white text-center text-xl font-bold rounded-xl py-4 px-4 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] placeholder-zinc-700 transition-all"
                />
              </div>

              {error && (
                 <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-center font-medium">
                    {error}
                 </div>
              )}

              <Button 
                type="submit" 
                isLoading={isLoading}
                className="w-full bg-[#0066FF] hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all"
              >
                ACESSAR CENTRAL <ArrowRight size={20} className="ml-2" />
              </Button>
           </form>
        </div>

        <div className="mt-8 text-center">
           <p className="text-zinc-600 text-xs">
             Ao entrar, você concorda com nossos <a href="#" className="text-zinc-400 hover:text-white underline">Termos de Uso</a>.
           </p>
        </div>
      </div>
    </div>
  );
};