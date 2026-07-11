// Proxies YouTube Data API v3 search so the API key stays server-side.
// Set YOUTUBE_API_KEY in Netlify → Site settings → Environment variables.
// Call: /.netlify/functions/youtube?q=ford+explorer

export async function handler(event) {
  const params = (event && event.queryStringParameters) || {};
  const q = (params.q || "").trim();
  if (!q) {
    return { statusCode: 400, body: JSON.stringify({ error: "missing q" }) };
  }

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "no_key", items: [] }),
    };
  }

  const url =
    "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=9&safeSearch=moderate" +
    "&q=" + encodeURIComponent(q) +
    "&key=" + key;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "yt_" + res.status, items: [] }),
      };
    }
    const data = await res.json();
    const items = (data.items || [])
      .filter((i) => i.id && i.id.videoId)
      .map((i) => ({
        id: i.id.videoId,
        title: decode(i.snippet.title),
        channel: decode(i.snippet.channelTitle),
        thumb: (i.snippet.thumbnails.medium || i.snippet.thumbnails.default).url,
      }));
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=600" },
      body: JSON.stringify({ items }),
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "fetch_failed", items: [] }),
    };
  }
}

function decode(s = "") {
  return s
    .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
