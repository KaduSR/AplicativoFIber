// AplicativoFIber/controllers/dashboardController.js
const ixcService = require("../services/ixc");

/**
 * @desc Retorna todos os dados essenciais do cliente logado para o Dashboard.
 * @route GET /api/v1/dashboard/dados
 */
exports.getDashboardData = async (req, res) => {
  // ID do cliente obtido do JWT (configurado no middleware 'authenticate.js')
  const clienteId = req.user.ixcId;

  try {
    // Dispara todas as requisições essenciais em paralelo para otimizar o tempo
    const [cliente, contrato, conexao, faturas] = await Promise.all([
      ixcService.getCliente(clienteId),
      ixcService.getContrato(clienteId),
      ixcService.getDadosConexao(clienteId),
      ixcService.getFaturas(clienteId),
    ]);

    // Tratamento e Formatação dos dados
    const dadosConexao = conexao
      ? {
          login: conexao.login,
          status: conexao.online,
          plano: conexao.contrato_plano_venda_,
        }
      : null;

    const dadosFaturas = faturas.map((fatura) => ({
      id: fatura.id,
      valor: fatura.valor,
      status: fatura.status,
      vencimento: fatura.data_vencimento,
      codigo_barra: fatura.linha_digitavel,
      link_gateway: fatura.gateway_link,
      pix_txid: fatura.pix_txid,
    }));

    // Consolida a resposta
    res.json({
      dados_cliente: cliente || {},
      dados_contrato: contrato || {},
      dados_conexao: dadosConexao,
      faturas: dadosFaturas,
      // Você pode adicionar nota fiscal aqui se criar o serviço para o endpoint nfse.
      // notas_fiscais: await ixcService.getNotasFiscais(clienteId),
    });
  } catch (error) {
    console.error(
      `[DashboardController] Erro ao buscar dados do cliente ${clienteId}:`,
      error.message
    );
    res.status(500).json({
      error: "Erro interno ao buscar dados do cliente no IXC.",
      details: error.message,
    });
  }
};
