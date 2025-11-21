const axios = require("axios");
const cheerio = require("cheerio");

// Configuração do cliente HTTP (Headers reais para evitar bloqueio 403)
const browserClient = axios.create({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
  },
});

let cache = {
  lastUpdate: 0,
  data: [],
  ttl: 15 * 60 * 1000, // 15 minutos de cache para não sobrecarregar
};

// --- NOVA FUNÇÃO: Busca a lista de serviços direto da Home ---
async function fetchTopServices() {
  try {
    console.log("🔍 Buscando lista de serviços em alta no Downdetector...");
    const { data } = await browserClient.get("https://downdetector.com.br/");
    const $ = cheerio.load(data);

    const services = [];

    // Seleciona os cards da home (pode variar o seletor, este é genérico para links de status)
    // Geralmente são links no formato /status/nome-do-servico/
    $('a[href^="/status/"]').each((i, el) => {
      const href = $(el).attr("href");
      // Extrai o ID da URL (ex: /status/whatsapp/ -> whatsapp)
      const id = href.replace("/status/", "").replace("/", "");

      // Tenta achar o nome legível (geralmente está num h3, div ou no texto do link)
      let name = $(el).find(".service-name, h3, h4").text().trim();
      if (!name) name = id.charAt(0).toUpperCase() + id.slice(1); // Fallback

      // Evita duplicatas e links inválidos
      if (id && !services.find((s) => s.id === id)) {
        services.push({ id, name });
      }
    });

    console.log(
      `📋 Encontrados ${services.length} serviços na página inicial.`
    );
    return services;
  } catch (error) {
    console.error("❌ Erro ao buscar lista de serviços:", error.message);
    // Retorna lista de fallback caso a home falhe
    return [
      { id: "whatsapp-messenger", name: "WhatsApp" },
      { id: "instagram", name: "Instagram" },
      { id: "facebook", name: "Facebook" },
      { id: "youtube", name: "YouTube" },
      { id: "nubank", name: "Nubank" },
    ];
  }
}

async function checkService(service) {
  const url = `https://downdetector.com.br/status/${service.id}/`;

  try {
    const { data } = await browserClient.get(url);
    const $ = cheerio.load(data);

    // Captura o texto de status
    let statusText =
      $(".entry-title").text().trim() ||
      $("div.indicator-title").text().trim() ||
      "";
    statusText = statusText.toLowerCase();

    let status = "operational";
    let isFailure = false;

    // Lógica de detecção de palavras-chave
    if (
      statusText.includes("problema") ||
      statusText.includes("falha") ||
      statusText.includes("instabilidade")
    ) {
      // Verifica falsos positivos ("não indicam problemas")
      if (
        !statusText.includes("não indicam") &&
        !statusText.includes("sem problemas")
      ) {
        status = "warning";
        isFailure = true;
      }
    }

    // Busca número de notificações (opcional, para medir gravidade)
    // Ex: "Relatórios de problemas: 543"
    // const reportsText = $(".uw-heatmap-label").text() || "";

    return {
      id: service.id,
      name: service.name,
      status: status,
      updatedAt: new Date().toISOString(),
      reason: isFailure ? statusText : null,
    };
  } catch (e) {
    // Se der 404 ou erro, assume operacional para não quebrar a lista
    return {
      id: service.id,
      name: service.name,
      status: "operational",
      updatedAt: new Date().toISOString(),
    };
  }
}

async function getInstabilities() {
  const now = Date.now();

  // Retorna cache se válido
  if (now - cache.lastUpdate < cache.ttl && cache.data.length > 0) {
    return cache.data;
  }

  // 1. Busca a lista dinâmica de serviços
  const allServices = await fetchTopServices();

  // 2. Filtra os Top 30 (para não demorar 5 minutos fazendo requests)
  // Se quiser todos, remova o .slice, mas cuidado com timeout do Render/Heroku
  const targetServices = allServices.slice(0, 30);

  console.log(`🔄 Verificando status de ${targetServices.length} serviços...`);

  // 3. Checa status em paralelo
  // Adicionamos um pequeno delay aleatório para não parecer ataque DDoS
  const promises = targetServices.map(async (s, index) => {
    await new Promise((resolve) => setTimeout(resolve, index * 100)); // Delay escalonado
    return checkService(s);
  });

  const results = await Promise.all(promises);

  // 4. Filtra apenas quem tem problema
  const problems = results.filter((r) => r.status !== "operational");

  console.log(
    `✅ Varredura concluída. ${problems.length} instabilidades detectadas.`
  );

  // Atualiza cache
  cache = { lastUpdate: now, data: problems };

  return problems;
}

module.exports = { getInstabilities };
