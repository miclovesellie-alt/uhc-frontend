import React, { useState } from "react";

/**
 * PdfjsViewer — renamed but now uses the browser's native PDF viewer via
 * <embed type="application/pdf">.
 *
 * Why this works when everything else failed:
 *   <embed> makes a "no-cors" browser navigation request — it does NOT check
 *   the Access-Control-Allow-Origin header. The browser's built-in PDF viewer
 *   (Chrome, Firefox, Edge) renders the bytes directly regardless of whether
 *   the server sends application/pdf or application/octet-stream.
 *   No proxy, no pdf.js, no CORS, no cold-start issues.
 *
 * Fallback chain:
 *   1. <embed type="application/pdf">  — native browser PDF viewer
 *   2. Google Docs Viewer iframe       — "Not loading?" button
 *   3. Open in Browser / Download      — always visible
 */
export default function PdfjsViewer({ url }) {
  const [useGoogleDocs, setUseGoogleDocs] = useState(false);
  const [gdLoaded, setGdLoaded] = useState(false);

  if (!url) return null;

  const secureUrl = url.replace("http://", "https://");
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(secureUrl)}&embedded=true`;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 600 }}>

      {/* ── Always-visible action bar ─────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
        background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", flexShrink: 0, flexWrap: "wrap"
      }}>
        <span style={{ fontSize: ".75rem", color: "#64748b", flex: 1 }}>
          {useGoogleDocs ? "Using Google Docs Viewer" : "Native PDF Viewer"}
        </span>
        {!useGoogleDocs && (
          <button
            onClick={() => setUseGoogleDocs(true)}
            style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: ".75rem", color: "#0f172a", fontWeight: 600 }}
          >
            Not loading? Switch viewer
          </button>
        )}
        {useGoogleDocs && (
          <button
            onClick={() => { setUseGoogleDocs(false); setGdLoaded(false); }}
            style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: ".75rem", color: "#0f172a", fontWeight: 600 }}
          >
            ← Back to native viewer
          </button>
        )}
        <a
          href={secureUrl}
          target="_blank"
          rel="noreferrer"
          style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", color: "#0f172a", textDecoration: "none", fontSize: ".75rem", fontWeight: 600 }}
        >
          🔗 Open tab
        </a>
        <a
          href={secureUrl}
          download
          target="_blank"
          rel="noreferrer"
          style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#10b981", color: "white", textDecoration: "none", fontSize: ".75rem", fontWeight: 600, cursor: "pointer" }}
        >
          ⬇️ Download
        </a>
      </div>

      {/* ── Viewer body ───────────────────────────────────────────── */}
      <div style={{ flex: 1, position: "relative", background: "#525659" }}>

        {/* 1. Native embed — browser PDF viewer, no CORS check */}
        {!useGoogleDocs && (
          <embed
            src={secureUrl}
            type="application/pdf"
            style={{ width: "100%", height: "100%", minHeight: 560, display: "block" }}
          />
        )}

        {/* 2. Google Docs Viewer fallback */}
        {useGoogleDocs && (
          <>
            {!gdLoaded && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", background: "#f8fafc", gap: 16, zIndex: 2
              }}>
                <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#10b981", borderRadius: "50%", animation: "spin .9s linear infinite" }} />
                <div style={{ color: "#64748b", fontSize: ".85rem" }}>Loading via Google Docs...</div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}
            <iframe
              src={googleViewerUrl}
              onLoad={() => setGdLoaded(true)}
              style={{ width: "100%", height: "100%", minHeight: 560, border: "none", display: "block" }}
              title="Document Viewer"
              allow="fullscreen"
            />
          </>
        )}
      </div>
    </div>
  );
}
