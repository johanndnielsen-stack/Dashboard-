// Netlify serverless function.
// Default (no params): returns curated headlines for ro / ev / explorer.
// Search:  /.netlify/functions/news?feed=ro&q=energie
//          -> live Google News RSS search, scoped by language per feed.

const FEEDS = {
  ro: [
    { source: "HotNews",  url: "https://hotnews.ro/feed" },
    { source: "G4Media",  url: "https://www.g4media.ro/feed" },
    { source: "Digi24",   url: "https://www.digi24.ro/rss" },
  ],
  ev: [
    { source: "Electrek",  url: "https://electrek.co/feed/" },
    { source: "InsideEVs", url: "https://insideevs.com/rss/articles/all/" },
    { source: "The Verge", url: "https://www.theverge.com/rss/transportation/index.xml" },
  ],
  explorer: [
    { source: "Ford Explorer EV", url: "https://news.google.com/rss/search?q=%22Ford+Explorer%22+electric+EV&hl=en-US&gl=US&ceid=US:en" },
  ],
};

// Language scope for the search box in each section.
const SEARCH_LOCALE = {
  ro:       { hl: "ro",    gl: "RO", ceid: "RO:ro" },
  ev:       { hl: "en-US", gl: "US", ceid: "US:en", suffix: " electric vehicle" },
  explorer: { hl: "en-US", gl: "US", ceid: "US:en", suffix: " Ford Explorer" },
};

// Minimal RSS/Atom extractor. Also grabs Google News <source> publisher when present.
function parseItems(xml, fallbackSource, limit = 6) {
  const out = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    let titleRaw = (b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
    let link = (b.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || "";
    if (!link) link = (b.match(/<link[^>]*href="([^"]+)"/i) || [])[1] || "#";
    const pub = (b.match(/<source[^>]*>([\s\S]*?)<\/source>/i) || [])[1];
    const clean = (s) => s
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&").replace(/&#8217;|&#39;/g, "'").replace(/&quot;/g, '"')
      .trim();
    let title = clean(titleRaw);
    // Google News appends " - Publisher" to titles; trim it if we have the source separately.
    let source = pub ? clean(pub) : fallbackSource;
    if (pub && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3)).trim();
    if (title) out.push({ source, title, link: link.trim() });
    if (out.length >= limit) break;
  }
  return out;
}

async function fetchXml(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Dashboard)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

async function collect(list) {
  const results = await Promise.all(
    list.map(async (f) => parseItems(await fetchXml(f.url), f.source, 3))
  );
  const merged = [];
  for (let i = 0; i < 3; i++) for (const arr of results) if (arr[i]) merged.push(arr[i]);
  return merged.slice(0, 4);
}

async function search(feed, q) {
  const loc = SEARCH_LOCALE[feed] || SEARCH_LOCALE.ro;
  const query = encodeURIComponent(q + (loc.suffix || ""));
  const url = `https://news.google.com/rss/search?q=${query}&hl=${loc.hl}&gl=${loc.gl}&ceid=${loc.ceid}`;
  return parseItems(await fetchXml(url), "Google News", 5).slice(0, 5);
}

export async function handler(event) {
  const params = (event && event.queryStringParameters) || {};
  const q = (params.q || "").trim();
  const feed = params.feed;

  // Search mode
  if (q && feed && SEARCH_LOCALE[feed]) {
    const items = await search(feed, q);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
      body: JSON.stringify({ items }),
    };
  }

  // Default dashboard payload
  const [ro, ev, explorer] = await Promise.all([
    collect(FEEDS.ro),
    collect(FEEDS.ev),
    collect(FEEDS.explorer),
  ]);
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=900" },
    body: JSON.stringify({ ro, ev, explorer }),
  };
}
