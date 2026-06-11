import React, { useState, useContext, useEffect, useRef, useCallback } from "react";
import { UserContext } from "../context/UserContext";
import {
  FaPencilAlt, FaMedal, FaStar, FaTrophy, FaCog, FaMoon, FaSun, FaGlobe,
  FaLock, FaTimes, FaCheckCircle, FaUser, FaEnvelope, FaMapMarkerAlt,
  FaUserGraduate, FaHospital, FaSearch, FaPlus
} from "react-icons/fa";
import "../styles/profile.css";
import countries from "../data/countries";
import api from "../api/api";
import { getBookmarks } from "../utils/bookmarks";

const INSTITUTION_CATEGORIES = ["Health Tutor", "Nurse", "Doctor", "Other Health Worker"];

const avatarGradient = (name = "") => {
  const palettes = [
    ["#4255ff","#8b5cf6"],["#ec4899","#f43f5e"],["#10b981","#06b6d4"],
    ["#f59e0b","#ef4444"],["#8b5cf6","#4255ff"],["#06b6d4","#10b981"],
  ];
  const idx = (name.charCodeAt(0) || 0) % palettes.length;
  return `linear-gradient(135deg, ${palettes[idx][0]}, ${palettes[idx][1]})`;
};

function ProfilePage({ user, setUser }) {
  const { theme, setTheme } = useContext(UserContext);
  const [isEditing, setIsEditing]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage]     = useState(localStorage.getItem("language") || "English");
  const [resetSent, setResetSent]   = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  // Contact Admin suggestion
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggSubject, setSuggSubject] = useState("");
  const [suggMessage, setSuggMessage] = useState("");
  const [suggSending, setSuggSending] = useState(false);
  const [suggSent, setSuggSent]       = useState(false);
  const [suggError, setSuggError]     = useState("");

  /* Institution picker */
  const [instSearch,     setInstSearch]     = useState("");
  const [instResults,    setInstResults]    = useState([]);
  const [instLoading,    setInstLoading]    = useState(false);
  const [instSuggesting, setInstSuggesting] = useState(false);
  const [instSaveMsg,    setInstSaveMsg]    = useState("");
  const [newInstName,    setNewInstName]    = useState("");
  const [newInstType,    setNewInstType]    = useState("school");
  const instDebounce = useRef(null);

  const showInstPicker = INSTITUTION_CATEGORIES.includes(user?.category);

  const searchInstitutions = useCallback((q) => {
    if (!q || q.length < 2) { setInstResults([]); return; }
    clearTimeout(instDebounce.current);
    instDebounce.current = setTimeout(() => {
      setInstLoading(true);
      api.get(`/institutions?q=${encodeURIComponent(q)}`)
        .then(r => setInstResults(r.data))
        .catch(() => {})
        .finally(() => setInstLoading(false));
    }, 350);
  }, []);

  const handleSelectInstitution = async (inst) => {
    try {
      await api.patch(`/institutions/select/${inst._id}`);
      setUser(prev => ({ ...prev, institution: inst }));
      setInstSearch(inst.name);
      setInstResults([]);
      setInstSaveMsg("Institution saved ✓");
      setTimeout(() => setInstSaveMsg(""), 3000);
    } catch (e) { alert(e.response?.data?.error || "Failed to set institution."); }
  };

  const handleClearInstitution = async () => {
    if (!window.confirm("Remove your institution from your profile?")) return;
    try {
      await api.patch("/institutions/clear");
      setUser(prev => ({ ...prev, institution: null }));
      setInstSearch("");
      setInstSaveMsg("Institution cleared.");
      setTimeout(() => setInstSaveMsg(""), 3000);
    } catch { alert("Failed to clear institution."); }
  };

  const handleSuggestInstitution = async () => {
    if (!newInstName.trim()) return;
    try {
      const r = await api.post("/institutions/suggest", { name: newInstName.trim(), type: newInstType, country: user.country });
      if (r.data.existing) { await handleSelectInstitution(r.data.institution); }
      else { setInstSaveMsg("Suggestion submitted! Admins will review it shortly."); setTimeout(() => setInstSaveMsg(""), 5000); }
      setInstSuggesting(false); setNewInstName("");
    } catch (e) { alert(e.response?.data?.error || "Failed to submit suggestion."); }
  };

  useEffect(() => {
    api.get("/user/leaderboard").then(res => setLeaderboard(res.data)).catch(() => {});
  }, []);

  if (!user) return null;

  const userId      = localStorage.getItem("userId");
  const quizHistory = (() => { try { return JSON.parse(localStorage.getItem(`quizHistory_${userId}`) || "[]"); } catch { return []; } })();
  const totalSolved = quizHistory.reduce((acc, h) => acc + (h.total || 0), 0);
  const savedBooks  = getBookmarks("book");
  const savedPosts  = getBookmarks("post");
  const totalSaved  = savedBooks.length + savedPosts.length;

  const handleChange = (field, value) => setUser({ ...user, [field]: value });

  const handleSaveChanges = async () => {
    try {
      const res = await api.put("/user", user);
      setUser(res.data);
      setIsEditing(false);
    } catch { alert("Failed to save profile."); }
  };

  const handlePasswordReset = async () => {
    try {
      await api.post("/auth/forgot-password", { email: user.email });
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch { alert("Failed to send reset email."); }
  };

  const handleSendSuggestion = async () => {
    if (!suggMessage.trim()) { setSuggError("Message is required"); return; }
    setSuggSending(true); setSuggError("");
    try {
      await api.post("/contact/suggestions", { subject: suggSubject.trim(), message: suggMessage.trim() });
      setSuggSent(true);
      setTimeout(() => { setSuggSent(false); setShowSuggest(false); setSuggSubject(""); setSuggMessage(""); }, 3000);
    } catch (e) {
      setSuggError(e.response?.data?.message || "Failed to send. Try again.");
    } finally { setSuggSending(false); }
  };

  const initial      = (user.name || "U")[0].toUpperCase();
  const userPoints   = user.points || 0;
  const userStreak   = user.streak || 0;

  let rankInfo = { title: "Novice",       color: "#94a3b8", icon: <FaStar />,   nextRank: 100  };
  if (userPoints >= 1000) rankInfo = { title: "Expert",       color: "#f59e0b", icon: <FaTrophy />, nextRank: 5000 };
  else if (userPoints >= 500)  rankInfo = { title: "Advanced",     color: "#8b5cf6", icon: <FaMedal />,  nextRank: 1000 };
  else if (userPoints >= 100)  rankInfo = { title: "Intermediate",  color: "#3b82f6", icon: <FaMedal />,  nextRank: 500  };

  const progressToNext = Math.min(100, (userPoints / rankInfo.nextRank) * 100);

  /* ─── Shared input style for edit fields ─── */
  const iStyle = {
    width: "100%", padding: "8px 10px", borderRadius: 8,
    border: "1.5px solid var(--border, #e2e8f0)",
    background: "var(--bg-input, #f1f3f8)",
    color: "var(--text-heading, #0f172a)",
    fontSize: "0.88rem", fontWeight: 600, outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div className="pp-page">

      {/* ── HERO CARD ── */}
      <div className="pp-hero">
        {/* Avatar ring */}
        <div className="pp-avatar-wrap">
          <div className="pp-ring" style={{ background: `conic-gradient(${rankInfo.color} ${progressToNext}%, #e2e8f0 0deg)` }}>
            <div className="pp-avatar" style={{ background: avatarGradient(user.name) }}>{initial}</div>
          </div>
          <div className="pp-rank-badge" style={{ background: rankInfo.color }}>
            {rankInfo.icon}&nbsp;{rankInfo.title}
          </div>
        </div>

        {/* Name + meta */}
        <div className="pp-hero-body">
          <h1 className="pp-name">{user.name}</h1>
          <p className="pp-meta">{user.category} · {user.country}</p>

          {/* Points + progress */}
          <div className="pp-points-row">
            <span className="pp-pts-num">{userPoints.toLocaleString()}</span>
            <span className="pp-pts-lbl">pts</span>
          </div>
          <div className="pp-prog-track">
            <div className="pp-prog-fill" style={{ width: `${progressToNext}%`, background: rankInfo.color }} />
          </div>
          <p className="pp-prog-hint">{Math.round(progressToNext)}% to {rankInfo.title === "Expert" ? "max rank" : "next rank"}</p>

          {/* Action buttons */}
          <div className="pp-hero-actions">
            <button
              className={`pp-btn pp-btn-edit${isEditing ? " active" : ""}`}
              onClick={() => { if (isEditing) handleSaveChanges(); else setIsEditing(true); }}
            >
              {isEditing ? <><FaCheckCircle /> Save</> : <><FaPencilAlt /> Edit</>}
            </button>
            <button className="pp-btn pp-btn-settings" onClick={() => setShowSettings(true)}>
              <FaCog />
            </button>
          </div>
        </div>
      </div>

      {/* ── INFO CARDS ── */}
      <div className="pp-section-label">Profile Info</div>
      <div className="pp-info-grid">
        {[
          { icon: <FaUser />,          label: "Full Name",     field: "name",     type: "text"  },
          { icon: <FaEnvelope />,      label: "Email",         field: "email",    type: "email" },
          { icon: <FaUserGraduate />,  label: "Category",      field: "category", type: "select",
            options: ["Student","Health Tutor","Nurse","Doctor","Other Health Worker"] },
          { icon: <FaMapMarkerAlt />,  label: "Country",       field: "country",  type: "country" },
        ].map(card => (
          <div key={card.field} className="pp-info-card">
            <div className="pp-info-icon">{card.icon}</div>
            <div className="pp-info-body">
              <span className="pp-info-label">{card.label}</span>
              {isEditing ? (
                card.type === "select" ? (
                  <select value={user[card.field] || ""} onChange={e => handleChange(card.field, e.target.value)} style={iStyle}>
                    {card.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : card.type === "country" ? (
                  <select value={user.country || ""} onChange={e => handleChange("country", e.target.value)} style={iStyle}>
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <input type={card.type} value={user[card.field] || ""} onChange={e => handleChange(card.field, e.target.value)} style={iStyle} />
                )
              ) : (
                <span className="pp-info-val">{user[card.field] || "—"}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {isEditing && (
        <div style={{ display: "flex", gap: 10, margin: "0 0 16px" }}>
          <button className="pp-btn pp-btn-edit active" onClick={handleSaveChanges}><FaCheckCircle /> Save Changes</button>
          <button className="pp-btn" onClick={() => setIsEditing(false)} style={{ background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>Discard</button>
        </div>
      )}

      {/* ── INSTITUTION PICKER ── */}
      {showInstPicker && (
        <div className="pp-card" style={{ marginBottom: 16 }}>
          <div className="pp-card-head"><FaHospital /> School / Hospital</div>
          {user.institution ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ flex: 1, fontWeight: 700, fontSize: "0.88rem", color: "var(--text-heading)", minWidth: 0, wordBreak: "break-word" }}>
                🏥 {user.institution.name}
                <span style={{ display: "inline-block", marginLeft: 8, fontSize: "0.7rem", color: "var(--accent)" }}>
                  {user.institution.type} · {user.institution.country}
                </span>
                {user.institutionVerified && (
                  <span style={{ marginLeft: 8, fontSize: "0.7rem", background: "rgba(16,185,129,0.12)", color: "#10b981", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>✓ Verified</span>
                )}
              </span>
              <button onClick={handleClearInstitution} style={{ fontSize: "0.75rem", padding: "5px 12px", borderRadius: 8, border: "1px solid #ef4444", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", fontWeight: 700, flexShrink: 0 }}>Remove</button>
            </div>
          ) : (
            <div>
              <div style={{ position: "relative", marginBottom: 6 }}>
                <FaSearch style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "0.8rem" }} />
                <input style={{ ...iStyle, paddingLeft: 30 }} placeholder="Search your school or hospital…"
                  value={instSearch} onChange={e => { setInstSearch(e.target.value); searchInstitutions(e.target.value); }} />
                {instLoading && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "#94a3b8" }}>…</span>}
              </div>
              {instResults.length > 0 && (
                <div style={{ background: "var(--bg-card,white)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
                  {instResults.map(inst => (
                    <button key={inst._id} onClick={() => handleSelectInstitution(inst)}
                      style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                      <span>{inst.type === "hospital" ? "🏥" : "🎓"}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.87rem", color: "var(--text-heading)" }}>{inst.name}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{inst.type} · {inst.country}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {!instSuggesting ? (
                <button onClick={() => setInstSuggesting(true)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", fontWeight: 700, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <FaPlus style={{ fontSize: "0.7rem" }} /> My institution isn't listed
                </button>
              ) : (
                <div style={{ background: "var(--bg-input)", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-heading)" }}>Suggest a new institution</span>
                  <input style={iStyle} placeholder="Full official name…" value={newInstName} onChange={e => setNewInstName(e.target.value)} />
                  <select style={iStyle} value={newInstType} onChange={e => setNewInstType(e.target.value)}>
                    <option value="school">School / University</option>
                    <option value="hospital">Hospital</option>
                    <option value="clinic">Clinic</option>
                    <option value="other">Other</option>
                  </select>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleSuggestInstitution} style={{ flex: 1, padding: 9, borderRadius: 8, background: "var(--accent)", color: "white", border: "none", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>Submit for review</button>
                    <button onClick={() => setInstSuggesting(false)} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "none", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              )}
              {instSaveMsg && <div style={{ marginTop: 6, fontSize: "0.78rem", fontWeight: 700, color: "#10b981" }}>{instSaveMsg}</div>}
            </div>
          )}
        </div>
      )}

      {/* ── LEARNING STATS ── */}
      <div className="pp-section-label">Activity</div>
      <div className="pp-stats-row">
        {[
          { icon: "📝", val: totalSolved, lab: "Solved" },
          { icon: "🔥", val: userStreak || 0, lab: "Streak" },
          { icon: "🔖", val: totalSaved,  lab: "Saved"  },
          { icon: "⭐", val: userPoints,  lab: "Points" },
        ].map((s, i) => (
          <div key={i} className="pp-stat-item">
            <span className="pp-stat-icon">{s.icon}</span>
            <span className="pp-stat-val">{s.val.toLocaleString()}</span>
            <span className="pp-stat-lab">{s.lab}</span>
          </div>
        ))}
      </div>

      {/* ── UPGRADE TO PREMIUM ── */}
      <div className="pp-upgrade">
        <div className="pp-upgrade-blobs" />
        <div className="pp-upgrade-inner">
          <div className="pp-upgrade-header">
            <div className="pp-upgrade-icon">⚡</div>
            <div>
              <div className="pp-upgrade-title">Upgrade to Premium</div>
              <div className="pp-upgrade-sub">Unlock the full UHC experience</div>
            </div>
            <span className="pp-upgrade-badge">PRO</span>
          </div>
          <div className="pp-upgrade-features">
            {["🚀 Unlimited quizzes","📊 Advanced analytics","🃏 Full study library","🏆 Priority rankings","🔔 Study reminders","📚 Downloads"].map((f,i) => (
              <div key={i} className="pp-upgrade-feat">{f}</div>
            ))}
          </div>
          <div className="pp-upgrade-cta">
            <button className="pp-upgrade-btn">⚡ Start Free Trial</button>
            <span className="pp-upgrade-note">No card required · Cancel anytime</span>
          </div>
        </div>
      </div>

      {/* ── LEADERBOARD ── */}
      <div className="pp-section-label">Top 5 Leaderboard</div>
      <div className="pp-card" style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
        {leaderboard.length === 0
          ? <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>No top users yet.</div>
          : leaderboard.map((u, i) => (
            <div key={u._id} className={`pp-lb-row${u._id === user._id ? " me" : ""}`}>
              <span className="pp-lb-rank" style={{ color: i < 3 ? "#f59e0b" : "var(--text-muted)" }}>#{i+1}</span>
              <div className="pp-lb-avatar" style={{ background: avatarGradient(u.name) }}>{u.name[0]?.toUpperCase()}</div>
              <div className="pp-lb-name">
                {u.name} <span className="pp-lb-cat">({u.category})</span>
                {u._id === user._id && <span className="pp-lb-you"> You</span>}
              </div>
              <span className="pp-lb-pts">{u.points.toLocaleString()} pts</span>
            </div>
          ))
        }
      </div>

      {/* ── QUIZ HISTORY ── */}
      {quizHistory.length > 0 && (
        <>
          <div className="pp-section-label">📊 Quiz History <span style={{ fontWeight: 400, fontSize: "0.75rem", color: "var(--text-muted)" }}>({quizHistory.length} sessions)</span></div>
          <div className="pp-card" style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {quizHistory.slice(0, 5).map((h, i) => (
              <div key={i} className="pp-quiz-row">
                <div className="pp-quiz-icon" style={{ background: h.pct >= 70 ? "rgba(66,85,255,0.1)" : h.pct >= 50 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)" }}>
                  {h.pct >= 70 ? "🎯" : h.pct >= 50 ? "📈" : "💪"}
                </div>
                <div className="pp-quiz-body">
                  <div className="pp-quiz-course">{h.course}</div>
                  <div className="pp-quiz-meta">{new Date(h.date).toLocaleDateString()} · {h.total} Q · 🔥{h.bestStreak}</div>
                </div>
                <span className="pp-quiz-pct" style={{ color: h.pct >= 70 ? "var(--accent)" : h.pct >= 50 ? "#f59e0b" : "#ef4444" }}>{h.pct}%</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── CONTACT ADMIN ── */}
      <div className="pp-section-label">💬 Contact Admin</div>
      <div className="pp-card" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "16px 20px" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: ".88rem", color: "var(--text-heading)", marginBottom: 3 }}>Send a Message to Admin</div>
          <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Suggestions, feedback, or questions — we'd love to hear from you</div>
        </div>
        <button
          onClick={() => setShowSuggest(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "linear-gradient(135deg,#4255ff,#8b5cf6)",
            color: "white", border: "none", borderRadius: 12, padding: "10px 18px",
            fontWeight: 700, fontSize: ".82rem", cursor: "pointer", flexShrink: 0,
            boxShadow: "0 4px 14px rgba(66,85,255,.3)", transition: "transform .15s, box-shadow .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(66,85,255,.4)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 4px 14px rgba(66,85,255,.3)"; }}
        >
          <FaEnvelope/> Write a Message
        </button>
      </div>

      {/* ── SUGGESTION MODAL ── */}
      {showSuggest && (
        <div
          onClick={e => e.target === e.currentTarget && setShowSuggest(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(15,23,42,.55)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 0 0",
          }}
        >
          <div style={{
            width: "100%", maxWidth: 540, background: "var(--bg-card, #fff)",
            borderRadius: "24px 24px 0 0", padding: "28px 24px 36px",
            boxShadow: "0 -8px 40px rgba(0,0,0,.18)",
            animation: "slideUp .28s cubic-bezier(.34,1.56,.64,1)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#4255ff,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FaEnvelope style={{ color: "white", fontSize: "1rem" }}/>
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-heading)" }}>Message Admin</div>
                  <div style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>Your message goes directly to the super admin</div>
                </div>
              </div>
              <button onClick={() => setShowSuggest(false)}
                style={{ background: "var(--bg-input)", border: "none", borderRadius: 99, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "1rem" }}>
                ✕
              </button>
            </div>

            {suggSent ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>✅</div>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: "#16a34a" }}>Message Sent!</div>
                <div style={{ fontSize: ".8rem", color: "var(--text-muted)", marginTop: 4 }}>The admin will reply to you shortly via email and in-app notification.</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: ".75rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>Subject (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Bug report, Suggestion, Question…"
                    value={suggSubject}
                    onChange={e => setSuggSubject(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 10, boxSizing: "border-box",
                      border: "1.5px solid var(--border, #e2e8f0)", background: "var(--bg-input, #f1f3f8)",
                      color: "var(--text-heading)", fontSize: ".87rem", fontWeight: 500, outline: "none",
                    }}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: ".75rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>Your Message *</label>
                  <textarea
                    placeholder="Tell us anything — we read every message…"
                    value={suggMessage}
                    onChange={e => { setSuggMessage(e.target.value); if (suggError) setSuggError(""); }}
                    rows={4}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 10, boxSizing: "border-box",
                      border: `1.5px solid ${suggError ? "#ef4444" : "var(--border, #e2e8f0)"}`,
                      background: "var(--bg-input, #f1f3f8)", color: "var(--text-heading)",
                      fontSize: ".87rem", outline: "none", fontFamily: "inherit",
                      resize: "vertical", lineHeight: 1.55,
                    }}
                  />
                  {suggError && <div style={{ fontSize: ".72rem", color: "#ef4444", fontWeight: 600, marginTop: 4 }}>{suggError}</div>}
                </div>
                <button
                  onClick={handleSendSuggestion}
                  disabled={suggSending || !suggMessage.trim()}
                  style={{
                    width: "100%", padding: "13px", borderRadius: 12, border: "none",
                    background: suggSending ? "#94a3b8" : "linear-gradient(135deg,#4255ff,#8b5cf6)",
                    color: "white", fontWeight: 800, fontSize: ".92rem", cursor: suggSending ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 4px 16px rgba(66,85,255,.3)", transition: "opacity .15s",
                    opacity: !suggMessage.trim() ? .6 : 1,
                  }}
                >
                  <FaEnvelope/>
                  {suggSending ? "Sending…" : "Send Message"}
                </button>
                <p style={{ fontSize: ".7rem", color: "var(--text-muted)", textAlign: "center", margin: "10px 0 0" }}>
                  The admin will reply to your email: <strong>{user.email}</strong>
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SETTINGS MODAL ── */}
      {showSettings && (
        <div className="settings-overlay" onClick={e => e.target.classList.contains("settings-overlay") && setShowSettings(false)}>
          <div className="settings-modal">
            <div className="settings-header">
              <div className="settings-title-wrap">
                <div className="settings-title-icon"><FaCog /></div>
                <h3>Account Settings</h3>
              </div>
              <button className="close-settings" onClick={() => setShowSettings(false)}><FaTimes /></button>
            </div>
            <div className="settings-content">
              <div className="setting-card">
                <div className="setting-info">
                  <div className="setting-icon-box">{theme === "dark" ? <FaMoon /> : <FaSun />}</div>
                  <div className="setting-text">
                    <span className="setting-name">Appearance</span>
                    <span className="setting-hint">{theme === "dark" ? "Dark mode active" : "Light mode active"}</span>
                  </div>
                </div>
                <div className={`custom-toggle ${theme === "dark" ? "active" : ""}`} onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
                  <div className="toggle-slider" />
                </div>
              </div>
              <div className="setting-card">
                <div className="setting-info">
                  <div className="setting-icon-box"><FaGlobe /></div>
                  <div className="setting-text">
                    <span className="setting-name">Language</span>
                    <span className="setting-hint">System interface language</span>
                  </div>
                </div>
                <select className="setting-dropdown" value={language} onChange={e => { setLanguage(e.target.value); localStorage.setItem("language", e.target.value); }}>
                  <option value="English">English</option>
                  <option value="French">French</option>
                  <option value="Spanish">Spanish</option>
                  <option value="Twi">Twi</option>
                </select>
              </div>
              <div className="settings-sub-title">Security &amp; Privacy</div>
              <div className="setting-card">
                <div className="setting-info">
                  <div className="setting-icon-box"><FaLock /></div>
                  <div className="setting-text">
                    <span className="setting-name">Authentication</span>
                    <span className="setting-hint">Update your login password</span>
                  </div>
                </div>
                <button className={`setting-action-btn ${resetSent ? "success" : ""}`} onClick={handlePasswordReset} disabled={resetSent}>
                  {resetSent ? <><FaCheckCircle /> Sent</> : "Reset Password"}
                </button>
              </div>
            </div>
            <div className="settings-footer">
              <button className="settings-done-btn" onClick={() => setShowSettings(false)}>Save &amp; Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;