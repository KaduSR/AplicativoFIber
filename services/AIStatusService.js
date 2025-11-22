const axios = require("axios");

class AIStatusService {
  async checkStatus(serviceId) {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return { status: "error", message: "GEMINI_API_KEY não configurada" };
      }

      const prompt = `Verificar o status atual do serviço ${serviceId}. Responda APENAS em JSON com este formato:
      {
        "hasIssues": boolean,
        "status": "stable" | "unstable" | "down",
        "message": "descrição breve"
      }`;

      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
        {
          contents: [{ parts: [{ text: prompt }] }],
        },
        {
          params: { key: process.env.GEMINI_API_KEY },
          timeout: 8000,
        }
      );

      const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) throw new Error("Resposta inválida da IA");

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

      return (
        result || {
          status: "error",
          message: "Não foi possível parsear resposta",
        }
      );
    } catch (error) {
      console.error(`[AI Service] Erro para ${serviceId}:`, error.message);
      return { status: "error", message: error.message };
    }
  }
}

module.exports = new AIStatusService();
