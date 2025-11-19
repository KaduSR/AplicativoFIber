import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { dataService } from '../services/api';
import { ChatMessage } from '../types';

export const Support: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Olá! Sou o FiberBot 🤖. Posso analisar seu sinal de internet ou verificar problemas na Netflix, YouTube e outros serviços. Como posso ajudar?",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const responseText = await dataService.sendMessageToBot(userMsg.text);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Ops! Tive um problema de conexão. Pode tentar novamente?",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 pb-20 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 p-4 flex items-center space-x-3 sticky top-0 z-20">
        <div className="relative">
            <div className="bg-gradient-to-br from-green-500 to-emerald-700 p-2 rounded-full shadow-lg shadow-green-900/20">
                <Bot className="text-white w-5 h-5" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-zinc-900 rounded-full"></span>
        </div>
        <div>
          <h2 className="text-white font-bold text-sm">Suporte Inteligente</h2>
          <p className="text-green-500 text-xs font-medium">Online agora</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-auto ${
                            isUser ? 'bg-blue-600 ml-2' : 'bg-zinc-800 mr-2'
                        }`}>
                            {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-green-500" />}
                        </div>

                        {/* Bubble */}
                        <div className={`p-3.5 rounded-2xl text-sm shadow-md ${
                            isUser 
                            ? 'bg-[#0066FF] text-white rounded-br-none' 
                            : 'bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-bl-none'
                        }`}>
                            <p className="leading-relaxed">{msg.text}</p>
                        </div>
                    </div>
                </div>
            );
        })}
        
        {isTyping && (
          <div className="flex justify-start">
             <div className="flex items-center ml-10 bg-zinc-800 border border-zinc-700 rounded-2xl rounded-bl-none px-4 py-3">
                <div className="flex space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-zinc-900/90 backdrop-blur border-t border-zinc-800">
        <div className="flex items-center space-x-2 bg-zinc-950 border border-zinc-800 rounded-full px-1.5 py-1.5 focus-within:border-[#0066FF] transition-colors">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Descreva seu problema..."
            className="flex-1 bg-transparent text-white px-4 py-2.5 outline-none text-sm placeholder-zinc-600"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-2.5 bg-[#0066FF] text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};