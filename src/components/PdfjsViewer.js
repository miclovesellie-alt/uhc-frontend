import React, { useState, useEffect, useRef } from "react";

function PdfPage({ pdfDoc, pageNum }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
      }
    }, { rootMargin: "600px 0px" });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || rendered || !pdfDoc) return;
    let active = true;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const scale = window.innerWidth < 768 ? 1.0 : 1.5;
        const viewport = page.getViewport({ scale });
        
        const canvas = canvasRef.current;
        if (!canvas || !active) return;
        
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        
        canvas.style.width = "100%";
        canvas.style.maxWidth = `${viewport.width}px`;
        canvas.style.height = "auto";
        
        const ctx = canvas.getContext("2d");
        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: ctx,
          transform: transform,
          viewport: viewport
        };
        
        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
        if (active) setRendered(true);
      } catch (err) {
        if (err.name !== "RenderingCancelledException") {
          console.error(`Error rendering page ${pageNum}:`, err);
        }
      }
    };
    
    renderPage();
    return () => {
      active = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [isVisible, pdfDoc, pageNum, rendered]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: "95%", 
        maxWidth: 850, 
        background: "white", 
        minHeight: "60vh", 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)", 
        margin: "0 auto", 
        position: "relative" 
      }}
    >
      {!rendered && (
        <div style={{ position: "absolute", color: "#a0aec0", fontSize: ".9rem" }}>
          Loading Page {pageNum}...
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: rendered ? "block" : "none" }} />
    </div>
  );
}

// ─── Backend proxy base (mirrors config.js logic) ──────────────────────────
const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:5000"
  : "https://uhc-backend.onrender.com";

/**
 * Build the fetch URL for pdf.js.
 * External URLs (Cloudinary raw files) are routed through the backend proxy
 * which adds proper CORS + Content-Type headers, preventing the browser from
 * blocking the cross-origin request that causes "Failed to load PDF preview".
 */
function buildFetchUrl(rawUrl) {
  const secure = rawUrl.replace("http://", "https://");
  const isExternal =
    secure.startsWith("https://") &&
    !secure.startsWith(window.location.origin);
  if (!isExternal) return secure;
  return `${API_BASE}/api/submissions/proxy-pdf?url=${encodeURIComponent(secure)}`;
}

export default function PdfjsViewer({ url }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // null | Error object
  const [renderedPages, setRenderedPages] = useState([]);
  const [retryCount, setRetryCount] = useState(0);

  const secureUrl = url ? url.replace("http://", "https://") : "";

  useEffect(() => {
    if (!url) return;
    let active = true;
    setPdfDoc(null);
    setLoading(true);
    setError(null);
    setRenderedPages([]);

    const loadPdf = async () => {
      try {
        // ── 1. Load pdf.js from CDN (once) ───────────────────────────────
        if (!window.pdfjsLib) {
          await new Promise((res, rej) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = () => {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
              res();
            };
            script.onerror = () => rej(new Error("Failed to load pdf.js from CDN"));
            document.head.appendChild(script);
          });
        } else if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
          // Ensure worker is always configured even if lib was pre-loaded
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }

        // ── 2. Route external URLs through the backend proxy ─────────────
        // Cloudinary raw-file URLs don't include CORS headers that allow
        // JavaScript fetches from other origins. The proxy (running on the
        // same Render instance as the API) fetches the file server-side and
        // pipes it back with Access-Control-Allow-Origin: * set, so pdf.js
        // can read the bytes without the browser blocking the request.
        const fetchUrl = buildFetchUrl(url);

        const doc = await window.pdfjsLib.getDocument({
          url: fetchUrl,
          disableRange: true,     // Force full-file GET — Cloudinary doesn't
          disableStream: true,    // support HTTP 206 range requests reliably
          disableAutoFetch: true,
        }).promise;

        if (active) {
          setPdfDoc(doc);
          setLoading(false);
        }
      } catch (err) {
        console.error("PDF load error:", err);
        if (active) { setError(err); setLoading(false); }
      }
    };

    loadPdf();
    return () => { active = false; };
  }, [url, retryCount]);

  useEffect(() => {
    if (!pdfDoc) return;
    const numPages = pdfDoc.numPages;
    const pages = Array.from({length: numPages}, (_, i) => i + 1);
    setRenderedPages(pages);
  }, [pdfDoc]);

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#f8fafc" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#4255ff", borderRadius: "50%", animation: "spin .9s linear infinite" }} />
        <div style={{ color: "var(--text-muted,#64748b)", fontSize: ".85rem" }}>Loading high-quality PDF reader...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#f8fafc", padding: "32px 16px", textAlign: "center" }}>
        <div style={{ fontSize: "3rem" }}>📄</div>
        <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "1rem" }}>Could not render PDF preview</div>
        <div style={{ color: "#64748b", fontSize: ".82rem", maxWidth: 340, lineHeight: 1.6 }}>
          The document couldn't be displayed inline. You can open it directly in your browser or download it.
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => setRetryCount(c => c + 1)}
            style={{ padding: "9px 18px", background: "#f1f5f9", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: ".85rem" }}
          >
            🔄 Retry
          </button>
          <a
            href={secureUrl}
            target="_blank"
            rel="noreferrer"
            style={{ padding: "9px 18px", background: "#f1f5f9", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 600, textDecoration: "none", fontSize: ".85rem" }}
          >
            🔗 Open in Browser
          </a>
          <a
            href={secureUrl}
            download
            target="_blank"
            rel="noreferrer"
            style={{ padding: "9px 18px", background: "#4255ff", color: "white", border: "none", borderRadius: 8, fontWeight: 600, textDecoration: "none", fontSize: ".85rem", cursor: "pointer" }}
          >
            ⬇️ Download
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", overflowY: "auto", background: "#525659", padding: "24px 0", display: "flex", flexDirection: "column", gap: 24 }}>
      {renderedPages.map(pageNum => (
        <PdfPage key={pageNum} pdfDoc={pdfDoc} pageNum={pageNum} />
      ))}
    </div>
  );
}
