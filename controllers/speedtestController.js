// controllers/SpeedtestController.js
const { UniversalSpeedTest, SpeedUnits } = require("universal-speedtest");

exports.run = async (req, res) => {
  try {
    // As opções para o teste podem ser ajustadas aqui ou vir do req.body, se necessário.
    const speedtest = new UniversalSpeedTest({
      tests: {
        measureDownload: true,
        measureUpload: true,
      },
      units: {
        downloadUnit: SpeedUnits.Mbps,
        uploadUnit: SpeedUnits.Mbps,
      },
    });

    // Executa o teste completo
    const results = await speedtest.performOoklaTest();

    // Retorna os resultados chaves
    return res.json({
      ping: results.pingResult.latency,
      jitter: results.pingResult.jitter,
      download: results.downloadResult.speed,
      upload: results.uploadResult.speed,
      clientIp: results.client.ip,
    });
  } catch (error) {
    console.error("Erro no Speedtest:", error);
    // Falha no teste de velocidade retorna um erro 500
    return res
      .status(500)
      .json({ message: "Falha ao executar teste de velocidade" });
  }
};
