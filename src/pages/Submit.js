import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { Upload, BookOpen, FileText, CheckCircle, Clock, XCircle, Plus, Newspaper } from "lucide-react";

const CATEGORIES = ["Health","Nutrition","Mental Health","Anatomy","Pharmacology","Nursing","Research","General"];

export default function Submit() {
  const navigate = useNavigate();
  const [tab, setTab]             = useState("book"); // book | feed
  const [courses, setCourses]     = useState([]);
  const [submissions, setSubmissions] = useState({ books: [], posts: [] });
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState("");
  const [error, setError]         = useState("");

  // Book form
  const [bookTitle, setBookTitle]       = useState("");
  const [bookAuthor, setBookAuthor]     = useState("");
  const [bookCourse, setBookCourse]     = useState("");
  const [bookDesc, setBookDesc]         = useState("");
  const [bookFile, setBookFile]         = useState(null);
  const [fileName, setFileName]         = useState("");
  const [uploading, setUploading]       = useState(false);
  const [uploadPct, setUploadPct]       = useState(0);

  // Feed form
  const [feedTitle, setFeedTitle]       = useState("");
  const [feedContent, setFeedContent]   = useState("");
  const [feedCategory, setFeedCategory] = useState("Health");

  useEffect(() => {
    api.get("courses").then(r => setCourses(r.data || [])).catch(() => {});
    api.get("submissions/my-submissions").then(r => setSubmissions(r.data)).catch(() => {});
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["pdf","ppt","pptx"].includes(ext)) {
      setError("Only PDF and PPT/PPTX files are accepted.");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("File must be under 50MB.");
      return;
    }
    setError("");
    setBookFile(f);
    setFileName(f.name);
  };

  const submitBook = async (e) => {
    e.preventDefault();
    if (!bookFile) { setError("Please select a PDF or PPT file."); return; }
    if (!bookTitle || !bookCourse) { setError("Title and course are required."); return; }
    setUploading(true); setError(""); setSuccess("");
    setUploadPct(0);

    const fd = new FormData();
    fd.append("file", bookFile);
    fd.append("title", bookTitle);
    fd.append("author", bookAuthor);
    fd.append("course", bookCourse);
    fd.append("description", bookDesc);

    try {
      await api.post("submissions/book", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => setUploadPct(Math.round((e.loaded * 100) / e.total)),
      });
      setSuccess("📚 Book submitted! An admin will review it shortly.");
      setBookTitle(""); setBookAuthor(""); setBookCourse(""); setBookDesc(""); setBookFile(null); setFileName("");
      // Refresh submissions
      const r = await api.get("submissions/my-submissions");
      setSubmissions(r.data);
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed. Please try again.");
    }
    setUploading(false);
  };

  const submitFeed = async (e) => {
    e.preventDefault();
    if (!feedTitle || !feedContent) { setError("Title and content are required."); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      await api.post("submissions/feed", { title: feedTitle, content: feedContent, category: feedCategory });
      setSuccess("📰 Post submitted! An admin will review it shortly.");
      setFeedTitle(""); setFeedContent(""); setFeedCategory("Health");
      const r = await api.get("submissions/my-submissions");
      setSubmissions(r.data);
    } catch (err) {
      setError(err.response?.data?.error || "Submission failed.");
    }
    setLoading(false);
  };

  const statusIcon = (s) => s === "approved" ? <CheckCircle size={14} color="#16a34a"/> : s === "rejected" ? <XCircle size={14} color="#dc2626"/> : <Clock size={14} color="#d97706"/>;
  const statusColor = (s) => s === "approved" ? "#16a34a" : s === "rejected" ? "#dc2626" : "#d97706";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize:"1.5rem", fontWeight: 800, margin: 0 }}>✍️ Submit Content</h1>
        <p style={{ color:"var(--text-muted)", fontSize:".85rem", marginTop: 4 }}>
          Share your knowledge — books and posts go to admin review before going live.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap: 8, marginBottom: 24, background:"var(--surface,#f1f5f9)", borderRadius: 12, padding: 4 }}>
        {[["book","📚 Submit a Book"],["feed","📰 Submit a Post"]].map(([t,l]) => (
          <button key={t} onClick={() => { setTab(t); setError(""); setSuccess(""); }}
            style={{ flex:1, padding:"10px 0", borderRadius: 10, border:"none", fontWeight: 700, fontSize:".875rem", cursor:"pointer",
              background: tab===t ? "var(--accent,#4255ff)" : "transparent",
              color: tab===t ? "white" : "var(--text-muted,#64748b)",
              transition:"all .2s",
            }}>
            {l}
          </button>
        ))}
      </div>

      {/* Messages */}
      {success && <div style={{ padding:"12px 16px", borderRadius: 12, background:"#dcfce7", border:"1px solid #bbf7d0", color:"#15803d", fontWeight: 600, fontSize:".875rem", marginBottom: 16 }}>{success}</div>}
      {error   && <div style={{ padding:"12px 16px", borderRadius: 12, background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", fontWeight: 600, fontSize:".875rem", marginBottom: 16 }}>{error}</div>}

      {/* ── BOOK FORM ── */}
      {tab === "book" && (
        <form onSubmit={submitBook} style={{ display:"flex", flexDirection:"column", gap: 14 }}>
          <div style={{ padding:"18px", borderRadius: 14, border:"2px dashed var(--border,#e2e8f0)", background:"var(--surface,#f8fafc)", textAlign:"center", cursor:"pointer", position:"relative" }}
            onClick={() => document.getElementById("book-file-input").click()}>
            <Upload size={28} style={{ margin:"0 auto 8px", color:"var(--accent,#4255ff)" }} />
            <div style={{ fontWeight: 700, color:"var(--text,#0f172a)" }}>
              {fileName || "Click to select PDF or PPT file"}
            </div>
            <div style={{ fontSize:".75rem", color:"var(--text-muted)", marginTop: 4 }}>
              Accepted: .pdf, .ppt, .pptx · Max 50MB
            </div>
            <input id="book-file-input" type="file" accept=".pdf,.ppt,.pptx" onChange={handleFileChange} style={{ position:"absolute", opacity:0, width:"100%", height:"100%", top:0, left:0, cursor:"pointer" }} />
          </div>

          {uploading && (
            <div style={{ borderRadius: 8, overflow:"hidden", background:"var(--border,#e2e8f0)", height: 6 }}>
              <div style={{ width:`${uploadPct}%`, height:"100%", background:"#4255ff", transition:"width .3s" }} />
            </div>
          )}

          <input style={inputStyle} placeholder="Book title *" value={bookTitle} onChange={e=>setBookTitle(e.target.value)} required />
          <input style={inputStyle} placeholder="Author name" value={bookAuthor} onChange={e=>setBookAuthor(e.target.value)} />
          <select style={inputStyle} value={bookCourse} onChange={e=>setBookCourse(e.target.value)} required>
            <option value="">Select course *</option>
            {courses.map(c => <option key={c.name||c} value={c.name||c}>{c.name||c}</option>)}
          </select>
          <textarea style={{ ...inputStyle, minHeight: 80, resize:"vertical" }} placeholder="Brief description (optional)" value={bookDesc} onChange={e=>setBookDesc(e.target.value)} />
          <button type="submit" disabled={uploading}
            style={{ padding:"13px", borderRadius: 12, background:"#4255ff", color:"white", fontWeight: 800, border:"none", fontSize:".95rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap: 8 }}>
            {uploading ? `Uploading ${uploadPct}%…` : <><Plus size={16}/> Submit for Review</>}
          </button>
        </form>
      )}

      {/* ── FEED FORM ── */}
      {tab === "feed" && (
        <form onSubmit={submitFeed} style={{ display:"flex", flexDirection:"column", gap: 14 }}>
          <input style={inputStyle} placeholder="Post title *" value={feedTitle} onChange={e=>setFeedTitle(e.target.value)} required />
          <select style={inputStyle} value={feedCategory} onChange={e=>setFeedCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea style={{ ...inputStyle, minHeight: 140, resize:"vertical" }} placeholder="Write your post content here… (share health tips, research summaries, case studies, etc.)" value={feedContent} onChange={e=>setFeedContent(e.target.value)} required />
          <p style={{ fontSize:".75rem", color:"var(--text-muted)", margin:"-6px 0" }}>Posts are reviewed by admin before going public.</p>
          <button type="submit" disabled={loading}
            style={{ padding:"13px", borderRadius: 12, background:"#4255ff", color:"white", fontWeight: 800, border:"none", fontSize:".95rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap: 8 }}>
            {loading ? "Submitting…" : <><Newspaper size={16}/> Submit Post</>}
          </button>
        </form>
      )}

      {/* ── MY SUBMISSIONS ── */}
      {(submissions.books.length > 0 || submissions.posts.length > 0) && (
        <div style={{ marginTop: 36 }}>
          <h2 style={{ fontSize:"1rem", fontWeight: 800, marginBottom: 14 }}>📋 My Submissions</h2>
          <div style={{ display:"flex", flexDirection:"column", gap: 8 }}>
            {[...submissions.books.map(b=>({...b,_type:"book"})), ...submissions.posts.map(p=>({...p,_type:"post"}))].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(item => (
              <div key={item._id} style={{ display:"flex", alignItems:"center", gap: 12, padding:"12px 14px", borderRadius: 12, background:"var(--card-bg,#fff)", border:"1px solid var(--border,#e2e8f0)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: item._type==="book" ? "rgba(66,85,255,.08)" : "rgba(22,163,74,.08)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {item._type==="book" ? <BookOpen size={18} color="#4255ff"/> : <FileText size={18} color="#16a34a"/>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight: 700, fontSize:".875rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.title}</div>
                  <div style={{ fontSize:".72rem", color:"var(--text-muted)" }}>{new Date(item.createdAt).toLocaleDateString()} · {item._type}</div>
                  {item.rejectReason && <div style={{ fontSize:".72rem", color:"#dc2626", marginTop: 2 }}>Reason: {item.rejectReason}</div>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap: 4, fontSize:".75rem", fontWeight: 700, color: statusColor(item.status) }}>
                  {statusIcon(item.status)} {item.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  padding:"11px 14px", borderRadius: 12, border:"1.5px solid var(--border,#e2e8f0)",
  background:"var(--card-bg,#fff)", color:"var(--text,#0f172a)",
  fontSize:".875rem", outline:"none", width:"100%", boxSizing:"border-box",
};
