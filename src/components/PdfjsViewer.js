import React, { useState } from "react";

/**
 * Document viewer — uses the Vercel serverless proxy (/api/proxy-pdf).
 *
 * Why this works:
 *   • The Vercel function (frontend/api/proxy-pdf.js) fetches the Cloudinary file
 *     SERVER-SIDE, so Cloudinary's access restrictions don't apply.
 *   • It re-serves the bytes with  Content-Type: application/pdf  so the browser
 *     renders it in its built-in PDF viewer inside the <iframe>.
 *   • The request goes to the same Vercel domain → zero CORS issues.
 *
 * Local dev: falls back to the Express backend proxy on port 5000.
 */
function buildProxyUrl(rawUrl) {
  if (!rawUrl) return "";
  const secure = rawUrl.replace("http://", "https://");
  if (window.location.hostname === "localhost") {
    return `http://localhost:5000/api/submissions/proxy-pdf?url=${encodeURIComponent(secure)}`;
  }
  // Production: same-domain Vercel serverless function
  return `${window.location.origin}/api/proxy-pdf?url=${encodeURIComponent(secure)}`;
}

export default function PdfjsViewer({ url }) {
  const [loaded,      setLoaded]      = useState(false);
  const [retryCount,  setRetryCount]  = useState(0);

  if (!url) return null;

  const secureUrl  = url.replace("http://", "https://");
  const proxyUrl   = buildProxyUrl(url);

  const handleRetry = () => {
    setLoaded(false);
    setRetryCount(c => c + 1);
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 560 }}>

      {/* ── Action bar ───────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
        background: "#f1f5f9", borderBottom: "1px solid #e2e8f0",
        flexShrink: 0, flexWrap: "wrap"
      }}>
        <span style={{ fontSize: ".72rem", color: "#64748b", flex: 1 }}>
          📄 Secure document viewer
        </span>
        <button onClick={handleRetry}
          style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #e2e8f0",
            background: "white", cursor: "pointer", fontSize: ".75rem", color: "#0f172a", fontWeight: 600 }}>
          🔄 Reload
        </button>
        <a href={secureUrl} target="_blank" rel="noreferrer"
          style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #e2e8f0",
            background: "white", color: "#0f172a", textDecoration: "none", fontSize: ".75rem", fontWeight: 600 }}>
          🔗 Open tab
        </a>
        <a href={secureUrl} download target="_blank" rel="noreferrer"
          style={{ padding: "5px 12px", borderRadius: 6, border: "none",
            background: "#10b981", color: "white", textDecoration: "none",
            fontSize: ".75rem", fontWeight: 600, cursor: "pointer" }}>
          ⬇️ Download
        </a>
      </div>

      {/* ── Viewer body ───────────────────────────────────────────── */}
      <div style={{ flex: 1, position: "relative", background: "#525659" }}>

        {/* Loading spinner — hidden once iframe fires onLoad */}
        {!loaded && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 2,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "#f8fafc", gap: 16
          }}>
            <div style={{
              width: 40, height: 40,
              border: "3px solid #e2e8f0", borderTopColor: "#10b981",
              borderRadius: "50%", animation: "spin .9s linear infinite"
            }} />
            <div style={{ color: "#64748b", fontSize: ".85rem" }}>Loading document...</div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* iframe — proxy returns Content-Type: application/pdf so Chrome/Firefox
            render it natively. The <iframe> navigation request is not subject to CORS. */}
        <iframe
          key={retryCount}
          src={proxyUrl}
          onLoad={() => setLoaded(true)}
          title="Document viewer"
          allow="fullscreen"
          style={{
            width: "100%", height: "100%",
            minHeight: 520, border: "none", display: "block"
          }}
        />
      </div>
    </div>
  );
}
