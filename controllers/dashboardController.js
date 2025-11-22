// src/controllers/dashboardController.js
const ixc = require("../services/ixc");

// A função getGenieACS foi removida, pois a funcionalidade ACS foi descontinuada.

/**
 * @desc Mock do status de conexão, usado na ausência do GenieACS.
 * Na vida real, o IXC ou um sistema de monitoramento retornaria o estado da conexão.
 * @returns {object} Status simulado da conexão.
 */
const mockConnectionStatus = () => {
  return {
    status: "Online", // Simula o status da conexão (Online, Offline, Instável)
    ip: "192.168.1.100", // IP simulado
    uptime: "20 dias, 5h", // Tempo de atividade simulado
    sinal_rx: "-18.0 dBm", // Sinal óptico RX simulado
    diagnostico_msg: "A conexão está estável e o sinal óptico está excelente.",
  };
};

/**
 * @route GET /api/v1/dashboard/dados
 * @desc Busca todos os dados do cliente (consumo, contrato, financeiro) em paralelo.
 */
exports.getDashboardData = async (req, res) => {
  // O ID do cliente vem do payload JWT (req.user.id)
  const clienteId = req.user.id;

  try {
    // 💡 Promise.all: Busca todos os dados no IXC em paralelo para máxima performance
    const [consumption, contractDetails, confidenceStatus, protocols, faturas] =
      await Promise.all([
        ixc.getConsumption(clienteId),
        ixc.getContractDetails(clienteId),
        ixc.getConfidenceUnlockStatus(clienteId),
        ixc.getProtocols(clienteId),
        ixc.getFaturas(clienteId),
      ]);

    // Simula o status da conexão já que o GenieACS foi removido
    const liveStatus = mockConnectionStatus();

    res.json({
      connection: {
        ...liveStatus, // status, ip, uptime, sinal... (Mock/IXC)
        ...consumption, // download, upload (IXC)
      },
      contract: {
        ...contractDetails, // plan_speed, address, contract_id (IXC)
        // URL para PDF do contrato: usa o método do IXC, se houver detalhes do contrato
        contract_pdf_url: contractDetails
          ? ixc.getContractPdfUrl(contractDetails.contract_id)
          : null,
      },
      finance: {
        faturas: faturas,
        confidenceUnlock: confidenceStatus, // is_blocked, is_eligible (IXC)
      },
      protocols: protocols, // Detalhes de protocolos de conexão (IXC)
    });
  } catch (error) {
    console.error(`Erro ao montar Dashboard para cliente ${clienteId}:`, error);
    res.status(500).json({ error: "Erro interno ao carregar o Dashboard" });
  }
};

/**
 * @route POST /api/v1/dashboard/desbloqueio
 * @desc Controla a ação de Desbloqueio de Confiança
 */
exports.performUnlock = async (req, res) => {
  const clienteId = req.user.id; // ID do cliente autenticado

  try {
    const result = await ixc.performConfidenceUnlock(clienteId);
    if (result.success) {
      // 200 OK
      res.json(result);
    } else {
      // 400 Bad Request se o IXC retornou falha na regra de negócio
      res.status(400).json(result);
    }
  } catch (error) {
    console.error(
      `Erro ao tentar desbloqueio de confiança para ${clienteId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: "Erro interno ao processar a solicitação de desbloqueio.",
    });
  }
};
