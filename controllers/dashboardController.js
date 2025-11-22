// src/controllers/dashboardController.js
const ixc = require("../services/ixc");

// Função auxiliar para pegar a instância do GenieACS injetada no app
const getGenieACS = (req) => req.app.get("genieacs");

exports.getDashboardData = async (req, res) => {
  // O ID do cliente vem do payload JWT (req.user.id)
  const clienteId = req.user.id;
  const genieacs = getGenieACS(req);

  try {
    // 💡 Promise.all: Busca todos os dados em paralelo para máxima performance
    const [
      liveStatus,
      consumption,
      contractDetails,
      confidenceStatus,
      protocols,
      faturas,
    ] = await Promise.all([
      genieacs.getLiveStatus(clienteId),
      ixc.getConsumption(clienteId),
      ixc.getContractDetails(clienteId),
      ixc.getConfidenceUnlockStatus(clienteId),
      ixc.getProtocols(clienteId),
      ixc.getFaturas(clienteId),
    ]);

    res.json({
      connection: {
        ...liveStatus, // status, ip, uptime, sinal... (GenieACS)
        ...consumption, // download, upload (IXC)
      },
      contract: {
        ...contractDetails, // plan_speed, address, contract_id (IXC)
        contract_pdf_url: contractDetails
          ? ixc.getContractPdfUrl(contractDetails.contract_id)
          : null,
      },
      finance: {
        faturas: faturas,
        confidenceUnlock: confidenceStatus, // is_blocked, is_eligible (IXC)
      },
      protocols: protocols, // (IXC)
    });
  } catch (error) {
    console.error(`Erro ao montar Dashboard para cliente ${clienteId}:`, error);
    res.status(500).json({ error: "Erro interno ao carregar o Dashboard" });
  }
};

// Controla a ação de Desbloqueio de Confiança
exports.performUnlock = async (req, res) => {
  const clienteId = req.user.id;

  try {
    const result = await ixc.performConfidenceUnlock(clienteId);
    if (result.success) {
      res.json(result);
    } else {
      // Em caso de erro de lógica de negócio (ex: não é elegível)
      res.status(400).json(result);
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Falha na comunicação com o IXC." });
  }
};
