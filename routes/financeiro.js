const express = require("express");
const router = express.Router();
const ixc = require("../services/ixc");

router.get("/faturas", async (req, res) => {
  try {
    const faturas = await ixc.getFaturas(req.user.id);
    res.json(faturas);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar faturas" });
  }
});

router.get("/boleto/:id", async (req, res) => {
  try {
    const boleto = await ixc.getBoleto(req.params.id);
    res.json(boleto);
  } catch (error) {
    res.status(500).json({ error: "Erro ao gerar boleto" });
  }
});

module.exports = router;
