import React, { useState, useEffect } from "react";

/**
 * PDF Viewer — fetch through Vercel proxy → blob URL → iframe.
 *
 * The proxy (/api/proxy-pdf) fetches the file server-side,
 * follows Cloudinary CDN redirects, and returns bytes as application/pdf.
 * A same-origin blob URL with type=application/pdf always renders
 * in the browser's native PDF viewer inside an iframe.
 *
 * If the file URL points to the old Render backend (onrender.com)
 * or is a local /uploads path, the file no longer exists — we show
 * a clear message telling the admin to re-upload the file to cloud storage.
 */
function buildProxyUrl(raw) {
  const s = raw.replace("http://", "https://");
  if (window.location.hostname === "localhost")
    return `http://localhost:5000/api/submissions/proxy-pdf?url=${encodeURIComponent(s)}`;
  return `/api/proxy-pdf?url=${encodeURIComponent(s)}`;
}

function isLegacyUrl(url) {
  return (
    url.includes("onrender.com") ||
    url.includes("localhost:5000") ||
    url.startsWith("/uploads") ||
    url.startsWith("/api/submissions")
  );
}

export default function PdfjsViewer({ url }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const secure = (url || "").replace("http://", "https://");
  const legacy  = isLegacyUrl(secure);

  useEffect(() => {
    if (!secure || legacy) { setLoading(false); if (legacy) setError(true); return; }
    let obj = null;
    setLoading(true); setError(false); setBlobUrl(null);

    fetch(buildProxyUrl(secure))
      .then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(b => {
        obj = URL.createObjectURL(new Blob([b], { type: "application/pdf" }));
        setBlobUrl(obj);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });

    return () => { if (obj) URL.revokeObjectURL(obj); };
  }, [secure, legacy]);

  if (!url) return null;

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", height:"100%", minHeight:480, gap:14 }}>
      <div style={{ width:38, height:38, border:"3px solid #e2e8f0",
        borderTopColor:"#10b981", borderRadius:"50%", animation:"pdfSpin .9s linear infinite" }}/>
      <span style={{ color:"#64748b", fontSize:".85rem" }}>Loading document…</span>
      <style>{`@keyframes pdfSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", minHeight:480, gap:16,
      textAlign:"center", padding:"32px 24px" }}>
      <span style={{ fontSize:"3rem" }}>📄</span>
      <div style={{ fontWeight:800, color:"#ef4444", fontSize:"1rem" }}>
        {legacy ? "File unavailable" : "Could not load document"}
      </div>
      <p style={{ color:"#64748b", fontSize:".88rem", maxWidth:340, lineHeight:1.7, margin:0 }}>
        {legacy
          ? "This document was uploaded before cloud storage was set up and no longer exists on the server. An admin needs to re-upload it from the library management panel."
          : "The document could not be loaded. Try opening it directly in your browser or downloading it below."}
      </p>
      {!legacy && (
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center" }}>
          <a href={secure} target="_blank" rel="noreferrer"
            style={{ padding:"9px 20px", background:"#f1f5f9", color:"#0f172a",
              border:"1px solid #e2e8f0", borderRadius:10, fontWeight:700,
              textDecoration:"none", fontSize:".85rem" }}>🔗 Open in Browser</a>
          <a href={secure} download target="_blank" rel="noreferrer"
            style={{ padding:"9px 20px", background:"#10b981", color:"white",
              border:"none", borderRadius:10, fontWeight:700,
              textDecoration:"none", fontSize:".85rem" }}>⬇️ Download</a>
        </div>
      )}
    </div>
  );

  /* ── Viewer ── */
  return (
    <iframe src={blobUrl} title="Document viewer"
      style={{ width:"100%", height:"100%", minHeight:520, border:"none", display:"block" }}/>
  );
}
