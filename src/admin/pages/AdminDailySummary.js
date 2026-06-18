import React, { useEffect, useState, useContext, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import api from "../../api/api";
import { UserContext } from "../../context/UserContext";
import {
  RefreshCw, Users, LogIn, Key, Flag, Shield,
  CalendarDays, TrendingUp, TrendingDown, Minus,
  BarChart2, Clock, Activity, Download, ArrowLeft,
  Search, Zap, Trophy, BookOpen, Layers, Star,
} from "lucide-react";
import "../admin_styles/AdminDailySummary.css";

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
function CountUp({ to, duration = 800, key: _key }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (to === 0) { setVal(0); return; }
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [to, duration]);
  return <>{val.toLocaleString()}</>;
}

function DeltaBadge({ current, yesterday }) {
  if (yesterday === 0 && current === 0) return <span className="ds-card-delta flat"><Minus size={11}/> No data</span>;
  if (yesterday === 0) return <span className="ds-card-delta up"><TrendingUp size={11}/> New today</span>;
  const pct = Math.round(((current - yesterday) / yesterday) * 100);
  if (pct > 0) return <span className="ds-card-delta up"><TrendingUp size={11}/> +{pct}% vs yesterday</span>;
  if (pct < 0) return <span className="ds-card-delta down"><TrendingDown size={11}/> {pct}% vs yesterday</span>;
  return <span className="ds-card-delta flat"><Minus size={11}/> Same as yesterday</span>;
}

const avatarColor = (name = "") => {
  const cols = ["#4255ff","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4","#ef4444"];
  return cols[(name.charCodeAt(0) || 0) % cols.length];
};

const activityScore = (row) =>
  (row.loginCount || 0) * 2 + (row.quiz || 0) * 3 + (row.notes || 0) + (row.flashcards || 0);

const relativeTime = (date) => {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
};

const FEED_ICONS = {
  login:   { icon: <LogIn  size={12}/>,   color: "#16a34a", bg: "rgba(22,163,74,.09)",   label: "logged in" },
  signup:  { icon: <Users  size={12}/>,   color: "#4255ff", bg: "rgba(66,85,255,.09)",   label: "signed up" },
  quiz:    { icon: <BookOpen size={12}/>, color: "#8b5cf6", bg: "rgba(139,92,246,.09)", label: "quiz session" },
  note:    { icon: <Layers  size={12}/>,  color: "#06b6d4", bg: "rgba(6,182,212,.09)",  label: "read note" },
  flash:   { icon: <Zap    size={12}/>,   color: "#f59e0b", bg: "rgba(245,158,11,.09)", label: "flashcards" },
};

const TABS = [
  { id: "overview",  label: "Overview",       icon: <Activity  size={14}/> },
  { id: "users",     label: "User Activity",  icon: <Users     size={14}/> },
  { id: "admins",    label: "Admin Timeline", icon: <Shield    size={14}/> },
  { id: "analytics", label: "Analytics",      icon: <BarChart2 size={14}/> },
];

