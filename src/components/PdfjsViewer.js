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

export default function PdfjsViewer({ url }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [renderedPages, setRenderedPages] = useState([]);
  
  useEffect(() => {
    let active = true;
    const loadPdf = async () => {
      try {
        if (!window.pdfjsLib) {
          await new Promise((res, rej) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = () => {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
              res();
            };
            script.onerror = rej;
            document.head.appendChild(script);
          });
        }
        
        // Cloudinary and some other CDNs don't support HTTP 206 Partial Content range requests properly for PDFs,
        // which causes pdf.js to throw "Failed to load pdf preview". 
        // We must disable range requests and streaming to force it to download the whole file via a standard GET.
        const secureUrl = url.replace("http://", "https://");
        
        const doc = await window.pdfjsLib.getDocument({ 
          url: secureUrl,
          disableRange: true,
          disableStream: true,
          disableAutoFetch: true
        }).promise;
        if (active) {
          setPdfDoc(doc);
          setLoading(false);
        }
      } catch (err) {
        console.error("PDF load error:", err);
        if (active) { setError(true); setLoading(false); }
      }
    };
    loadPdf();
    return () => { active = false; };
  }, [url]);

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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#f8fafc" }}>
        <div style={{ fontSize: "3rem" }}>⚠️</div>
        <div style={{ color: "#ef4444", fontWeight: 600 }}>Failed to load PDF preview</div>
        <a href={url.replace("http://", "https://")} download target="_blank" rel="noreferrer" style={{ padding: "8px 16px", background: "#4255ff", color: "white", textDecoration: "none", borderRadius: 8, fontWeight: 600 }}>
          Download File Instead
        </a>
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
