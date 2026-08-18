import React, { useEffect, useState, useCallback, useRef } from "react";
import { Eye, EyeOff, Send, StopCircle, RefreshCw, Users, Download, CheckCircle, XCircle, AlertTriangle, Bot } from "lucide-react";

import api from "../../api/api";
import "../admin_styles/AdminTelegramBot.css";

// ─── Helpers ────────────────────────────────────────────────────────────────

function platformEmoji(name) {
  const map = {
    tiktok: "🎵", instagram: "📸", youtube: "▶️",
    twitter: "🐦", reddit: "🤖", pinterest: "📌",
    facebook: "📘", snapchat: "👻", vimeo: "🎞", other: "🔗",
  };
  return map[name?.toLowerCase()] || "🔗";
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString([], {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(d) {
  if (!d) return "—";
  const secs = Math.floor((Date.now() - new Date(d)) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function useUptime(startedAt, running) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    if (!running || !startedAt) { setElapsed(""); return; }
    const tick = () => {
      const s = Math.floor((Date.now() - new Date(startedAt)) / 1000);
      const h = String(Math.floor(s / 3600)).padStart(2, "0");
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      const sc = String(s % 60).padStart(2, "0");
      setElapsed(`${h}:${m}:${sc}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [startedAt, running]);
  return elapsed;
}

// ─── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ icon, color, value, label }) {
  return (
    <div className="tgb-card">
      <div className="tgb-stat">
        <div className={`tgb-stat-icon ${color}`}>{icon}</div>
        <div>
          <div className="tgb-stat-val">{value?.toLocaleString() ?? "—"}</div>
          <div className="tgb-stat-label">{label}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminTelegramBot() {

  // ── Bot status ─────────────────────────────────────────────────────────────
  const [status, setStatus] = useState({ running: false, startedAt: null, enabled: false, maskedToken: "" });
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPages, setUsersPages] = useState(1);

  // ── Token form ─────────────────────────────────────────────────────────────
  const [token, setToken] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // { type: 'success'|'error', text }

  // ── Loading & Refresh states ─────────────────────────────────────────────
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingUsers, setLoadingUsers]   = useState(false);
  const [loadingLogs, setLoadingLogs]     = useState(false);
  const [refreshing, setRefreshing]       = useState(false);

  const uptime = useUptime(status.startedAt, status.running);
  const pollRef = useRef(null);

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get("admin/telegram-bot/status");
      setStatus(data);
      setEnabled(data.enabled);
      if (data.token) {
        setToken(data.token);
      }
    } catch (_) { }
    finally { setLoadingStatus(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get("admin/telegram-bot/stats");
      setStats(data);
    } catch (_) { }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const { data } = await api.get("admin/telegram-bot/logs");
      setLogs(data);
    } catch (_) { }
    finally { setLoadingLogs(false); }
  }, []);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get(`admin/telegram-bot/users?page=${page}&limit=10`);
      setUsers(data.users);
      setUsersTotal(data.total);
      setUsersPages(data.pages);
      setUsersPage(page);
    } catch (_) { }
    finally { setLoadingUsers(false); }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStatus(),
      fetchStats(),
      fetchLogs(),
      fetchUsers(usersPage)
    ]);
    setRefreshing(false);
  }, [fetchStatus, fetchStats, fetchLogs, fetchUsers, usersPage]);

  // ── Initial load + polling ─────────────────────────────────────────────────
  useEffect(() => {
    refreshAll();
    pollRef.current = setInterval(() => {
      fetchStatus();
      fetchStats();
    }, 20000);
    return () => clearInterval(pollRef.current);
  }, []); // eslint-disable-line

  // ── Save token ─────────────────────────────────────────────────────────────
  async function handleSave(e) {
    e.preventDefault();
    const tokenToSave = token.trim();
    if (!tokenToSave && enabled && !status.token) {
      setSaveMsg({ type: "error", text: "Please enter your Telegram bot token before saving." });
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const { data } = await api.post("admin/telegram-bot/token", {
        token: tokenToSave || null,
        enabled,
      });
      setSaveMsg({ type: "success", text: data.message || "Bot settings saved!" });
      await fetchStatus();
      await fetchStats();
    } catch (err) {
      setSaveMsg({ type: "error", text: err?.response?.data?.message || "Failed to save settings." });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 5000);
    }
  }

  // ── Users page change ──────────────────────────────────────────────────────
  function changePage(p) { if (p >= 1 && p <= usersPages) fetchUsers(p); }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="tgb-page">

      {/* ── Header ── */}
      <div className="tgb-header">
        <div className="tgb-header-icon">🤖</div>
        <div>
          <h1>Telegram Media Bot</h1>
          <p>Configure your bot token, monitor activity, and see who's using it.</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {loadingStatus ? (
            <span className="tgb-spinner" />
          ) : (
            <span className={`tgb-status-badge ${status.running ? "online" : "offline"}`}>
              <span className="tgb-status-dot" />
              {status.running ? "Online" : "Offline"}
            </span>
          )}
          {status.running && uptime && (
            <span className="tgb-uptime">⏱ {uptime}</span>
          )}
          <button className="tgb-btn ghost" onClick={refreshAll} disabled={refreshing} title="Refresh Dashboard">
            <RefreshCw size={14} className={refreshing ? "tgb-spin" : ""} /> {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="tgb-grid three" style={{ marginBottom: 20 }}>
        <StatCard icon={<Users size={18} />} color="teal" value={stats?.totalUsers} label="Telegram Users" />
        <StatCard icon={<Download size={18} />} color="blue" value={stats?.total} label="Total Downloads" />
        <StatCard icon={<CheckCircle size={18} />} color="green" value={stats?.success} label="Successful" />
        <StatCard icon={<XCircle size={18} />} color="red" value={stats?.failed} label="Failed" />
        <StatCard icon={<AlertTriangle size={18} />} color="orange" value={stats?.toolarge} label="Too Large (>50 MB)" />
      </div>

      {/* ── Main 2-col grid ── */}
      <div className="tgb-grid" style={{ marginBottom: 20 }}>

        {/* Token config */}
        <div className="tgb-card">
          <p className="tgb-card-title">🔑 Telegram Bot Token</p>

          <form className="tgb-token-form" onSubmit={handleSave}>
            <div className="tgb-input-row">
              <Bot size={16} color="var(--admin-muted)" style={{ flexShrink: 0 }} />
              <input
                type={showToken ? "text" : "password"}
                placeholder="Paste Telegram Bot Token (from @BotFather)..."
                value={token}
                onChange={e => setToken(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" className="tgb-eye-btn" onClick={() => setShowToken(v => !v)} title={showToken ? "Hide token" : "Show token"}>
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <div className="tgb-toggle-row">
              <div>
                <div className="tgb-toggle-label">Bot Service Enabled</div>
                <div className="tgb-toggle-sub">Turns Telegram long-polling on/off</div>
              </div>
              <label className="tgb-switch">
                <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
                <span className="tgb-switch-slider" />
              </label>
            </div>

            {saveMsg && (
              <div className={`tgb-msg ${saveMsg.type}`}>
                {saveMsg.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {saveMsg.text}
              </div>
            )}

            <div className="tgb-btn-row">
              <button type="submit" className="tgb-btn primary" disabled={saving}>
                {saving ? <span className="tgb-spinner" /> : <Send size={14} />}
                {saving ? "Saving…" : "Save & Apply"}
              </button>
              {status.running && (
                <button type="button" className="tgb-btn danger"
                  onClick={() => { setEnabled(false); handleSave({ preventDefault: () => { } }); }}>
                  <StopCircle size={14} /> Stop Bot
                </button>
              )}
            </div>
          </form>

          <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--admin-bg)", borderRadius: 9, border: "1px solid var(--admin-border)" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--admin-muted)", marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              How to get a token
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: "0.8rem", color: "var(--admin-muted)", lineHeight: 1.7 }}>
              <li>Open Telegram and search for <strong>@BotFather</strong></li>
              <li>Send <code>/newbot</code> and follow the steps</li>
              <li>Copy the token BotFather gives you</li>
              <li>Paste it above and hit <strong>Save &amp; Apply</strong></li>
            </ol>
          </div>
        </div>

        {/* Platform breakdown */}
        <div className="tgb-card">
          <p className="tgb-card-title">📊 Platform Breakdown</p>
          {!stats?.platforms?.length ? (
            <div className="tgb-empty">
              <div className="tgb-empty-icon">📭</div>
              No download requests yet
            </div>
          ) : (
            <div className="tgb-platform-list">
              {stats.platforms.map(p => (
                <div key={p.name} className="tgb-platform-row">
                  <div className="tgb-platform-name">
                    {platformEmoji(p.name)} {p.name}
                  </div>
                  <div className="tgb-platform-bar-wrap">
                    <div className="tgb-platform-bar"
                      style={{ width: `${Math.round((p.count / stats.total) * 100)}%` }} />
                  </div>
                  <div className="tgb-platform-count">{p.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Telegram Users Table ── */}
      <div className="tgb-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p className="tgb-card-title" style={{ margin: 0 }}>
            👥 Telegram Users &nbsp;
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--admin-accent)", background: "var(--admin-accent-pale)", padding: "1px 8px", borderRadius: 99 }}>
              {usersTotal}
            </span>
          </p>
          <button className="tgb-btn ghost" onClick={() => fetchUsers(usersPage)}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {loadingUsers ? (
          <div className="tgb-empty"><span className="tgb-spinner" /></div>
        ) : users.length === 0 ? (
          <div className="tgb-empty">
            <div className="tgb-empty-icon">👤</div>
            No users yet — share your bot link and they'll appear here!
          </div>
        ) : (
          <div className="tgb-table-wrap">
            <table className="tgb-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Telegram ID</th>
                  <th>Downloads</th>
                  <th>Top Platform</th>
                  <th>Last Seen</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const initials = ((u.firstName?.[0] || "") + (u.lastName?.[0] || "")).toUpperCase() || "?";
                  const topPlatform = u.platforms
                    ? Object.entries(u.platforms).sort((a, b) => b[1] - a[1])[0]
                    : null;
                  return (
                    <tr key={u._id}>
                      <td>
                        <div className="tgb-user-cell">
                          <div className="tgb-avatar">{initials}</div>
                          <div>
                            <div className="tgb-user-name">
                              {[u.firstName, u.lastName].filter(Boolean).join(" ") || "Unknown"}
                            </div>
                            {u.username && (
                              <div className="tgb-user-handle">@{u.username}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--admin-muted)" }}>
                        {u.telegramId}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{u.totalRequests}</span>
                      </td>
                      <td>
                        {topPlatform
                          ? `${platformEmoji(topPlatform[0])} ${topPlatform[0]}`
                          : "—"}
                      </td>
                      <td style={{ color: "var(--admin-muted)", fontSize: "0.8rem" }}>
                        {timeAgo(u.lastSeen)}
                      </td>
                      <td style={{ color: "var(--admin-muted)", fontSize: "0.8rem" }}>
                        {formatDate(u.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {usersPages > 1 && (
          <div className="tgb-pagination">
            <span className="tgb-page-info">Page {usersPage} of {usersPages}</span>
            <button className="tgb-page-btn" onClick={() => changePage(usersPage - 1)} disabled={usersPage === 1}>← Prev</button>
            <button className="tgb-page-btn" onClick={() => changePage(usersPage + 1)} disabled={usersPage === usersPages}>Next →</button>
          </div>
        )}
      </div>

      {/* ── Recent Activity Logs ── */}
      <div className="tgb-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p className="tgb-card-title" style={{ margin: 0 }}>🕒 Recent Activity (last 50)</p>
          <button className="tgb-btn ghost" onClick={fetchLogs} disabled={loadingLogs}>
            <RefreshCw size={13} /> {loadingLogs ? "Loading…" : "Refresh"}
          </button>
        </div>

        {loadingLogs ? (
          <div className="tgb-empty"><span className="tgb-spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="tgb-empty">
            <div className="tgb-empty-icon">📋</div>
            No activity yet
          </div>
        ) : (
          <div className="tgb-table-wrap">
            <table className="tgb-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Platform</th>
                  <th>Format</th>
                  <th>Status</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l._id}>
                    <td>
                      <div className="tgb-user-cell">
                        <div className="tgb-avatar" style={{ fontSize: "0.68rem" }}>
                          {((l.firstName?.[0] || "") + "").toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="tgb-user-name">{l.firstName || "Unknown"}</div>
                          {l.username && <div className="tgb-user-handle">@{l.username}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{platformEmoji(l.platform)} {l.platform}</td>
                    <td style={{ textTransform: "capitalize" }}>{l.format}</td>
                    <td><span className={`tgb-pill ${l.status}`}>{l.status}</span></td>
                    <td style={{ color: "var(--admin-muted)", fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                      {timeAgo(l.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
