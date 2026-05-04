import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../api/api";
import {
  BookMarked, BookOpen, ChevronRight, ArrowLeft,
  GraduationCap, Bookmark, Search, X, Download, ExternalLink
} from "lucide-react";
import { useToast } from "../components/Toast";
import { toggleBookmark, getBookmarks } from "../utils/bookmarks";
import { getFileUrl } from "../utils/config";
import BASE_URL from "../utils/config";
import "../styles/library.css";

// ── Inline document viewer modal ────────────────────────────────
function DocModal({ book, onClose }) {
  const rawUrl  = getFileUrl(book.fileUrl);
  const proxied = `${BASE_URL}/api/submissions/proxy-pdf?url=${encodeURIComponent(rawUrl)}`;
  const ext     = (rawUrl.split("?")[0].match(/\.([a-z0-9]+)$/i)?.[1] || "pdf").toLowerCase();
  const isMobile = window.innerWidth <= 768;

  // For PPT/PPTX → Microsoft Office viewer
  const isOffice = ["ppt","pptx"].includes(ext);
  const viewerSrc = isOffice
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawUrl)}`
    : proxied; // PDF via our backend proxy → browser's native PDF renderer

  const headerStyle = {
    display: "flex", alignItems: "center", gap: 10,
    padding: "0 14px", height: 52, flexShrink: 0,
    background: "#0f172a", borderBottom: "1px solid rgba(255,255,255,0.08)",
  };
  const btn = {
    display: "flex", alignItems: "center", gap: 6,
    padding: "7px 13px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.07)", color: "white",
    fontWeight: 600, fontSize: ".78rem", cursor: "pointer",
    textDecoration: "none", whiteSpace: "nowrap",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", background: "#1e293b" }}>
      {/* Header */}
      <div style={headerStyle}>
        <button onClick={onClose} style={{ ...btn, padding: "7px 9px" }}>
          <X size={16}/>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "white", fontWeight: 700, fontSize: ".85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {book.title}
          </div>
          <div style={{ color: "rgba(255,255,255,.4)", fontSize: ".7rem" }}>
            {book.course} {book.author ? `· ${book.author}` : ""}
          </div>
        </div>
        <a href={rawUrl} target="_blank" rel="noreferrer" style={btn}>
          <ExternalLink size={13}/> Open tab
        </a>
        <a href={rawUrl} download target="_blank" rel="noreferrer" style={{ ...btn, background: "#4255ff", border: "none" }}>
          <Download size={13}/> Download
        </a>
      </div>

      {/* Viewer body */}
      {isMobile ? (
        // Mobile: just link out — iframes unreliable on iOS
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white", gap: 20, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: "3.5rem" }}>{isOffice ? "📊" : "📄"}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>{book.title}</div>
            <div style={{ opacity: .6, fontSize: ".85rem", marginBottom: 24 }}>Tap below to read this document</div>
          </div>
          <a href={rawUrl} target="_blank" rel="noreferrer"
            style={{ padding: "15px 32px", borderRadius: 14, background: "#4255ff", color: "white", fontWeight: 800, textDecoration: "none", fontSize: "1rem", boxShadow: "0 8px 24px rgba(66,85,255,.4)" }}>
            📖 Open Document
          </a>
        </div>
      ) : (
        // Desktop: native browser iframe
        <iframe
          src={viewerSrc}
          title={book.title}
          style={{ flex: 1, border: "none", width: "100%", background: "#525659" }}
          allow="fullscreen"
        />
      )}
    </div>
  );
}

// ── Main Library ─────────────────────────────────────────────────
export default function Library() {
  const toast = useToast();
  const { searchQuery } = useOutletContext();
  const [books, setBooks]         = useState([]);
  const [courses, setCourses]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState("courses");
  const [activeCourse, setActiveCourse] = useState(null);
  const [localSearch, setLocalSearch]   = useState("");
  const [openBook, setOpenBook]   = useState(null);
  const [bookmarkedBooks, setBookmarkedBooks] = useState(
    () => new Set(getBookmarks("book").map(b => String(b._id)))
  );

  const combinedSearch = (localSearch || searchQuery || "").toLowerCase();

  const handleBookmark = (book) => {
    const added = toggleBookmark("book", book);
    setBookmarkedBooks(prev => {
      const next = new Set(prev);
      added ? next.add(String(book._id)) : next.delete(String(book._id));
      return next;
    });
    toast(added ? "🔖 Book saved!" : "Removed from saved", added ? "success" : "info");
  };

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const [booksRes, coursesRes] = await Promise.all([
          api.get("library/books"),
          api.get("library/courses"),
        ]);
        setBooks(booksRes.data);
        setCourses(coursesRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchLibrary();
  }, []);

  const getBookCount = (name) => books.filter(b => b.course === name).length;

  const filteredBooks = books.filter(b => {
    const s = b.title.toLowerCase().includes(combinedSearch) || b.author?.toLowerCase().includes(combinedSearch);
    return s && (activeCourse ? b.course === activeCourse : true);
  });

  if (loading) return <div className="viewer-loading">Loading Study Library...</div>;

  return (
    <>
      {openBook && <DocModal book={openBook} onClose={() => setOpenBook(null)} />}

      <div className="library-wrapper">
        <div className="library-header">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {view === "books" && (
              <button className="viewer-back-btn" style={{ width: 36, height: 36 }}
                onClick={() => { setView("courses"); setActiveCourse(null); setLocalSearch(""); }}>
                <ArrowLeft size={18}/>
              </button>
            )}
            <h1 className="library-title">{view === "courses" ? "Explore Courses" : activeCourse}</h1>
          </div>
          <div style={{ position: "relative", minWidth: 200, maxWidth: 320 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", opacity: .5 }}/>
            <input type="text"
              placeholder={view === "courses" ? "Search courses..." : "Search books..."}
              value={localSearch} onChange={e => setLocalSearch(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 14px 9px 36px", borderRadius: 12, border: "1px solid var(--border,#e2e8f0)", background: "var(--card-bg,#f8fafc)", color: "var(--text,#0f172a)", fontSize: ".85rem", outline: "none" }}
            />
          </div>
        </div>

        {view === "courses" ? (
          <div className="library-topics-grid">
            {courses.filter(c => c.toLowerCase().includes(combinedSearch)).map(course => (
              <div key={course} className="course-card-classic" onClick={() => { setActiveCourse(course); setView("books"); }}>
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
                <BookOpen size={48}/><p>No courses available yet.</p>
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
            ) : filteredBooks.map(book => (
              <div key={book._id} className="book-card">
                <div className="book-cover">
                  {book.coverImage
                    ? <img src={book.coverImage} alt={book.title}/>
                    : <div className="book-cover-placeholder">
                        <BookMarked size={50} strokeWidth={1.5}/>
                        <span style={{ fontSize: ".65rem", fontWeight: 800, marginTop: 4 }}>UHC</span>
                      </div>
                  }
                </div>
                <div className="book-info">
                  <h3 className="book-title">{book.title}</h3>
                  <p className="book-author">{book.author || "Unknown Author"}</p>
                  <div className="book-actions" style={{ display: "flex", gap: 8 }}>
                    <button className="book-btn" style={{ flex: 1 }} onClick={() => setOpenBook(book)}>
                      <BookOpen size={16}/> Open Reader
                    </button>
                    <button className="book-btn"
                      onClick={() => handleBookmark(book)}
                      style={{ padding: "0 12px", background: bookmarkedBooks.has(String(book._id)) ? "var(--accent-pale)" : undefined, color: bookmarkedBooks.has(String(book._id)) ? "var(--accent)" : undefined }}>
                      <Bookmark size={16} fill={bookmarkedBooks.has(String(book._id)) ? "currentColor" : "none"}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}