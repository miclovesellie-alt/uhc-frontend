import React, { useEffect, useState, useContext, useCallback } from "react";
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
  BarChart2, Clock, Activity, Download, ArrowLeft
} from "lucide-react";
import "../admin_styles/AdminDailySummary.css";

/* ── helpers ── */
function CountUp({ to, duration = 800 }) {
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

const TABS = [
  { id: "overview",  label: "Overview",        icon: <Activity size={14}/> },
  { id: "users",     label: "User Activity",   icon: <Users size={14}/> },
  { id: "admins",    label: "Admin Timeline",  icon: <Shield size={14}/> },
  { id: "analytics", label: "Analytics",       icon: <BarChart2 size={14}/> },
];

const INSIGHT_ICONS = { positive: "✅", warning: "⚠️", danger: "🚨", neutral: "💡", info: "📊" };

const COMPARE_COLORS = ["#4255ff", "#10b981", "#f59e0b"];

/* ════════════════════════════════════════════════════════════════
   Main Component
════════════════════════════════════════════════════════════════ */
export default function AdminDailySummary() {
  const navigate = useNavigate();
  const { adminTheme } = useContext(UserContext);
  const isDark = adminTheme === "dark";

  const [tab, setTab]           = useState("overview");
  const [summary, setSummary]   = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [aLoading, setALoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

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
    } catch (err) {
      console.error("Daily summary fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Fetch analytics (lazy — on tab switch) ── */
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

  useEffect(() => {
    if (tab === "analytics") fetchAnalytics();
  }, [tab, fetchAnalytics]);

  /* ── Auto-refresh every 60s ── */
  useEffect(() => {
    const iv = setInterval(fetchSummary, 60000);
    return () => clearInterval(iv);
  }, [fetchSummary]);

  /* ── Export summary as text ── */
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
    const text = lines.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `uhc-summary-${d.toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Build comparison bar chart data ── */
  const comparisonData = analytics ? [
    { metric: "Signups",  Today: analytics.comparison.signups[0], Yesterday: analytics.comparison.signups[1], "7d Avg": analytics.comparison.signups[2] },
    { metric: "Logins",   Today: analytics.comparison.logins[0],  Yesterday: analytics.comparison.logins[1],  "7d Avg": analytics.comparison.logins[2] },
    { metric: "Resets",   Today: analytics.comparison.resets[0],  Yesterday: analytics.comparison.resets[1],  "7d Avg": analytics.comparison.resets[2] },
    { metric: "Reported", Today: analytics.comparison.reported[0],Yesterday: analytics.comparison.reported[1],"7d Avg": analytics.comparison.reported[2] },
  ] : [];

  /* ── Hourly heatmap gradient ── */
  const maxHourly = summary ? Math.max(...summary.hourlyLogins, 1) : 1;
  const heatmapColor = (count) => {
    const intensity = count / maxHourly;
    const r = Math.round(66  + (139 - 66)  * intensity);
    const g = Math.round(85  + (92  - 85)  * intensity);
    const b = Math.round(255 + (246 - 255) * intensity);
    const alpha = 0.1 + intensity * 0.85;
    return `rgba(${r},${g},${b},${alpha})`;
  };

  /* ── KPI cards config ── */
  const cards = summary ? [
    { icon: <Users size={17}/>,    label: "New Signups",        value: summary.signups.count,          yesterday: summary.signups.yesterday,          color: "blue",   path: "/admin/users" },
    { icon: <LogIn size={17}/>,    label: "User Logins",        value: summary.logins.count,           yesterday: summary.logins.yesterday,           color: "green",  path: null },
    { icon: <Key size={17}/>,      label: "Password Resets",    value: summary.passwordResets.count,   yesterday: summary.passwordResets.yesterday,   color: "orange", path: null },
    { icon: <Flag size={17}/>,     label: "Questions Reported", value: summary.reportedQuestions.count,yesterday: summary.reportedQuestions.yesterday, color: "red",    path: "/admin/questions?filter=reported" },
    { icon: <Shield size={17}/>,   label: "Admin Logins",       value: summary.adminLoginCount,        yesterday: null,                               color: "purple", path: "/admin/logs" },
  ] : [];

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  /* ════════════════════════════════════════════════════════════ */
  return (
    <div className="admin-page ds-page">

      {/* ── Header ── */}
      <div className="ds-header">
        <div className="ds-header-left">
          <button className="ds-back-to-dashboard" onClick={() => navigate("/admin")}>
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <h1>
            <CalendarDays size={22} color="var(--admin-accent)"/>
            Daily Summary
          </h1>
          <p>
            {dateStr} &nbsp;
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
                <div className="ds-card-value"><CountUp to={card.value}/></div>
                <div className="ds-card-label">{card.label}</div>
                {card.yesterday !== null && (
                  <DeltaBadge current={card.value} yesterday={card.yesterday}/>
                )}
              </div>
            ))}
          </div>

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
            👥 User Login & Activity Breakdown
            {summary && <span className="ds-section-count">{summary.userActivity?.length || 0} users</span>}
          </div>
          {loading ? (
            <div className="ds-empty"><div className="ds-empty-icon">⏳</div>Loading…</div>
          ) : !summary?.userActivity?.length ? (
            <div className="ds-empty"><div className="ds-empty-icon">🌙</div>No user activity recorded today yet</div>
          ) : (
            <div className="ds-user-table-wrap">
              <table className="ds-user-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Logins</th>
                    <th>Login Times</th>
                    <th>Quiz</th>
                    <th>Notes</th>
                    <th>Flashcards</th>
                    <th>Reset?</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.userActivity.map((row, i) => (
                    <tr key={i}>
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
                        <span className="ds-activity-pill green">{row.loginCount}×</span>
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
                  ))}
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
              {/* Comparison chart */}
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

              {/* 30-day trend */}
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
                      <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 9 }}
                        tickFormatter={v => v.split(" ")[0]}/>
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
                      <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 9 }}
                        tickFormatter={v => v.split(" ")[0]}/>
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} allowDecimals={false} width={25}/>
                      <Tooltip contentStyle={tooltipStyle}/>
                      <Area type="monotone" dataKey="logins" stroke="#10b981" strokeWidth={2.5}
                        fill="url(#lgGrad)" dot={false} activeDot={{ r: 4 }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hourly heatmap */}
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
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:.6; } 50% { opacity:.3; } }
      `}</style>
    </div>
  );
}
