// src/services/genieacs.js
const axios = require("axios");

class GenieACSService {
  constructor(url, user, password) {
    if (!url || !user || !password) {
      console.warn("[GenieACS] Configurações incompletas. Usando mocks.");
    }

    // 💡 Configuração do Axios para a API GenieACS
    this.api = axios.create({
      baseURL: url,
      auth: {
        username: user,
        password: password,
      },
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 10000,
    });
  }

  // =========================================================
  // 🔑 UTILITÁRIOS (Mapeamento Cliente ID -> Serial Number)
  // =========================================================

  /**
   * @private
   * Simula a busca do Serial Number da ONT a partir do ID do Cliente no IXC.
   * Na vida real, esta chamada deve ir para o IXC Service ou DB.
   */
  getOntSerialByClienteId(clienteId) {
    // Mock: Mapeamento simples
    return `HWTC${String(clienteId).padStart(8, "0")}`;
  }

  // =========================================================
  // ⚙️ AÇÕES DA ONT
  // =========================================================

  /**
   * @desc Envia um comando de Reboot para a ONT via GenieACS.
   */
  async rebootONT(clienteId) {
    const serialNumber = this.getOntSerialByClienteId(clienteId);
    console.log(`[GenieACS] Tentando Reboot para ${serialNumber}`);

    try {
      // 💡 Exemplo de requisição real do GenieACS
      await this.api.post(`/devices/${serialNumber}/tasks?connection_request`, {
        name: "Reboot",
        // Não precisa de parameters
      });

      return {
        success: true,
        message: `Comando de reboot enviado com sucesso para a ONT ${serialNumber}.`,
        status: "pending",
      };
    } catch (error) {
      console.error(`Erro ao dar reboot: ${error.message}`);
      return {
        success: false,
        message: `Falha ao comunicar com a ONT. Status: ${
          error.response ? error.response.status : "Erro de rede"
        }.`,
        status: "error",
      };
    }
  }

  /**
   * @desc Envia um comando para alterar a senha Wi-Fi via GenieACS.
   */
  async changeWifiPassword(clienteId, newPassword) {
    const serialNumber = this.getOntSerialByClienteId(clienteId);
    console.log(`[GenieACS] Alterando senha Wi-Fi para ${serialNumber}`);

    try {
      // 💡 Exemplo: SetParameterValue para o SSID 1
      await this.api.put(`/devices/${serialNumber}/parameters`, {
        path: "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey",
        value: newPassword,
        options: {
          // Configurações da RPC (seta como persistente)
        },
      });

      return {
        success: true,
        message: "Senha Wi-Fi alterada. A alteração pode levar até 2 minutos.",
      };
    } catch (error) {
      console.error(`Erro ao trocar Wi-Fi: ${error.message}`);
      return {
        success: false,
        message: "Falha ao enviar comando para trocar senha Wi-Fi.",
      };
    }
  }

  // =========================================================
  // 📈 STATUS E DIAGNÓSTICO
  // =========================================================

  /**
   * @desc Busca o status em tempo real da ONT/Conexão (para o Dashboard).
   */
  async getLiveStatus(clienteId) {
    const serialNumber = this.getOntSerialByClienteId(clienteId);

    // Na implementação real, você faria uma requisição GET para parâmetros específicos
    // const response = await this.api.get(`/devices/${serialNumber}/parameters?query=...`);

    // Por enquanto, mantemos o mock de diagnóstico para simular a resposta
    const diagnostic = await this.runDiagnostic(serialNumber);

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
   * @desc Mock de diagnóstico de conexão (A ser substituído por chamadas reais).
   */
  async runDiagnostic(serialNumber) {
    console.log(
      `[GenieACS Mock] Executando diagnóstico para Serial: ${serialNumber}`
    );

    const randomIssue = Math.random();

    let statusData = {
      ip: `187.1.2.x`, // IP do cliente (deve vir de outro parâmetro GenieACS)
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
