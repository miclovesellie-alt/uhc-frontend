import React, { useState, useEffect } from "react";
import api from "../api/api";
import { Layers, FileText, CheckCircle, Clock, XCircle, Plus, Newspaper } from "lucide-react";

const CATEGORIES = ["Health","Nutrition","Mental Health","Anatomy","Pharmacology","Nursing","Research","General"];
const EMOJIS = ["🃏","💊","🩺","🧠","👶","🧒","📋","❤️","🦴","🩻","💉","🌡️"];

export default function Submit() {
  const [tab, setTab]             = useState("flashcard"); // flashcard | feed
  const [courses, setCourses]     = useState([]);
  const [submissions, setSubmissions] = useState({ books: [], posts: [], flashcards: [] });
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState("");
  const [error, setError]         = useState("");

  // Flashcard form
  const [fcQuestion, setFcQuestion] = useState("");
  const [fcAnswer,   setFcAnswer]   = useState("");
  const [fcHint,     setFcHint]     = useState("");
  const [fcCourse,   setFcCourse]   = useState("");
  const [fcEmoji,    setFcEmoji]    = useState("🃏");

  // Feed form
  const [feedTitle,        setFeedTitle]        = useState("");
  const [feedContent,      setFeedContent]      = useState("");
  const [feedCategory,     setFeedCategory]     = useState("Health");
  const [feedImage,        setFeedImage]        = useState(null);
  const [feedImagePreview, setFeedImagePreview] = useState("");

  useEffect(() => {
    api.get("courses").then(r => setCourses(r.data || [])).catch(() => {});
    api.get("submissions/my-submissions").then(r => setSubmissions(r.data)).catch(() => {});
  }, []);

  /* ── Submit flashcard ── */
  const submitFlashcard = async (e) => {
    e.preventDefault();
    if (!fcQuestion || !fcAnswer || !fcCourse) {
      setError("Question, answer, and course are required."); return;
    }
    setLoading(true); setError(""); setSuccess("");
    try {
      await api.post("submissions/flashcard", {
        question: fcQuestion, answer: fcAnswer,
        hint: fcHint, course: fcCourse, emoji: fcEmoji,
      });
      setSuccess("🃏 Flashcard submitted! An admin will review it shortly.");
      setFcQuestion(""); setFcAnswer(""); setFcHint(""); setFcCourse(""); setFcEmoji("🃏");
      const r = await api.get("submissions/my-submissions");
      setSubmissions(r.data);
    } catch (err) {
      setError(err.response?.data?.error || "Submission failed. Please try again.");
    }
    setLoading(false);
  };

  /* ── Submit feed post ── */
  const submitFeed = async (e) => {
    e.preventDefault();
    if (!feedTitle || !feedContent) { setError("Title and content are required."); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const fd = new FormData();
      fd.append("title", feedTitle);
      fd.append("content", feedContent);
      fd.append("category", feedCategory);
      if (feedImage) fd.append("image", feedImage);
      await api.post("submissions/feed", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setSuccess("📰 Post submitted! An admin will review it shortly.");
      setFeedTitle(""); setFeedContent(""); setFeedCategory("Health"); setFeedImage(null); setFeedImagePreview("");
      const r = await api.get("submissions/my-submissions");
      setSubmissions(r.data);
    } catch (err) {
      setError(err.response?.data?.error || "Submission failed.");
    }
    setLoading(false);
  };

  const statusIcon  = (s) => s === "approved" ? <CheckCircle size={14} color="#16a34a"/> : s === "rejected" ? <XCircle size={14} color="#dc2626"/> : <Clock size={14} color="#d97706"/>;
  const statusColor = (s) => s === "approved" ? "#16a34a" : s === "rejected" ? "#dc2626" : "#d97706";

  /* ── All submissions merged ── */
  const allSubmissions = [
    ...(submissions.flashcards || []).map(f => ({ ...f, _type: "flashcard", title: f.question })),
    ...(submissions.posts || []).map(p => ({ ...p, _type: "post" })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize:"1.5rem", fontWeight: 800, margin: 0 }}>✍️ Submit Content</h1>
        <p style={{ color:"var(--text-muted)", fontSize:".85rem", marginTop: 4 }}>
          Share your knowledge — flashcards and posts go to admin review before going live.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap: 8, marginBottom: 24, background:"var(--surface,#f1f5f9)", borderRadius: 12, padding: 4 }}>
        {[["flashcard","🃏 Submit a Flashcard"],["feed","📰 Submit a Post"]].map(([t,l]) => (
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

      {/* ── FLASHCARD FORM ── */}
      {tab === "flashcard" && (
        <form onSubmit={submitFlashcard} style={{ display:"flex", flexDirection:"column", gap: 14 }}>

          {/* Info banner */}
          <div style={{ padding:"12px 14px", borderRadius:12, background:"rgba(66,85,255,.06)",
            border:"1px solid rgba(66,85,255,.15)", fontSize:".82rem", color:"#4255ff", fontWeight:600,
            display:"flex", alignItems:"center", gap:8 }}>
            <Layers size={15}/> Help build the Study Hub — submit a flashcard for your course!
          </div>

          {/* Emoji picker */}
          <div>
            <label style={labelStyle}>Pick an emoji</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:6 }}>
              {EMOJIS.map(e => (
                <button key={e} type="button" onClick={() => setFcEmoji(e)}
                  style={{ width:38, height:38, borderRadius:10, border:`2px solid ${fcEmoji===e ? "#4255ff" : "var(--border,#e2e8f0)"}`,
                    background: fcEmoji===e ? "rgba(66,85,255,.08)" : "var(--card-bg,#fff)",
                    fontSize:"1.1rem", cursor:"pointer", transition:"all .15s" }}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Question *</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize:"vertical", marginTop:6 }}
              placeholder="e.g. What is the antidote for heparin overdose?"
              value={fcQuestion} onChange={e => setFcQuestion(e.target.value)} required />
          </div>

          <div>
            <label style={labelStyle}>Answer *</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize:"vertical", marginTop:6 }}
              placeholder="e.g. Protamine sulfate — reverses heparin anticoagulation."
              value={fcAnswer} onChange={e => setFcAnswer(e.target.value)} required />
          </div>

          <div>
            <label style={labelStyle}>Hint <span style={{ fontWeight:400, color:"var(--text-muted)" }}>(optional)</span></label>
            <input style={{ ...inputStyle, marginTop:6 }}
              placeholder="e.g. Think about reversal agents…"
              value={fcHint} onChange={e => setFcHint(e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Course *</label>
            <select style={{ ...inputStyle, marginTop:6 }} value={fcCourse} onChange={e => setFcCourse(e.target.value)} required>
              <option value="">Select course</option>
              {courses.map(c => <option key={c.name||c} value={c.name||c}>{c.name||c}</option>)}
            </select>
          </div>

          {/* Preview */}
          {fcQuestion && (
            <div style={{ borderRadius:14, border:"1px solid var(--border,#e2e8f0)", overflow:"hidden" }}>
              <div style={{ padding:"10px 14px", background:"var(--surface,#f8fafc)", fontSize:".72rem", fontWeight:700, color:"var(--text-muted)", borderBottom:"1px solid var(--border,#e2e8f0)" }}>
                👁 Preview — how your card will look
              </div>
              <div style={{ padding:"16px", background:"var(--card-bg,white)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:"1.3rem" }}>{fcEmoji}</span>
                  {fcCourse && <span style={{ fontSize:".7rem", fontWeight:700, color:"#10b981", background:"rgba(16,185,129,.1)", padding:"3px 10px", borderRadius:99 }}>{fcCourse}</span>}
                </div>
                <p style={{ fontSize:".88rem", fontWeight:700, color:"var(--text,#0f172a)", lineHeight:1.55, margin:0 }}>{fcQuestion}</p>
                {fcHint && <p style={{ fontSize:".73rem", color:"var(--text-muted)", fontStyle:"italic", marginTop:6, marginBottom:0 }}>💡 {fcHint}</p>}
              </div>
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ padding:"13px", borderRadius: 12, background:"#4255ff", color:"white", fontWeight: 800, border:"none", fontSize:".95rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap: 8 }}>
            {loading ? "Submitting…" : <><Plus size={16}/> Submit Flashcard for Review</>}
          </button>

          <p style={{ fontSize:".75rem", color:"var(--text-muted)", textAlign:"center", margin:0 }}>
            Submitted flashcards go to admin review before appearing in the Study Hub.
          </p>
        </form>
      )}

      {/* ── FEED FORM ── */}
      {tab === "feed" && (
        <form onSubmit={submitFeed} style={{ display:"flex", flexDirection:"column", gap: 14 }}>
          <input style={inputStyle} placeholder="Post title *" value={feedTitle} onChange={e => setFeedTitle(e.target.value)} required />
          <select style={inputStyle} value={feedCategory} onChange={e => setFeedCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea style={{ ...inputStyle, minHeight: 140, resize:"vertical" }} placeholder="Write your post content here…" value={feedContent} onChange={e => setFeedContent(e.target.value)} required />

          <input id="feed-image-input" type="file" accept="image/*" style={{ display:"none" }}
            onChange={e => {
              const f = e.target.files[0];
              if (!f) return;
              setFeedImage(f);
              setFeedImagePreview(URL.createObjectURL(f));
            }}
          />
          {feedImagePreview ? (
            <div style={{ position:"relative", borderRadius: 12, overflow:"hidden", border:"1px solid var(--border,#e2e8f0)" }}>
              <img src={feedImagePreview} alt="preview" style={{ width:"100%", maxHeight:200, objectFit:"cover", display:"block" }} />
              <button type="button" onClick={() => { setFeedImage(null); setFeedImagePreview(""); }}
                style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,.55)", color:"white", border:"none", borderRadius:"50%", width:28, height:28, cursor:"pointer", fontWeight:800, fontSize:".9rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>
          ) : (
            <label htmlFor="feed-image-input" style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderRadius:12, border:"1.5px dashed var(--border,#e2e8f0)", cursor:"pointer", color:"var(--text-muted)", fontSize:".85rem", fontWeight:600 }}>
              <span style={{ fontSize:"1.2rem" }}>🖼️</span> Attach an image (optional)
            </label>
          )}

          <p style={{ fontSize:".75rem", color:"var(--text-muted)", margin:"-4px 0" }}>Posts are reviewed by admin before going public.</p>
          <button type="submit" disabled={loading}
            style={{ padding:"13px", borderRadius:12, background:"#4255ff", color:"white", fontWeight:800, border:"none", fontSize:".95rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {loading ? "Submitting…" : <><Newspaper size={16}/> Submit Post</>}
          </button>
        </form>
      )}

      {/* ── MY SUBMISSIONS ── */}
      {allSubmissions.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <h2 style={{ fontSize:"1rem", fontWeight: 800, marginBottom: 14 }}>📋 My Submissions</h2>
          <div style={{ display:"flex", flexDirection:"column", gap: 8 }}>
            {allSubmissions.map(item => (
              <div key={item._id} style={{ display:"flex", alignItems:"center", gap: 12, padding:"12px 14px", borderRadius: 12, background:"var(--card-bg,#fff)", border:"1px solid var(--border,#e2e8f0)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10,
                  background: item._type==="flashcard" ? "rgba(16,185,129,.08)" : "rgba(66,85,255,.08)",
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:"1.1rem" }}>
                  {item._type==="flashcard" ? "🃏" : <FileText size={18} color="#4255ff"/>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight: 700, fontSize:".875rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize:".72rem", color:"var(--text-muted)" }}>
                    {new Date(item.createdAt).toLocaleDateString()} · {item._type === "flashcard" ? `Flashcard · ${item.course}` : "post"}
                  </div>
                  {item.rejectReason && (
                    <div style={{ marginTop:6, padding:"8px 10px", borderRadius:8, background:"#fef2f2", border:"1px solid #fecaca", fontSize:".78rem", color:"#dc2626", fontWeight:600, lineHeight:1.4 }}>
                      ❌ Admin feedback: {item.rejectReason}
                    </div>
                  )}
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

const labelStyle = {
  fontSize:".82rem", fontWeight:700, color:"var(--text-muted,#64748b)", display:"block",
};
