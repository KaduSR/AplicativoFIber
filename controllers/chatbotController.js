// AplicativoFIber/controllers/chatbotController.js
const ixcService = require("../services/ixc");

/**
 * @typedef {object} ChatbotRequest
 * @property {string} id ID do cliente IXC (do JWT).
 * @property {string} message Mensagem do usuário (Intenção).
 */

/**
 * @desc Processa a intenção do usuário e executa ações de diagnóstico ou suporte.
 * @route POST /api/v1/chatbot/processar
 */
exports.processarIntencao = async (req, res) => {
  const ixcId = req.user.id; // ID do cliente extraído pelo JWT
  const { message } = req.body;

  // Para fins de demonstração, assumimos que a 'Intenção' foi extraída.
  const intencao = classificarIntencao(message);

  if (!ixcId) {
    return res
      .status(401)
      .json({ reply: "Sua sessão não está ativa. Por favor, refaça o login." });
  }

  try {
    // Busca dados de conexão (Protocolos) para checagem básica
    const dadosConexao = await ixcService.getProtocols(ixcId);

    if (!dadosConexao || !dadosConexao.pppoe_login) {
      return res.json({
        reply:
          "Não consegui localizar seus dados de conexão. Por favor, entre em contato com o suporte humano.",
      });
    }

    let chatbotResponse = {
      reply: "",
      acao: null,
      dados: null,
    };

    switch (intencao) {
      case "DIAGNOSTICO_INTERNET":
        // Fallback após remoção do GenieACS.
        chatbotResponse.reply =
          "Entendi que sua internet está com problemas. O diagnóstico automatizado (via ONT) está temporariamente indisponível. Para resolver rapidamente, por favor, abra um chamado para um diagnóstico humano.";
        chatbotResponse.acao = "SUGERIR_CHAMADO";
        break;

      case "ABRIR_CHAMADO":
        // 1. Cria o ticket no IXC (Baseado em su_ticket.php)
        const ticketResult = await ixcService.createTicket(
          ixcId,
          "Problema Reportado pelo Chatbot",
          `O cliente solicitou a abertura de chamado após diagnóstico inicial. Descrição do problema: ${message}`,
          100 // Exemplo: ID para Assunto 'Internet Instável'
        );

        if (ticketResult.success) {
          chatbotResponse.reply = `Chamado de suporte aberto com sucesso! Nosso protocolo é **${ticketResult.id_ticket}**. Um técnico entrará em contato em breve.`;
          chatbotResponse.acao = "CONFIRMACAO_CHAMADO";
        } else {
          chatbotResponse.reply =
            "Não foi possível abrir o chamado. Tente novamente ou use nosso WhatsApp.";
          chatbotResponse.acao = "ERRO_IXC";
        }
        break;

      case "REINICIAR_ONT":
        // Fallback após remoção do GenieACS.
        chatbotResponse.reply =
          "A função de reinicialização remota (REBOOT) está em manutenção. Por favor, tente reiniciar seu equipamento manualmente (tirando da tomada por 10 segundos).";
        chatbotResponse.acao = "REBOOT_INDISPONIVEL";
        break;

      case "SAUDACAO":
      default:
        chatbotResponse.reply = `Olá ${
          req.user.nome.split(" ")[0]
        }! Eu sou o assistente virtual da FiberNet. Como posso ajudar hoje? (Ex: "Minha internet está lenta" ou "Quero pagar a fatura")`;
        chatbotResponse.acao = "DEFAULT";
        break;
    }

    res.json(chatbotResponse);
  } catch (error) {
    console.error("[Chatbot Controller] Erro fatal no processamento:", error);
    res
      .status(500)
      .json({ reply: "Desculpe, ocorreu um erro interno na nossa IA." });
  }
};

// Função Simples para classificar a intenção (Em produção, usaria Gemini/Dialogflow)
function classificarIntencao(message) {
  const msg = message.toLowerCase();

  if (
    msg.includes("internet") ||
    msg.includes("lenta") ||
    msg.includes("caiu")
  ) {
    return "DIAGNOSTICO_INTERNET";
  }
  if (
    msg.includes("abrir chamado") ||
    msg.includes("chamar tecnico") ||
    msg.includes("abrir ticket")
  ) {
    return "ABRIR_CHAMADO";
  }
  if (msg.includes("reiniciar") || msg.includes("reboot")) {
    return "REINICIAR_ONT";
  }
  return "SAUDACAO";
}
