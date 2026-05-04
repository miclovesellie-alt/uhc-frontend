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

    // Detect extension — Cloudinary URLs sometimes strip extension, so also check raw fileUrl
    const getExt = (u) => {
      if (!u) return null;
      const cleanPath = u.split('?')[0];
      const extMatch = cleanPath.match(/\.([a-z0-9]+)$/i);
      return extMatch ? extMatch[1].toLowerCase() : null;
    };

    const ext = getExt(url) || getExt(book.fileUrl) || "pdf";
    const isMedia = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
    const isVideo = ["mp4", "webm", "ogg"].includes(ext);

    // ── Images ──
    if (isMedia) {
      return (
        <div className="media-viewer">
          <img src={url} alt={book.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      );
    }

    // ── Videos ──
    if (isVideo) {
      return (
        <div className="media-viewer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <video src={url} controls style={{ maxWidth: '100%', maxHeight: '100%' }} />
        </div>
      );
    }

    // ── Mobile: always show splash with open button (most reliable) ──
    if (isMobile) {
      return (
        <div className="unsupported-viewer">
          <div className="viewer-splash-icon">
            <BookOpen size={80} color="var(--accent)" />
          </div>
          <h2>Document Ready</h2>
          <p>Tap below to open this document in your browser or native reader.</p>
          <button
            className="viewer-action-btn primary large"
            style={{ padding: '16px 32px', fontSize: '1.1rem' }}
            onClick={() => window.open(url, "_blank")}
          >
            Open Document 📖
          </button>
          <p style={{ marginTop: 20, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Cloud-optimized reader powered by UHC
          </p>
        </div>
      );
    }

    // ── Desktop Local (development) ──
    if (isLocal) {
      if (["ppt","pptx","doc","docx","xls","xlsx"].includes(ext)) {
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
      // Local PDF: direct iframe
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <iframe
            id="pdf-viewer-frame"
            src={`${url}#toolbar=0`}
            title={book.title}
            className="pdf-iframe"
          />
        </div>
      );
    }

    // ── Production Desktop: Google Docs Viewer (handles PDF, PPTX, DOCX, XLS etc.) ──
    // This is the most reliable cross-origin viewer and works with Cloudinary URLs.
    const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <iframe
          id="pdf-viewer-frame"
          src={googleViewerUrl}
          title={book.title}
          className="pdf-iframe"
          allow="fullscreen"
        />
        {/* Always show a direct open button as fallback */}
        <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 10, display: 'flex', gap: 8 }}>
          <button
            className="viewer-action-btn primary"
            onClick={() => window.open(url, "_blank")}
            title="Open in new tab"
          >
            Open Direct ↗
          </button>
        </div>
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