const INSIGHT_ICONS = { positive: "✅", warning: "⚠️", danger: "🚨", neutral: "💡", info: "📊" };
const COMPARE_COLORS = ["#4255ff", "#10b981", "#f59e0b"];

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function AdminDailySummary() {
  const navigate = useNavigate();
  const { adminTheme } = useContext(UserContext);
  const isDark = adminTheme === "dark";

  const [tab,        setTab]        = useState("overview");
  const [summary,    setSummary]    = useState(null);
  const [analytics,  setAnalytics]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [aLoading,   setALoading]   = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshKey,  setRefreshKey]  = useState(0);

  /* user activity tab controls */
  const [search,  setSearch]  = useState("");
  const [sortBy,  setSortBy]  = useState("score");

  const tooltipStyle = {
    background: isDark ? "#1e293b" : "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    color: isDark ? "#f1f5f9" : "#0f172a",
    fontSize: ".78rem",
  };

  /* ── Fetch summary ── */
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("admin/daily-summary");
      setSummary(res.data);
      setLastRefresh(new Date());
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error("Daily summary fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Fetch analytics (lazy) ── */
  const fetchAnalytics = useCallback(async () => {
    if (analytics) return;
    setALoading(true);
    try {
      const res = await api.get("admin/daily-summary/analytics");
      setAnalytics(res.data);
    } catch (err) {
      console.error("Analytics fetch failed:", err);
    } finally {
      setALoading(false);
    }
  }, [analytics]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { if (tab === "analytics") fetchAnalytics(); }, [tab, fetchAnalytics]);

  /* ── Auto-refresh every 60s ── */
  useEffect(() => {
    const iv = setInterval(fetchSummary, 60000);
    return () => clearInterval(iv);
  }, [fetchSummary]);

  /* ══════════════════ COMPUTED VALUES ══════════════════ */

  /* Activity Feed — built from userActivity loginTimes + signups */
  const activityFeed = useMemo(() => {
    if (!summary) return [];
    const items = [];

    for (const row of summary.userActivity || []) {
      const name = row.user?.name || "Unknown";
      for (const t of (row.loginTimes || []).slice(0, 3)) {
        items.push({ type: "login", user: name, time: new Date(t), extra: null });
      }
      if (row.quiz > 0) {
        const t = row.loginTimes?.[0] ? new Date(row.loginTimes[0]) : new Date();
        items.push({ type: "quiz", user: name, time: t, extra: `${row.quiz} session${row.quiz > 1 ? "s" : ""}` });
      }
      if (row.notes > 0) {
        const t = row.loginTimes?.[0] ? new Date(row.loginTimes[0]) : new Date();
        items.push({ type: "note", user: name, time: t, extra: `${row.notes} note${row.notes > 1 ? "s" : ""}` });
      }
      if (row.flashcards > 0) {
        const t = row.loginTimes?.[0] ? new Date(row.loginTimes[0]) : new Date();
        items.push({ type: "flash", user: name, time: t, extra: `${row.flashcards} card${row.flashcards > 1 ? "s" : ""}` });
      }
    }
    for (const u of summary.signups?.users || []) {
      items.push({ type: "signup", user: u.name || "New User", time: new Date(u.createdAt), extra: u.category });
    }

    return items.sort((a, b) => b.time - a.time).slice(0, 14);
  }, [summary]);

  /* Top 5 users by activity score */
  const topUsers = useMemo(() => {
    if (!summary?.userActivity) return [];
    return [...summary.userActivity]
      .sort((a, b) => activityScore(b) - activityScore(a))
      .slice(0, 5);
  }, [summary]);

  /* Max score across all users (for progress bars) */
  const maxScore = useMemo(() =>
    Math.max(...(summary?.userActivity || []).map(activityScore), 1),
  [summary]);

  /* Filtered + sorted user activity */
  const filteredActivity = useMemo(() => {
    if (!summary?.userActivity) return [];
    let arr = [...summary.userActivity];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(r =>
        r.user?.name?.toLowerCase().includes(q) ||
        r.user?.email?.toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case "score":  arr.sort((a, b) => activityScore(b) - activityScore(a)); break;
      case "logins": arr.sort((a, b) => (b.loginCount || 0) - (a.loginCount || 0)); break;
      case "quiz":   arr.sort((a, b) => (b.quiz || 0) - (a.quiz || 0)); break;
      case "name":   arr.sort((a, b) => (a.user?.name || "").localeCompare(b.user?.name || "")); break;
      default:       arr.sort((a, b) => activityScore(b) - activityScore(a));
    }
    return arr;
  }, [summary, search, sortBy]);

  /* ── Export ── */
  const handleExport = () => {
    if (!summary) return;
    const d = new Date(summary.date);
    const lines = [
      `UHC Academy — Daily Summary`,
      `Date: ${d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
      `Generated: ${d.toLocaleTimeString()}`,
      ``,
      `📥 Signups Today:         ${summary.signups.count}`,
      `🔑 User Logins Today:     ${summary.logins.count}`,
      `👤 Unique Users Active:   ${summary.logins.unique}`,
      `🔁 Password Resets:       ${summary.passwordResets.count}`,
      `🚩 Questions Reported:    ${summary.reportedQuestions.count}`,
      `🛡️ Admin Logins:         ${summary.adminLoginCount}`,
      ``,
      `💡 Auto-Insights:`,
      ...(summary.insights || []).map(i => `  • ${i.text}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `uhc-summary-${d.toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Comparison chart data ── */
  const comparisonData = analytics ? [
    { metric: "Signups",  Today: analytics.comparison.signups[0],  Yesterday: analytics.comparison.signups[1],  "7d Avg": analytics.comparison.signups[2] },
    { metric: "Logins",   Today: analytics.comparison.logins[0],   Yesterday: analytics.comparison.logins[1],   "7d Avg": analytics.comparison.logins[2] },
    { metric: "Resets",   Today: analytics.comparison.resets[0],   Yesterday: analytics.comparison.resets[1],   "7d Avg": analytics.comparison.resets[2] },
    { metric: "Reported", Today: analytics.comparison.reported[0], Yesterday: analytics.comparison.reported[1], "7d Avg": analytics.comparison.reported[2] },
  ] : [];

  /* ── Hourly heatmap ── */
  const maxHourly = summary ? Math.max(...summary.hourlyLogins, 1) : 1;
  const heatmapColor = (count) => {
    const intensity = count / maxHourly;
    const r = Math.round(66  + (139 - 66)  * intensity);
    const g = Math.round(85  + (92  - 85)  * intensity);
    const b = Math.round(255 + (246 - 255) * intensity);
    return `rgba(${r},${g},${b},${0.1 + intensity * 0.85})`;
  };

  /* ── KPI cards ── */
  const cards = summary ? [
    { icon: <Users  size={17}/>, label: "New Signups",        value: summary.signups.count,           yesterday: summary.signups.yesterday,           color: "blue",   path: "/admin/users" },
    { icon: <LogIn  size={17}/>, label: "User Logins",        value: summary.logins.count,            yesterday: summary.logins.yesterday,            color: "green",  path: null },
    { icon: <Key    size={17}/>, label: "Password Resets",    value: summary.passwordResets.count,    yesterday: summary.passwordResets.yesterday,    color: "orange", path: null },
    { icon: <Flag   size={17}/>, label: "Questions Reported", value: summary.reportedQuestions.count, yesterday: summary.reportedQuestions.yesterday, color: "red",    path: "/admin/questions?filter=reported" },
    { icon: <Shield size={17}/>, label: "Admin Logins",       value: summary.adminLoginCount,         yesterday: null,                                color: "purple", path: "/admin/logs" },
  ] : [];

  const today  = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <div className="admin-page ds-page">

      {/* ── Header ── */}
      <div className="ds-header">
        <div className="ds-header-left">
          <button className="ds-back-to-dashboard" onClick={() => navigate("/admin")}>
            <ArrowLeft size={14}/> Back to Dashboard
          </button>
          <h1>
            <CalendarDays size={22} color="var(--admin-accent)"/>
            Daily Summary
          </h1>
          <p>
            {dateStr}&nbsp;
            <span className="ds-live-dot">LIVE</span>
            &nbsp;· Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="ds-header-actions">
          <button className="admin-btn secondary sm" onClick={handleExport} title="Export summary as text">
            <Download size={13}/> Export
          </button>
          <button className="admin-btn secondary sm" onClick={fetchSummary} disabled={loading}>
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }}/> Refresh
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="ds-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`ds-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ════════ TAB: OVERVIEW ════════ */}
      {tab === "overview" && (
        <>
          {/* KPI Cards */}
          <div className="ds-cards-grid">
            {loading ? Array(5).fill(0).map((_, i) => (
              <div key={i} className="ds-card" style={{ minHeight: 120, background: "var(--admin-border)", animation: "pulse 1.5s ease infinite" }}/>
            )) : cards.map((card, i) => (
              <div key={i} className="ds-card" onClick={() => card.path && navigate(card.path)}
                style={{ cursor: card.path ? "pointer" : "default" }}>
                <div className={`ds-card-icon ${card.color}`}>{card.icon}</div>
                <div className="ds-card-value"><CountUp key={`${i}-${refreshKey}`} to={card.value}/></div>
                <div className="ds-card-label">{card.label}</div>
                {card.yesterday !== null && (
                  <DeltaBadge current={card.value} yesterday={card.yesterday}/>
                )}
              </div>
            ))}
          </div>

          {/* ── Live Activity Feed + Top Users ── */}
          {!loading && summary && (
            <div className="ds-two-col">

              {/* Activity Feed */}
              <div className="ds-section ds-feed-section">
                <div className="ds-section-title">
                  <Activity size={15} color="var(--admin-accent)"/>
                  Live Activity Feed
                  <span className="ds-section-count">{activityFeed.length}</span>
                </div>
                {activityFeed.length === 0 ? (
                  <div className="ds-empty" style={{ padding: "20px 0" }}>
                    <div className="ds-empty-icon">🌙</div>No activity yet today
                  </div>
                ) : (
                  <div className="ds-activity-feed">
                    {activityFeed.map((item, i) => {
                      const cfg = FEED_ICONS[item.type] || FEED_ICONS.login;
                      return (
                        <div key={i} className="ds-feed-item" style={{ animationDelay: `${i * 40}ms` }}>
                          <div className="ds-feed-icon" style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.icon}
                          </div>
                          <div className="ds-feed-body">
                            <span className="ds-feed-name">{item.user}</span>
                            <span className="ds-feed-action">{cfg.label}{item.extra ? ` · ${item.extra}` : ""}</span>
                          </div>
                          <div className="ds-feed-time">{relativeTime(item.time)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top Users Today */}
              <div className="ds-section ds-top-section">
                <div className="ds-section-title">
                  <Trophy size={15} color="#f59e0b"/>
                  Top Users Today
                  <span className="ds-section-count">{topUsers.length}</span>
                </div>
                {topUsers.length === 0 ? (
                  <div className="ds-empty" style={{ padding: "20px 0" }}>
                    <div className="ds-empty-icon">🏆</div>No active users yet
                  </div>
                ) : (
                  <div className="ds-top-users">
                    {topUsers.map((row, i) => {
                      const score  = activityScore(row);
                      const pct    = Math.round((score / maxScore) * 100);
                      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
                      return (
                        <div key={i} className="ds-top-user-row"
                          onClick={() => setTab("users")}
                          style={{ cursor: "pointer" }}>
                          <div className="ds-top-medal">{medals[i]}</div>
                          <div className="ds-top-avatar" style={{ background: avatarColor(row.user?.name || "?") }}>
                            {(row.user?.name || "?")[0]?.toUpperCase()}
                          </div>
                          <div className="ds-top-info">
                            <div className="ds-top-name">{row.user?.name || "Unknown"}</div>
                            <div className="ds-activity-bar-wrap">
                              <div className="ds-activity-bar" style={{ width: `${pct}%` }}/>
                            </div>
                          </div>
                          <div className="ds-top-score">
                            <Star size={10}/> {score}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Auto-insights */}
          {!loading && summary?.insights?.length > 0 && (
            <div className="ds-insights">
              <div className="ds-insights-title">
                🤖 Auto-Insights
                <span style={{ fontSize: ".72rem", color: "var(--admin-muted)", fontWeight: 500 }}>
                  Generated from today's data
                </span>
              </div>
              {summary.insights.map((ins, i) => (
                <div key={i} className={`ds-insight-item ${ins.type}`}>
                  <span className="ds-insight-dot"/>
                  <span>{INSIGHT_ICONS[ins.type] || "💡"} {ins.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* New Signups list */}
          {!loading && summary?.signups?.users?.length > 0 && (
            <div className="ds-section">
              <div className="ds-section-title">
                📥 New Signups Today
                <span className="ds-section-count">{summary.signups.users.length}</span>
              </div>
              <div className="ds-user-table-wrap">
                <table className="ds-user-table">
                  <thead><tr><th>User</th><th>Category</th><th>Country</th><th>Time</th></tr></thead>
                  <tbody>
                    {summary.signups.users.map((u, i) => (
                      <tr key={i}>
                        <td>
                          <div className="ds-user-info">
                            <div className="ds-user-avatar" style={{ background: avatarColor(u.name) }}>
                              {u.name[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="ds-user-name">{u.name}</div>
                              <div className="ds-user-email">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="ds-activity-pill">{u.category}</span></td>
                        <td style={{ color: "var(--admin-muted)", fontSize: ".8rem" }}>{u.country}</td>
                        <td style={{ color: "var(--admin-muted)", fontSize: ".75rem", whiteSpace: "nowrap" }}>
                          <Clock size={11} style={{ marginRight: 4, verticalAlign: "middle" }}/>
                          {new Date(u.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Password reset details */}
          {!loading && summary?.passwordResets?.details?.length > 0 && (
            <div className="ds-section">
              <div className="ds-section-title">
                🔁 Password Reset Requests
                <span className="ds-section-count">{summary.passwordResets.count}</span>
              </div>
              <div className="ds-user-table-wrap">
                <table className="ds-user-table">
                  <thead><tr><th>User</th><th>Email</th><th>Type</th><th>Time</th></tr></thead>
                  <tbody>
                    {summary.passwordResets.details.map((d, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{d.user}</td>
                        <td style={{ color: "var(--admin-muted)", fontSize: ".78rem" }}>{d.email}</td>
                        <td><span className="ds-activity-pill orange">{d.action?.replace(/_/g, " ")}</span></td>
                        <td style={{ color: "var(--admin-muted)", fontSize: ".75rem", whiteSpace: "nowrap" }}>
                          <Clock size={11} style={{ marginRight: 4, verticalAlign: "middle" }}/>
                          {new Date(d.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Reported questions */}
          {!loading && summary?.reportedQuestions?.details?.length > 0 && (
            <div className="ds-section">
              <div className="ds-section-title">
                🚩 Reported Questions
                <span className="ds-section-count">{summary.reportedQuestions.count}</span>
              </div>
              <div className="ds-user-table-wrap">
                <table className="ds-user-table">
                  <thead><tr><th>Question</th><th>Course</th><th>Reason</th></tr></thead>
                  <tbody>
                    {summary.reportedQuestions.details.map((q, i) => (
                      <tr key={i} style={{ cursor: "pointer" }} onClick={() => navigate("/admin/questions?filter=reported")}>
                        <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {q.question?.slice(0, 80)}…
                        </td>
                        <td><span className="ds-activity-pill">{q.course}</span></td>
                        <td style={{ color: "#ef4444", fontSize: ".78rem" }}>{q.reportReason || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && !summary && (
            <div className="ds-empty"><div className="ds-empty-icon">📊</div>No data available</div>
          )}
        </>
      )}

      {/* ════════ TAB: USER ACTIVITY ════════ */}
      {tab === "users" && (
        <div className="ds-section">
          <div className="ds-section-title">
            👥 User Login &amp; Activity Breakdown
            {summary && (
              <span className="ds-section-count">
                {filteredActivity.length} / {summary.userActivity?.length || 0} users
              </span>
            )}
          </div>

          {/* Search + Sort bar */}
          {!loading && summary?.userActivity?.length > 0 && (
            <div className="ds-search-row">
              <div className="ds-search-wrap">
                <Search size={13} className="ds-search-icon"/>
                <input
                  className="ds-search-input"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button className="ds-search-clear" onClick={() => setSearch("")}>✕</button>
                )}
              </div>
              <div className="ds-sort-pills">
                {[
                  { id: "score",  label: "Most Active" },
                  { id: "logins", label: "Logins"      },
                  { id: "quiz",   label: "Quiz"         },
                  { id: "name",   label: "A–Z"          },
                ].map(opt => (
                  <button key={opt.id}
                    className={`ds-sort-pill${sortBy === opt.id ? " active" : ""}`}
                    onClick={() => setSortBy(opt.id)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="ds-empty"><div className="ds-empty-icon">⏳</div>Loading…</div>
          ) : !summary?.userActivity?.length ? (
            <div className="ds-empty"><div className="ds-empty-icon">🌙</div>No user activity recorded today yet</div>
          ) : filteredActivity.length === 0 ? (
            <div className="ds-empty"><div className="ds-empty-icon">🔍</div>No users match "{search}"</div>
          ) : (
            <div className="ds-user-table-wrap">
              <table className="ds-user-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Score</th>
                    <th>Logins</th>
                    <th>Login Times</th>
                    <th>Quiz</th>
                    <th>Notes</th>
                    <th>Flashcards</th>
                    <th>Reset?</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivity.map((row, i) => {
                    const score = activityScore(row);
                    const pct   = Math.round((score / maxScore) * 100);
                    const isLogOnly = row.fromLastLogin && !row.quiz && !row.notes && !row.flashcards;
                    return (
                      <tr key={i} className={score >= maxScore * 0.7 ? "ds-row-hot" : score >= maxScore * 0.35 ? "ds-row-warm" : ""}>
                        <td>
                          <div className="ds-user-info">
                            <div className="ds-user-avatar" style={{ background: avatarColor(row.user?.name || "?") }}>
                              {(row.user?.name || "?")[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="ds-user-name">{row.user?.name || "Unknown"}</div>
                              <div className="ds-user-email">{row.user?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="ds-score-wrap">
                            <span className="ds-score-num">{score}</span>
                            <div className="ds-activity-bar-wrap ds-activity-bar-sm">
                              <div className="ds-activity-bar" style={{ width: `${pct}%` }}/>
                            </div>
                          </div>
                        </td>
                        <td>
                          {isLogOnly
                            ? <span className="ds-login-only-badge">⚡ seen</span>
                            : <span className="ds-activity-pill green">{row.loginCount}×</span>
                          }
                        </td>
                        <td>
                          <div className="ds-login-times">
                            {(row.loginTimes || []).slice(0, 4).map((t, ti) => (
                              <span key={ti} style={{ display: "block" }}>
                                <Clock size={10} style={{ marginRight: 3, verticalAlign: "middle" }}/>
                                {new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                              </span>
                            ))}
                            {row.loginTimes?.length > 4 && (
                              <span style={{ color: "var(--admin-accent)", fontWeight: 700 }}>+{row.loginTimes.length - 4} more</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {row.quiz > 0
                            ? <span className="ds-activity-pill purple">{row.quiz} session{row.quiz > 1 ? "s" : ""}{row.quizCourses?.length ? ` · ${[...new Set(row.quizCourses)].slice(0,2).join(", ")}` : ""}</span>
                            : <span style={{ color: "var(--admin-muted)", fontSize: ".75rem" }}>—</span>}
                        </td>
                        <td>
                          {row.notes > 0
                            ? <span className="ds-activity-pill">{row.notes} read</span>
                            : <span style={{ color: "var(--admin-muted)", fontSize: ".75rem" }}>—</span>}
                        </td>
                        <td>
                          {row.flashcards > 0
                            ? <span className="ds-activity-pill">{row.flashcards} opened</span>
                            : <span style={{ color: "var(--admin-muted)", fontSize: ".75rem" }}>—</span>}
                        </td>
                        <td>
                          {row.requestedReset
                            ? <span className="ds-reset-badge">Yes</span>
                            : <span style={{ color: "var(--admin-muted)", fontSize: ".75rem" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════ TAB: ADMIN TIMELINE ════════ */}
      {tab === "admins" && (
        <div className="ds-section">
          <div className="ds-section-title">
            🛡️ Admin Activity Timeline
            {summary && <span className="ds-section-count">{summary.adminActivity?.length || 0} actions</span>}
          </div>
          {loading ? (
            <div className="ds-empty"><div className="ds-empty-icon">⏳</div>Loading…</div>
          ) : !summary?.adminActivity?.length ? (
            <div className="ds-empty"><div className="ds-empty-icon">😴</div>No admin activity recorded today</div>
          ) : (
            <div className="ds-timeline">
              {summary.adminActivity.map((entry, i) => (
                <div key={i} className="ds-timeline-item">
                  <div className="ds-timeline-left">
                    <div className="ds-timeline-avatar" style={{ background: avatarColor(entry.admin) }}>
                      {entry.admin[0]?.toUpperCase()}
                    </div>
                    {i < summary.adminActivity.length - 1 && <div className="ds-timeline-connector"/>}
                  </div>
                  <div className="ds-timeline-body">
                    <div className="ds-timeline-action">
                      <strong>{entry.admin}</strong>{" — "}
                      {entry.action.replace(/_/g, " ")}
                    </div>
                    <div className="ds-timeline-meta">
                      <span className={`ds-timeline-badge ${entry.role}`}>{entry.role}</span>
                      <span className="ds-timeline-time">
                        <Clock size={10} style={{ marginRight: 3, verticalAlign: "middle" }}/>
                        {new Date(entry.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        {" · "}
                        {new Date(entry.time).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <span style={{ fontSize: ".68rem", color: "var(--admin-muted)" }}>
                          {JSON.stringify(entry.details).slice(0, 80)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════ TAB: ANALYTICS ════════ */}
      {tab === "analytics" && (
        <>
          {aLoading ? (
            <div className="ds-empty"><div className="ds-empty-icon">⏳</div>Loading analytics…</div>
          ) : !analytics ? (
            <div className="ds-empty"><div className="ds-empty-icon">📉</div>No analytics data</div>
          ) : (
            <>
              <div className="ds-chart-card" style={{ marginBottom: 20 }}>
                <div className="ds-chart-title"><BarChart2 size={16} color="var(--admin-accent)"/> Today vs Yesterday vs 7-Day Average</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={comparisonData} barSize={22} barCategoryGap="30%">
                    <CartesianGrid stroke={isDark ? "#334155" : "#f1f5f9"} strokeDasharray="4 4"/>
                    <XAxis dataKey="metric" stroke="#94a3b8" tick={{ fontSize: 12 }}/>
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} width={30}/>
                    <Tooltip contentStyle={tooltipStyle}/>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: ".75rem" }}/>
                    {["Today", "Yesterday", "7d Avg"].map((key, i) => (
                      <Bar key={key} dataKey={key} fill={COMPARE_COLORS[i]} radius={[5,5,0,0]}/>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="ds-charts-grid">
                <div className="ds-chart-card">
                  <div className="ds-chart-title"><TrendingUp size={15} color="#4255ff"/> 30-Day Signup Trend</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={analytics.trend30}>
                      <defs>
                        <linearGradient id="sgGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#4255ff" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#4255ff" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={isDark ? "#334155" : "#f1f5f9"} strokeDasharray="4 4"/>
                      <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 9 }} tickFormatter={v => v.split(" ")[0]}/>
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} allowDecimals={false} width={25}/>
                      <Tooltip contentStyle={tooltipStyle}/>
                      <Area type="monotone" dataKey="signups" stroke="#4255ff" strokeWidth={2.5}
                        fill="url(#sgGrad)" dot={false} activeDot={{ r: 4 }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="ds-chart-card">
                  <div className="ds-chart-title"><Activity size={15} color="#10b981"/> 30-Day Login Trend</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={analytics.trend30}>
                      <defs>
                        <linearGradient id="lgGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={isDark ? "#334155" : "#f1f5f9"} strokeDasharray="4 4"/>
                      <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 9 }} tickFormatter={v => v.split(" ")[0]}/>
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} allowDecimals={false} width={25}/>
                      <Tooltip contentStyle={tooltipStyle}/>
                      <Area type="monotone" dataKey="logins" stroke="#10b981" strokeWidth={2.5}
                        fill="url(#lgGrad)" dot={false} activeDot={{ r: 4 }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {summary && (
                <div className="ds-chart-card">
                  <div className="ds-chart-title"><Clock size={15} color="#8b5cf6"/> Hourly Login Heatmap — Today</div>
                  <div style={{ marginBottom: 6, fontSize: ".7rem", color: "var(--admin-muted)" }}>
                    Each cell = 1 hour. Darker = more logins.
                  </div>
                  <div className="ds-heatmap">
                    {summary.hourlyLogins.map((count, h) => (
                      <div key={h} className="ds-heatmap-cell"
                        title={`${h}:00–${h+1}:00 · ${count} login${count !== 1 ? "s" : ""}`}
                        style={{ background: heatmapColor(count), border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}` }}
                      />
                    ))}
                  </div>
                  <div className="ds-heatmap-label">
                    {summary.hourlyLogins.map((_, h) => (
                      <span key={h}>{h % 6 === 0 ? `${h}h` : ""}</span>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap", fontSize: ".72rem", color: "var(--admin-muted)" }}>
                    <span>Peak hour: <strong style={{ color: "var(--admin-text)" }}>
                      {(() => { const p = summary.hourlyLogins.indexOf(Math.max(...summary.hourlyLogins)); return `${p}:00–${p+1}:00 (${summary.hourlyLogins[p]} logins)`; })()}
                    </strong></span>
                    <span>Total logins: <strong style={{ color: "var(--admin-text)" }}>{summary.logins.count}</strong></span>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      <style>{`
        @keyframes spin  { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:.6; } 50% { opacity:.3; } }
      `}</style>
    </div>
  );
}
