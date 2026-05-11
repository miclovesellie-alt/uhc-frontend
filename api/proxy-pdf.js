// Vercel Serverless Function — /api/proxy-pdf?url=ENCODED_URL
//
// Uses https.get() with MANUAL redirect following so it works on Node 14/16/18/20.
// (fetch() is only globally available on Node 18+ — can't rely on it here.)
// Cloudinary serves raw files through CDN redirects (301/302), which plain
// https.get() silently ignores. This implementation follows up to 5 redirects.

const https = require("https");
const http  = require("http");

function getFollowRedirects(url, hops) {
  return new Promise((resolve, reject) => {
    if (hops > 5) return reject(new Error("Too many redirects"));
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; UHC-Proxy/2.0)" } }, (res) => {
      const { statusCode, headers } = res;
      if ([301, 302, 303, 307, 308].includes(statusCode) && headers.location) {
        res.resume(); // drain so socket can be reused
        const next = headers.location.startsWith("http")
          ? headers.location
          : new URL(headers.location, url).href;
        return resolve(getFollowRedirects(next, hops + 1));
      }
      resolve(res);
    }).on("error", reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url parameter" });

  let decoded;
  try {
    decoded = decodeURIComponent(url).replace(/^http:\/\//, "https://");
  } catch {
    return res.status(400).json({ error: "Invalid URL encoding" });
  }

  try {
    const upstream = await getFollowRedirects(decoded, 0);

    if (upstream.statusCode >= 400) {
      return res.status(upstream.statusCode).json({ error: `Upstream: ${upstream.statusCode}` });
    }

    // Force application/pdf — Cloudinary raw uploads return application/octet-stream
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200);

    upstream.pipe(res);
  } catch (err) {
    console.error("proxy-pdf error:", err.message);
    if (!res.headersSent) res.status(502).json({ error: err.message });
  }
};
