const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const ipaddr = require("ipaddr.js");

// Rota: /api/speedtest/getIP
// Retorna o IP do cliente para o teste
router.get("/getIP", (req, res) => {
  let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (ip.includes(",")) ip = ip.split(",")[0].trim();

  try {
    const addr = ipaddr.parse(ip);
    if (addr.kind() === "ipv6" && addr.isIPv4MappedAddress()) {
      ip = addr.toIPv4Address().toString();
    }
  } catch (e) {
    // Mantém o IP original em caso de erro no parser
  }

  // Formato esperado pelo LibreSpeed
  res.send({ processedString: ip, rawIpv6: ip });
});

// Rota: /api/speedtest/garbage (Download Test)
// Gera dados aleatórios para o cliente baixar
router.get("/garbage", (req, res) => {
  const chunkCount = parseInt(req.query.ckSize) || 4;
  const buffer = crypto.randomBytes(1048576); // 1MB Buffer

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Cache-Control", "no-store, no-cache, max-age=0");

  for (let i = 0; i < chunkCount; i++) {
    res.write(buffer);
  }
  res.end();
});

// Rota: /api/speedtest/empty (Upload Test)
// Recebe dados do cliente e descarta (mede velocidade de upload)
router.all("/empty", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, max-age=0");
  res.send("");
});

module.exports = router;
