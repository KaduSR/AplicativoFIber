// routes/speedtest.js
const express = require("express");
const router = express.Router();
const SpeedtestController = require("../controllers/speedtestController");

/**
 * @route POST /api/speedtest/run
 * @desc Inicia o teste de velocidade no servidor.
 */
router.post("/run", SpeedtestController.run);

module.exports = router;
