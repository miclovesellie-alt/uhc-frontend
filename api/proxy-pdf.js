// Vercel Serverless Function — /api/proxy-pdf?url=ENCODED_URL
// Uses fetch() instead of https.get() so Cloudinary CDN redirects are followed automatically.
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url parameter" });

  try {
    const decoded = decodeURIComponent(url).replace("http://", "https://");

    // fetch() follows 301/302 redirects automatically — critical for Cloudinary CDN URLs
    const upstream = await fetch(decoded, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; UHC-Proxy/1.0)" },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream returned ${upstream.status}` });
    }

    // Force application/pdf regardless of what Cloudinary sends (octet-stream)
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "public, max-age=3600");

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.status(200).send(buffer);
  } catch (err) {
    console.error("proxy-pdf error:", err.message);
    return res.status(502).json({ error: err.message });
  }
};
