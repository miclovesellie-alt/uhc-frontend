import React, { useContext, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, Outlet, NavLink } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { io } from "socket.io-client";
import axios from "axios";
import "../admin_styles/AdminLayout.css";
import {
  LayoutDashboard, Users, HelpCircle, Upload, Bell, Settings, LogOut,
  Menu, X, FileText, Shield, Library, Mail, Layout, Trash2, Megaphone,
  Clock, ChevronLeft, ChevronRight, Search, Check, ExternalLink,
  Sun, Moon, ChevronRight as Crumb, ArrowRight, CalendarDays
} from "lucide-react";
import CommandPalette from "./CommandPalette";
import AdminQuickDock from "./AdminQuickDock";
import { playToastSound, unlockAudio } from "../../utils/sounds";

/* ── Resolve a navigation path from notification content ── */
function resolveNotifPath(n) {
  const msg = (n.message || n.desc || "").toLowerCase();
  const type = (n.type || "").toUpperCase();
  if (type === "DANGER" || n.color === "red") return "/admin/logs";
  if (msg.includes("question reported") || msg.includes("reported question")) return "/admin/questions?filter=reported";
  if (msg.includes("question") || msg.includes("quiz") || type === "WARNING") return "/admin/questions";
  if (msg.includes("user") || msg.includes("signup") || msg.includes("register")) return "/admin/users";
  if (msg.includes("library") || msg.includes("book")) return "/admin/userlibrary";
  if (msg.includes("pending") || msg.includes("review")) return "/admin/pending";
  if (msg.includes("maintenance") || msg.includes("setting")) return "/admin/settings";
  if (msg.includes("broadcast") || msg.includes("announcement")) return "/admin/announcements";
  if (msg.includes("log") || msg.includes("activity")) return "/admin/logs";
  return "/admin/notifications";
}

const baseNavItems = [
  { icon: <LayoutDashboard size={17}/>, label: "Dashboard",      path: "/admin"                  },
  { icon: <Users size={17}/>,           label: "Users",           path: "/admin/users"            },
  { icon: <HelpCircle size={17}/>,      label: "Questions",       path: "/admin/questions"        },
  { icon: <Library size={17}/>,         label: "Library",         path: "/admin/userlibrary"      },
  { icon: <Layout size={17}/>,          label: "Feed Manager",    path: "/admin/feed"             },
  { icon: <Upload size={17}/>,          label: "Bulk Upload",     path: "/admin/uploads"          },
  { icon: <Clock size={17}/>,           label: "Pending Review",  path: "/admin/pending"          },
  { icon: <FileText size={17}/>,        label: "Activity Logs",   path: "/admin/logs"             },
  { icon: <CalendarDays size={17}/>,    label: "Daily Summary",   path: "/admin/daily-summary"   },
  { icon: <Bell size={17}/>,            label: "Notifications",   path: "/admin/notifications"   },
  { icon: <Megaphone size={17}/>,       label: "Announcements",   path: "/admin/announcements"   },
  { icon: <Trash2 size={17}/>,          label: "Recycle Bin",     path: "/admin/recycle-bin"     },
  { icon: <Mail size={17}/>,            label: "Messages",        path: "/admin/messages"        },
  { icon: <Settings size={17}/>,        label: "Settings",        path: "/admin/settings"        },
];

const MAIN       = ["/admin","/admin/users","/admin/admins","/admin/questions","/admin/userlibrary","/admin/feed","/admin/uploads","/admin/pending"];
const MONITORING = ["/admin/logs","/admin/daily-summary","/admin/notifications","/admin/messages","/admin/recycle-bin","/admin/announcements"];
const SYSTEM     = ["/admin/settings"];

/* ── Live Clock ── */
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <span style={{ fontSize: ".76rem", color: "var(--admin-muted)", fontVariantNumeric: "tabular-nums", letterSpacing: ".02em" }}>
      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

