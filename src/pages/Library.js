import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../api/api";
import { BookOpen, ChevronRight, ArrowLeft, GraduationCap, Bookmark, Search, Download, RefreshCw, ExternalLink, FileText } from "lucide-react";
import { useToast } from "../components/Toast";
import { toggleBookmark, getBookmarks } from "../utils/bookmarks";
import BASE_URL, { getFileUrl } from "../utils/config";
import PdfjsViewer from "../components/PdfjsViewer";
import "../styles/library.css";

const LAST_VISITED_KEY = "uhc_last_visited_books";
function getLastVisited() { try { return JSON.parse(localStorage.getItem(LAST_VISITED_KEY) || "[]"); } catch { return []; } }
function addLastVisited(book) {
  const prev = getLastVisited().filter(b => b._id !== book._id);
  localStorage.setItem(LAST_VISITED_KEY, JSON.stringify([book, ...prev].slice(0, 5)));
}

// ── Inline Document Reader ─────────────────────────────────────
function InlineReader({ book }) {
  const rawUrl  = getFileUrl(book.fileUrl);
  const isMobile = window.innerWidth < 768;
  const [retry, setRetry] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef();

  const isPdf = rawUrl.toLowerCase().includes(".pdf");
  
  // Use backend proxy for PDFs to ensure browser's native PDF viewer loads them flawlessly.
  // Use Google Docs viewer for DOC/DOCX/TXT files.
  const viewerSrc = isPdf 
    ? `${BASE_URL}/api/submissions/proxy-pdf?url=${encodeURIComponent(rawUrl)}`
    : `https://docs.google.com/gview?url=${encodeURIComponent(rawUrl)}&embedded=true`;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "calc(100vh - 200px)", border: "1px solid var(--border,#e2e8f0)", borderRadius: 12, overflow: "hidden", background: "#f8fafc", marginTop: 16 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"0 14px", height:52, flexShrink:0, background:"#fff", borderBottom:"1px solid var(--border,#e2e8f0)" }}>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontWeight:700, fontSize:".85rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color: "var(--text,#0f172a)"}}>{book.title}</div>
          <div style={{color:"var(--text-muted,#64748b)", fontSize:".7rem"}}>{book.course}{book.author ? ` · ${book.author}` : ""}</div>
        </div>
        {!isMobile && (
          <button style={{padding:"6px 12px", borderRadius:6, border:"1px solid var(--border,#e2e8f0)", background:"#fff", cursor:"pointer", fontSize:".75rem", display:"flex", alignItems:"center", gap:6, color:"var(--text,#0f172a)"}} onClick={() => { setLoaded(false); setRetry(r => r+1); }} title="Reload">
            <RefreshCw size={13}/> Reload
          </button>
        )}
        <a href={rawUrl} target="_blank" rel="noreferrer" style={{padding:"6px 12px", borderRadius:6, border:"1px solid var(--border,#e2e8f0)", background:"#fff", cursor:"pointer", fontSize:".75rem", textDecoration:"none", color:"var(--text,#0f172a)", display:"flex", alignItems:"center", gap:6}}><ExternalLink size={13}/> Open tab</a>
        <a href={rawUrl} download target="_blank" rel="noreferrer" style={{padding:"6px 12px", borderRadius:6, border:"none", background:"#4255ff", color:"white", cursor:"pointer", fontSize:".75rem", textDecoration:"none", display:"flex", alignItems:"center", gap:6}}><Download size={13}/> Download</a>
      </div>

      {/* Body */}
      <div style={{flex:1, position:"relative", background:"#e2e8f0"}}>
        {isPdf ? (
          <PdfjsViewer url={rawUrl} />
        ) : (
          <>
            {!loaded && (
              <div style={{position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#f8fafc", gap:16, zIndex:2}}>
                <div style={{width:40, height:40, border:"3px solid #e2e8f0", borderTopColor:"#4255ff", borderRadius:"50%", animation:"spin .9s linear infinite"}}/>
                <div style={{color:"var(--text-muted,#64748b)", fontSize:".85rem"}}>Loading document viewer...</div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              key={retry}
              src={viewerSrc}
              title={book.title}
              onLoad={() => setLoaded(true)}
              style={{width:"100%", height:"100%", border:"none", display:"block", minHeight:"600px"}}
              allow="fullscreen"
            />
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────
function BookSkeleton() {
  return (
    <div style={{borderRadius:16, overflow:"hidden", border:"1px solid var(--border,#e2e8f0)", background:"var(--card-bg,#f8fafc)"}}>
      <div style={{height:180, background:"linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite"}}/>
      <div style={{padding:"12px 14px", display:"flex", flexDirection:"column", gap:8}}>
        <div style={{height:14, borderRadius:8, background:"#e2e8f0", width:"80%"}}/>
        <div style={{height:12, borderRadius:8, background:"#e2e8f0", width:"55%"}}/>
        <div style={{height:34, borderRadius:10, background:"#e2e8f0", marginTop:4}}/>
      </div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

// ── Main Library ─────────────────────────────────────────────
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
  const [lastVisited, setLastVisited] = useState(getLastVisited);
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

  const openReader = (book) => {
    setOpenBook(book);
    setView("reader");
    addLastVisited(book);
    // Refresh last-visited list after modal records it
    setTimeout(() => setLastVisited(getLastVisited()), 300);
  };

  useEffect(() => {
    Promise.all([api.get("library/books"), api.get("library/courses")])
      .then(([b, c]) => { setBooks(b.data); setCourses(c.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getBookCount = (name) => books.filter(b => b.course === name).length;

  // Course progress (books opened vs total in course, stored in lastVisited)
  const courseProgress = (course) => {
    const total = books.filter(b => b.course === course).length;
    if (!total) return 0;
    const visitedIds = new Set(getLastVisited().map(b => b._id));
    const done = books.filter(b => b.course === course && visitedIds.has(b._id)).length;
    return Math.round((done / total) * 100);
  };

  const filteredBooks = books.filter(b => {
    const s = b.title.toLowerCase().includes(combinedSearch) || b.author?.toLowerCase().includes(combinedSearch);
    return s && (activeCourse ? b.course === activeCourse : true);
  });

  if (loading) return (
    <div className="library-wrapper">
      <div className="library-books-grid" style={{paddingTop:24}}>
        {[...Array(6)].map((_,i) => <BookSkeleton key={i}/>)}
      </div>
    </div>
  );

  return (
      <div className="library-wrapper">
        <div className="library-header">
          <div style={{display:"flex", alignItems:"center", gap:16}}>
            {(view === "books" || view === "reader") && (
              <button className="viewer-back-btn" style={{width:36, height:36}}
                onClick={() => { 
                  if (view === "reader") {
                    setView(activeCourse ? "books" : "courses");
                    setOpenBook(null);
                  } else {
                    setView("courses"); 
                    setActiveCourse(null); 
                    setLocalSearch(""); 
                  }
                }}>
                <ArrowLeft size={18}/>
              </button>
            )}
            <h1 className="library-title">{view === "courses" ? "Explore Courses" : view === "reader" ? "Document Viewer" : activeCourse}</h1>
          </div>
          <div style={{position:"relative", minWidth:200, maxWidth:320}}>
            <Search size={15} style={{position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--text-muted)", opacity:.5}}/>
            <input type="text"
              placeholder={view === "courses" ? "Search courses..." : "Search books..."}
              value={localSearch} onChange={e => setLocalSearch(e.target.value)}
              style={{width:"100%", boxSizing:"border-box", padding:"9px 14px 9px 36px", borderRadius:12, border:"1px solid var(--border,#e2e8f0)", background:"var(--card-bg,#f8fafc)", color:"var(--text,#0f172a)", fontSize:".85rem", outline:"none"}}
            />
          </div>
        </div>

        {/* Last visited (only on course home) */}
        {view === "courses" && lastVisited.length > 0 && (
          <div style={{marginBottom:24}}>
            <div style={{fontWeight:700, fontSize:".82rem", color:"var(--text-muted)", marginBottom:10, textTransform:"uppercase", letterSpacing:.5}}>📂 Recently Opened</div>
            <div style={{display:"flex", gap:12, overflowX:"auto", paddingBottom:8}}>
              {lastVisited.map(book => (
                <button key={book._id} onClick={() => openReader(book)}
                  style={{flexShrink:0, padding:"8px 14px", borderRadius:12, border:"1px solid var(--border,#e2e8f0)", background:"var(--card-bg,#f8fafc)", cursor:"pointer", textAlign:"left", maxWidth:160}}>
                  <div style={{fontWeight:700, fontSize:".78rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"var(--text)"}}>{book.title}</div>
                  <div style={{fontSize:".7rem", color:"var(--text-muted)", marginTop:2}}>{book.course}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === "reader" && openBook ? (
          <InlineReader book={openBook} />
        ) : view === "courses" ? (
          <div className="library-topics-grid">
            {courses.filter(c => c.toLowerCase().includes(combinedSearch)).map(course => {
              const pct = courseProgress(course);
              return (
                <div key={course} className="course-card-classic" onClick={() => { setActiveCourse(course); setView("books"); }}>
                  <div className="course-card-icon"><GraduationCap size={32}/></div>
                  <div className="course-card-info" style={{flex:1}}>
                    <h3>{course}</h3>
                    <span className="book-count-badge">{getBookCount(course)} Resources</span>
                    {pct > 0 && (
                      <div style={{marginTop:6}}>
                        <div style={{height:3, background:"var(--border,#e2e8f0)", borderRadius:99, overflow:"hidden"}}>
                          <div style={{height:"100%", width:`${pct}%`, background:"#4255ff", borderRadius:99, transition:"width .4s"}}/>
                        </div>
                        <div style={{fontSize:".65rem", color:"var(--text-muted)", marginTop:2}}>{pct}% explored</div>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="course-arrow" size={20}/>
                </div>
              );
            })}
            {courses.length === 0 && (
              <div className="empty-library"><BookOpen size={48}/><p>No courses available yet.</p></div>
            )}
          </div>
        ) : (
          <div className="document-list-container">
            {filteredBooks.length === 0 ? (
              <div className="text-center py-20" style={{gridColumn:"1/-1"}}>
                <BookOpen size={48} style={{opacity:.2, marginBottom:16}}/>
                <p style={{color:"var(--text-muted)"}}>No documents found.</p>
              </div>
            ) : filteredBooks.map(book => {
              const rawUrl = getFileUrl(book.fileUrl || "");
              const ext = (rawUrl.split("?")[0].match(/\.([a-z0-9]+)$/i)?.[1] || "pdf").toLowerCase();
              const isOfficeDoc = ["ppt","pptx","doc","docx"].includes(ext);
              
              return (
                <div key={book._id} className="document-list-item" onClick={() => openReader(book)}>
                  <div className="doc-icon">
                    <FileText size={28} color={isOfficeDoc ? "#2563eb" : "#ef4444"} strokeWidth={1.5} />
                    <span className="doc-ext-badge">{ext.substring(0,3).toUpperCase()}</span>
                  </div>
                  <div className="doc-info">
                    <h3 className="doc-title">{book.title}</h3>
                    <p className="doc-author">{book.author || "Unknown Author"}</p>
                  </div>
                  <div className="doc-actions">
                    <button className="doc-bookmark-btn"
                      onClick={(e) => { e.stopPropagation(); handleBookmark(book); }}
                      style={{
                        background: bookmarkedBooks.has(String(book._id)) ? "var(--accent-pale)" : "transparent", 
                        color: bookmarkedBooks.has(String(book._id)) ? "var(--accent)" : "var(--text-muted)"
                      }}>
                      <Bookmark size={20} fill={bookmarkedBooks.has(String(book._id)) ? "currentColor" : "none"}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
}