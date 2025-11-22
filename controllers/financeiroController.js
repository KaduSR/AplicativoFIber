// AplicativoFIber/controllers/financeiroController.js
const ixcService = require("../services/ixc");

/**
 * @desc Lista todas as faturas de um cliente logado, usando o ID do JWT.
 * @route GET /api/v1/faturas/minhas-faturas
 */
exports.getMinhasFaturas = async (req, res) => {
  // Padronizado para req.user.id
  const clienteId = req.user.id;

  try {
    const faturas = await ixcService.getFaturas(clienteId); // Chama o método do service

    if (!faturas || faturas.length === 0) {
      return res.json({
        message: "Nenhuma fatura encontrada.",
        faturas: [],
      });
    }

    // Retorna a lista de faturas (registros brutos do IXC)
    res.json(faturas);
  } catch (error) {
    console.error(
      `[FinanceiroController] Erro ao buscar faturas para o cliente ${clienteId}:`,
      error.message
    );
    res.status(500).json({ error: "Erro interno ao buscar faturas." });
  }
};

/**
 * @desc Gera o boleto (PDF em base64) de uma fatura específica.
 * @route GET /api/v1/faturas/boleto/:id
 */
exports.getBoleto = async (req, res) => {
  const boletoId = req.params.id;

  if (!boletoId) {
    return res.status(400).json({ message: "ID do boleto é obrigatório." });
  }

  try {
    // Chama o serviço para gerar o boleto (que retorna o PDF em base64)
    const boletoData = await ixcService.getBoleto(boletoId);

    if (boletoData && boletoData.base64) {
      // Retorna a base64
      return res.json({
        id: boletoId,
        base64: boletoData.base64,
        message: "Boleto gerado com sucesso.",
      });
    }

    // Trata falhas na geração do boleto (ex: título pago, título cancelado)
    res.status(404).json({
      error: "Boleto não encontrado, pago ou inacessível.",
      details: boletoData,
    });
  } catch (error) {
    console.error(
      `[FinanceiroController] Erro ao gerar boleto ${boletoId}:`,
      error.message
    );
    res.status(500).json({ error: "Erro interno ao gerar boleto." });
  }
};

module.exports = {
  getMinhasFaturas,
  getBoleto,
};
