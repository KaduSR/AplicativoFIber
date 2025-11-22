/*
 * backend/controllers/speedtestController.js
 */
const speedtestService = require("../services/speedtest");

class SpeedtestController {
  // GET /api/v1/speedtest/servers
  async listServers(req, res) {
    // Exemplo: Permitir que o cliente defina quantos servidores quer
    const serversToFetch = parseInt(req.query.limit, 10) || 10;

    try {
      const servers = await speedtestService.listServers(serversToFetch);

      return res.status(200).json({
        message: "Lista de servidores Ookla obtida com sucesso.",
        data: servers,
      });
    } catch (error) {
      console.error("[SpeedtestController] Erro ao listar servidores:", error);
      return res.status(500).json({
        message: "Erro interno no servidor ao listar servidores.",
        error: error.message,
      });
    }
  }

  // POST /api/v1/speedtest/run
  async runTest(req, res) {
    // O corpo da requisição (req.body) pode conter opções customizadas
    // para o teste, como { tests: { measureUpload: false } }
    const options = req.body;

    try {
      const result = await speedtestService.runSpeedtest(options);

      return res.status(200).json({
        message: "Teste de velocidade concluído com sucesso.",
        result: result,
      });
    } catch (error) {
      // Em caso de erro na execução do teste (timeout, falha de conexão, etc.)
      return res.status(500).json({
        message: error.message,
        status: 500,
      });
    }
  }
}

module.exports = new SpeedtestController();
