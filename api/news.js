const SOURCES = [
  {
    name: "BBC News — Europe",
    url: "https://feeds.bbci.co.uk/news/world/europe/rss.xml",
    kind: "rss",
    category: "Europe",
    priority: 1
  },
  {
    name: "BBC News — Monde",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    kind: "rss",
    category: "Monde",
    priority: 2
  },
  {
    name: "The Guardian — Monde",
    url: "https://www.theguardian.com/world/rss",
    kind: "rss",
    category: "Monde",
    priority: 2
  },
  {
    name: "BBC News — Culture & célébrités",
    url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    kind: "rss",
    category: "Célébrités",
    priority: 3
  },
  {
    name: "Variety — Entertainment",
    url: "https://variety.com/feed/",
    kind: "rss",
    category: "Célébrités",
    priority: 3
  },
  {
    name: "Google News — Tendances Europe",
    url: "https://news.google.com/rss/search?q=Europe+trending+news&hl=en-GB&gl=GB&ceid=GB:en",
    kind: "rss",
    category: "Tendances",
    priority: 0
  },
  {
    name: "Google News — Tendances mondiales",
    url: "https://news.google.com/rss/search?q=world+trending+news&hl=en-GB&gl=GB&ceid=GB:en",
    kind: "rss",
    category: "Tendances",
    priority: 0
  },
  {
    name: "BBC Sport — Football",
    url: "https://feeds.bbci.co.uk/sport/football/rss.xml",
    kind: "rss",
    category: "Football européen",
    priority: 4
  },
  {
    name: "FRMF",
    url: "https://frmf.ma/fr/categorie/actualites",
    kind: "html",
    category: "Football marocain",
    priority: 5
  },
  {
    name: "CAF",
    url: "https://www.cafonline.com/fr/ligue-des-champions/news/",
    kind: "html",
    category: "Football africain",
    priority: 5
  }
];

function decodeEntities(value = "") {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function clean(value = "") {
  return decodeEntities(value.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ").trim();
}

function absoluteUrl(href, base) {
  try {
    const url = new URL(decodeEntities(href), base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.href;
  } catch {
    return "";
  }
}

function parseRss(xml, source) {
  const entries = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return entries.map(item => {
    const tag = name => {
      const match = item.match(new RegExp("<" + name + "\\b[^>]*>([\\s\\S]*?)<\\/" + name + ">", "i"));
      return match ? clean(match[1].replace(/<!\[CDATA\[|\]\]>/g, "")) : "";
    };
    const title = tag("title");
    const link = tag("link");
    const description = tag("description");
    const pubDate = tag("pubDate");
    return {
      title, url: absoluteUrl(link, source.url),
      description: description || title, date: pubDate && Number.isFinite(Date.parse(pubDate)) ? new Date(pubDate).toISOString() : "",
      source: source.name, category: source.category
    };
  }).filter(item => item.title && item.url);
}

function parseHtml(html, source) {
  const anchors = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];
  const found = [];
  for (const anchor of anchors) {
    const hrefMatch = anchor.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    const title = clean(anchor);
    if (title.length < 24 || title.length > 190) continue;
    if (/^(accueil|actualités|actualites|en savoir plus|lire plus|voir plus|news|contact|facebook|instagram)$/i.test(title)) continue;
    const url = absoluteUrl(hrefMatch[1], source.url);
    if (!url) continue;
    const host = new URL(url).hostname;
    if (source.name === "FRMF" && !host.endsWith("frmf.ma")) continue;
    if (source.name === "CAF" && !host.endsWith("cafonline.com")) continue;
    if (/\.pdf(?:$|\?)/i.test(url)) continue;
    if (url.replace(/\/$/, "") === source.url.replace(/\/$/, "")) continue;
    if (/\/(categorie|category|tag|author|page)\//i.test(new URL(url).pathname)) continue;
    found.push({
      title, url, description: title, date: "",
      source: source.name, category: source.category
    });
  }
  const seen = new Set();
  return found.filter(item => {
    const key = item.url.split("#")[0].replace(/\/$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const results = await Promise.all(SOURCES.map(async source => {
      try {
        const response = await fetch(source.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; BakhiraFootNews/1.0)",
            "Accept": source.kind === "rss" ? "application/rss+xml, application/xml, text/xml" : "text/html"
          },
          signal: AbortSignal.timeout(9000)
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const body = await response.text();
        return source.kind === "rss" ? parseRss(body, source) : parseHtml(body, source);
      } catch (error) {
        console.warn("NEWS SOURCE FAILED:", source.name, error.message);
        return [];
      }
    }));
    const all = results.flat().filter(item => item.title && item.url);
    const unique = [];
    const seenTitles = new Set();
    for (const item of all) {
      const key = item.title.toLowerCase().replace(/\s*[-|–]\s*(bbc news|bbc sport|the guardian|variety|google news).*$/i, "").replace(/[^a-z0-9à-ÿ]+/gi, " ").trim();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);
      unique.push(item);
    }
    unique.sort((a, b) => {
      const ad = Date.parse(a.date || "") || 0;
      const bd = Date.parse(b.date || "") || 0;
      if (ad && bd) return bd - ad;
      if (ad) return -1;
      if (bd) return 1;
      return (a.priority ?? 9) - (b.priority ?? 9);
    });
    return res.status(200).json({
      updatedAt: new Date().toISOString(),
      count: unique.length,
      articles: unique.slice(0, 36),
      sources: SOURCES.map(({ name, url, category }) => ({ name, url, category }))
    });
  } catch (error) {
    return res.status(500).json({ error: "news_unavailable", articles: [] });
  }
};
