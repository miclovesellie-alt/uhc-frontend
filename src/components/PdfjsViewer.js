import React, { useState, useEffect } from "react";

/**
 * PDF/Document Viewer
 *
 * Strategy (in order):
 *  1. Cloudinary URLs (res.cloudinary.com) → direct <iframe> — browser makes a
 *     navigation request (no CORS), Chrome/Firefox render .pdf URLs natively even
 *     if content-type is octet-stream.
 *  2. Any other URL → proxy blob via Vercel serverless function /api/proxy-pdf
 *     which re-serves the file with Content-Type: application/pdf.
 *  3. If both fail → show download / open-tab buttons.
 *
 * The "Switch viewer" button lets the user manually toggle between the two modes.
 */
const isCloudinary = (url) => url && url.includes("res.cloudinary.com");

function buildProxyUrl(rawUrl) {
  const s = rawUrl.replace("http://", "https://");
  if (window.location.hostname === "localhost")
    return `http://localhost:5000/api/submissions/proxy-pdf?url=${encodeURIComponent(s)}`;
  return `/api/proxy-pdf?url=${encodeURIComponent(s)}`;
}

export default function PdfjsViewer({ url }) {
  const secure   = url ? url.replace("http://", "https://") : "";
  // Cloudinary → direct; others → proxy blob
  const initMode = isCloudinary(secure) ? "direct" : "proxy";

  const [mode,    setMode]    = useState(initMode);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [retries] = useState(0);

  /* ── Proxy-blob mode ─────────────────────────────────────── */
  useEffect(() => {
    if (!secure || mode !== "proxy") return;
    let objectUrl = null;
    setLoading(true); setError(false); setBlobUrl(null);

    fetch(buildProxyUrl(secure))
      .then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(blob => {
        objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setBlobUrl(objectUrl);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [secure, mode, retries]);

  /* ── Direct mode just sets loading=false once ────────────── */
  useEffect(() => {
    if (mode === "direct") { setLoading(false); setError(false); }
  }, [mode]);

  if (!url) return null;

  const switchMode = () => {
    setMode(m => m === "direct" ? "proxy" : "direct");
    setLoading(true); setError(false); setBlobUrl(null);
  };

  return (
    <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", minHeight:560 }}>

      {/* ── Top bar ── */}
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 12px",
        background:"#f1f5f9", borderBottom:"1px solid #e2e8f0", flexShrink:0, flexWrap:"wrap" }}>
        <span style={{ fontSize:".7rem", color:"#94a3b8", flex:1 }}>
          {mode === "direct" ? "🔗 Direct view" : "🔄 Proxy view"}
        </span>
        <button onClick={switchMode}
          style={{ padding:"4px 10px", borderRadius:6, border:"1px solid #e2e8f0",
            background:"white", cursor:"pointer", fontSize:".73rem", color:"#475569", fontWeight:600 }}>
          Switch viewer
        </button>
        <a href={secure} target="_blank" rel="noreferrer"
          style={{ padding:"4px 10px", borderRadius:6, border:"1px solid #e2e8f0",
            background:"white", color:"#0f172a", textDecoration:"none", fontSize:".73rem", fontWeight:600 }}>
          🔗 Open tab
        </a>
        <a href={secure} download target="_blank" rel="noreferrer"
          style={{ padding:"4px 10px", borderRadius:6, border:"none",
            background:"#10b981", color:"white", textDecoration:"none", fontSize:".73rem", fontWeight:600 }}>
          ⬇️ Download
        </a>
      </div>

      {/* ── Body ── */}
      <div style={{ flex:1, position:"relative", background:"#525659" }}>

        {/* Spinner */}
        {loading && (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", background:"#f8fafc", gap:16, zIndex:2 }}>
            <div style={{ width:40, height:40, border:"3px solid #e2e8f0",
              borderTopColor:"#10b981", borderRadius:"50%", animation:"pdfSpin .9s linear infinite" }}/>
            <div style={{ color:"#64748b", fontSize:".85rem" }}>Loading document…</div>
            <style>{`@keyframes pdfSpin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", background:"#f8fafc",
            gap:14, padding:24, textAlign:"center", zIndex:2 }}>
            <div style={{ fontSize:"2.5rem" }}>📄</div>
            <div style={{ fontWeight:700, color:"#ef4444" }}>Could not load document</div>
            <div style={{ color:"#64748b", fontSize:".83rem", maxWidth:320, lineHeight:1.6 }}>
              The file may be unavailable or stored on an old server.
              Try switching the viewer mode or open/download directly.
            </div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center" }}>
              <button onClick={switchMode}
                style={{ padding:"8px 16px", background:"#f1f5f9", border:"1px solid #e2e8f0",
                  borderRadius:8, fontWeight:600, cursor:"pointer", fontSize:".83rem" }}>
                Switch Viewer
              </button>
              <a href={secure} target="_blank" rel="noreferrer"
                style={{ padding:"8px 16px", background:"white", color:"#0f172a",
                  border:"1px solid #e2e8f0", borderRadius:8, fontWeight:600,
                  textDecoration:"none", fontSize:".83rem" }}>🔗 Open in Browser</a>
              <a href={secure} download target="_blank" rel="noreferrer"
                style={{ padding:"8px 16px", background:"#10b981", color:"white",
                  border:"none", borderRadius:8, fontWeight:600,
                  textDecoration:"none", fontSize:".83rem" }}>⬇️ Download</a>
            </div>
          </div>
        )}

        {/* Direct iframe (Cloudinary URLs) */}
        {mode === "direct" && !error && (
          <iframe
            key={`direct-${retries}`}
            src={secure}
            title="Document viewer"
            onLoad={() => setLoading(false)}
            onError={() => { setError(true); setLoading(false); }}
            style={{ width:"100%", height:"100%", minHeight:520, border:"none", display:"block" }}
          />
        )}

        {/* Blob iframe (proxy mode) */}
        {mode === "proxy" && blobUrl && (
          <iframe
            src={blobUrl}
            title="Document viewer"
            style={{ width:"100%", height:"100%", minHeight:520, border:"none", display:"block" }}
          />
        )}
      </div>
    </div>
  );
}
