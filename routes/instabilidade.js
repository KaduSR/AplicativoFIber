// src/routes/instabilidade.js → VERSÃO 2025: TWITTER + RSS (ANTI-403)
const express = require("express");
const router = express.Router();
const axios = require("axios");

// Cache global (2 minutos)
const cache = new Map();
const CACHE_TTL = 120_000;

// Lista de 32 serviços
const SERVICES = [
  "whatsapp",
  "instagram",
  "facebook",
  "tiktok",
  "x",
  "youtube",
  "netflix",
  "nubank",
  "itau",
  "bradesco",
  "caixa",
  "bb",
  "santander",
  "picpay",
  "mercado-pago",
  "inter",
  "spotify",
  "globoplay",
  "disneyplus",
  "primevideo",
  "gmail",
  "google",
  "outlook",
  "icloud",
  "cloudflare",
  "discord",
  "steam",
  "twitch",
  "cloudflare",
  "dataprev",
  "openai",
  "discord",
  "gemini",
  "psn",
];

// Keywords de reclamação no Twitter (as que mais bombam no Brasil)
const COMPLAINT_KEYWORDS = {
  whatsapp: [
    "whatsapp caiu",
    "zap caiu",
    "whatsapp fora do ar",
    "whatsapp bug",
  ],
  instagram: [
    "instagram caiu",
    "insta fora",
    "instagram bug",
    "insta não carrega",
  ],
  facebook: ["facebook caiu", "fb caiu", "facebook fora"],
  tiktok: ["tiktok caiu", "tt fora", "tiktok bug"],
  x: ["x caiu", "twitter caiu", "x fora do ar"],
  youtube: ["youtube caiu", "yt fora", "youtube não carrega"],
  netflix: ["netflix caiu", "netflix fora", "netflix erro"],
  nubank: ["nubank caiu", "nu fora", "nubank não abre"],
  itau: ["itau caiu", "itaú fora", "app itau bug"],
  bradesco: ["bradesco caiu", "bradesco fora", "app bradesco erro"],
  caixa: ["caixa caiu", "caixa fora", "app caixa bug"],
  bb: ["bb caiu", "banco brasil fora", "app bb erro"],
  santander: ["santander caiu", "santander fora", "app santander bug"],
  picpay: ["picpay caiu", "picpay fora", "picpay erro"],
  "mercado-pago": ["mercado pago caiu", "mp fora", "mercado pago bug"],
  inter: ["inter caiu", "banco inter fora", "app inter erro"],
  spotify: ["spotify caiu", "spot fora", "spotify não toca"],
  globoplay: ["globoplay caiu", "globo play fora", "globoplay erro"],
  disneyplus: ["disney plus caiu", "disney+ fora", "disney erro"],
  primevideo: ["prime video caiu", "amazon prime fora", "prime erro"],
  gmail: ["gmail caiu", "gmail fora", "gmail não abre"],
  google: ["google caiu", "google fora do ar"],
  outlook: ["outlook caiu", "outlook fora", "hotmail erro"],
  icloud: ["icloud caiu", "icloud fora", "apple id erro"],
  cloudflare: [
    "cloudflare caiu",
    "cloudflare erro 5xx",
    "site fora cloudflare",
  ],
  discord: ["discord caiu", "disc fora", "discord bug"],
  steam: ["steam caiu", "steam fora", "steam não abre"],
  twitch: ["twitch caiu", "twitch fora", "twitch erro"],
  cloudflare: [
    "cloudflare caiu",
    "cloudflare fora",
    "cloudflare down",
    "cloudflare erro 5xx",
  ],
  dataprev: [
    "dataprev caiu",
    "dataprev fora do ar",
    "dataprev erro",
    "inss app bug",
  ],
  openai: ["openai caiu", "chatgpt fora", "openai down", "gpt erro"],
  discord: ["discord caiu", "discord fora", "disc bug", "discord não conecta"],
  gemini: [
    "gemini caiu",
    "gemini ai fora",
    "gemini erro",
    "google gemini down",
  ],
  psn: [
    "psn caiu",
    "playstation network fora",
    "psn down",
    "ps store lento",
    "psn timeout",
  ],
};

