import React, { useState, useEffect } from "react";

/**
 * Pure PDF viewer — no action bar (the parent Library handles open/download buttons).
 * Fetches through the Vercel proxy (which now uses fetch() and follows redirects),
 * wraps bytes in a same-origin blob URL with type application/pdf,
 * then renders in an <iframe>. Same-origin blob URLs always render in the browser
 * native PDF viewer regardless of original content-type.
 */
function buildProxyUrl(raw) {
  const s = raw.replace("http://", "https://");
  if (window.location.hostname === "localhost")
    return `http://localhost:5000/api/submissions/proxy-pdf?url=${encodeURIComponent(s)}`;
  return `/api/proxy-pdf?url=${encodeURIComponent(s)}`;
}

export default function PdfjsViewer({ url }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const secure = (url || "").replace("http://", "https://");

  useEffect(() => {
    if (!secure) return;
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
  }, [secure]);

  if (!url) return null;

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", height:"100%", minHeight:480, gap:14 }}>
      <div style={{ width:38, height:38, border:"3px solid #e2e8f0",
        borderTopColor:"#10b981", borderRadius:"50%", animation:"pdfSpin .9s linear infinite" }}/>
      <span style={{ color:"#64748b", fontSize:".85rem" }}>Loading document…</span>
      <style>{`@keyframes pdfSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", height:"100%", minHeight:480,
      gap:14, textAlign:"center", padding:32 }}>
      <span style={{ fontSize:"2.5rem" }}>📄</span>
      <div style={{ fontWeight:700, color:"#ef4444", fontSize:"1rem" }}>Could not load document</div>
      <p style={{ color:"#64748b", fontSize:".85rem", maxWidth:300, lineHeight:1.65, margin:0 }}>
        The file may be unavailable. Try opening it in a new tab or downloading it.
      </p>
    </div>
  );

  return (
    <iframe src={blobUrl} title="Document viewer"
      style={{ width:"100%", height:"100%", minHeight:520, border:"none", display:"block" }}/>
  );
}
