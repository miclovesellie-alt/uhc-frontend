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

/* ── Institution categories that show the picker ── */
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

  /* ── Institution picker state ── */
  const [instSearch,     setInstSearch]     = useState("");
  const [instResults,    setInstResults]    = useState([]);
  const [instLoading,    setInstLoading]    = useState(false);
  const [instSuggesting, setInstSuggesting] = useState(false); // show "add new" form
  const [instSaveMsg,    setInstSaveMsg]    = useState("");
  const [newInstName,    setNewInstName]    = useState("");
  const [newInstType,    setNewInstType]    = useState("school");
  const instDebounce = useRef(null);

  const showInstPicker = INSTITUTION_CATEGORIES.includes(user?.category);

  /* Search institutions from API */
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
    } catch (e) { alert("Failed to clear institution."); }
  };

  const handleSuggestInstitution = async () => {
    if (!newInstName.trim()) return;
    try {
      const r = await api.post("/institutions/suggest", { name: newInstName.trim(), type: newInstType, country: user.country });
      if (r.data.existing) {
        await handleSelectInstitution(r.data.institution);
      } else {
        setInstSaveMsg("Suggestion submitted! Admins will review it shortly.");
        setTimeout(() => setInstSaveMsg(""), 5000);
      }
      setInstSuggesting(false);
      setNewInstName("");
    } catch (e) { alert(e.response?.data?.error || "Failed to submit suggestion."); }
  };

  useEffect(() => {
    api.get("/user/leaderboard").then(res => setLeaderboard(res.data)).catch(err => console.error("Leaderboard error", err));
  }, []);

  if (!user) return null;

  // Real quiz history from localStorage
  const userId = localStorage.getItem('userId');
  const quizHistory = (() => { try { return JSON.parse(localStorage.getItem(`quizHistory_${userId}`) || '[]'); } catch { return []; } })();
  const totalSolved = quizHistory.reduce((acc, h) => acc + (h.total || 0), 0);
  const savedBooks = getBookmarks('book');
  const savedPosts = getBookmarks('post');
  const totalSaved = savedBooks.length + savedPosts.length;

  const handleChange = (field, value) => setUser({ ...user, [field]: value });

  const handleSaveChanges = async () => {
    try {
      const res = await api.put(`/user`, user);
      setUser(res.data);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save profile.");
    }
  };

  const handlePasswordReset = async () => {
    try {
      await api.post("/auth/forgot-password", { email: user.email });
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err) {
      alert("Failed to send reset email.");
    }
  };

  const initial = (user.name || "U")[0].toUpperCase();
  const userPoints = user.points || 0;
  const userStreak = user.streak || 0;

  let rankInfo = { title: "Novice", color: "#94a3b8", icon: <FaStar />, nextRank: 100 };
  if (userPoints >= 1000) rankInfo = { title: "Expert", color: "#f59e0b", icon: <FaTrophy />, nextRank: 5000 };
  else if (userPoints >= 500) rankInfo = { title: "Advanced", color: "#8b5cf6", icon: <FaMedal />, nextRank: 1000 };
  else if (userPoints >= 100) rankInfo = { title: "Intermediate", color: "#3b82f6", icon: <FaMedal />, nextRank: 500 };

  const progressToNext = Math.min(100, (userPoints / rankInfo.nextRank) * 100);

  return (
    <div className="profile-page-v2 scrollable">
      
      {/* Background Abstract Shapes */}
      <div className="profile-bg-glow"></div>
      <div className="profile-bg-shape s1"></div>
      <div className="profile-bg-shape s2"></div>

      <div className={`profile-container ${isEditing ? 'editing-mode' : ''}`}>
        
        {/* Left Column: Avatar & Rank */}
        <aside className="profile-sidebar">
          <div className="profile-avatar-card">
            <div className="avatar-outer-ring" style={{ '--progress': `${progressToNext}%`, '--rank-color': rankInfo.color }}>
              <div className="profile-avatar-main" style={{ background: avatarGradient(user.name) }}>
                {initial}
              </div>
            </div>
            
            <div className="rank-info-v2">
              <div className="rank-badge-v2" style={{ backgroundColor: rankInfo.color }}>
                {rankInfo.icon}
                <span>{rankInfo.title}</span>
              </div>
              <div className="rank-progress-wrap">
                <div className="progress-text">
                  <span>Level Progress</span>
                  <span>{Math.round(progressToNext)}%</span>
                </div>
                <div className="progress-track-v2">
                  <div className="progress-fill-v2" style={{ width: `${progressToNext}%`, backgroundColor: rankInfo.color }}></div>
                </div>
              </div>
            </div>

            <div className="profile-points-display">
              <span className="points-number">{userPoints.toLocaleString()}</span>
              <span className="points-label">Total Points Earned</span>
            </div>
          </div>

          <button className="profile-settings-v2-btn" onClick={() => setShowSettings(true)}>
            <FaCog /> Account Settings
          </button>
        </aside>

        {/* Right Column: Information & Stats */}
        <main className="profile-main-content">
          
          <header className="profile-header-v2">
            <div className="header-text">
              <h1>{user.name}</h1>
              <p>{user.category} from {user.country}</p>
            </div>
            <button 
              className={`edit-toggle-v2 ${isEditing ? 'active' : ''}`} 
              onClick={() => { if(isEditing) handleSaveChanges(); else setIsEditing(true); }}
            >
              {isEditing ? <><FaCheckCircle /> Save Changes</> : <><FaPencilAlt /> Edit Profile</>}
            </button>
          </header>

          <section className="profile-grid-v2">
            {/* Info Cards */}
            <div className="info-card-v2">
              <div className="card-icon"><FaUser /></div>
              <div className="card-body">
                <label>Full Name</label>
                {isEditing ? (
                  <input type="text" value={user.name || ""} onChange={(e) => handleChange("name", e.target.value)} />
                ) : (
                  <p>{user.name}</p>
                )}
              </div>
            </div>

            <div className="info-card-v2">
              <div className="card-icon"><FaEnvelope /></div>
              <div className="card-body">
                <label>Email Address</label>
                {isEditing ? (
                  <input type="email" value={user.email || ""} onChange={(e) => handleChange("email", e.target.value)} />
                ) : (
                  <p>{user.email}</p>
                )}
              </div>
            </div>

            <div className="info-card-v2">
              <div className="card-icon"><FaUserGraduate /></div>
              <div className="card-body">
                <label>Category</label>
                {isEditing ? (
                  <select value={user.category || ""} onChange={(e) => handleChange("category", e.target.value)}>
                    <option value="Student">Student</option>
                    <option value="Health Tutor">Health Tutor</option>
                    <option value="Nurse">Nurse</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Other Health Worker">Other Health Worker</option>
                  </select>
                ) : (
                  <p>{user.category}</p>
                )}
              </div>
            </div>

            <div className="info-card-v2">
              <div className="card-icon"><FaMapMarkerAlt /></div>
              <div className="card-body">
                <label>Country / Location</label>
                {isEditing ? (
                  <select value={user.country || ""} onChange={(e) => handleChange("country", e.target.value)}>
                    {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <p>{user.country}</p>
                )}
              </div>
            </div>
          </section>

          {/* ── Institution Picker (tutors / health workers) ── */}
          {showInstPicker && (
            <section className="profile-grid-v2" style={{ marginTop: 0 }}>
              <div className="info-card-v2" style={{ gridColumn: "1 / -1" }}>
                <div className="card-icon"><FaHospital /></div>
                <div className="card-body" style={{ width: "100%" }}>
                  <label>School / Hospital</label>
                  {user.institution ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, fontWeight: 700, color: "var(--text-heading)", fontSize: "0.9rem" }}>
                        🏥 {user.institution.name}
                        <span style={{ marginLeft: 8, fontSize: "0.72rem", color: "var(--accent)", fontWeight: 600 }}>
                          {user.institution.type} · {user.institution.country}
                        </span>
                        {user.institutionVerified && (
                          <span style={{ marginLeft: 8, fontSize: "0.72rem", background: "rgba(16,185,129,0.12)", color: "#10b981", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>✓ Verified</span>
                        )}
                      </div>
                      <button
                        onClick={handleClearInstitution}
                        style={{ fontSize: "0.75rem", padding: "5px 12px", borderRadius: 8, border: "1px solid #ef4444", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", fontWeight: 700 }}
                      >Remove</button>
                    </div>
                  ) : (
                    <div style={{ width: "100%", marginTop: 6 }}>
                      {/* Search bar */}
                      <div style={{ position: "relative", marginBottom: 6 }}>
                        <FaSearch style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "0.8rem" }} />
                        <input
                          style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-heading)", fontSize: "0.85rem", outline: "none", boxSizing: "border-box" }}
                          placeholder="Search your school or hospital…"
                          value={instSearch}
                          onChange={e => { setInstSearch(e.target.value); searchInstitutions(e.target.value); }}
                        />
                        {instLoading && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: "0.72rem", color: "#94a3b8" }}>Searching…</span>}
                      </div>

                      {/* Dropdown results */}
                      {instResults.length > 0 && (
                        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", marginBottom: 8, overflow: "hidden" }}>
                          {instResults.map(inst => (
                            <button
                              key={inst._id}
                              onClick={() => handleSelectInstitution(inst)}
                              style={{ width: "100%", textAlign: "left", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}
                            >
                              <span style={{ fontSize: "1.1rem" }}>{inst.type === "hospital" ? "🏥" : "🎓"}</span>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: "0.87rem", color: "var(--text-heading)" }}>{inst.name}</div>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{inst.type} · {inst.country}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Add new suggestion button */}
                      {!instSuggesting ? (
                        <button
                          onClick={() => setInstSuggesting(true)}
                          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", fontWeight: 700, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 2 }}
                        >
                          <FaPlus style={{ fontSize: "0.7rem" }} /> My institution isn't listed — suggest it
                        </button>
                      ) : (
                        <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px", marginTop: 4, display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-heading)" }}>Suggest a new institution</div>
                          <input
                            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-heading)", fontSize: "0.85rem", outline: "none" }}
                            placeholder="Full official name…"
                            value={newInstName}
                            onChange={e => setNewInstName(e.target.value)}
                          />
                          <select
                            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-heading)", fontSize: "0.85rem" }}
                            value={newInstType}
                            onChange={e => setNewInstType(e.target.value)}
                          >
                            <option value="school">School / University</option>
                            <option value="hospital">Hospital</option>
                            <option value="clinic">Clinic</option>
                            <option value="other">Other</option>
                          </select>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={handleSuggestInstitution}
                              style={{ flex: 1, padding: "9px", borderRadius: 8, background: "var(--accent)", color: "white", border: "none", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
                            >Submit for review</button>
                            <button onClick={() => setInstSuggesting(false)}
                              style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "none", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
                            >Cancel</button>
                          </div>
                        </div>
                      )}

                      {instSaveMsg && (
                        <div style={{ marginTop: 6, fontSize: "0.78rem", fontWeight: 700, color: "#10b981" }}>{instSaveMsg}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Additional Stats Section */}
          <section className="stats-section-v2">
            <h3 className="section-title-v2">Learning Activity</h3>
            <div className="stats-mini-grid">
              <div className="stat-pill">
                <span className="pill-icon">📝</span>
                <div className="pill-text">
                  <span className="pill-val">{totalSolved}</span>
                  <span className="pill-lab">Solved</span>
                </div>
              </div>
              <div className="stat-pill">
                <span className="pill-icon">🔥</span>
                <div className="pill-text">
                  <span className="pill-val">{userStreak || 0}</span>
                  <span className="pill-lab">Day Streak</span>
                </div>
              </div>
              <div className="stat-pill">
                <span className="pill-icon">🔖</span>
                <div className="pill-text">
                  <span className="pill-val">{totalSaved}</span>
                  <span className="pill-lab">Saved</span>
                </div>
              </div>
            </div>
          </section>

          {/* ===== TOP 5 LEADERBOARD ===== */}
          <section className="profile-section" style={{ marginTop: '30px' }}>
            <h3 className="section-title"><FaTrophy style={{ color: '#f59e0b', marginRight: '8px' }} /> Top 5 Leaderboard</h3>
            <div className="leaderboard-container">
              {leaderboard.map((u, i) => (
                <div key={u._id} className={`leaderboard-row ${u._id === user._id ? 'highlight' : ''}`}>
                  <div style={{ width: '30px', fontWeight: '800', color: i < 3 ? '#f59e0b' : 'var(--text-muted)' }}>#{i + 1}</div>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: avatarGradient(u.name), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '16px' }}>
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', color: 'var(--text-heading)' }}>
                      {u.name} <span style={{ fontWeight: '500', color: 'var(--text-muted)' }}>({u.category})</span> {u._id === user._id && <span style={{ color: 'var(--accent)' }}>(You)</span>}
                    </div>
                  </div>
                  <div style={{ fontWeight: '800', color: 'var(--accent)' }}>{u.points} pts</div>
                </div>
              ))}
              {leaderboard.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No top users yet.</div>}
            </div>
          </section>

          {/* ===== QUIZ HISTORY ===== */}
          {quizHistory.length > 0 && (
            <section className="profile-section" style={{ marginTop: '30px' }}>
              <h3 className="section-title">📊 Quiz History <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>({quizHistory.length} session{quizHistory.length !== 1 ? 's' : ''})</span></h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {quizHistory.slice(0, 5).map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: h.pct >= 70 ? 'rgba(66,85,255,0.1)' : h.pct >= 50 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                      {h.pct >= 70 ? '🎯' : h.pct >= 50 ? '📈' : '💪'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.course}</div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{new Date(h.date).toLocaleDateString()} · {h.total} questions · 🔥{h.bestStreak} streak</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: h.pct >= 70 ? 'var(--accent)' : h.pct >= 50 ? '#f59e0b' : '#ef4444', flexShrink: 0 }}>{h.pct}%</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===== SAVED ITEMS ===== */}
          {totalSaved > 0 && (
            <section className="profile-section" style={{ marginTop: '30px' }}>
              <h3 className="section-title">🔖 Saved Items <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>({totalSaved})</span></h3>
              {savedBooks.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>📚 Books ({savedBooks.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {savedBooks.slice(0, 3).map((b, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '1.2rem' }}>📖</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-heading)' }}>{b.title}</div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{b.author || 'Unknown'} · {b.course}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {savedPosts.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>📰 Posts ({savedPosts.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {savedPosts.slice(0, 3).map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '1.2rem' }}>📰</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{p.category || 'Health'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {isEditing && (
            <div className="editing-actions-v2">
              <button className="cancel-btn-v2" onClick={() => setIsEditing(false)}>Discard Changes</button>
            </div>
          )}
        </main>
      </div>

      {/* Settings Modal (Re-using the previous high-quality design) */}
      {showSettings && (
        <div className="settings-overlay" onClick={(e) => e.target.classList.contains('settings-overlay') && setShowSettings(false)}>
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
                <select className="setting-dropdown" value={language} onChange={(e) => {setLanguage(e.target.value); localStorage.setItem("language", e.target.value);}}>
                  <option value="English">English</option>
                  <option value="French">French</option>
                  <option value="Spanish">Spanish</option>
                  <option value="Twi">Twi</option>
                </select>
              </div>

              <div className="settings-sub-title">Security & Privacy</div>
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
              <button className="settings-done-btn" onClick={() => setShowSettings(false)}>Save & Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;