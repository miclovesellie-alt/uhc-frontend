import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";
import { ArrowLeft, Download, BookOpen, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { getFileUrl } from "../utils/config";
import BASE_URL from "../utils/config";
import "../styles/BookViewer.css";

export default function BookViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // PDF.js state
  const [pdfDoc, setPdfDoc]         = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages]   = useState(0);
  const [scale, setScale]             = useState(1.3);
  const [rendering, setRendering]     = useState(false);
  const [pdfLoading, setPdfLoading]   = useState(false);
  const [pdfError, setPdfError]       = useState(null);
  const canvasRef    = useRef(null);
  const renderRef    = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    api.get("library/books")
      .then(res => setBook(res.data.find(b => b._id === id)))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const getExt = (url) => {
    if (!url) return "pdf";
    const m = url.split("?")[0].match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toLowerCase() : "pdf";
  };

  // Build a proxied URL so we avoid Cloudinary CORS issues entirely
  const getProxiedUrl = (rawUrl) => {
    const full = getFileUrl(rawUrl);
    return `${BASE_URL}/api/submissions/proxy-pdf?url=${encodeURIComponent(full)}`;
  };

  // Load PDF.js + document
  useEffect(() => {
    if (!book) return;
    const rawUrl = book.fileUrl;
    const ext = getExt(getFileUrl(rawUrl)) || getExt(rawUrl);
    if (ext !== "pdf") return;

    setPdfLoading(true);
    setPdfError(null);

    const loadPdf = async () => {
      try {
        // Load PDF.js from CDN once
        if (!window.pdfjsLib) {
          await new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
          });
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }

        // Use proxied URL — guaranteed to work without CORS errors
        const proxied = getProxiedUrl(rawUrl);

        const doc = await window.pdfjsLib.getDocument({ url: proxied }).promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (err) {
        console.error("PDF load error:", err);
        setPdfError(true);
      } finally {
        setPdfLoading(false);
      }
    };
    loadPdf();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book]);

  // Render page on canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    const render = async () => {
      if (renderRef.current) { try { renderRef.current.cancel(); } catch {} }
      setRendering(true);
      try {
        const page = await pdfDoc.getPage(currentPage);
        const vp = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width  = vp.width;
        canvas.height = vp.height;
        const task = page.render({ canvasContext: canvas.getContext("2d"), viewport: vp });
        renderRef.current = task;
        await task.promise;
      } catch (e) {
        if (e?.name !== "RenderingCancelledException") console.error(e);
      }
      setRendering(false);
    };
    render();
  }, [pdfDoc, currentPage, scale]);

  if (loading) return <div className="viewer-loading">Opening your book...</div>;
  if (!book)   return <div className="viewer-error">Book not found. <button onClick={() => navigate("/library")}>Back</button></div>;

  const rawUrl = book.fileUrl;
  const directUrl = getFileUrl(rawUrl);
  const ext = getExt(directUrl) || getExt(rawUrl);
  const isPdf    = ext === "pdf";
  const isOffice = ["ppt","pptx","doc","docx"].includes(ext);
  const isMedia  = ["jpg","jpeg","png","gif","webp"].includes(ext);
  const isVideo  = ["mp4","webm","ogg"].includes(ext);

  const ctrlBtn = {
    background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)",
    borderRadius:8, color:"white", cursor:"pointer", padding:"6px 10px",
    display:"flex", alignItems:"center", justifyContent:"center",
    transition:"background .15s",
  };

  const renderContent = () => {
    if (isMedia) return (
      <div className="media-viewer">
        <img src={directUrl} alt={book.title} style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain" }} />
      </div>
    );
    if (isVideo) return (
      <div className="media-viewer" style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100%" }}>
        <video src={directUrl} controls style={{ maxWidth:"100%", maxHeight:"100%" }} />
      </div>
    );

    // Office via Microsoft viewer
    if (isOffice) {
      const isLocal = directUrl.includes("localhost");
      if (isLocal) return (
        <div className="unsupported-viewer">
          <BookOpen size={64} />
          <h2>Local Dev</h2>
          <p>Office preview not available locally.</p>
          <button className="viewer-action-btn primary" onClick={() => window.open(directUrl,"_blank")}>Download ↗</button>
        </div>
      );
      return (
        <div style={{ width:"100%", height:"100%", position:"relative" }}>
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(directUrl)}`}
            title={book.title} style={{ width:"100%", height:"100%", border:"none" }}
          />
          <div style={{ position:"absolute", bottom:16, right:16, zIndex:10 }}>
            <button className="viewer-action-btn primary" onClick={() => window.open(directUrl,"_blank")}>Open Direct ↗</button>
          </div>
        </div>
      );
    }

    // Mobile PDF — just open directly
    if (isPdf && isMobile) return (
      <div className="unsupported-viewer">
        <div style={{ fontSize:"4rem", marginBottom:8 }}>📄</div>
        <h2>PDF Ready</h2>
        <p>Tap below to open in your device's PDF reader.</p>
        <button className="viewer-action-btn primary large"
          style={{ padding:"16px 32px", fontSize:"1.05rem", marginTop:8 }}
          onClick={() => window.open(directUrl,"_blank")}>
          Open PDF 📖
        </button>
      </div>
    );

    // Desktop PDF via PDF.js
    if (isPdf) {
      if (pdfLoading) return (
        <div className="unsupported-viewer">
          <div style={{ fontSize:"2.5rem", marginBottom:12, animation:"pulse 1.2s infinite" }}>📄</div>
          <h2>Loading PDF…</h2>
          <p style={{ opacity:.7 }}>Preparing Scribd-style reader…</p>
        </div>
      );
      if (pdfError) return (
        <div className="unsupported-viewer">
          <div style={{ fontSize:"2.5rem", marginBottom:12 }}>⚠️</div>
          <h2>Preview Failed</h2>
          <p>Could not render PDF. Try opening it directly.</p>
          <button className="viewer-action-btn primary" style={{ marginTop:12 }}
            onClick={() => window.open(directUrl,"_blank")}>Open PDF ↗</button>
        </div>
      );

      return (
        <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", alignItems:"center", background:"#525659", overflowY:"auto", paddingBottom:60 }}>
          {/* Sticky controls bar */}
          <div style={{
            position:"sticky", top:0, zIndex:20,
            display:"flex", alignItems:"center", gap:8, flexWrap:"wrap",
            background:"rgba(30,30,30,0.97)", backdropFilter:"blur(8px)",
            borderRadius:"0 0 14px 14px", padding:"10px 18px", width:"100%",
            boxSizing:"border-box", boxShadow:"0 4px 20px rgba(0,0,0,0.5)",
            justifyContent:"center",
          }}>
            {/* Page nav */}
            <button style={ctrlBtn} onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage <= 1}><ChevronLeft size={16}/></button>
            <span style={{ color:"white", fontSize:".82rem", fontWeight:600, minWidth:110, textAlign:"center" }}>
              {rendering ? "Rendering…" : `Page ${currentPage} of ${totalPages}`}
            </span>
            <button style={ctrlBtn} onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages}><ChevronRight size={16}/></button>

            <div style={{ width:1, height:20, background:"rgba(255,255,255,0.15)", margin:"0 4px" }} />

            {/* Zoom */}
            <button style={ctrlBtn} onClick={() => setScale(s => Math.max(0.5, s-0.2))}><ZoomOut size={14}/></button>
            <span style={{ color:"rgba(255,255,255,.65)", fontSize:".75rem", minWidth:44, textAlign:"center" }}>{Math.round(scale*100)}%</span>
            <button style={ctrlBtn} onClick={() => setScale(s => Math.min(3.5, s+0.2))}><ZoomIn size={14}/></button>

            <div style={{ width:1, height:20, background:"rgba(255,255,255,0.15)", margin:"0 4px" }} />

            {/* Jump to page */}
            <span style={{ color:"rgba(255,255,255,.55)", fontSize:".75rem" }}>Go to:</span>
            <input type="number" min={1} max={totalPages}
              defaultValue={currentPage}
              key={currentPage}
              onBlur={e => { const v=parseInt(e.target.value); if(v>=1&&v<=totalPages) setCurrentPage(v); }}
              onKeyDown={e => { if(e.key==="Enter"){ const v=parseInt(e.target.value); if(v>=1&&v<=totalPages) setCurrentPage(v);} }}
              style={{ width:52, padding:"4px 6px", borderRadius:7, border:"1px solid rgba(255,255,255,.2)", background:"rgba(255,255,255,.1)", color:"white", fontSize:".8rem", textAlign:"center" }}
            />
          </div>

          {/* Canvas page */}
          <div style={{ marginTop:20, background:"white", borderRadius:6, boxShadow:"0 10px 50px rgba(0,0,0,.6)", display:"inline-block", overflow:"hidden" }}>
            <canvas ref={canvasRef} style={{ display:"block", maxWidth:"100%", height:"auto" }} />
          </div>
        </div>
      );
    }

    // Fallback
    return (
      <div className="unsupported-viewer">
        <BookOpen size={64} />
        <h2>Document</h2>
        <button className="viewer-action-btn primary" onClick={() => window.open(directUrl,"_blank")}>Open ↗</button>
      </div>
    );
  };

  return (
    <div className="book-viewer-page">
      <div className="viewer-header">
        <div className="viewer-header-left">
          <button className="viewer-back-btn" onClick={() => navigate("/library")}><ArrowLeft size={20}/></button>
          <div className="viewer-title-info">
            <h1>{book.title}</h1>
            <span>{book.course} · {book.author || "Unknown Author"}</span>
          </div>
        </div>
        <div className="viewer-header-right">
          <a href={directUrl} target="_blank" rel="noreferrer" download
            className="viewer-action-btn primary" style={{ textDecoration:"none" }}>
            <Download size={16}/> Download
          </a>
        </div>
      </div>
      <div className="viewer-container" style={{ overflow: isPdf && !isMobile ? "hidden" : "auto" }}>
        {renderContent()}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  );
}
