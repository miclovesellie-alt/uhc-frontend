import React from "react";

/**
 * The simplest possible document viewer.
 *
 * Key insight for Cloudinary:
 *   Raw uploads are served as application/octet-stream.
 *   Appending ".pdf" to a Cloudinary URL forces it to serve with
 *   Content-Type: application/pdf → <embed> renders natively in every browser.
 *   No proxy, no fetch, no state.
 */
function toPdfUrl(raw) {
  if (!raw) return "";
  const url = raw.replace("http://", "https://");
  const path = url.split("?")[0].toLowerCase();
  if (url.includes("res.cloudinary.com") && !path.endsWith(".pdf"))
    return url.split("?")[0] + ".pdf";
  return url;
}

export default function PdfjsViewer({ url }) {
  if (!url) return null;

  const secure  = url.replace("http://", "https://");
  const embedSrc = toPdfUrl(secure);

  return (
    <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", minHeight:560 }}>

      {/* ── Action bar ── */}
      <div style={{
        display:"flex", gap:8, alignItems:"center", flexWrap:"wrap",
        padding:"6px 12px", background:"#f1f5f9", borderBottom:"1px solid #e2e8f0",
        flexShrink:0
      }}>
        <span style={{ flex:1, fontSize:".72rem", color:"#64748b" }}>📄 Document viewer</span>
        <a href={secure} target="_blank" rel="noreferrer"
          style={{ padding:"4px 12px", borderRadius:6, border:"1px solid #e2e8f0",
            background:"white", color:"#0f172a", textDecoration:"none",
            fontSize:".75rem", fontWeight:600 }}>
          🔗 Open tab
        </a>
        <a href={secure} download target="_blank" rel="noreferrer"
          style={{ padding:"4px 12px", borderRadius:6, border:"none",
            background:"#10b981", color:"white", textDecoration:"none",
            fontSize:".75rem", fontWeight:600 }}>
          ⬇️ Download
        </a>
      </div>

      {/* ── Embed ── */}
      <embed
        src={embedSrc}
        type="application/pdf"
        style={{ flex:1, width:"100%", minHeight:520, border:"none", display:"block" }}
      />
    </div>
  );
}
