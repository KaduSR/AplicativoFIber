import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { Input } from '../components/Input';
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
  const [showPassword, setShowPassword] = useState(false); // Visual only, since we use CPF

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
      setError('Não foi possível autenticar. Verifique seus dados.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative">
      
      <div className="w-full max-w-sm z-10 animate-fade-in">
        <div className="text-center mb-12">
           <h1 className="text-5xl font-black tracking-tighter mb-1 italic">
             FIBER<span className="text-[#FF6600]">.NET</span>
           </h1>
           <p className="text-zinc-400 text-sm font-light italic font-serif">Central de Conexão Inteligente</p>
        </div>

        <div className="space-y-6">
           <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Campo CPF (Estilizado como E-mail na imagem para manter fidelidade visual) */}
              <Input 
                placeholder="CPF do Titular"
                value={cpf}
                onChange={handleCpfChange}
                icon={<Mail size={20} />}
                maxLength={14}
                className="tracking-wider"
              />

              {/* Campo Senha (Visual - Opcional na lógica atual, mas presente no layout) */}
              <Input 
                type={showPassword ? "text" : "password"}
                placeholder="Senha (Opcional para acesso rápido)"
                icon={<Lock size={20} />}
                rightElement={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-zinc-500 hover:text-white">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                }
              />

              {error && (
                 <div className="text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-center">
                    {error}
                 </div>
              )}

              <Button 
                type="submit" 
                isLoading={isLoading}
                className="mt-2 py-4 text-base"
              >
                Entrar <ArrowRight size={20} className="ml-2" />
              </Button>
           </form>

           <div className="text-center">
             <a href="#" className="text-[#0066FF] text-sm hover:underline">Esqueci minha senha</a>
           </div>

           <div className="pt-8 text-center">
              <p className="text-zinc-500 text-sm mb-2">Ainda não é cliente?</p>
              <a href="#" className="text-[#0066FF] text-sm font-bold hover:underline">Conheça nossa empresa</a>
           </div>
        </div>
      </div>
    </div>
  );
};