import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, Check, Send, Trash2, ChevronDown, ChevronUp,
  Bell, X, AlertTriangle, Info, Zap, ExternalLink,
  Users, HelpCircle, Shield, FileText, Settings, ArrowRight, ArrowLeft
} from "lucide-react";
import { useOutletContext, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { io } from "socket.io-client";

const NOTIF_TYPES = ["All", "Reports", "Users", "System", "Quiz", "Security"];

const PRIORITY_CONFIG = {
  critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: <Zap size={10}/> },
  high:     { label: "High",     color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: <AlertTriangle size={10}/> },
  medium:   { label: "Medium",   color: "#4255ff", bg: "rgba(66,85,255,0.1)", icon: <Bell size={10}/> },
  low:      { label: "Low",      color: "#64748b", bg: "rgba(100,116,139,0.1)", icon: <Info size={10}/> },
};

/* â”€â”€ Smart route resolver â”€â”€ */
function resolveActionPath(n) {
  const msg = (n.message || n.desc || "").toLowerCase();
  const title = (n.title || "").toLowerCase();

  if (n.type === "Security" || n.color === "red") return "/admin/logs";
  if (msg.includes("question reported") || msg.includes("reported question") || title.includes("reported"))
    return "/admin/questions?filter=reported";
  if (msg.includes("question") || msg.includes("quiz") || n.type === "Quiz")
    return "/admin/questions";
  if (msg.includes("user") || msg.includes("signup") || msg.includes("register") || n.type === "Users")
    return "/admin/users";
  if (msg.includes("library") || msg.includes("book") || msg.includes("resource"))
    return "/admin/userlibrary";
  if (msg.includes("pending") || msg.includes("review"))
    return "/admin/pending";
  if (msg.includes("maintenance") || msg.includes("setting") || n.id === "mm")
    return "/admin/settings";
  if (msg.includes("broadcast") || msg.includes("announcement"))
    return "/admin/announcements";
  if (msg.includes("log") || msg.includes("activity"))
    return "/admin/logs";
  return null;
}

function getActionLabel(path) {
  if (!path) return null;
  if (path.includes("questions?filter=reported")) return { label: "View Reported", icon: <HelpCircle size={11}/> };
  if (path.includes("questions"))  return { label: "View Questions",  icon: <HelpCircle size={11}/> };
  if (path.includes("users"))      return { label: "View Users",      icon: <Users size={11}/> };
  if (path.includes("logs"))       return { label: "View Logs",       icon: <Shield size={11}/> };
  if (path.includes("library"))    return { label: "View Library",    icon: <FileText size={11}/> };
  if (path.includes("pending"))    return { label: "View Pending",    icon: <FileText size={11}/> };
  if (path.includes("settings"))   return { label: "View Settings",   icon: <Settings size={11}/> };
  if (path.includes("announce"))   return { label: "View Announcements", icon: <Bell size={11}/> };
  return { label: "View Details", icon: <ExternalLink size={11}/> };
}

function getPriority(n) {
  if (n.type === "Security" || n.color === "red") return "critical";
  if (n.color === "orange") return "high";
  if (n.color === "blue") return "medium";
  return "low";
}

function getGroupLabel(timeStr) {
  if (!timeStr || timeStr === "Active now") return "Active";
  const d = new Date(timeStr);
  if (isNaN(d)) return "Active";
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This Week";
  return "Older";
}

function groupNotifications(list) {
  const order = ["Active", "Today", "Yesterday", "This Week", "Older"];
  const groups = {};
  list.forEach(n => {
    const g = getGroupLabel(n.time);
    if (!groups[g]) groups[g] = [];
    groups[g].push(n);
  });
  return order.filter(k => groups[k]).map(k => ({ label: k, items: groups[k] }));
}

