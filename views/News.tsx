import React, { useEffect, useState } from 'react';
import { dataService } from '../services/api';
import { NewsItem } from '../types';
import { Calendar, ExternalLink, Newspaper, AlertTriangle } from 'lucide-react';

export const News: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await dataService.getNews();
        setNews(data);
      } catch (error) {
        console.error('Failed to load news', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNews();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-24 animate-fade-in">
      <div className="flex items-center space-x-3 mb-2">
        <div className="bg-green-500/10 p-2.5 rounded-xl border border-green-500/20">
          <Newspaper className="text-green-500 w-6 h-6" />
        </div>
        <div>
            <h2 className="text-xl font-bold text-white leading-none">Notícias</h2>
            <p className="text-zinc-500 text-xs mt-1">Atualizações e comunicados</p>
        </div>
      </div>

      <div className="space-y-4">
        {news.map((item, index) => {
          // Lógica de Relevância: Primeiro item + Palavras-chave críticas
          const isUrgent = index === 0 && (
            item.title.toLowerCase().includes('manutenção') ||
            item.title.toLowerCase().includes('aviso') ||
            item.title.toLowerCase().includes('instabilidade') ||
            item.title.toLowerCase().includes('queda') ||
            item.source.name === 'Aviso'
          );

          return (
            <div 
              key={index} 
              className={`group relative bg-zinc-900 border rounded-3xl overflow-hidden transition-all duration-300 flex flex-col shadow-lg ${
                isUrgent 
                  ? 'border-red-500/50 shadow-red-900/20 ring-1 ring-red-500/20' 
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Imagem e Badges */}
              <div className="h-48 overflow-hidden relative">
                 <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent"></div>
                 
                 {/* Selo de Importante (Destaque solicitado) */}
                 {isUrgent && (
                   <div className="absolute top-3 right-3 z-20 animate-pulse">
                     <div className="bg-red-600 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-full flex items-center shadow-[0_0_15px_rgba(220,38,38,0.6)] border border-white/10">
                       <AlertTriangle size={13} className="mr-1.5 fill-white text-red-600" strokeWidth={1.5} />
                       IMPORTANTE
                     </div>
                   </div>
                 )}

                 <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md border ${
                      isUrgent 
                        ? 'text-red-100 bg-red-600/80 border-red-400/30'
                        : 'text-zinc-300 bg-zinc-950/60 border-zinc-700'
                    }`}>
                      {item.source.name}
                    </span>
                    
                    <div className="flex items-center text-[10px] text-zinc-300 bg-black/40 px-2 py-1 rounded-lg backdrop-blur-sm">
                       <Calendar size={10} className="mr-1.5 text-zinc-400" />
                       {new Date(item.publishedAt).toLocaleDateString('pt-BR')}
                    </div>
                 </div>
              </div>
              
              {/* Conteúdo */}
              <div className="p-5 flex flex-col flex-1">
                <h3 className={`text-lg font-bold mb-2 leading-tight ${
                  isUrgent ? 'text-white' : 'text-zinc-100'
                }`}>
                  {item.title}
                </h3>
                
                <p className="text-zinc-400 text-sm mb-5 line-clamp-3 flex-1 leading-relaxed">
                  {item.description}
                </p>
                
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                    isUrgent
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                  }`}
                >
                  Ler comunicado
                  <ExternalLink size={16} className="ml-2" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
      
      {news.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 opacity-50">
            <Newspaper size={48} strokeWidth={1} className="mb-4" />
            <p>Nenhuma notícia no momento.</p>
        </div>
      )}
    </div>
  );
};