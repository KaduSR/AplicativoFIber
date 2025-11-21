// routes/instabilidade.js
const express = require("express");
const router = express.Router();
const { getInstabilities } = require("../services/downdetector");

router.get("/", async (req, res) => {
  try {
    const data = await getInstabilities();
    res.json(data);
  } catch (error) {
    console.error("Erro na rota de instabilidade:", error);
    res.status(500).json({ error: "Erro ao buscar status dos serviços" });
  }
});

module.exports = router;