/* â”€â”€ Priority Badge â”€â”€ */
function PriorityBadge({ level }) {
  const cfg = PRIORITY_CONFIG[level] || PRIORITY_CONFIG.low;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 7px", borderRadius: 99, fontSize: ".65rem", fontWeight: 700,
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

/* â”€â”€ Single Notification Card â”€â”€ */
function NotifCard({ n, idx, onRead, onDelete, navigate }) {
  const [expanded, setExpanded] = useState(false);
  const priority = getPriority(n);
  const cfg = PRIORITY_CONFIG[priority];
  const colorMap = { blue: "#4255ff", green: "#22c55e", orange: "#f59e0b", red: "#ef4444" };
  const iconColor = colorMap[n.color] || "#4255ff";
  const actionPath = resolveActionPath(n);
  const action = getActionLabel(actionPath);

  const handleNavigate = (e) => {
    e.stopPropagation();
    if (!n.read) onRead(n.id);
    if (actionPath) navigate(actionPath);
  };

  const handleCardClick = () => {
    if (!n.read) onRead(n.id);
    // If there's a clear action, navigate directly; otherwise expand for details
    if (actionPath && !expanded) {
      navigate(actionPath);
    } else {
      setExpanded(v => !v);
    }
  };

  return (
    <div
      className="notif-card-anim notif-card-hover"
      style={{
        display: "flex", alignItems: "flex-start", gap: 14,
        padding: "16px 16px 16px 20px",
        background: n.read ? "rgba(255,255,255,0.02)" : "rgba(66,85,255,0.05)",
        border: `1px solid ${n.read ? "var(--admin-border)" : "rgba(66,85,255,0.2)"}`,
        borderLeft: `4px solid ${n.read ? "transparent" : cfg.color}`,
        borderRadius: 14, transition: "all .2s", cursor: "pointer",
        animationDelay: `${idx * 0.05}s`,
        position: "relative",
      }}
      onClick={handleCardClick}
    >
      {/* Unread pulse ring */}
      {!n.read && (
        <span style={{
          position: "absolute", top: 14, left: -2,
          width: 8, height: 8, borderRadius: "50%",
          background: cfg.color,
          boxShadow: `0 0 0 3px ${cfg.color}30`,
          animation: "notifPulse 1.8s ease infinite",
        }}/>
      )}

      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 12, background: `${iconColor}20`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.2rem", flexShrink: 0,
      }}>
        {n.icon}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: ".875rem", color: "var(--admin-text)" }}>{n.title}</span>
          <span className={`admin-badge ${n.color}`} style={{ fontSize: ".65rem" }}>{n.type}</span>
          <PriorityBadge level={priority} />
        </div>
        <div style={{
          fontSize: ".82rem", color: "var(--admin-muted)", lineHeight: 1.5,
          overflow: "hidden", maxHeight: expanded ? "none" : "2.6em",
          transition: "max-height .25s ease",
        }}>
          {n.desc}
        </div>
        {n.desc && n.desc.length > 80 && (
          <button onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            style={{ marginTop: 4, fontSize: ".72rem", color: "var(--admin-accent)", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 2 }}>
            {expanded ? <><ChevronUp size={12}/>Less</> : <><ChevronDown size={12}/>More</>}
          </button>
        )}

        {/* Action button — always visible if there's a route */}
        {actionPath && (
          <button
            className="notif-action-btn"
            onClick={handleNavigate}
            style={{
              marginTop: 10, display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 8, fontSize: ".75rem", fontWeight: 700,
              background: `${cfg.color}15`, color: cfg.color,
              border: `1px solid ${cfg.color}30`, cursor: "pointer",
              transition: "all .15s",
            }}
          >
            {action?.icon} {action?.label} <ArrowRight size={11}/>
          </button>
        )}
      </div>

      {/* Right side */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
        <div style={{ fontSize: ".72rem", color: "var(--admin-muted)", whiteSpace: "nowrap" }}>{n.time}</div>
        <div style={{ display: "flex", gap: 4 }}>
          {!n.read && (
            <button title="Mark as read"
              onClick={e => { e.stopPropagation(); onRead(n.id); }}
              style={{ background: "rgba(66,85,255,0.1)", border: "none", borderRadius: 6, padding: "3px 6px", cursor: "pointer", color: "#4255ff", display: "flex", alignItems: "center" }}>
              <Check size={12}/>
            </button>
          )}
          {!["ss", "mm"].includes(n.id) && (
            <button title="Dismiss"
              onClick={e => { e.stopPropagation(); onDelete(n.id); }}
              style={{ background: "rgba(239,68,68,0.08)", border: "none", borderRadius: 6, padding: "3px 6px", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}>
              <X size={12}/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* â”€â”€ Group Section â”€â”€ */
function NotifGroup({ group, collapsed, onToggle, onRead, onDelete, navigate }) {
  const unread = group.items.filter(n => !n.read).length;
  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          background: "none", border: "none", cursor: "pointer",
          padding: "6px 0", marginBottom: 8,
        }}
      >
        <span style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--admin-muted)" }}>
          {group.label}
        </span>
        {unread > 0 && (
          <span style={{ background: "#ef4444", color: "white", fontSize: ".62rem", fontWeight: 700, padding: "1px 6px", borderRadius: 99 }}>
            {unread} unread
          </span>
        )}
        <span style={{ marginLeft: "auto", color: "var(--admin-muted)" }}>
          {collapsed ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
        </span>
      </button>
      {!collapsed && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {group.items.map((n, idx) => (
            <NotifCard key={n.id} n={n} idx={idx} onRead={onRead} onDelete={onDelete} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}

/* â”€â”€ Stats Bar â”€â”€ */
function NotifStats({ notifications }) {
  const total   = notifications.length;
  const unread  = notifications.filter(n => !n.read).length;
  const critical = notifications.filter(n => getPriority(n) === "critical").length;
  const today   = notifications.filter(n => getGroupLabel(n.time) === "Today" || getGroupLabel(n.time) === "Active").length;

  const items = [
    { label: "Total",    value: total,    color: "#4255ff", bg: "rgba(66,85,255,0.08)" },
    { label: "Unread",   value: unread,   color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
    { label: "Critical", value: critical, color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
    { label: "Today",    value: today,    color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
      {items.map(s => (
        <div key={s.label} style={{
          background: s.bg, borderRadius: 12, padding: "12px 16px",
          border: `1px solid ${s.color}20`, textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          <div style={{ fontSize: ".72rem", color: "var(--admin-muted)", marginTop: 4, fontWeight: 600 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* â”€â”€ Main Component â”€â”€ */
export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [broadcastPriority, setBroadcastPriority] = useState("medium");
  const [broadcasting, setBroadcasting] = useState(false);
  const [bToast, setBToast] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [newBadge, setNewBadge] = useState(false);
  const { setUnreadCount } = useOutletContext() || {};
  const navigate = useNavigate();
  const charLimit = 500;

  const showBToast = (msg, type = "success") => {
    setBToast({ msg, type });
    setTimeout(() => setBToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [notifsRes, ssRes, mmRes] = await Promise.all([
        api.get("admin/activity/notifications"),
        api.get("settings/noScreenshot"),
        api.get("settings/maintenanceMode"),
      ]);
      const ssActive = ssRes.data.value === true;
      const mmActive = mmRes.data.value === true;
      setNotifications(processNotifications(notifsRes.data, ssActive, mmActive));
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  }, []);

  const processNotifications = (backendNotifs, ss, mm) => {
    const list = [];
    if (ss) list.push({ id: "ss", type: "Security", icon: "📵", title: "No-Screenshot Active", desc: "Screenshot protection is enabled for all quizzes", time: "Active now", read: false, color: "blue" });
    if (mm) list.push({ id: "mm", type: "System", icon: "🔧", title: "Maintenance Mode", desc: "Platform is in maintenance — users cannot log in", time: "Active now", read: false, color: "orange" });

    backendNotifs.forEach(n => {
      const isReadByMe = n.readBy?.includes(localStorage.getItem("userId"));
      const msgLower = (n.message || "").toLowerCase();
      const isQuiz = msgLower.includes("quiz");
      let notifType = "System";
      if (n.type === "DANGER") notifType = "Security";
      else if (n.type === "WARNING") notifType = isQuiz ? "Quiz" : "System";
      let icon = "🔔";
      if (n.type === "DANGER") icon = "🚫";
      else if (isQuiz) icon = "🧠";
      else if (n.type === "WARNING") icon = "⚠️";
      list.push({
        id: n._id,
        type: notifType,
        icon,
        title: n.sender?.name || "System Alert",
        desc: n.message,
        message: n.message,
        time: new Date(n.createdAt).toLocaleString(),
        read: isReadByMe,
        color: n.type === "DANGER" ? "red" : isQuiz ? "green" : "blue",
      });
    });
    return list;
  };

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const SOCKET_URL = window.location.hostname === "localhost"
      ? "http://localhost:5000" : "https://uhc-backend.onrender.com";
    const socket = io(SOCKET_URL);
    socket.on("ADMIN_NOTIFICATION", () => {
      load();
      setNewBadge(true);
      setTimeout(() => setNewBadge(false), 4000);
    });
    return () => socket.disconnect();
  }, [load]);

  const filtered = notifications.filter(n => {
    const typeOk = filter === "All" || n.type === filter;
    const prioOk = priorityFilter === "All" || getPriority(n) === priorityFilter.toLowerCase();
    return typeOk && prioOk;
  });

  const unread = notifications.filter(n => !n.read).length;
  const groups = groupNotifications(filtered);

  const markRead = async (id) => {
    if (!["ss", "mm"].includes(id)) {
      try { await api.patch(`/admin/activity/notifications/${id}/read`); } catch {}
    }
    setNotifications(prev => prev.map(x => x.id === id ? { ...x, read: true } : x));
    if (setUnreadCount) setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    try {
      await api.patch("/admin/activity/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      if (setUnreadCount) setUnreadCount(0);
    } catch (err) { console.error(err); }
  };

  const deleteNotif = (id) => {
    setNotifications(prev => {
      const n = prev.find(x => x.id === id);
      if (n && !n.read && setUnreadCount) setUnreadCount(p => Math.max(0, p - 1));
      return prev.filter(x => x.id !== id);
    });
  };

  const clearAllRead = () => {
    setNotifications(prev => prev.filter(n => !n.read || ["ss", "mm"].includes(n.id)));
  };

  const toggleGroup = (label) => setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));

  return (
    <div className="admin-page">
      <style>{`
        .notif-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(66, 85, 255, 0.08);
          color: var(--admin-accent, #4255ff);
          border: 1px solid rgba(66, 85, 255, 0.15);
          padding: 5px 12px;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          margin-bottom: 12px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .notif-back-btn:hover {
          background: var(--admin-accent, #4255ff);
          color: white;
          transform: translateX(-4px);
          box-shadow: 0 4px 12px rgba(66, 85, 255, 0.2);
        }
        .notif-back-btn svg {
          transition: transform 0.25s ease;
        }
        .notif-back-btn:hover svg {
          transform: translateX(-2px);
        }
        @keyframes notifSlideIn {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes notifPulse {
          0%,100% { box-shadow: 0 0 0 3px rgba(66,85,255,0.3); }
          50%      { box-shadow: 0 0 0 6px rgba(66,85,255,0); }
        }
        @keyframes newBadgePop {
          0%   { transform:scale(0) rotate(-10deg); opacity:0; }
          60%  { transform:scale(1.15) rotate(3deg); opacity:1; }
          100% { transform:scale(1) rotate(0deg); opacity:1; }
        }
        .notif-card-anim {
          animation: notifSlideIn 0.35s ease both;
        }
        .notif-card-hover:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .notif-action-btn:hover {
          filter: brightness(1.1);
          transform: translateX(2px);
        }
        .notif-broadcast-char { font-size:.72rem; color:var(--admin-muted); text-align:right; margin-top:4px; }
        .notif-priority-filter button { transition: all .15s; }
      `}</style>

      {/* Header */}
      <div className="admin-section-header" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <button className="notif-back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={13} /> Back
            </button>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--admin-text)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              🔔 Notifications
              {unread > 0 && (
                <span style={{
                  fontSize: ".75rem", background: "#ef4444", color: "white",
                  borderRadius: 50, padding: "2px 9px", fontWeight: 700,
                  animation: newBadge ? "newBadgePop .4s cubic-bezier(.34,1.56,.64,1)" : "none",
                }}>
                  {unread}
                </span>
              )}
              {newBadge && (
                <span style={{
                  fontSize: ".65rem", background: "#22c55e", color: "white",
                  borderRadius: 99, padding: "2px 8px", fontWeight: 700,
                  animation: "newBadgePop .4s cubic-bezier(.34,1.56,.64,1)",
                }}>
                  âœ¨ New
                </span>
              )}
            </h1>
            <p style={{ fontSize: ".82rem", color: "var(--admin-muted)", margin: "4px 0 0" }}>
              {notifications.length} total Â· {unread} unread Â· Click a notification to go directly to the relevant section
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="admin-btn primary sm" onClick={() => setShowBroadcast(true)}><Send size={13}/> Send Broadcast</button>
          <button className="admin-btn secondary sm" onClick={markAllRead}><Check size={13}/> Mark All Read</button>
          <button className="admin-btn secondary sm" onClick={clearAllRead} title="Remove all read notifications from view"><Trash2 size={13}/> Clear Read</button>
          <button className="admin-btn secondary sm" onClick={load}><RefreshCw size={13}/> Refresh</button>
        </div>
      </div>

      {/* Stats Bar */}
      <NotifStats notifications={notifications} />

      {/* Type filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {NOTIF_TYPES.map(t => (
          <button key={t} onClick={() => setFilter(t)} className={filter === t ? "admin-btn primary sm" : "admin-btn secondary sm"}>
            {t}
            {t !== "All" && (
              <span style={{
                marginLeft: 4, padding: "1px 6px", borderRadius: 99, fontSize: ".65rem",
                background: filter === t ? "rgba(255,255,255,0.25)" : "var(--admin-border)",
              }}>
                {notifications.filter(n => n.type === t).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Priority filter */}
      <div className="notif-priority-filter" style={{ display: "flex", gap: 6, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>Priority:</span>
        {["All", "Critical", "High", "Medium", "Low"].map(p => {
          const isActive = priorityFilter === p;
          const cfg = p !== "All" ? PRIORITY_CONFIG[p.toLowerCase()] : null;
          return (
            <button key={p} onClick={() => setPriorityFilter(p)}
              style={{
                padding: "3px 11px", borderRadius: 99, border: "none", cursor: "pointer",
                fontSize: ".72rem", fontWeight: 700, transition: "all .15s",
                background: isActive ? (cfg?.color || "#4255ff") : "var(--admin-surface, #f1f5f9)",
                color: isActive ? "white" : "var(--admin-muted, #475569)",
              }}>
              {p}
            </button>
          );
        })}
      </div>

      {/* Deep-link hint */}
      {filtered.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
          padding: "9px 14px", borderRadius: 10,
          background: "rgba(66,85,255,0.06)", border: "1px solid rgba(66,85,255,0.12)",
          fontSize: ".78rem", color: "var(--admin-muted)",
        }}>
          <ArrowRight size={13} color="#4255ff"/>
          <span><strong style={{ color: "#4255ff" }}>Click any notification</strong> to jump directly to the related admin section.</span>
        </div>
      )}

      {/* Notification groups */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--admin-muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>ðŸ“­</div>
          <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 6 }}>All clear!</div>
          <div style={{ fontSize: ".85rem" }}>No notifications in this category.</div>
        </div>
      ) : (
        groups.map(group => (
          <NotifGroup
            key={group.label}
            group={group}
            collapsed={!!collapsedGroups[group.label]}
            onToggle={() => toggleGroup(group.label)}
            onRead={markRead}
            onDelete={deleteNotif}
            navigate={navigate}
          />
        ))
      )}

      {/* â”€â”€ Broadcast Modal â”€â”€ */}
      {showBroadcast && (
        <div className="admin-modal-overlay" onClick={() => setShowBroadcast(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}><Send size={18}/> Send Broadcast</h3>
              <button className="admin-btn secondary sm" onClick={() => setShowBroadcast(false)}>âœ•</button>
            </div>
            <p style={{ fontSize: ".85rem", color: "var(--admin-muted)", marginBottom: 16 }}>
              Send a notification to users on the platform. It appears in their notification feed.
            </p>

            <label style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--admin-muted)", display: "block", marginBottom: 6 }}>TITLE</label>
            <input
              className="admin-input"
              style={{ width: "100%", boxSizing: "border-box", marginBottom: 12 }}
              placeholder="e.g. Platform Maintenance Notice"
              value={broadcastTitle}
              onChange={e => setBroadcastTitle(e.target.value)}
            />

            <label style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--admin-muted)", display: "block", marginBottom: 6 }}>AUDIENCE</label>
            <select className="admin-select" style={{ width: "100%", marginBottom: 12, boxSizing: "border-box" }} value={broadcastTarget} onChange={e => setBroadcastTarget(e.target.value)}>
              <option value="all">All Users</option>
              <option value="students">Students Only</option>
              <option value="tutors">Health Tutors / Nurses / Doctors</option>
            </select>

            <label style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--admin-muted)", display: "block", marginBottom: 8 }}>PRIORITY</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {["low", "medium", "high", "critical"].map(p => {
                const cfg = PRIORITY_CONFIG[p];
                const isActive = broadcastPriority === p;
                return (
                  <button key={p} onClick={() => setBroadcastPriority(p)}
                    style={{
                      padding: "5px 12px", borderRadius: 99, border: `1px solid ${isActive ? cfg.color : "var(--admin-border)"}`,
                      cursor: "pointer", fontSize: ".75rem", fontWeight: 700, transition: "all .15s",
                      background: isActive ? cfg.color : "transparent",
                      color: isActive ? "white" : cfg.color,
                    }}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            <label style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--admin-muted)", display: "block", marginBottom: 6 }}>MESSAGE *</label>
            <textarea
              className="admin-input"
              rows={4}
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", padding: "10px 14px" }}
              placeholder="Type your announcement hereâ€¦"
              value={broadcastMsg}
              maxLength={charLimit}
              onChange={e => setBroadcastMsg(e.target.value)}
            />
            <div className="notif-broadcast-char">{broadcastMsg.length}/{charLimit}</div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button className="admin-btn secondary" onClick={() => setShowBroadcast(false)}>Cancel</button>
              <button
                className="admin-btn primary"
                disabled={!broadcastMsg.trim() || broadcasting}
                onClick={async () => {
                  if (!broadcastMsg.trim()) return;
                  setBroadcasting(true);
                  try {
                    await api.post("admin/notifications/broadcast", {
                      title: broadcastTitle || "Admin Broadcast",
                      message: broadcastMsg,
                      target: broadcastTarget,
                      priority: broadcastPriority,
                    });
                    showBToast("Broadcast sent successfully! âœ…");
                    setBroadcastMsg(""); setBroadcastTitle(""); setShowBroadcast(false);
                    load();
                  } catch (err) {
                    showBToast(err.response?.data?.message || "Failed to send broadcast", "error");
                  } finally { setBroadcasting(false); }
                }}
              >
                <Send size={14}/> {broadcasting ? "Sendingâ€¦" : "Send Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Toast â”€â”€ */}
      {bToast && (
        <div style={{
          position: "fixed", top: 70, right: 24, zIndex: 9999,
          padding: "12px 20px", borderRadius: 12, fontWeight: 600, fontSize: ".875rem",
          background: bToast.type === "error" ? "#ef4444" : "#22c55e",
          color: "white", boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          animation: "notifSlideIn .3s ease",
        }}>
          {bToast.msg}
        </div>
      )}
    </div>
  );
}

