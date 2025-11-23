// src/controllers/dashboardController.js
const IXCService = require("../services/ixc");
const jwt = require("jsonwebtoken");
const md5 = require("md5");

exports.getDashboardData = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token ausente" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fibernet2025");
    const clienteId = decoded.id;

    // Busca todos os dados em paralelo
    const [clienteRaw, contrato, consumo, faturas] = await Promise.all([
      IXCService.list("cliente", {
        qtype: "cliente.id",
        query: clienteId,
        oper: "=",
        limit: 1,
      }),
      IXCService.getContractDetails(clienteId),
      IXCService.getConsumption(clienteId),
      IXCService.getFaturas(clienteId),
    ]);

    const cliente = clienteRaw.registros?.[0] || {};

    res.json({
      cliente: {
        nome: cliente.razao || "Cliente",
        email: cliente.hotsite_email || decoded.email,
        cpf_cnpj: cliente.cnpj_cpf || "Não informado",
      },
      plano: {
        velocidade: contrato.plan_speed || "Não informado",
        status: contrato.status || "Desconhecido",
        endereco:
          cliente.endereco_instalacao || cliente.endereco || "Não informado",
      },
      consumo: {
        download: consumo.download || "0 GB",
        upload: consumo.upload || "0 GB",
      },
      faturas:
        faturas.length > 0
          ? faturas
          : [{ valor: "0,00", vencimento: "-", status: "Nenhuma fatura" }],
      contratoPdf: contrato.contract_id
        ? IXCService.getContractPdfUrl(contrato.contract_id)
        : null,
    });
  } catch (error) {
    console.error("[Dashboard] Erro:", error.message);
    res.status(500).json({ error: "Erro ao carregar dados" });
  }
};

// NOVA ROTA: Trocar senha do hotsite
exports.trocarSenha = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const { senhaAtual, novaSenha } = req.body;

    if (!token || !senhaAtual || !novaSenha) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fibernet2025");
    const clienteId = decoded.id;

    // Busca cliente atual
    const clienteRaw = await IXCService.list("cliente", {
      qtype: "cliente.id",
      query: clienteId,
      oper: "=",
      limit: 1,
    });

    const cliente = clienteRaw.registros?.[0];
    if (!cliente)
      return res.status(404).json({ error: "Cliente não encontrado" });

    // Verifica senha atual
    const senhaCorreta =
      cliente.senha_hotsite_md5 === "S"
        ? cliente.senha === md5(senhaAtual)
        : cliente.senha === senhaAtual;

    if (!senhaCorreta) {
      return res.status(401).json({ error: "Senha atual incorreta" });
    }

    // Atualiza senha (força MD5 para compatibilidade)
    const resultado = await IXCService.post(
      "cliente",
      {
        id: clienteId,
        senha: md5(novaSenha),
        senha_hotsite_md5: "S",
      },
      "editar"
    );

    if (resultado.error) {
      return res.status(500).json({ error: "Erro ao salvar nova senha" });
    }

    res.json({ success: true, message: "Senha alterada com sucesso!" });
  } catch (error) {
    console.error("[Trocar Senha] Erro:", error.message);
    res.status(500).json({ error: "Erro interno" });
  }
};
