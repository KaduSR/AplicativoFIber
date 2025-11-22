const { GoogleGenerativeAI } = require("@google/generative-ai");
const NodeCache = require("node-cache");

class AIStatusService {
  constructor(ttlSeconds = 1800) {
    this.cache = new NodeCache({ stdTTL: ttlSeconds });

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    } else {
      console.warn("[DownDetector-bot] GEMINI_API_KEY não configurada.");
    }
  }

  async checkStatus(serviceName) {
    if (!this.model) {
      return {
        service: serviceName,
        hasIssues: true, // Considera erro de config como problema
        status: "error",
        message: "IA não ativa - Verifique API Key",
      };
    }

    const cacheKey = `status_${serviceName}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return { ...cachedData, cached: true };
    }

    return this.askAI(serviceName, cacheKey);
  }

  async askAI(serviceName, cacheKey) {
    try {
      // Prompt refinado para forçar uma estimativa baseada em tendências
      // se dados em tempo real não estiverem disponíveis.
      const prompt = `
        Atue como um monitor de DevOps sênior.
        Analise o status do serviço "${serviceName}" hoje.
        Se não tiver dados em tempo real, baseie-se em padrões de relatórios recentes ou notícias de tecnologia das últimas 24h.
        
        Responda estritamente este JSON:
        { 
          "hasIssues": boolean, 
          "status": "stable" | "unstable" | "unknown",
          "summary": "Resumo curto em pt-BR (máx 10 palavras)" 
        }
      `;

      const result = await this.model.generateContent(prompt);
      const text = result.response
        .text()
        .replace(/```json|```/g, "")
        .trim();
      const data = JSON.parse(text);

      // Lógica de segurança: Se a IA responder "unknown", forçamos hasIssues como true
      // para que o admin saiba que o monitoramento falhou.
      const isUnknown = data.status === "unknown";

      const statusResult = {
        service: serviceName,
        hasIssues: data.hasIssues || isUnknown,
        status: data.status,
        message: isUnknown
          ? "Status inconclusivo (Verificar Manualmente)"
          : data.summary,
        lastUpdate: new Date().toISOString(),
        cached: false,
      };

      this.cache.set(cacheKey, statusResult);
      return statusResult;
    } catch (error) {
      console.error(
        `[DownDetector-bot] Erro em ${serviceName}:`,
        error.message
      );
      // Retorna como problema para não passar despercebido no filtro
      return {
        service: serviceName,
        hasIssues: true,
        status: "error",
        message: "Falha na consulta à IA",
      };
    }
  }

  async getUnstableServices(services) {
    const checks = services.map((service) => this.checkStatus(service));
    const results = await Promise.all(checks);

    // Filtra instabilidades CONFIRMADAS ou erros de monitoramento
    return results.filter(
      (r) => r.hasIssues || r.status === "error" || r.status === "unknown"
    );
  }
}

module.exports = new AIStatusService();
