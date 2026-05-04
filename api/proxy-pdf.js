// Vercel Serverless Function — always warm, zero cold starts, same domain as frontend
// Routes: GET /api/proxy-pdf?url=ENCODED_URL
const https = require("https");
const http  = require("http");

module.exports = (req, res) => {
  const { url } = req.query;

  // Allow CORS preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!url) return res.status(400).json({ error: "No URL provided" });

  let decoded;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL encoding" });
  }

  // ── Detect Content-Type from URL path (Cloudinary sends octet-stream for raw uploads)
  const urlPath = decoded.toLowerCase().split("?")[0];
  let contentType = "application/pdf"; // safe default
  if (urlPath.endsWith(".pptx") || urlPath.includes("/pptx"))
    contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  else if (urlPath.endsWith(".ppt"))
    contentType = "application/vnd.ms-powerpoint";
  else if (urlPath.endsWith(".docx"))
    contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  else if (urlPath.endsWith(".doc"))
    contentType = "application/msword";

  const protocol = decoded.startsWith("https") ? https : http;

  const proxyReq = protocol.get(decoded, (proxyRes) => {
    // Force correct Content-Type — never trust Cloudinary's application/octet-stream
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    if (proxyRes.headers["content-length"]) {
      res.setHeader("Content-Length", proxyRes.headers["content-length"]);
    }
    res.status(proxyRes.statusCode || 200);
    proxyRes.pipe(res);
  });

  proxyReq.setTimeout(25000, () => {
    proxyReq.destroy();
    if (!res.headersSent) res.status(504).json({ error: "Upstream timeout" });
  });

  proxyReq.on("error", (err) => {
    console.error("proxy-pdf error:", err.message);
    if (!res.headersSent) res.status(502).json({ error: "Failed to fetch document" });
  });
};
