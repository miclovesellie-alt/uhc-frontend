import React from "react";

export default function PdfjsViewer({ url }) {
  if (!url) return null;
  const secure = url.replace("http://", "https://");
  const gdocs  = `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(secure)}`;

  return (
    <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", minHeight:580 }}>
      <iframe
        src={gdocs}
        title="Document viewer"
        style={{ flex:1, width:"100%", minHeight:540, border:"none", display:"block" }}
        allowFullScreen
      />
    </div>
  );
}
