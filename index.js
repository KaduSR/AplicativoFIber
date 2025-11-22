const axios = require("axios");
const cheerio = require("cheerio");

// URL da página inicial do Downdetector Brasil
const URL_DOWNDETECTOR =
  "[https://downdetector.com.br/](https://downdetector.com.br/)";

async function buscarServicosComInstabilidade() {
  console.log("Iniciando busca por serviços instáveis...");

  // 1. Obter o conteúdo HTML da página
  try {
    const headers = {
      // É crucial usar um User-Agent para simular um navegador real e evitar bloqueios de Cloudflare
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    };
    // Faz a requisição HTTP GET
    const response = await axios.get(URL_DOWNDETECTOR, { headers });
    const html = response.data;

    // 2. Carregar o HTML para o Cheerio
    // '$' agora é o seletor (como o jQuery) para o HTML da página
    const $ = cheerio.load(html);

    const servicosInstaveis = [];

    // 3. Encontrar e extrair os dados
    // Busca todos os blocos de empresa na página inicial
    $(".company-index").each((index, element) => {
      const $element = $(element);

      // Procura a tag SVG interna que tem a classe de cor 'warning' ou 'danger'.
      // A classe do SVG indica o status de instabilidade.
      const $statusSvg = $element.find("svg.warning, svg.danger");

      if ($statusSvg.length) {
        // Encontrou um SVG com status de alerta ou problema

        const nomeServico = $element.find("h5").text().trim();

        let status = "ALERTA (Warning)";
        if ($statusSvg.hasClass("danger")) {
          status = "PROBLEMA (Danger)";
        }

        // O atributo data-day contém o volume de relatórios nas últimas 24h
        const relatorios24h = $element.attr("data-day") || "N/A";

        servicosInstaveis.push({
          servico: nomeServico,
          status: status,
          relatorios_24h: relatorios24h,
        });
      }
    });

    return servicosInstaveis;
  } catch (error) {
    // Tratamento de erros de rede ou análise
    console.error(
      `\n❌ Erro durante a requisição ou análise: ${error.message}`
    );
    if (error.response) {
      console.error(`Código de Status HTTP: ${error.response.status}`);
    }
    return [];
  }
}

// --- Execução e Output ---
(async () => {
  const instaveis = await buscarServicosComInstabilidade();

  if (instaveis.length > 0) {
    console.log(
      "\n✅ Serviços com Instabilidade (Warning ou Danger) nas últimas 24h:"
    );
    console.log(
      "----------------------------------------------------------------"
    );
    instaveis.forEach((item) => {
      console.log(
        `Serviço: ${item.servico} | Status: ${item.status} | Relatórios (24h): ${item.relatorios_24h}`
      );
    });
  } else {
    console.log(
      "\n❌ Nenhuma instabilidade significativa encontrada ou houve um erro na busca."
    );
  }
})();
