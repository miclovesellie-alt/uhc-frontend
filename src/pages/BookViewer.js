import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";
import { ArrowLeft, Download, Maximize2, Minimize2, BookOpen } from "lucide-react";
import { getFileUrl } from "../utils/config";
import "../styles/BookViewer.css";

export default function BookViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [viewerError, setViewerError] = useState(false);

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

  const toggleFullscreen = () => {
    const elem = document.getElementById("pdf-viewer-frame");
    if (!elem) return; // Fix: avoid null error if iframe is not rendered

    if (!isFullscreen) {
      if (elem.requestFullscreen) elem.requestFullscreen();
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
      else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  if (loading) return <div className="viewer-loading">Opening your book...</div>;
  if (!book) return <div className="viewer-error">Book not found. <button onClick={() => navigate("/library")}>Back to Library</button></div>;


  const getViewerContent = () => {
    const url = getFileUrl(book.fileUrl);
    const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
    
    // Improved Extension Detection
    const getExt = (u) => {
      if (!u) return null;
      // Remove query params
      const cleanPath = u.split('?')[0];
      // Get everything after the last dot
      const extMatch = cleanPath.match(/\.([a-z0-9]+)$/i);
      return extMatch ? extMatch[1].toLowerCase() : null;
    };

    const ext = getExt(url) || getExt(book.fileUrl) || "pdf";

    // 1. PDF Handling
    if (ext === "pdf") {
      // DESKTOP: Use direct iframe
      if (!isMobile || isLocal) {
        return (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <iframe 
              id="pdf-viewer-frame"
              src={`${url}#toolbar=0`} 
              title={book.title}
              className="pdf-iframe"
            />
            <div className="viewer-mobile-fallback" style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 10 }}>
               <button className="viewer-action-btn primary" onClick={() => window.open(url, "_blank")}>
                 Open in New Tab ↗
               </button>
            </div>
          </div>
        );
      }
      
      // MOBILE: Splash screen for better reliability
      return (
        <div className="unsupported-viewer">
          <div className="viewer-splash-icon">
             <BookOpen size={80} color="var(--accent)" />
          </div>
          <h2>Document Ready</h2>
          <p>This PDF is ready for viewing. Tap below to open it in your device's native reader for the best experience.</p>
          <button className="viewer-action-btn primary large" style={{ padding: '16px 32px', fontSize: '1.1rem' }} onClick={() => window.open(url, "_blank")}>
            Start Reading 📖
          </button>
          <p style={{ marginTop: 20, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Cloud-optimized reader powered by UHC
          </p>
        </div>
      );
    } 
    
    // 2. Office Documents Handling (PPT, DOC, XLS)
    else if (["ppt", "pptx", "doc", "docx", "xls", "xlsx"].includes(ext)) {
      if (isLocal) {
        return (
          <div className="unsupported-viewer">
            <BookOpen size={64} />
            <h2>Local Development</h2>
            <p>Office documents cannot be previewed locally. Please download to view.</p>
            <button className="viewer-action-btn primary" onClick={() => window.open(url, "_blank")}>
              Download Document ↗
            </button>
          </div>
        );
      }
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <iframe 
            id="office-viewer-frame"
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`} 
            title={book.title}
            className="pdf-iframe"
          />
          <div className="viewer-mobile-fallback" style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 10 }}>
             <button className="viewer-action-btn primary" onClick={() => window.open(url, "_blank")}>
               View Direct ↗
             </button>
          </div>
        </div>
      );
    }
    
    // 3. Media/Images Handling
    else if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      return (
        <div className="media-viewer">
          <img src={url} alt={book.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      );
    } else if (["mp4", "webm", "ogg"].includes(ext)) {
      return (
        <div className="media-viewer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <video src={url} controls style={{ maxWidth: '100%', maxHeight: '100%' }} />
        </div>
      );
    }

    // 4. Default Fallback
    return (
      <div className="unsupported-viewer">
        <BookOpen size={64} />
        <h2>Document Reader</h2>
        <p>This file format is supported for download. Click below to view the resource.</p>
        <button className="viewer-action-btn primary" onClick={() => window.open(url, "_blank")}>
          Open Resource ↗
        </button>
      </div>
    );
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
            <span>{book.course} • By {book.author || "Unknown Author"}</span>
          </div>
        </div>
        <div className="viewer-header-right">
          <button className="viewer-action-btn primary" onClick={() => window.open(getFileUrl(book.fileUrl), "_blank")}>
            <Download size={18} /> Open Direct
          </button>
          {isFullscreen ? (
            <button className="viewer-action-btn" onClick={toggleFullscreen}>
               <Minimize2 size={18} />
            </button>
          ) : (
            <button className="viewer-action-btn" onClick={toggleFullscreen}>
               <Maximize2 size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="viewer-container">
        {getViewerContent()}
      </div>
    </div>
  );
}
