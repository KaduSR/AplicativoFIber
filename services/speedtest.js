/*
 * backend/services/speedtest.js
 * NOTA: Este arquivo foi tornado obsoleto porque a dependência 'universal-speedtest'
 * causava conflitos de dependência no ambiente Node.js.
 * A lógica do Speedtest foi movida para um Mock no controller ou deve ser manipulada pelo Librespeed Worker no frontend.
 */

class SpeedtestService {
  async runSpeedtest(options = {}) {
    throw new Error(
      "O serviço Universal Speedtest foi desativado devido a conflitos de dependência. Use o worker Librespeed."
    );
  }

  async listServers(serversToFetch) {
    return [];
  }
}

module.exports = new SpeedtestService();
