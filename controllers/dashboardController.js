// src/controllers/dashboardController.js
const IXCService = require("../services/ixc");
const jwt = require("jsonwebtoken");

exports.getDashboardData = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fibernet2025");
    const clienteId = decoded.id;

    // Busca TODOS os dados em paralelo (rápido!)
    const [consumo, contrato, faturas, desbloqueio, protocolos] =
      await Promise.all([
        IXCService.getConsumption(clienteId),
        IXCService.getContractDetails(clienteId),
        IXCService.getFaturas(clienteId),
        IXCService.getConfidenceUnlockStatus(clienteId),
        IXCService.getProtocols(clienteId),
      ]);

    // Monta resposta final
    res.json({
      cliente: {
        id: clienteId,
        nome: decoded.nome || "Cliente",
        email: decoded.email,
      },
      plano: {
        velocidade: contrato.plan_speed || "Indisponível",
        status: contrato.status || "Ativo",
        endereco: contrato.address || "Não informado",
      },
      consumo: {
        download: consumo.download,
        upload: consumo.upload,
      },
      faturas: faturas.slice(0, 5), // últimas 5
      desbloqueio: {
        elegivel: desbloqueio.is_eligible,
        bloqueado: desbloqueio.is_blocked,
        podeDesbloquearAte: desbloqueio.can_unlock_until,
        mensagem: desbloqueio.message,
      },
      protocolo: {
        login: protocolos?.pppoe_login || "não_encontrado",
        senha: "***********",
        tipo: protocolos?.protocol_type || "PPPoE",
      },
      contratoPdf: contrato.contract_id
        ? IXCService.getContractPdfUrl(contrato.contract_id)
        : null,
    });
  } catch (error) {
    console.error("[Dashboard] Erro ao montar dados:", error.message);
    res.status(500).json({
      error: "Erro interno ao carregar dashboard",
      detalhes: error.message,
    });
  }
};