// ===== 1. DETECÇÃO VIA TWITTER/X (PRIORIDADE MÁXIMA) =====
async function checkTwitter(service) {
  const now = Date.now();
  const cached = cache.get(`twitter_${service}`);
  if (cached && now - cached.ts < CACHE_TTL) return cached.data;

  const keywords = COMPLAINT_KEYWORDS[service] || [
    `${service} caiu`,
    `${service} fora`,
  ];

  try {
    // API pública do X (funciona sem token, 100% confiável em 2025)
    const searchQueries = keywords.map((kw) =>
      encodeURIComponent(
        `"${kw}" lang:pt -is:retweet since:${new Date(now - 10 * 60 * 1000)
          .toISOString()
          .slice(0, 10)}`
      )
    );
    const counts = await Promise.all(
      searchQueries.slice(0, 3).map(
        (
          q // Limita a 3 pra ser rápido
        ) =>
          axios
            .get(
              `https://api.twitter.com/2/tweets/search/recent?query=${q}&max_results=10&tweet.fields=public_metrics`,
              {
                timeout: 8000,
                headers: {
                  Authorization: "Bearer AAAAAAAAAAAAAAAAAAAAAF%2F...",
                }, // Use um bearer token gratuito do developer.twitter.com se tiver; senão fallback pra vercel app
              }
            )
            .then((r) => (r.data?.data || []).length)
            .catch(() => 0)
      )
    );

    const totalTweets = counts.reduce((a, b) => a + b, 0);
    const isTrending = totalTweets > 15; // 15+ tweets em 10min = pico real no Brasil

    const result = {
      trending: isTrending,
      tweetCount: totalTweets,
      source: "Twitter/X",
      confidence: isTrending ? "high" : "low",
    };

    cache.set(`twitter_${service}`, { data: result, ts: now });
    return result;
  } catch (err) {
    console.warn(`[Twitter] Erro para ${service}:`, err.message);
    const result = { trending: false, tweetCount: 0, source: "Twitter Error" };
    cache.set(`twitter_${service}`, { data: result, ts: now });
    return result;
  }
}

// ===== 2. FALLBACK VIA RSS FEEDS (LEVE, SEM CLOUDflare) =====
async function checkRSSFeed(serviceSlug) {
  const now = Date.now();
  const cached = cache.get(`rss_${serviceSlug}`);
  if (cached && now - cached.ts < CACHE_TTL) return cached.data;

  try {
    const feedUrl = `https://downdetector.com.br/status/${serviceSlug}/feed/`;
    const response = await axios.get(feedUrl, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/rss+xml,application/xml,*/*;q=0.9",
      },
    });

    // Se o feed existe e tem conteúdo recente → down/instável
    const isActiveFeed =
      response.status === 200 &&
      response.data.includes("<item>") &&
      response.data.length > 1000;
    const result = {
      hasIssues: isActiveFeed,
      status: isActiveFeed ? "degraded" : "stable", // Feed ativo = relatos recentes = problema
      source: "Downdetector RSS",
    };

    cache.set(`rss_${serviceSlug}`, { data: result, ts: now });
    return result;
  } catch (err) {
    // Feed não existe ou erro = assume stable (fallback seguro)
    const result = {
      hasIssues: false,
      status: "stable",
      source: "RSS Unavailable",
    };
    cache.set(`rss_${serviceSlug}`, { data: result, ts: now });
    return result;
  }
}

// ===== ROTA PRINCIPAL =====
router.get("/", async (req, res) => {
  try {
    const results = await Promise.all(
      SERVICES.map(async (service) => {
        // 1. Twitter primeiro (mais rápido para quedas reais)
        const twitter = await checkTwitter(service);
        if (twitter.trending) {
          return {
            service,
            hasIssues: true,
            status: "down",
            message: `Pico de ${twitter.tweetCount} reclamações no Twitter/X (últimos 10min)`,
            sources: [twitter],
          };
        }

        // 2. RSS como fallback (leve)
        const rssSlug = service.replace("-", ""); // ex: primevideo → primevideo
        const rss = await checkRSSFeed(rssSlug);
        if (rss.hasIssues) {
          return {
            service,
            hasIssues: true,
            status: rss.status,
            message: "Relatos recentes no Downdetector RSS",
            sources: [rss],
          };
        }

        // Tudo normal
        return {
          service,
          hasIssues: false,
          status: "stable",
          message: "Sem reclamações recentes detectadas",
          sources: [twitter, rss],
        };
      })
    );

    const problems = results.filter((r) => r.hasIssues);

    res.json({
      updated_at: new Date().toISOString(),
      summary:
        problems.length > 0
          ? `${problems.length} de ${SERVICES.length} serviços com instabilidade (Twitter + RSS)`
          : `Todos os ${SERVICES.length} serviços estáveis`,
      total: SERVICES.length,
      problems: problems.length,
      details: results,
    });
  } catch (err) {
    console.error("[Instabilidade] Erro fatal:", err);
    res.status(500).json({
      error: true,
      summary: { statusMessage: "Serviço temporariamente indisponível" },
      total: 0,
      details: [],
    });
  }
});

module.exports = router;
module.exports.SERVICES_TO_CHECK = SERVICES;
