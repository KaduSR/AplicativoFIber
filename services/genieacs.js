// src/services/genieacs.js

class GenieACSService {
  constructor(url, user, password) {
    this.url = url;
    this.user = user;
    this.password = password;
  }

  /**
   * @desc Simula a busca de status em tempo real da ONT/Conexão (Card Conexão).
   */
  async getLiveStatus(clienteId) {
    // Na vida real, o clienteId seria mapeado para o serialNumber da ONT
    const mockIP = `187.1.2.${clienteId % 255 || 100}`;
    const diagnostic = await this.runDiagnostic(mockIP);

    return {
      conexao_status: diagnostic.conexao_status,
      ip: diagnostic.ip,
      uptime: diagnostic.uptime,
      sinal_rx: diagnostic.sinal_rx,
      causa_problema: diagnostic.causa_problema,
      reboot_necessario: diagnostic.reboot_necessario,
    };
  }

  /**
   * @desc Simula uma chamada ao GenieACS para forçar um reboot.
   */
  async rebootONT(serialNumber) {
    console.log(
      `[GenieACS Mock] Enviando comando de Reboot para ${serialNumber}`
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      success: true,
      message: `Comando de reboot enviado com sucesso para a ONT ${serialNumber}.`,
      status: "rebooting",
    };
  }

  /**
   * @desc Simula a mudança de senha Wi-Fi via GenieACS.
   */
  async changeWifiPassword(clienteId, newPassword) {
    console.log(
      `[GenieACS Mock] Alterando Wi-Fi para cliente ${clienteId} com nova senha.`
    );
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      success: true,
      message: "Senha Wi-Fi alterada. A alteração pode levar até 2 minutos.",
    };
  }

  /**
   * @desc Simula a busca de diagnóstico e status da ONT/Conexão. (Método Auxiliar)
   */
  async runDiagnostic(ipAddress) {
    console.log(
      `[GenieACS Mock] Executando diagnóstico para IP/Serial: ${ipAddress}`
    );

    const randomIssue = Math.random();

    let statusData = {
      ip: ipAddress,
      conexao_status: "Online",
      sinal_rx: "-18.5 dBm",
      sinal_tx: "2.5 dBm",
      uptime: "48 dias",
      causa_problema: "Nenhuma falha crítica detectada.",
      reboot_necessario: false,
    };

    if (randomIssue < 0.2) {
      statusData.sinal_rx = "-28.0 dBm";
      statusData.conexao_status = "Instável/Oscilando";
      statusData.causa_problema =
        "Sinal Óptico Recebido (RX) muito baixo. Verifique a fibra na sua casa.";
      statusData.reboot_necessario = true;
    } else if (randomIssue < 0.4) {
      statusData.conexao_status = "Offline (Falha de Autenticação)";
      statusData.causa_problema =
        "O login do PPPoE não está autenticando. Pode ser bloqueio financeiro.";
      statusData.reboot_necessario = false;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    return statusData;
  }
}

module.exports = GenieACSService;
