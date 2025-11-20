// server.js

// ... importações
const instabilidadeRoutes = require("./routes/instabilidade");
const { getInstabilities } = require("./services/downdetector"); // Para usar no Bot

// ... configurações do app

// Rotas
app.use("/api/status", instabilidadeRoutes); // IMPORTANTE: O front busca em /api/status

// Chatbot Atualizado (Usando o mesmo serviço)
app.post("/api/bot", async (req, res) => {
  try {
    const { message, history } = req.body;

    // Verifica instabilidades atuais usando o serviço compartilhado
    const currentInstabilities = await getInstabilities();

    let contextInfo = "";
    const foundProblem = currentInstabilities.find(
      (p) =>
        message.toLowerCase().includes(p.name.toLowerCase()) ||
        message.toLowerCase().includes(p.id)
    );

    if (foundProblem) {
      contextInfo = `[ALERTA SISTEMA]: O ${foundProblem.name} está com problemas externos reportados no Brasil. Avise o usuário que não é falha na internet.`;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const chat = model.startChat({
      history:
        history?.map((h) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }],
        })) || [],
      systemInstruction: `Você é o FiberBot. ${contextInfo} Responda de forma curta e prestativa.`,
    });

    const result = await chat.sendMessage(message);
    res.json({ reply: result.response.text() });
  } catch (error) {
    res.status(500).json({ reply: "Erro ao processar IA." });
  }
});