/* ── Toast Stack ── */
function ToastStack({ toasts, onDismiss }) {
  return (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
      {toasts.map((t) => (
        <div key={t.id} className={`live-toast ${t.type || ""}`}
          style={{ pointerEvents: "auto", position: "relative", overflow: "hidden" }}>
          <div className="live-toast-icon">
            {t.type === "SUCCESS" ? "✅" : t.type === "DANGER" ? "🚫" : "🔔"}
          </div>
          <div className="live-toast-content"
            style={{ cursor: t.actionPath ? "pointer" : "default" }}
            onClick={() => { if (t.actionPath) { window.location.href = t.actionPath; onDismiss(t.id); } }}
          >
            <div className="live-toast-title">{t.senderName || t.title || "System Update"}</div>
            <div className="live-toast-msg">{t.message}</div>
            {t.actionPath && (
              <div style={{ marginTop: 4, fontSize: ".68rem", fontWeight: 700, opacity: 0.85, display: "flex", alignItems: "center", gap: 3 }}>
                <ArrowRight size={10}/> Tap to view →
              </div>
            )}
          </div>
          <button className="live-toast-close" onClick={() => onDismiss(t.id)}><X size={14}/></button>
          {/* Progress bar */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, height: 3, borderRadius: "0 0 0 0",
            background: t.type === "SUCCESS" ? "#22c55e" : t.type === "DANGER" ? "#ef4444" : "var(--admin-accent)",
            animation: `toastProgress ${t.duration || 6}s linear forwards`,
          }}/>
        </div>
      ))}
    </div>
  );
}

