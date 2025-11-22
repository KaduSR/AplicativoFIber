const express = require("express");
const router = express.Router();
const downdetectorService = require("../services/DowndetectorService");
const aiStatusService = require("../services/AIStatusService");

// Lista de serviços prioritários
const SERVICES_TO_CHECK = [
  "whatsapp",
  "facebook",
  "instagram",
  "google",
  "youtube",
  "netflix",
  "cloudflare"
];

router.get("/", async (req, res) => {
  try {
    const promises = SERVICES_TO_CHECK.map(async (id) => {
      // 1. Tenta Downdetector (Dados Reais de Gráfico)
      let result = await downdetectorService.getStatus(id);

      // 2. Se o Downdetector foi bloqueado (status unknown), usa a IA como fallback
      if (result.status === "unknown") {
        // Só chama a IA se tivermos a chave configurada
        if (process.env.GEMINI_API_KEY) {
            const aiResult = await aiStatusService.checkStatus(id);
            
            // Se a IA respondeu com sucesso, usamos a resposta dela
            if (aiResult.status === "success") {
                result = {
                    ...result, // Mantém estrutura base
                    hasIssues: aiResult.hasIssues,
                    message: aiResult.message, // Ex: "Nenhuma instabilidade grave reportada hoje"
                    source: "AI Backup",
                    status: "success" // Agora temos uma resposta válida!
                };
            }
        }
      }
      return result;
    });

    const results = await Promise.all(promises);

    // Filtra problemas (seja do Downdetector ou da IA)
    const problems = results.filter((r) => r.hasIssues);

    res.json({
      status: problems.length > 0 ? "Instabilidade detectada" : "Nenhuma instabilidade crítica detectada.",
      checked: results.length,
      details: results
    });

  } catch (error) {
    console.error("Erro na rota de status:", error);
    res.status(500).json({ error: "Erro interno ao verificar status" });
  }
});

module.exports = router;
