import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../api/api";
import { ArrowLeft, BookOpen, Search, Download, ExternalLink, GraduationCap } from "lucide-react";
import { useToast } from "../components/Toast";
import { toggleBookmark, getBookmarks } from "../utils/bookmarks";
import { getFileUrl } from "../utils/config";
import PdfjsViewer from "../components/PdfjsViewer";
import { usePageEnabled, MaintenanceScreen } from "../hooks/usePageEnabled";
import "../styles/library.css";

/* ── Skeleton ─────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div style={{ borderRadius:14, overflow:"hidden", border:"1px solid #e2e8f0", background:"#f8fafc" }}>
      <div style={{ height:160, background:"linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
        backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite" }}/>
      <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ height:13, borderRadius:8, background:"#e2e8f0", width:"75%" }}/>
        <div style={{ height:11, borderRadius:8, background:"#e2e8f0", width:"50%" }}/>
        <div style={{ height:32, borderRadius:10, background:"#e2e8f0", marginTop:4 }}/>
      </div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

/* ── Book Card ────────────────────────────────────────────────── */
function BookCard({ book, bookmarked, onOpen, onBookmark }) {
  const cover = book.coverUrl ? getFileUrl(book.coverUrl) : null;
  return (
    <div style={{ borderRadius:14, overflow:"hidden", border:"1px solid #e2e8f0",
      background:"white", display:"flex", flexDirection:"column",
      boxShadow:"0 2px 8px rgba(0,0,0,0.04)", transition:"box-shadow .18s" }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.09)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.04)"}>

      {/* Cover */}
      <div style={{ height:160, background:"linear-gradient(135deg,#e0f2fe,#dbeafe)",
        display:"flex", alignItems:"center", justifyContent:"center",
        position:"relative", overflow:"hidden" }}>
        {cover
          ? <img src={cover} alt={book.title} onError={e=>e.target.style.display="none"}
              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
          : <BookOpen size={40} color="#93c5fd"/>
        }
        <button onClick={()=>onBookmark(book)}
          style={{ position:"absolute", top:8, right:8, background:"rgba(255,255,255,.85)",
            border:"none", borderRadius:"50%", width:30, height:30, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"1rem", backdropFilter:"blur(6px)" }}>
          {bookmarked ? "🔖" : "🏷️"}
        </button>
      </div>

      {/* Info */}
      <div style={{ padding:"12px 14px", flex:1, display:"flex", flexDirection:"column", gap:4 }}>
        <div style={{ fontWeight:700, fontSize:".88rem", color:"#0f172a",
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{book.title}</div>
        {book.author && <div style={{ fontSize:".73rem", color:"#64748b" }}>{book.author}</div>}
        <div style={{ marginTop:"auto", paddingTop:10 }}>
          <button onClick={()=>onOpen(book)}
            style={{ width:"100%", padding:"9px 0", borderRadius:10, border:"none",
              background:"#10b981", color:"white", fontWeight:700,
              fontSize:".82rem", cursor:"pointer", display:"flex",
              alignItems:"center", justifyContent:"center", gap:7 }}>
            <BookOpen size={14}/> Read
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Library ─────────────────────────────────────────────── */
export default function Library() {
  const { disabled, loading: checkingFlag } = usePageEnabled("disableLibrary");
  const { searchQuery } = useOutletContext();
  const toast = useToast();

  const [books,       setBooks]       = useState([]);
  const [courses,     setCourses]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeCourse,setActiveCourse]= useState(null); // null = show all courses
  const [openBook,    setOpenBook]    = useState(null); // book being read
  const [localSearch, setLocalSearch] = useState("");
  const [bookmarked,  setBookmarked]  = useState(
    () => new Set(getBookmarks("book").map(b => String(b._id)))
  );

  useEffect(() => {
    if (disabled) return;
    Promise.all([api.get("library/books"), api.get("library/courses")])
      .then(([b, c]) => { setBooks(b.data); setCourses(c.data); })
      .catch(() => toast("Failed to load library", "error"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  const handleBookmark = (book) => {
    const added = toggleBookmark("book", book);
    setBookmarked(prev => {
      const next = new Set(prev);
      added ? next.add(String(book._id)) : next.delete(String(book._id));
      return next;
    });
    toast(added ? "🔖 Saved!" : "Removed from saved", added ? "success" : "info");
  };

  if (checkingFlag) return null;
  if (disabled) return <MaintenanceScreen pageName="Study Library" />;

  /* ─── READER VIEW ─── */
  if (openBook) {
    const rawUrl = getFileUrl(openBook.fileUrl);
    const secure = rawUrl.replace("http://", "https://");
    return (
      <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 64px)" }}>

        {/* Reader header — single action bar */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px",
          background:"white", borderBottom:"1px solid #e2e8f0", flexShrink:0, flexWrap:"wrap" }}>
          <button onClick={() => setOpenBook(null)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px",
              borderRadius:8, border:"1px solid #e2e8f0", background:"#f8fafc",
              color:"#0f172a", cursor:"pointer", fontWeight:600, fontSize:".82rem" }}>
            <ArrowLeft size={15}/> Back
          </button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:".9rem", color:"#0f172a",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{openBook.title}</div>
            {openBook.course && <div style={{ fontSize:".72rem", color:"#64748b" }}>{openBook.course}</div>}
          </div>
          <a href={secure} target="_blank" rel="noreferrer"
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px",
              borderRadius:8, border:"1px solid #e2e8f0", background:"white",
              color:"#0f172a", textDecoration:"none", fontWeight:600, fontSize:".82rem" }}>
            <ExternalLink size={13}/> Open tab
          </a>
          <a href={secure} download target="_blank" rel="noreferrer"
            style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px",
              borderRadius:8, border:"none", background:"#10b981",
              color:"white", textDecoration:"none", fontWeight:700, fontSize:".82rem" }}>
            <Download size={13}/> Download
          </a>
        </div>

        {/* Viewer */}
        <div style={{ flex:1, overflow:"hidden" }}>
          <PdfjsViewer url={rawUrl} />
        </div>
      </div>
    );
  }

  /* ─── BROWSE VIEW ─── */
  const query = (localSearch || searchQuery || "").toLowerCase();

  // Course list (from courses endpoint, fallback to distinct book courses)
  const courseList = courses.length
    ? courses.map(c => c.name || c)
    : [...new Set(books.map(b => b.course).filter(Boolean))];

  // Books to show
  const filtered = books.filter(b => {
    const matchSearch = !query
      || b.title?.toLowerCase().includes(query)
      || b.author?.toLowerCase().includes(query);
    const matchCourse = !activeCourse || b.course === activeCourse;
    return matchSearch && matchCourse;
  });

  return (
    <div className="library-wrapper" style={{ padding:"0 0 40px" }}>

      {/* ── Top bar ── */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"20px 0 18px",
        flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
          <GraduationCap size={22} color="#10b981"/>
          <h1 style={{ margin:0, fontSize:"1.2rem", fontWeight:800, color:"var(--text,#0f172a)" }}>
            Study Library
          </h1>
        </div>
        <div style={{ position:"relative" }}>
          <Search size={14} style={{ position:"absolute", left:10, top:"50%",
            transform:"translateY(-50%)", color:"#94a3b8" }}/>
          <input value={localSearch} onChange={e=>setLocalSearch(e.target.value)}
            placeholder="Search books…"
            style={{ paddingLeft:32, paddingRight:12, height:36, borderRadius:10,
              border:"1px solid #e2e8f0", background:"#f8fafc", fontSize:".85rem",
              outline:"none", width:200 }}/>
        </div>
      </div>

      {/* ── Course filter ── */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
        <button onClick={()=>setActiveCourse(null)}
          style={{ padding:"6px 16px", borderRadius:99, fontSize:".78rem", fontWeight:700,
            border:"none", cursor:"pointer",
            background: activeCourse===null ? "#10b981" : "#f1f5f9",
            color: activeCourse===null ? "white" : "#475569" }}>
          All
        </button>
        {courseList.map(name => (
          <button key={name} onClick={()=>setActiveCourse(name)}
            style={{ padding:"6px 16px", borderRadius:99, fontSize:".78rem", fontWeight:700,
              border:"none", cursor:"pointer",
              background: activeCourse===name ? "#10b981" : "#f1f5f9",
              color: activeCourse===name ? "white" : "#475569" }}>
            {name}
          </button>
        ))}
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="library-books-grid">
          {[...Array(6)].map((_,i) => <Skeleton key={i}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 24px", color:"#64748b" }}>
          <div style={{ fontSize:"2.5rem", marginBottom:12 }}>📚</div>
          <div style={{ fontWeight:700, marginBottom:6 }}>No books found</div>
          <div style={{ fontSize:".85rem" }}>Try a different search or course filter</div>
        </div>
      ) : (
        <div className="library-books-grid">
          {filtered.map(book => (
            <BookCard key={book._id}
              book={book}
              bookmarked={bookmarked.has(String(book._id))}
              onOpen={setOpenBook}
              onBookmark={handleBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
}