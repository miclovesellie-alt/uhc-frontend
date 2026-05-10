import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";
import { ArrowLeft, Download, BookOpen } from "lucide-react";
import { getFileUrl } from "../utils/config";
import "../styles/BookViewer.css";

export default function BookViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="viewer-loading">Opening your book...</div>;
  if (!book)   return <div className="viewer-error">Book not found. <button onClick={() => navigate("/library")}>Back</button></div>;

  const rawUrl = book.fileUrl;
  const directUrl = getFileUrl(rawUrl);
  const ext = getExt(directUrl) || getExt(rawUrl);
  const isPdf    = ext === "pdf";
  const isOffice = ["doc","docx","txt"].includes(ext);
  const isMedia  = ["jpg","jpeg","png","gif","webp"].includes(ext);
  const isVideo  = ["mp4","webm","ogg"].includes(ext);

  const viewerSrc = `https://docs.google.com/gview?url=${encodeURIComponent(directUrl)}&embedded=true`;

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

    // Desktop and Mobile — Scribd style embedded iframe
    if (isPdf || isOffice) {
      return (
        <div style={{ width:"100%", height:"100%", position:"relative", background: "#e2e8f0" }}>
          <iframe
            src={viewerSrc}
            title={book.title} style={{ width:"100%", height:"100%", border:"none", display: "block" }}
            allow="fullscreen"
          />
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
      <div className="viewer-container" style={{ overflow: "hidden" }}>
        {renderContent()}
      </div>
    </div>
  );
}
