import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../api/api";
import {
  BookMarked, BookOpen, ChevronRight, ArrowLeft,
  GraduationCap, Bookmark, Search, X, Download,
  ChevronLeft, ZoomIn, ZoomOut
} from "lucide-react";
import { useToast } from "../components/Toast";
import { toggleBookmark, getBookmarks } from "../utils/bookmarks";
import { getFileUrl } from "../utils/config";
import BASE_URL from "../utils/config";
import "../styles/library.css";

// ── Inline PDF viewer (Scribd-style) ───────────────────────────
function PdfModal({ book, onClose }) {
  const [pdfDoc, setPdfDoc]         = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages]   = useState(0);
  const [scale, setScale]             = useState(1.3);
  const [rendering, setRendering]     = useState(false);
  const [pdfLoading, setPdfLoading]   = useState(true);
  const [pdfError, setPdfError]       = useState(false);
  const canvasRef = useRef(null);
  const renderRef = useRef(null);

  const rawUrl   = getFileUrl(book.fileUrl);
  const proxied  = `${BASE_URL}/api/submissions/proxy-pdf?url=${encodeURIComponent(rawUrl)}`;
  const ext      = rawUrl.split("?")[0].match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "pdf";

  // Load PDF.js
  useEffect(() => {
    if (ext !== "pdf") { setPdfLoading(false); return; }
    const load = async () => {
      try {
        if (!window.pdfjsLib) {
          await new Promise((res, rej) => {
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
          });
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
        const doc = await window.pdfjsLib.getDocument({ url: proxied }).promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch { setPdfError(true); }
      setPdfLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render page
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
        canvas.width = vp.width; canvas.height = vp.height;
        const task = page.render({ canvasContext: canvas.getContext("2d"), viewport: vp });
        renderRef.current = task;
        await task.promise;
      } catch (e) { if (e?.name !== "RenderingCancelledException") console.error(e); }
      setRendering(false);
    };
    render();
  }, [pdfDoc, currentPage, scale]);

  const ctrlBtn = {
    background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 8, color: "white", cursor: "pointer", padding: "6px 10px",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  const isOffice = ["ppt","pptx","doc","docx"].includes(ext);
  const isMobile = window.innerWidth <= 768;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#1a1a2e", display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        height: 56, background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0,
      }}>
        <button onClick={onClose} style={{ ...ctrlBtn, padding: "6px 8px" }}><X size={18}/></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "white", fontWeight: 700, fontSize: ".9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{book.title}</div>
          <div style={{ color: "rgba(255,255,255,.45)", fontSize: ".72rem" }}>{book.course} · {book.author || "Unknown"}</div>
        </div>
        <a href={rawUrl} download target="_blank" rel="noreferrer"
          style={{ ...ctrlBtn, textDecoration: "none", gap: 6, padding: "6px 12px", fontSize: ".78rem", fontWeight: 600 }}>
          <Download size={14}/> Download
        </a>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Office docs */}
        {isOffice && (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawUrl)}`}
            title={book.title} style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
          />
        )}

        {/* PDF on mobile → direct open */}
        {ext === "pdf" && isMobile && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white", gap: 16 }}>
            <div style={{ fontSize: "3rem" }}>📄</div>
            <p style={{ opacity: .7 }}>Tap below to open in your PDF reader</p>
            <a href={rawUrl} target="_blank" rel="noreferrer"
              style={{ padding: "14px 28px", borderRadius: 14, background: "#4255ff", color: "white", fontWeight: 800, textDecoration: "none", fontSize: "1rem" }}>
              Open PDF 📖
            </a>
          </div>
        )}

        {/* PDF desktop — PDF.js */}
        {ext === "pdf" && !isMobile && (
          pdfLoading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite" }}>⏳</div>
              <p style={{ opacity: .7 }}>Loading PDF…</p>
            </div>
          ) : pdfError ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: "2.5rem" }}>⚠️</div>
              <p style={{ opacity: .7 }}>Could not render inline. Open directly:</p>
              <a href={rawUrl} target="_blank" rel="noreferrer"
                style={{ padding: "12px 24px", borderRadius: 12, background: "#4255ff", color: "white", fontWeight: 700, textDecoration: "none" }}>
                Open PDF ↗
              </a>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Controls */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
                padding: "10px 16px", background: "rgba(0,0,0,0.4)", flexShrink: 0, flexWrap: "wrap",
              }}>
                <button style={ctrlBtn} onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage<=1}><ChevronLeft size={15}/></button>
                <span style={{ color: "white", fontSize: ".82rem", fontWeight: 600, minWidth: 100, textAlign: "center" }}>
                  {rendering ? "Rendering…" : `Page ${currentPage} / ${totalPages}`}
                </span>
                <button style={ctrlBtn} onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage>=totalPages}><ChevronRight size={15}/></button>
                <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)", margin: "0 4px" }}/>
                <button style={ctrlBtn} onClick={() => setScale(s => Math.max(0.5, s-0.2))}><ZoomOut size={13}/></button>
                <span style={{ color: "rgba(255,255,255,.55)", fontSize: ".72rem", minWidth: 40, textAlign: "center" }}>{Math.round(scale*100)}%</span>
                <button style={ctrlBtn} onClick={() => setScale(s => Math.min(3, s+0.2))}><ZoomIn size={13}/></button>
              </div>
              {/* Canvas scroll area */}
              <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", padding: "20px 16px", background: "#525659" }}>
                <div style={{ background: "white", borderRadius: 4, boxShadow: "0 8px 40px rgba(0,0,0,.5)", display: "inline-block", overflow: "hidden" }}>
                  <canvas ref={canvasRef} style={{ display: "block", maxWidth: "100%" }}/>
                </div>
              </div>
            </div>
          )
        )}

        {/* Other file types */}
        {!["pdf","ppt","pptx","doc","docx"].includes(ext) && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: "white" }}>
            <BookOpen size={48} style={{ opacity: .3 }}/>
            <a href={rawUrl} target="_blank" rel="noreferrer"
              style={{ padding: "12px 24px", borderRadius: 12, background: "#4255ff", color: "white", fontWeight: 700, textDecoration: "none" }}>
              Open File ↗
            </a>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Main Library ─────────────────────────────────────────────
function Library() {
  const toast = useToast();
  const { searchQuery } = useOutletContext();
  const [books, setBooks]           = useState([]);
  const [courses, setCourses]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState("courses");
  const [activeCourse, setActiveCourse] = useState(null);
  const [localSearch, setLocalSearch]   = useState("");
  const [openBook, setOpenBook]     = useState(null); // book to show in modal
  const [bookmarkedBooks, setBookmarkedBooks] = useState(
    () => new Set(getBookmarks("book").map(b => String(b._id)))
  );

  const combinedSearch = (localSearch || searchQuery || "").toLowerCase();

  const handleBookmarkBook = (book) => {
    const added = toggleBookmark("book", book);
    setBookmarkedBooks(prev => {
      const next = new Set(prev);
      added ? next.add(String(book._id)) : next.delete(String(book._id));
      return next;
    });
    toast(added ? "🔖 Book saved!" : "Removed from saved", added ? "success" : "info");
  };

  useEffect(() => { fetchLibrary(); }, []);

  const fetchLibrary = async () => {
    try {
      const [booksRes, coursesRes] = await Promise.all([
        api.get("library/books"),
        api.get("library/courses"),
      ]);
      setBooks(booksRes.data);
      setCourses(coursesRes.data);
    } catch (err) { console.error("Library fetch failed", err); }
    finally { setLoading(false); }
  };

  const getBookCount = (courseName) => books.filter(b => b.course === courseName).length;

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(combinedSearch) ||
                          book.author?.toLowerCase().includes(combinedSearch);
    const matchesCourse = activeCourse ? book.course === activeCourse : true;
    return matchesSearch && matchesCourse;
  });

  const selectCourse = (course) => { setActiveCourse(course); setView("books"); };
  const goBack       = () => { setView("courses"); setActiveCourse(null); setLocalSearch(""); };

  if (loading) return <div className="viewer-loading">Loading Study Library...</div>;

  return (
    <>
      {/* Inline fullscreen PDF modal */}
      {openBook && <PdfModal book={openBook} onClose={() => setOpenBook(null)} />}

      <div className="library-wrapper">
        <div className="library-header">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {view === "books" && (
              <button className="viewer-back-btn" onClick={goBack} style={{ width: 36, height: 36 }}>
                <ArrowLeft size={18}/>
              </button>
            )}
            <h1 className="library-title">{view === "courses" ? "Explore Courses" : activeCourse}</h1>
          </div>
          <div style={{ position: "relative", minWidth: 200, maxWidth: 320 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", opacity: .5 }}/>
            <input
              type="text"
              placeholder={view === "courses" ? "Search courses..." : "Search books..."}
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 14px 9px 36px", borderRadius: 12, border: "1px solid var(--border,#e2e8f0)", background: "var(--card-bg,#f8fafc)", color: "var(--text,#0f172a)", fontSize: ".85rem", outline: "none" }}
            />
          </div>
        </div>

        {view === "courses" ? (
          <div className="library-topics-grid">
            {courses
              .filter(c => c.toLowerCase().includes(combinedSearch))
              .map(course => (
              <div key={course} className="course-card-classic" onClick={() => selectCourse(course)}>
                <div className="course-card-icon"><GraduationCap size={32}/></div>
                <div className="course-card-info">
                  <h3>{course}</h3>
                  <span className="book-count-badge">{getBookCount(course)} Resources</span>
                </div>
                <ChevronRight className="course-arrow" size={20}/>
              </div>
            ))}
            {courses.length === 0 && (
              <div className="empty-library">
                <BookOpen size={48}/>
                <p>No courses available yet.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="library-books-grid">
            {filteredBooks.length === 0 ? (
              <div className="text-center py-20" style={{ gridColumn: "1/-1" }}>
                <BookOpen size={48} style={{ opacity: .2, marginBottom: 16 }}/>
                <p style={{ color: "var(--text-muted)" }}>No books found.</p>
              </div>
            ) : (
              filteredBooks.map(book => (
                <div key={book._id} className="book-card">
                  <div className="book-cover">
                    {book.coverImage ? (
                      <img src={book.coverImage} alt={book.title}/>
                    ) : (
                      <div className="book-cover-placeholder">
                        <BookMarked size={50} strokeWidth={1.5}/>
                        <span style={{ fontSize: ".65rem", fontWeight: 800, marginTop: 4 }}>UHC</span>
                      </div>
                    )}
                  </div>
                  <div className="book-info">
                    <h3 className="book-title">{book.title}</h3>
                    <p className="book-author">{book.author || "Unknown Author"}</p>
                    <div className="book-actions" style={{ display: "flex", gap: 8 }}>
                      <button className="book-btn" style={{ flex: 1 }} onClick={() => setOpenBook(book)}>
                        <BookOpen size={16}/> Open Reader
                      </button>
                      <button
                        className="book-btn"
                        onClick={() => handleBookmarkBook(book)}
                        title={bookmarkedBooks.has(String(book._id)) ? "Remove bookmark" : "Save book"}
                        style={{ padding: "0 12px", background: bookmarkedBooks.has(String(book._id)) ? "var(--accent-pale)" : undefined, color: bookmarkedBooks.has(String(book._id)) ? "var(--accent)" : undefined }}
                      >
                        <Bookmark size={16} fill={bookmarkedBooks.has(String(book._id)) ? "currentColor" : "none"}/>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default Library;