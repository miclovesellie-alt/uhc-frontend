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
    const cleanUrl = url.split('?')[0].toLowerCase();
    const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
    const isCloudinary = url.includes("cloudinary.com");

    // Extract extension — check the URL itself, then fall back to the stored fileUrl path
    const getExt = (u) => {
      const match = u.split('?')[0].match(/\.([a-z0-9]{2,5})$/i);
      return match ? match[1].toLowerCase() : null;
    };
    const ext = getExt(cleanUrl) || getExt(book.fileUrl || "") || (isCloudinary ? "pdf" : null);

    // 1. PDF Handling
    if (ext === "pdf") {
      // Use native viewer for desktop or local environments to prevent "No preview available"
      if (!isMobile || isLocal) {
        return (
          <iframe 
            id="pdf-viewer-frame"
            src={`${url}#toolbar=0`} 
            title={book.title}
            className="pdf-iframe"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        );
      }
      // For mobile production, use Google Viewer with a fallback option
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {!viewerError ? (
            <iframe 
              id="pdf-viewer-frame"
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`} 
              title={book.title}
              className="pdf-iframe"
              sandbox="allow-scripts allow-same-origin allow-popups"
              onError={() => setViewerError(true)}
            />
          ) : (
            <div className="unsupported-viewer">
              <BookOpen size={64} />
              <h2>Preview Unavailable</h2>
              <p>The document could not be previewed automatically on this device.</p>
              <button className="viewer-action-btn primary" onClick={() => window.open(url, "_blank")}>
                Open PDF Directly ↗
              </button>
            </div>
          )}
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
            <p>Office documents cannot be previewed in a local environment. Please download to view.</p>
            {book.isDownloadable && (
              <button className="viewer-action-btn primary" onClick={() => window.open(url, "_blank")}>
                Download Document ↗
              </button>
            )}
          </div>
        );
      }
      return (
        <iframe 
          id="office-viewer-frame"
          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`} 
          title={book.title}
          className="pdf-iframe"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
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

    // 4. Unsupported Formats
    return (
      <div className="unsupported-viewer">
        <BookOpen size={64} />
        <h2>Digital Reader</h2>
        <p>This document is in a format that requires a specialized viewer. You can download it to read it on your device.</p>
        {book.isDownloadable ? (
          <button className="viewer-action-btn primary" onClick={() => window.open(url, "_blank")}>
            Download & Read ↗
          </button>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Contact admin for access to this non-downloadable resource.</p>
        )}
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
          {book.isDownloadable && (
            <button className="viewer-action-btn" onClick={() => window.open(getFileUrl(book.fileUrl), "_blank")}>
              <Download size={18} /> Download
            </button>
          )}
          {book?.fileUrl?.toLowerCase().split('?')[0].endsWith(".pdf") && (
            <button className="viewer-action-btn" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
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
