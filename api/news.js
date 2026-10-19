const SOURCES = [
 {name:"BBC Sport Football",url:"https://feeds.bbci.co.uk/sport/football/rss.xml",kind:"rss",category:"Europe",priority:1},
 {name:"Sky Sports Football",url:"https://www.skysports.com/rss/12040",kind:"rss",category:"Europe",priority:1},
 {name:"The Guardian Football",url:"https://www.theguardian.com/football/rss",kind:"rss",category:"Europe",priority:1},
 {name:"UEFA",url:"https://www.uefa.com/rssfeed/news/",kind:"rss",category:"Europe",priority:1},
 {name:"ESPN Soccer",url:"https://www.espn.com/espn/rss/soccer/news",kind:"rss",category:"International",priority:2},
 {name:"Google News Football Europe",url:"https://news.google.com/rss/search?q=football+soccer+Europe+transfer+news&hl=en-GB&gl=GB&ceid=GB:en",kind:"rss",category:"Europe",priority:2},
 {name:"Google News Football Maroc",url:"https://news.google.com/rss/search?q=football+Maroc+Botola+Maroc+football+news&hl=fr&gl=MA&ceid=MA:fr",kind:"rss",category:"Maroc",priority:2},
 {name:"FRMF",url:"https://frmf.ma/fr/categorie/actualites",kind:"html",category:"Maroc",priority:3},
 {name:"CAF",url:"https://www.cafonline.com/fr/ligue-des-champions/news/",kind:"html",category:"Afrique",priority:3}
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

function validHeadline(title) {
  const cleanTitle = clean(String(title || ""))
    .replace(/\s*[|–—-]\s*(BBC Sport|BBC News|The Guardian|Sky Sports|ESPN|Google News).*$/i, "")
    .trim();
  if (cleanTitle.length < 16 || cleanTitle.length > 190) return false;
  const normalized = cleanTitle.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const generic = new Set([
    "home", "accueil", "news", "football news", "latest news",
    "actualites", "actualites football", "toutes les actualites",
    "fixtures", "results", "standings", "tables", "teams", "players",
    "scores", "live scores", "contact", "about us", "read more",
    "en savoir plus", "voir plus", "subscribe", "sign in", "login",
    "privacy policy", "cookie policy", "official website",
    "federation royale marocaine de football", "caf online"
  ]);
  if (generic.has(normalized)) return false;
  if (/^(?:home|accueil|contact|privacy|cookies|newsletter)\b/i.test(cleanTitle)) return false;
  if (/^(?:the guardian|bbc sport|sky sports|espn|frmf|caf online)\s*[-|:]\s*(?:football|news|actualites)?$/i.test(cleanTitle)) return false;
  return true;
}

function isUsableArticle(item, source) {
  if (!item || !validHeadline(item.title) || !item.url) return false;
  let url;
  try { url = new URL(item.url); } catch { return false; }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (!url.pathname || url.pathname === "/") return false;
  if (/\/(?:category|categories|categorie|tag|author|page|search|results|fixtures|standings|tables)(?:\/|$)/i.test(url.pathname)) return false;
  if (source && source.kind === "html") {
    if (source.name === "FRMF" && !url.hostname.endsWith("frmf.ma")) return false;
    if (source.name === "CAF" && !url.hostname.endsWith("cafonline.com")) return false;
    if (!/(?:news|actualit|article|communique|football|botola|competition|selection|equipe|ligue)/i.test(url.pathname)) return false;
  }
  if (/\.pdf(?:$|\?)/i.test(url.href)) return false;
  return true;
}

function parseRss(xml, source) {
  const entries = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return entries.map(item => {
    const tagRaw = name => {
      const match = item.match(new RegExp("<" + name + "\\b[^>]*>([\\s\\S]*?)<\\/" + name + ">", "i"));
      return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
    };

    const title = clean(tagRaw("title"));
    const link = clean(tagRaw("link"));
    const rawDescription = tagRaw("description") || tagRaw("content:encoded");
    const decodedMarkup = decodeEntities(rawDescription);
    const description = clean(rawDescription);
    const pubDate = clean(tagRaw("pubDate") || tagRaw("dc:date"));

    const mediaTags = item.match(/<(?:media:thumbnail|media:content|enclosure)\b[^>]*>/gi) || [];
    const mediaTag = mediaTags.find(tag => {
      const type = (tag.match(/\btype\s*=\s*["']([^"']+)["']/i) || [, ""])[1];
      const match = tag.match(/\b(?:url|href)\s*=\s*["']([^"']+)["']/i);
      const mediaUrl = match ? match[1] : "";
      if (!mediaUrl || /\.(?:mp3|m4a|ogg|mp4|pdf)(?:$|[?#])/i.test(mediaUrl)) return false;
      return !type || /^image\//i.test(type) || /thumbnail/i.test(tag);
    });

    let image = "";
    if (mediaTag) {
      const match = mediaTag.match(/\b(?:url|href)\s*=\s*["']([^"']+)["']/i);
      if (match) image = absoluteUrl(match[1], source.url);
    }
    if (!image) {
      const imageMatch = decodedMarkup.match(/<(?:img|source)\b[^>]*(?:src|data-src|data-lazy-src|srcset)\s*=\s*["']([^"'\s,]+)["'][^>]*>/i);
      if (imageMatch) image = absoluteUrl(imageMatch[1], source.url);
    }

    const article = {
      title, url: absoluteUrl(link, source.url),
      description: description || title, image,
      date: pubDate && Number.isFinite(Date.parse(pubDate)) ? new Date(pubDate).toISOString() : "",
      source: source.name, category: source.category, priority: source.priority
    };
    return isUsableArticle(article, source) ? article : null;
  }).filter(Boolean);
}

function parseHtml(html, source) {
  const anchors = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];
  const found = [];
  for (const anchor of anchors) {
    const hrefMatch = anchor.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    const title = clean(anchor);
    const url = absoluteUrl(hrefMatch[1], source.url);
    if (!url) continue;

    const host = new URL(url).hostname;
    if (source.name === "FRMF" && !host.endsWith("frmf.ma")) continue;
    if (source.name === "CAF" && !host.endsWith("cafonline.com")) continue;

    const imageAttr =
      anchor.match(/<(?:img|source)\b[^>]*(?:src|data-src|data-lazy-src)\s*=\s*["']([^"']+)["']/i) ||
      anchor.match(/<(?:img|source)\b[^>]*srcset\s*=\s*["']([^"', ]+)/i);
    const image = imageAttr ? absoluteUrl(imageAttr[1], source.url) : "";
    const article = {
      title, url, description: title, image, date: "",
      source: source.name, category: source.category, priority: source.priority
    };
    if (!isUsableArticle(article, source)) continue;
    if (url.replace(/\/$/, "") === source.url.replace(/\/$/, "")) continue;
    found.push(article);
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
          signal: AbortSignal.timeout(4200)
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const body = await response.text();
        return source.kind === "rss" ? parseRss(body, source) : parseHtml(body, source);
      } catch (error) {
        console.warn("NEWS SOURCE FAILED:", source.name, error.message);
        return [];
      }
    }));
    const cutoff = Date.now() - 45 * 24 * 60 * 60 * 1000;
    const all = results.flat().filter(item => {
      const source = SOURCES.find(candidate => candidate.name === item.source);
      if (!isUsableArticle(item, source)) return false;
      const published = Date.parse(item.date || "");
      return !published || published >= cutoff;
    });
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
      if (ad && bd && ad !== bd) return bd - ad;
      if (ad && !bd) return -1;
      if (bd && !ad) return 1;
      if (!!a.image !== !!b.image) return a.image ? -1 : 1;
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
