/*
 * backend/services/speedtest.js
 */
// Importa a classe principal da biblioteca
const {
  UniversalSpeedTest,
  DistanceUnits,
  SpeedUnits,
} = require("universal-speedtest");

class SpeedtestService {
  // Configuração base que a biblioteca 'universal-speedtest' aceita
  // Você pode ajustar as unidades e o que medir aqui.
  static DEFAULT_OPTIONS = {
    debug: true, // Útil para depuração no backend
    tests: {
      measureDownload: true,
      measureUpload: true,
    },
    units: {
      distanceUnit: DistanceUnits.km, // Preferência por KM, em vez de MI
      downloadUnit: SpeedUnits.Mbps,
      uploadUnit: SpeedUnits.Mbps,
    },
    ooklaOptions: {
      serversToFetch: 10,
      connections: "multi",
      technology: "http",
    },
  };
  /**
   * @description Executa o teste completo (ping, download e upload) usando o Ookla.
   * @param {object} options Opções para o teste de velocidade.
   * @returns {Promise<OAResult>} Resultados do teste de velocidade.
   */

  async runSpeedtest(options = {}) {
    // Usa as opções padrão e sobrescreve com as opções fornecidas
    const mergedOptions = {
      ...SpeedtestService.DEFAULT_OPTIONS,
      ...options,
    };

    try {
      const test = new UniversalSpeedTest(mergedOptions);

      console.log("Iniciando Speedtest...");
      const result = await test.performOoklaTest(); // // Formata o resultado para a resposta (opcional, mas recomendado)

      return {
        client: result.client,
        ping: `${result.pingResult.latency}ms / Jitter: ${result.pingResult.jitter}ms`,
        download: `${result.downloadResult.speed} ${mergedOptions.units.downloadUnit}`,
        upload: `${result.uploadResult.speed} ${mergedOptions.units.uploadUnit}`,
        bestServer: result.bestServer,
        totalTime: `${result.totalTime}s`,
      };
    } catch (error) {
      console.error("[SpeedtestService] Erro ao executar o teste:", error);
      throw new Error("Não foi possível completar o teste de velocidade.");
    }
  }
  /**
   * @description Lista os servidores do Ookla disponíveis.
   * @param {number} serversToFetch Número de servidores para buscar.
   * @returns {Promise<OAServer[]>} Lista de servidores.
   */

  async listServers(serversToFetch) {
    const test = new UniversalSpeedTest(SpeedtestService.DEFAULT_OPTIONS);
    return test.listOoklaServers(serversToFetch); //
  }
}

module.exports = new SpeedtestService();
