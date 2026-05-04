import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";
import { ArrowLeft, Download, BookOpen, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { getFileUrl } from "../utils/config";
import "../styles/BookViewer.css";

export default function BookViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // PDF.js state
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [rendering, setRendering] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const canvasRef = React.useRef(null);
  const renderTaskRef = React.useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await api.get("library/books");
        const found = res.data.find(b => b._id === id);
        setBook(found);
      } catch (err) {
        console.error("Failed to load book", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id]);

  // Detect file extension
  const getExt = (url) => {
    if (!url) return "pdf";
    const clean = url.split("?")[0];
    const m = clean.match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toLowerCase() : "pdf";
  };

  // Load PDF.js and the document once book is ready
  useEffect(() => {
    if (!book) return;
    const url = getFileUrl(book.fileUrl);
    const ext = getExt(url) || getExt(book.fileUrl);

    // Only load PDF.js for PDFs
    if (ext !== "pdf") return;

    setPdfLoading(true);
    setPdfError(null);

    const loadPdf = async () => {
      try {
        // Dynamically load PDF.js from CDN
        if (!window.pdfjsLib) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }

        const loadingTask = window.pdfjsLib.getDocument({
          url,
          cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
          cMapPacked: true,
          withCredentials: false,
        });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (err) {
        console.error("PDF.js load error:", err);
        setPdfError(err.message || "Failed to load PDF");
      } finally {
        setPdfLoading(false);
      }
    };

    loadPdf();
  }, [book]);

  // Render the current page whenever page or scale changes
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      // Cancel any ongoing render task
      if (renderTaskRef.current) {
        try { await renderTaskRef.current.cancel(); } catch {}
      }
      setRendering(true);
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderTask = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("Render error:", err);
        }
      } finally {
        setRendering(false);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale]);

  if (loading) return <div className="viewer-loading">Opening your book...</div>;
  if (!book) return (
    <div className="viewer-error">
      Book not found. <button onClick={() => navigate("/library")}>Back to Library</button>
    </div>
  );

  const url = getFileUrl(book.fileUrl);
  const ext = getExt(url) || getExt(book.fileUrl);
  const isMedia = ["jpg","jpeg","png","gif","webp"].includes(ext);
  const isVideo = ["mp4","webm","ogg"].includes(ext);
  const isOffice = ["ppt","pptx","doc","docx","xls","xlsx"].includes(ext);
  const isPdf = ext === "pdf";

  const renderContent = () => {
    // ── Images ──
    if (isMedia) return (
      <div className="media-viewer">
        <img src={url} alt={book.title} style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain" }} />
      </div>
    );

    // ── Videos ──
    if (isVideo) return (
      <div className="media-viewer" style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100%" }}>
        <video src={url} controls style={{ maxWidth:"100%", maxHeight:"100%" }} />
      </div>
    );

    // ── Office docs → Microsoft viewer ──
    if (isOffice) {
      const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
      if (isLocal) return (
        <div className="unsupported-viewer">
          <BookOpen size={64} />
          <h2>Local Development</h2>
          <p>Office documents can't be previewed locally.</p>
          <button className="viewer-action-btn primary" onClick={() => window.open(url, "_blank")}>Download ↗</button>
        </div>
      );
      return (
        <div style={{ width:"100%", height:"100%", position:"relative" }}>
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
            title={book.title}
            className="pdf-iframe"
            style={{ width:"100%", height:"100%", border:"none" }}
          />
          <div style={{ position:"absolute", bottom:16, right:16, zIndex:10 }}>
            <button className="viewer-action-btn primary" onClick={() => window.open(url,"_blank")}>Open Direct ↗</button>
          </div>
        </div>
      );
    }

    // ── PDF: Mobile splash ──
    if (isPdf && isMobile) return (
      <div className="unsupported-viewer">
        <div style={{ fontSize:"4rem", marginBottom:8 }}>📄</div>
        <h2>Document Ready</h2>
        <p>Tap below to open in your browser's native PDF reader.</p>
        <button className="viewer-action-btn primary large" style={{ padding:"16px 32px", fontSize:"1.1rem" }} onClick={() => window.open(url,"_blank")}>
          Open Document 📖
        </button>
        <p style={{ marginTop:16, fontSize:"0.75rem", opacity:0.6 }}>Cloud-optimized · UHC</p>
      </div>
    );

    // ── PDF: Desktop PDF.js ──
    if (isPdf) {
      if (pdfLoading) return (
        <div className="unsupported-viewer">
          <div style={{ fontSize:"3rem", marginBottom:12 }}>⏳</div>
          <h2>Loading Document…</h2>
          <p style={{ opacity:0.7 }}>Preparing your reader, please wait.</p>
        </div>
      );
      if (pdfError) return (
        <div className="unsupported-viewer">
          <div style={{ fontSize:"3rem", marginBottom:12 }}>⚠️</div>
          <h2>Preview Unavailable</h2>
          <p>Couldn't render this document inline. Open it directly instead.</p>
          <button className="viewer-action-btn primary" style={{ marginTop:8 }} onClick={() => window.open(url,"_blank")}>
            Open PDF Directly ↗
          </button>
        </div>
      );
      return (
        <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", alignItems:"center", background:"#525659", overflowY:"auto", paddingTop:16, paddingBottom:80 }}>
          {/* PDF Page Controls */}
          <div style={{ position:"sticky", top:0, zIndex:20, display:"flex", alignItems:"center", gap:10, background:"rgba(40,40,40,0.95)", backdropFilter:"blur(8px)", borderRadius:12, padding:"8px 16px", marginBottom:16, boxShadow:"0 4px 20px rgba(0,0,0,0.4)" }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} style={ctrlBtn}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ color:"white", fontSize:".82rem", fontWeight:600, minWidth:90, textAlign:"center" }}>
              {rendering ? "Rendering…" : `Page ${currentPage} / ${totalPages}`}
            </span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} style={ctrlBtn}>
              <ChevronRight size={16} />
            </button>
            <div style={{ width:1, height:20, background:"rgba(255,255,255,0.2)", margin:"0 4px" }} />
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} style={ctrlBtn} title="Zoom out"><ZoomOut size={15} /></button>
            <span style={{ color:"rgba(255,255,255,0.7)", fontSize:".75rem", minWidth:40, textAlign:"center" }}>{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.2))} style={ctrlBtn} title="Zoom in"><ZoomIn size={15} /></button>
          </div>

          {/* Canvas */}
          <div style={{ background:"white", borderRadius:4, boxShadow:"0 8px 40px rgba(0,0,0,0.5)", overflow:"hidden", display:"inline-block" }}>
            <canvas ref={canvasRef} style={{ display:"block", maxWidth:"100%" }} />
          </div>

          {/* Page jump input */}
          <div style={{ marginTop:16, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ color:"rgba(255,255,255,0.6)", fontSize:".78rem" }}>Go to page</span>
            <input
              type="number" min={1} max={totalPages} value={currentPage}
              onChange={e => { const v = parseInt(e.target.value); if (v >= 1 && v <= totalPages) setCurrentPage(v); }}
              style={{ width:60, padding:"4px 8px", borderRadius:8, border:"1px solid rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.1)", color:"white", fontSize:".82rem", textAlign:"center" }}
            />
          </div>
        </div>
      );
    }

    // Fallback
    return (
      <div className="unsupported-viewer">
        <BookOpen size={64} />
        <h2>Document Reader</h2>
        <p>Click below to open this resource.</p>
        <button className="viewer-action-btn primary" onClick={() => window.open(url,"_blank")}>Open Resource ↗</button>
      </div>
    );
  };

  // Control button style
  const ctrlBtn = {
    background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)",
    borderRadius:8, color:"white", cursor:"pointer", padding:"6px 10px",
    display:"flex", alignItems:"center", justifyContent:"center",
    transition:"background .15s",
  };

  return (
    <div className="book-viewer-page">
      <div className="viewer-header">
        <div className="viewer-header-left">
          <button className="viewer-back-btn" onClick={() => navigate("/library")}>
            <ArrowLeft size={20} />
          </button>
          <div className="viewer-title-info">
            <h1>{book.title}</h1>
            <span>{book.course} · {book.author || "Unknown Author"}</span>
          </div>
        </div>
        <div className="viewer-header-right">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            download
            className="viewer-action-btn primary"
            style={{ textDecoration:"none" }}
          >
            <Download size={16} /> Download
          </a>
        </div>
      </div>

      <div className="viewer-container" style={{ overflow: isPdf && !isMobile ? "hidden" : "auto" }}>
        {renderContent()}
      </div>
    </div>
  );
}
