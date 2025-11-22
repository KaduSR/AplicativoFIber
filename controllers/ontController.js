// src/controllers/ontController.js

// Função auxiliar para pegar a instância do GenieACS injetada no app
const getGenieACS = (req) => req.app.get("genieacs");

exports.getStatus = async (req, res) => {
  // O ID do cliente é extraído do token JWT
  const clienteId = req.user.id;
  const genieacs = getGenieACS(req);

  try {
    const status = await genieacs.getLiveStatus(clienteId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar status da ONT." });
  }
};

exports.reboot = async (req, res) => {
  const clienteId = req.user.id;
  const genieacs = getGenieACS(req);

  try {
    // Na vida real, mapear clienteId para serialNumber da ONT
    const result = await genieacs.rebootONT(clienteId);
    res.json(result);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Erro ao enviar comando de reboot." });
  }
};

exports.changeWifiPassword = async (req, res) => {
  const clienteId = req.user.id;
  const { newPassword } = req.body;
  const genieacs = getGenieACS(req);

  if (!newPassword || newPassword.length < 8) {
    return res
      .status(400)
      .json({
        success: false,
        message: "A senha deve ter no mínimo 8 caracteres.",
      });
  }

  try {
    const result = await genieacs.changeWifiPassword(clienteId, newPassword);
    res.json(result);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Erro ao trocar a senha Wi-Fi." });
  }
};