/* ── Mail Dropdown Panel ── */
function MailDropdown({ messages, unreadCount, onMarkRead, onViewAll, onClose, onNavigate }) {
  const panelRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const handleItemClick = (m) => {
    onMarkRead(m._id);
    onNavigate(`/admin/messages?id=${m._id}`);
    onClose();
  };

  const userMsgs = messages.filter(m => m.source !== "admin_reply");

  return (
    <div ref={panelRef} style={{
      position: "absolute", top: "calc(100% + 12px)", right: 0,
      width: 360, background: "var(--admin-card)", border: "1px solid var(--admin-border)",
      borderRadius: 18, boxShadow: "0 16px 48px rgba(0,0,0,0.18)", zIndex: 600,
      overflow: "hidden", animation: "bellDropIn .22s cubic-bezier(.34,1.56,.64,1)",
    }}>
      <style>{`
        @keyframes bellDropIn {
          from { opacity:0; transform:translateY(-10px) scale(.96); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--admin-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 800, fontSize: ".9rem", color: "var(--admin-text)", display: "flex", alignItems: "center", gap: 8 }}>
          User Messages
          {unreadCount > 0 && (
            <span style={{ background: "#ef4444", color: "white", fontSize: ".65rem", fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>{unreadCount}</span>
          )}
        </span>
        <button onClick={onViewAll}
          style={{ background: "none", border: "none", fontSize: ".72rem", color: "var(--admin-accent)", fontWeight: 700, cursor: "pointer" }}>
          View all messages
        </button>
      </div>

      {/* Message list */}
      <div style={{ maxHeight: 320, overflowY: "auto", padding: "6px 0" }}>
        {userMsgs.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--admin-muted)", fontSize: ".85rem" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>📭</div>
            No messages
          </div>
        ) : userMsgs.slice(0, 8).map((m) => {
          const isRead = m.status === "read";
          const catLabel = m.category ? m.category.charAt(0).toUpperCase() + m.category.slice(1) : m.source === "suggestion" ? "Suggestion" : "Contact";
          return (
            <div
              key={m._id}
              className="bell-notif-item"
              onClick={() => handleItemClick(m)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 16px",
                cursor: "pointer",
                background: isRead ? "transparent" : "rgba(66,85,255,0.04)",
                borderLeft: isRead ? "3px solid transparent" : "3px solid var(--admin-accent)",
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: isRead ? "rgba(255,255,255,0.05)" : "var(--admin-accent-pale)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem",
                color: isRead ? "var(--admin-muted)" : "var(--admin-accent)"
              }}>
                <Mail size={16}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: ".82rem", color: "var(--admin-text)", marginBottom: 2, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {m.name}
                  </span>
                  {!isRead && (
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--admin-accent)", flexShrink: 0, display: "inline-block" }}/>
                  )}
                </div>
                <div style={{ fontSize: ".72rem", color: "var(--admin-muted)", display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontWeight: 700, color: m.category === "password" ? "#ef4444" : "var(--admin-accent)" }}>{catLabel}</span>
                  <span>•</span>
                  <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: ".75rem", color: "var(--admin-muted)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.message}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Bell Dropdown Panel ── */
function BellDropdown({ notifications, unreadCount, onMarkRead, onMarkAllRead, onViewAll, onClose, onNavigate }) {
  const panelRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const colorMap = { blue: "#4255ff", green: "#22c55e", orange: "#f59e0b", red: "#ef4444" };

  const handleItemClick = (n) => {
    const id = n.id || n._id;
    onMarkRead(id);
    const path = resolveNotifPath(n);
    onNavigate(path);
    onClose();
  };

  return (
    <div ref={panelRef} style={{
      position: "absolute", top: "calc(100% + 12px)", right: 0,
      width: 360, background: "var(--admin-card)", border: "1px solid var(--admin-border)",
      borderRadius: 18, boxShadow: "0 16px 48px rgba(0,0,0,0.18)", zIndex: 600,
      overflow: "hidden", animation: "bellDropIn .22s cubic-bezier(.34,1.56,.64,1)",
    }}>
      <style>{`
        @keyframes bellDropIn {
          from { opacity:0; transform:translateY(-10px) scale(.96); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        .bell-notif-item { transition: background .15s, transform .12s; }
        .bell-notif-item:hover { background: rgba(66,85,255,0.06) !important; transform: translateX(2px); }
        .bell-notif-item:hover .bell-nav-hint { opacity: 1 !important; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--admin-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 800, fontSize: ".9rem", color: "var(--admin-text)", display: "flex", alignItems: "center", gap: 8 }}>
          Notifications
          {unreadCount > 0 && (
            <span style={{ background: "#ef4444", color: "white", fontSize: ".65rem", fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>{unreadCount}</span>
          )}
        </span>
        <button onClick={onMarkAllRead}
          style={{ background: "none", border: "none", fontSize: ".72rem", color: "var(--admin-accent)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <Check size={11}/> Mark all read
        </button>
      </div>

      {/* Hint bar */}
      <div style={{ padding: "7px 16px", background: "rgba(66,85,255,0.05)", borderBottom: "1px solid var(--admin-border)", fontSize: ".7rem", color: "var(--admin-muted)", display: "flex", alignItems: "center", gap: 6 }}>
        <ArrowRight size={11} color="#4255ff"/>
        <span>Click a notification to jump to the relevant section</span>
      </div>

      {/* Notif list */}
      <div style={{ maxHeight: 320, overflowY: "auto", padding: "6px 0" }}>
        {notifications.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--admin-muted)", fontSize: ".85rem" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>📭</div>
            No notifications
          </div>
        ) : notifications.slice(0, 8).map((n) => {
          const isRead = n.read || n.readBy?.includes(localStorage.getItem("userId"));
          const destPath = resolveNotifPath(n);
          const accentColor = colorMap[n.color] || "#4255ff";
          return (
            <div
              key={n.id || n._id}
              className="bell-notif-item"
              onClick={() => handleItemClick(n)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 16px",
                cursor: "pointer",
                background: isRead ? "transparent" : "rgba(66,85,255,0.04)",
                borderLeft: isRead ? "3px solid transparent" : `3px solid ${accentColor}`,
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: `${accentColor}18`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem",
              }}>
                {n.icon || "🔔"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: ".82rem", color: "var(--admin-text)", marginBottom: 2, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {n.title || n.sender?.name || "System"}
                  </span>
                  {!isRead && (
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: accentColor, flexShrink: 0, display: "inline-block" }}/>
                  )}
                </div>
                <div style={{ fontSize: ".76rem", color: "var(--admin-muted)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {n.desc || n.message}
                </div>
                <div style={{ fontSize: ".68rem", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "var(--admin-muted)" }}>{n.time || (n.createdAt && new Date(n.createdAt).toLocaleString())}</span>
                  <span className="bell-nav-hint" style={{ opacity: 0, transition: "opacity .15s", color: accentColor, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                    <ArrowRight size={10}/> {destPath.replace("/admin/", "").replace("?", " ").replace("filter=", "")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid var(--admin-border)", display: "flex", justifyContent: "center" }}>
        <button onClick={onViewAll}
          style={{ background: "none", border: "none", color: "var(--admin-accent)", fontWeight: 700, fontSize: ".8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          View all notifications <ExternalLink size={13}/>
        </button>
      </div>
    </div>
  );
}

/* ── Main Layout ── */
export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, adminTheme, setAdminTheme } = useContext(UserContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [presence, setPresence] = useState({ onlineIds: [], recentIds: [] });
  const [cmdOpen, setCmdOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [bellNotifs, setBellNotifs] = useState([]);
  const bellRef = useRef(null);
  const isDark = adminTheme === "dark";

  // Message states
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [mailOpen, setMailOpen] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      const { default: api } = await import("../../api/api");
      const res = await api.get("contact/messages");
      const msgs = Array.isArray(res.data) ? res.data : [];
      setMessages(msgs);
      const count = msgs.filter(m => m.status === "unread" && m.source !== "admin_reply").length;
      setUnreadMsgCount(count);
    } catch {}
  }, []);

  const markMessageAsRead = async (id) => {
    try {
      const { default: api } = await import("../../api/api");
      await api.patch(`/contact/messages/${id}`, { status: "read" });
      setMessages(prev => prev.map(m => m._id === id ? { ...m, status: "read" } : m));
      setUnreadMsgCount(p => Math.max(0, p - 1));
    } catch {}
  };

  // ── Unlock AudioContext on first user gesture (browser autoplay policy) ──
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("click",   unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("click",   unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // ── Global Ctrl+K listener ──
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(v => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── Socket ──
  useEffect(() => {
    const URL = window.location.hostname === "localhost"
      ? "http://localhost:5000" : "https://uhc-backend.onrender.com";
    const socket = io(URL);

    socket.on("ADMIN_NOTIFICATION", d => {
      const id = Date.now();
      const soundType = d.type === "SUCCESS" ? "success" : d.type === "DANGER" ? "error" : d.type === "WARNING" ? "warning" : "info";
      playToastSound(soundType);
      const msg = (d.message || "").toLowerCase();
      let actionPath = "/admin/notifications";
      if (d.type === "DANGER" || d.color === "red") actionPath = "/admin/logs";
      else if (msg.includes("question reported") || msg.includes("reported question")) actionPath = "/admin/questions?filter=reported";
      else if (msg.includes("question") || msg.includes("quiz")) actionPath = "/admin/questions";
      else if (msg.includes("user") || msg.includes("signup") || msg.includes("register")) actionPath = "/admin/users";
      else if (msg.includes("library") || msg.includes("book")) actionPath = "/admin/userlibrary";
      else if (msg.includes("pending") || msg.includes("review")) actionPath = "/admin/pending";
      else if (msg.includes("maintenance") || msg.includes("setting")) actionPath = "/admin/settings";
      setToasts(prev => [...prev, {
        id,
        type: d.type || "INFO",
        senderName: d.senderName || "System",
        message: d.message,
        duration: 6,
        actionPath,
      }]);
      setUnreadCount(p => p + 1);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6500);
      loadBellNotifs();
      loadMessages();
    });

    socket.on("NEW_MESSAGE", () => {
      loadMessages();
    });

    socket.on("PRESENCE_UPDATE", d => setPresence(d));
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMessages]);

  // ── Load initial data ──
  const loadBellNotifs = useCallback(async () => {
    try {
      const { default: api } = await import("../../api/api");
      const res = await api.get("admin/activity/notifications");
      const userId = localStorage.getItem("userId");
      const processed = (Array.isArray(res.data) ? res.data : []).map(n => ({
        id: n._id,
        icon: n.type === "DANGER" ? "🚫" : n.type === "WARNING" ? "⚠️" : "🔔",
        title: n.sender?.name || "System Alert",
        desc: n.message,
        time: new Date(n.createdAt).toLocaleString(),
        read: n.readBy?.includes(userId),
        color: n.type === "DANGER" ? "red" : n.type === "WARNING" ? "orange" : "blue",
      }));
      setBellNotifs(processed);
      setUnreadCount(processed.filter(n => !n.read).length);
    } catch {}
  }, []);

  useEffect(() => {
    import("../../api/api").then(({ default: api }) => {
      const token = localStorage.getItem("token");
      if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      api.get("admin/presence").then(res => { if (res.data) setPresence(res.data); }).catch(() => {});
      api.get("library/pending").then(res => {
        setPendingCount(Array.isArray(res.data) ? res.data.length : 0);
      }).catch(() => {});
    });
    loadBellNotifs();
    loadMessages();
  }, [location.pathname, loadBellNotifs, loadMessages]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }, []);

  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const markBellRead = async (id) => {
    try {
      const { default: api } = await import("../../api/api");
      await api.patch(`/admin/activity/notifications/${id}/read`);
      setBellNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(p => Math.max(0, p - 1));
    } catch {}
  };

  const markAllBellRead = async () => {
    try {
      const { default: api } = await import("../../api/api");
      await api.patch("/admin/activity/notifications/read-all");
      setBellNotifs(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const toggleDark = () => setAdminTheme?.(isDark ? "light" : "dark");

  const navItems = [...baseNavItems];
  if (user?.role === "superadmin") navItems.splice(2, 0, { icon: <Shield size={17}/>, label: "Admins", path: "/admin/admins" });

  const isActive = p => p === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(p);
  const currentNav = navItems.find(n => isActive(n.path));
  const pageTitle = currentNav?.label || "Admin";

  // Breadcrumb
  const crumbs = ["Admin", pageTitle].filter((c, i, arr) => i === 0 || c !== arr[i - 1]);

  return (
    <div className={`admin-wrapper ${isDark ? "admin-dark" : ""}`}>
      {/* ── Toast Stack ── */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* ── Command Palette ── */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onToggleDark={toggleDark} isDark={isDark} />

      {/* ── Quick Dock ── */}
      <AdminQuickDock />

      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar${sidebarOpen ? " sidebar-open" : ""}${collapsed ? " sidebar-collapsed" : ""}`}>
        <div className="admin-logo">
          <div className="logo-animated-text">
            <span className="logo-letter">U</span><span className="logo-letter">H</span><span className="logo-letter">C</span>
          </div>
          {!collapsed && <div style={{ marginLeft: 8 }}><h2 style={{ fontSize: ".9rem" }}>Admin</h2><span>Control Panel</span></div>}
          <button className="sidebar-collapse-btn" onClick={() => setCollapsed(c => !c)} title={collapsed ? "Expand" : "Collapse"}>
            {collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
          </button>
        </div>

        {/* Ctrl+K shortcut hint in sidebar */}
        {!collapsed && (
          <div style={{ margin: "0 10px 4px", padding: "7px 12px", borderRadius: 10, background: "rgba(66,85,255,0.06)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            onClick={() => setCmdOpen(true)}>
            <Search size={13} color="var(--admin-muted)"/>
            <span style={{ flex: 1, fontSize: ".78rem", color: "var(--admin-muted)" }}>Search…</span>
            <span style={{ fontSize: ".65rem", background: "var(--admin-border)", padding: "1px 6px", borderRadius: 4, color: "var(--admin-muted)", fontFamily: "monospace", fontWeight: 700 }}>⌃K</span>
          </div>
        )}

        <nav className="admin-nav">
          {!collapsed && <div className="admin-nav-section">Main</div>}
          {navItems.filter(i => MAIN.includes(i.path)).map(item => (
            <NavLink key={item.path} to={item.path} end={item.path === "/admin"}
              className={() => isActive(item.path) ? "active" : ""}
              onClick={() => setSidebarOpen(false)}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
              {item.path === "/admin/pending" && pendingCount > 0 && !collapsed && (
                <span style={{ background: "#ef4444", color: "white", fontSize: ".65rem", fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>{pendingCount}</span>
              )}
            </NavLink>
          ))}

          {!collapsed && <div className="admin-nav-section" style={{ marginTop: 8 }}>Monitoring</div>}
          {navItems.filter(i => MONITORING.includes(i.path)).map(item => (
            <NavLink key={item.path} to={item.path}
              className={() => isActive(item.path) ? "active" : ""}
              onClick={() => setSidebarOpen(false)}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
              {item.label === "Notifications" && unreadCount > 0 && !collapsed && (
                <span style={{ background: "#ef4444", color: "white", fontSize: ".65rem", fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>{unreadCount}</span>
              )}
            </NavLink>
          ))}

          {!collapsed && <div className="admin-nav-section" style={{ marginTop: 8 }}>System</div>}
          {navItems.filter(i => SYSTEM.includes(i.path)).map(item => (
            <NavLink key={item.path} to={item.path}
              className={() => isActive(item.path) ? "active" : ""}
              onClick={() => setSidebarOpen(false)}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>

        {/* Profile card */}
        <div className="admin-nav-logout">
          <div className="admin-profile-card-clickable" onClick={() => navigate("/admin/settings")}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, marginBottom: 6, cursor: "pointer" }}
          >
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--admin-accent-pale)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".85rem", fontWeight: 700, color: "var(--admin-accent)", flexShrink: 0 }}>
              {user?.name?.[0]?.toUpperCase() || "A"}
            </div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--admin-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name || "Admin"}</div>
                <div style={{ fontSize: ".7rem", color: "var(--admin-muted)" }}>{user?.role === "superadmin" ? "⭐ Superadmin" : "Administrator"}</div>
              </div>
            )}
          </div>
          <button className="admin-btn danger" style={{ width: "100%", justifyContent: "center" }} onClick={() => setShowLogout(true)} title="Sign Out">
            <LogOut size={15}/>{!collapsed && " Sign Out"}
          </button>
        </div>
      </aside>

      {sidebarOpen && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 150 }} onClick={() => setSidebarOpen(false)}/>}

      {/* ── Main Content ── */}
      <div className="admin-content">
        {/* Topbar */}
        <div className="admin-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="admin-hamburger"
              style={{ alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, border: "1px solid var(--admin-border)", background: "transparent", color: "var(--admin-text)", cursor: "pointer" }}
              onClick={() => setSidebarOpen(o => !o)}
            >
              {sidebarOpen ? <X size={18}/> : <Menu size={18}/>}
            </button>

            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {crumbs.map((crumb, i) => (
                <React.Fragment key={crumb}>
                  {i > 0 && <Crumb size={13} color="var(--admin-muted)" style={{ opacity: .5 }}/>}
                  <span style={{
                    fontSize: i === crumbs.length - 1 ? "1rem" : ".82rem",
                    fontWeight: i === crumbs.length - 1 ? 700 : 500,
                    color: i === crumbs.length - 1 ? "var(--admin-text)" : "var(--admin-muted)",
                  }}>
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="admin-topbar-actions">
            <LiveClock />
            <span style={{ fontSize: ".78rem", color: "var(--admin-muted)" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>

            {/* Ctrl+K search trigger */}
            <button onClick={() => setCmdOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 10, border: "1px solid var(--admin-border)", background: "var(--admin-bg)", cursor: "pointer", color: "var(--admin-muted)", fontSize: ".78rem" }}>
              <Search size={14}/>
              <span className="desktop-only">Search</span>
              <kbd style={{ background: "var(--admin-border)", borderRadius: 4, padding: "0 5px", fontSize: ".65rem", fontWeight: 700, fontFamily: "monospace" }}>⌃K</kbd>
            </button>

            {/* Dark mode toggle */}
            <button onClick={toggleDark}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid var(--admin-border)", background: "transparent", color: "var(--admin-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}>
              {isDark ? <Sun size={16}/> : <Moon size={16}/>}
            </button>

            {/* Mail with dropdown */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => { setMailOpen(v => !v); setBellOpen(false); if (!mailOpen) loadMessages(); }}
                style={{ position: "relative", width: 36, height: 36, borderRadius: 10, border: "1px solid var(--admin-border)", background: "transparent", color: "var(--admin-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}
                title="Messages"
              >
                <Mail size={18}/>
                {unreadMsgCount > 0 && (
                  <span style={{ position: "absolute", top: -5, right: -6, background: "#ef4444", color: "white", fontSize: ".62rem", fontWeight: 700, minWidth: 18, height: 18, borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid var(--admin-card)", animation: "bellBounce .4s cubic-bezier(.34,1.56,.64,1)" }}>
                    {unreadMsgCount > 99 ? "99+" : unreadMsgCount}
                  </span>
                )}
              </button>

              {mailOpen && (
                <MailDropdown
                  messages={messages}
                  unreadCount={unreadMsgCount}
                  onMarkRead={markMessageAsRead}
                  onViewAll={() => { navigate("/admin/messages"); setMailOpen(false); }}
                  onClose={() => setMailOpen(false)}
                  onNavigate={(path) => { navigate(path); setMailOpen(false); }}
                />
              )}
            </div>

            {/* Bell with dropdown */}
            <div style={{ position: "relative" }} ref={bellRef}>
              <button
                onClick={() => { setBellOpen(v => !v); if (!bellOpen) loadBellNotifs(); }}
                style={{ position: "relative", width: 36, height: 36, borderRadius: 10, border: "1px solid var(--admin-border)", background: "transparent", color: "var(--admin-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}
                title="Notifications"
              >
                <Bell size={18}/>
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: -5, right: -6, background: "#ef4444", color: "white", fontSize: ".62rem", fontWeight: 700, minWidth: 18, height: 18, borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid var(--admin-card)", animation: "bellBounce .4s cubic-bezier(.34,1.56,.64,1)" }}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <BellDropdown
                  notifications={bellNotifs}
                  unreadCount={unreadCount}
                  onMarkRead={markBellRead}
                  onMarkAllRead={markAllBellRead}
                  onViewAll={() => { navigate("/admin/notifications"); setBellOpen(false); }}
                  onClose={() => setBellOpen(false)}
                  onNavigate={(path) => { navigate(path); setBellOpen(false); }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="admin-page-wrapper">
          <Outlet context={{ setUnreadCount, presence }}/>
        </div>
      </div>

      {/* Logout modal */}
      {showLogout && (
        <div className="modal-overlay" onClick={() => setShowLogout(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 320, textAlign: "center", padding: "32px 24px", borderRadius: "24px" }}>
            <div style={{ width: 56, height: 56, borderRadius: "18px", background: "var(--admin-accent-pale)", color: "var(--admin-accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", transform: "rotate(-5deg)" }}>
              <LogOut size={26} style={{ transform: "rotate(5deg)" }}/>
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 8, color: "var(--admin-text)" }}>Ready to leave?</h2>
            <p style={{ color: "var(--admin-muted)", fontSize: ".88rem", marginBottom: 28, lineHeight: 1.4 }}>Are you sure you want to log out?</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="admin-btn secondary" style={{ flex: 1 }} onClick={() => setShowLogout(false)}>Cancel</button>
              <button className="admin-btn primary" style={{ flex: 1, background: "#ef4444", border: "none" }} onClick={() => { logout(); navigate("/"); }}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bellBounce {
          from { transform: scale(0.3); opacity:0; }
          to   { transform: scale(1);   opacity:1; }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
        .sidebar-collapsed { width: 64px !important; }
        .sidebar-collapsed .admin-logo { justify-content: center; padding: 0 8px; }
        .sidebar-collapsed .admin-nav a { justify-content: center; padding: 10px 0; }
        .sidebar-collapse-btn { margin-left: auto; background: none; border: none; cursor: pointer; color: var(--admin-muted); padding: 4px; border-radius: 6px; display: flex; align-items: center; }
        .sidebar-collapse-btn:hover { background: var(--admin-accent-pale); color: var(--admin-accent); }
        .admin-profile-card-clickable:hover { background: var(--admin-accent-pale) !important; }
        .admin-page-wrapper { animation: pageSlideIn .3s ease; }
        @keyframes pageSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}