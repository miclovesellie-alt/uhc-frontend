import React, { useState, useEffect } from "react";

/**
 * Simplest possible reliable PDF viewer.
 *
 * Flow:
 *   1. fetch() the file through the Vercel proxy (same domain, sets Content-Type:
 *      application/pdf server-side — bypasses Cloudinary octet-stream issue)
 *   2. Wrap the bytes in a Blob with explicit type "application/pdf"
 *   3. createObjectURL() → same-origin URL
 *   4. <iframe src={blobUrl}> — browsers ALWAYS render same-origin
 *      application/pdf iframes in their built-in PDF viewer. No exceptions.
 */
function proxyUrl(rawUrl) {
  const s = rawUrl.replace("http://", "https://");
  if (window.location.hostname === "localhost")
    return `http://localhost:5000/api/submissions/proxy-pdf?url=${encodeURIComponent(s)}`;
  return `/api/proxy-pdf?url=${encodeURIComponent(s)}`;
}

export default function PdfjsViewer({ url }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const secure = url ? url.replace("http://", "https://") : "";

  useEffect(() => {
    if (!secure) return;
    let objectUrl = null;
    setLoading(true); setError(false); setBlobUrl(null);

    fetch(proxyUrl(secure))
      .then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(blob => {
        objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setBlobUrl(objectUrl);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [secure]);

  if (!url) return null;

  return (
    <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", minHeight:560 }}>

      {/* ── Top bar ── */}
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 12px",
        background:"#f1f5f9", borderBottom:"1px solid #e2e8f0", flexShrink:0, flexWrap:"wrap" }}>
        <span style={{ fontSize:".72rem", color:"#64748b", flex:1 }}>📄 Document viewer</span>
        <a href={secure} target="_blank" rel="noreferrer"
          style={{ padding:"5px 12px", borderRadius:6, border:"1px solid #e2e8f0",
            background:"white", color:"#0f172a", textDecoration:"none", fontSize:".75rem", fontWeight:600 }}>
          🔗 Open tab
        </a>
        <a href={secure} download target="_blank" rel="noreferrer"
          style={{ padding:"5px 12px", borderRadius:6, border:"none",
            background:"#10b981", color:"white", textDecoration:"none", fontSize:".75rem", fontWeight:600 }}>
          ⬇️ Download
        </a>
      </div>

      {/* ── Body ── */}
      <div style={{ flex:1, position:"relative", background:"#525659" }}>

        {/* Loading */}
        {loading && !error && (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", background:"#f8fafc", gap:16, zIndex:2 }}>
            <div style={{ width:40, height:40, border:"3px solid #e2e8f0",
              borderTopColor:"#10b981", borderRadius:"50%", animation:"pdfSpin .9s linear infinite" }}/>
            <div style={{ color:"#64748b", fontSize:".85rem" }}>Loading document…</div>
            <style>{`@keyframes pdfSpin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", background:"#f8fafc",
            gap:16, padding:24, textAlign:"center", zIndex:2 }}>
            <div style={{ fontSize:"2.5rem" }}>📄</div>
            <div style={{ fontWeight:700, color:"#ef4444", fontSize:"1rem" }}>Could not load document</div>
            <div style={{ color:"#64748b", fontSize:".85rem", maxWidth:300, lineHeight:1.6 }}>
              The file may be unavailable. Open it directly or download it below.
            </div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center" }}>
              <a href={secure} target="_blank" rel="noreferrer"
                style={{ padding:"9px 18px", background:"#f1f5f9", color:"#0f172a",
                  border:"1px solid #e2e8f0", borderRadius:8, fontWeight:600,
                  textDecoration:"none", fontSize:".85rem" }}>🔗 Open in Browser</a>
              <a href={secure} download target="_blank" rel="noreferrer"
                style={{ padding:"9px 18px", background:"#10b981", color:"white",
                  border:"none", borderRadius:8, fontWeight:600,
                  textDecoration:"none", fontSize:".85rem" }}>⬇️ Download</a>
            </div>
          </div>
        )}

        {/* PDF rendered from blob URL — same-origin → always works */}
        {blobUrl && (
          <iframe src={blobUrl} title="PDF Viewer"
            style={{ width:"100%", height:"100%", minHeight:520, border:"none", display:"block" }}/>
        )}
      </div>
    </div>
  );
}
