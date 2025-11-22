// src/controllers/ontController.js

const ixc = require("../services/ixc");

// Helper para obter a instância do GenieACSService (setada em server.js)
const getGenieACS = (req) => req.app.get("genieacs");

/**
 * @route GET /api/v1/ont/status
 * @desc Busca o status de conexão em tempo real via IXC (mapeamento) -> GenieACS.
 */
exports.getStatus = async (req, res) => {
  const clienteId = req.user.id;
  const genieacs = getGenieACS(req);

  try {
    // 1. Busca o identificador do dispositivo no IXC
    const serialNumber = await ixc.getOntIdentifier(clienteId);

    // 2. Executa a busca de status no GenieACS
    const status = await genieacs.getLiveStatus(serialNumber);

    res.json(status);
  } catch (error) {
    console.error("Erro em getStatus:", error.message);
    res
      .status(500)
      .json({ error: error.message || "Erro ao buscar status da ONT." });
  }
};

/**
 * @route POST /api/v1/ont/reboot
 * @desc Envia comando de reboot para a ONT via GenieACS.
 */
exports.reboot = async (req, res) => {
  const clienteId = req.user.id;
  const genieacs = getGenieACS(req);

  try {
    // 1. Busca o identificador do dispositivo no IXC
    const serialNumber = await ixc.getOntIdentifier(clienteId);

    // 2. Executa o comando no GenieACS
    const result = await genieacs.rebootONT(serialNumber);

    res.json(result);
  } catch (error) {
    console.error("Erro em reboot:", error.message);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Erro ao enviar comando de reboot.",
      });
  }
};

/**
 * @route POST /api/v1/ont/wifi-password
 * @desc Envia comando de troca de senha Wi-Fi para a ONT.
 */
exports.changeWifiPassword = async (req, res) => {
  const clienteId = req.user.id;
  const genieacs = getGenieACS(req);
  const { newPassword } = req.body;

  if (!newPassword) {
    return res
      .status(400)
      .json({ success: false, message: "A nova senha é obrigatória." });
  }

  try {
    // 1. Busca o identificador do dispositivo no IXC
    const serialNumber = await ixc.getOntIdentifier(clienteId);

    // 2. Executa o comando no GenieACS
    const result = await genieacs.changeWifiPassword(serialNumber, newPassword);

    res.json(result);
  } catch (error) {
    console.error("Erro em changeWifiPassword:", error.message);
    res
      .status(500)
      .json({
        success: false,
        message: error.message || "Erro ao trocar senha Wi-Fi.",
      });
  }
};
