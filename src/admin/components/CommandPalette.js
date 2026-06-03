import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, HelpCircle, Library, Layout, Upload,
  Bell, Settings, FileText, Trash2, Megaphone, Mail, Shield,
  Plus, Send, RefreshCw, Moon, Sun, Search, ArrowRight, Clock,
  Zap, BookOpen, Layers
} from "lucide-react";

const ALL_ACTIONS = [
  // Navigation
  { id: "nav-dashboard",    label: "Go to Dashboard",      icon: <LayoutDashboard size={16}/>, category: "Navigate",  path: "/admin",                    keywords: "home overview stats" },
  { id: "nav-users",        label: "Go to Users",           icon: <Users size={16}/>,           category: "Navigate",  path: "/admin/users",              keywords: "members accounts" },
  { id: "nav-questions",    label: "Go to Questions",        icon: <HelpCircle size={16}/>,      category: "Navigate",  path: "/admin/questions",          keywords: "quiz bank" },
  { id: "nav-library",      label: "Go to Library",          icon: <Library size={16}/>,         category: "Navigate",  path: "/admin/userlibrary",        keywords: "books documents study" },
  { id: "nav-studyhub",     label: "Go to Study Hub",        icon: <Layers size={16}/>,          category: "Navigate",  path: "/admin/userlibrary",        keywords: "flashcards notes resources" },
  { id: "nav-feed",         label: "Go to Feed Manager",     icon: <Layout size={16}/>,          category: "Navigate",  path: "/admin/feed",               keywords: "posts announcements" },
  { id: "nav-uploads",      label: "Go to Bulk Upload",      icon: <Upload size={16}/>,          category: "Navigate",  path: "/admin/uploads",            keywords: "csv import" },
  { id: "nav-notifications",label: "Go to Notifications",    icon: <Bell size={16}/>,            category: "Navigate",  path: "/admin/notifications",      keywords: "alerts" },
  { id: "nav-logs",         label: "Go to Activity Logs",    icon: <FileText size={16}/>,        category: "Navigate",  path: "/admin/logs",               keywords: "audit history" },
  { id: "nav-announcements",label: "Go to Announcements",    icon: <Megaphone size={16}/>,       category: "Navigate",  path: "/admin/announcements",      keywords: "broadcast news" },
  { id: "nav-recycle",      label: "Go to Recycle Bin",      icon: <Trash2 size={16}/>,          category: "Navigate",  path: "/admin/recycle-bin",        keywords: "deleted restore" },
  { id: "nav-messages",     label: "Go to Messages",         icon: <Mail size={16}/>,            category: "Navigate",  path: "/admin/messages",           keywords: "inbox chat" },
  { id: "nav-settings",     label: "Go to Settings",         icon: <Settings size={16}/>,        category: "Navigate",  path: "/admin/settings",           keywords: "config preferences" },
  // Quick actions
  { id: "act-add-question",  label: "Add New Question",      icon: <Plus size={16}/>,            category: "Action",    path: "/admin/questions",          keywords: "create" },
  { id: "act-bulk-upload",   label: "Bulk Upload Questions",  icon: <Upload size={16}/>,          category: "Action",    path: "/admin/uploads",            keywords: "csv import" },
  { id: "act-send-broadcast",label: "Send Broadcast",         icon: <Send size={16}/>,            category: "Action",    path: "/admin/notifications",      keywords: "notify users message" },
  { id: "act-view-reported", label: "View Reported Questions",icon: <HelpCircle size={16}/>,      category: "Action",    path: "/admin/questions?filter=reported", keywords: "flag review" },
  { id: "act-pending",       label: "Pending Reviews",        icon: <Clock size={16}/>,           category: "Action",    path: "/admin/pending",            keywords: "approval" },
  { id: "act-add-book",      label: "Upload Study Book",      icon: <BookOpen size={16}/>,        category: "Action",    path: "/admin/userlibrary",        keywords: "library document" },
  { id: "act-admins",        label: "Manage Admins",          icon: <Shield size={16}/>,          category: "Action",    path: "/admin/admins",             keywords: "superadmin roles" },
];

const CATEGORY_COLORS = {
  Navigate: "#4255ff",
  Action:   "#10b981",
  System:   "#d97706",
};

function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "rgba(66,85,255,0.18)", color: "var(--cmd-accent, #4255ff)", borderRadius: 3, padding: "0 2px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function CommandPalette({ open, onClose, onToggleDark, isDark }) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [recentIds, setRecentIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("admin_cmd_recent") || "[]"); } catch { return []; }
  });
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  const filtered = query.trim()
    ? ALL_ACTIONS.filter(a =>
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        a.keywords.toLowerCase().includes(query.toLowerCase()) ||
        a.category.toLowerCase().includes(query.toLowerCase())
      )
    : [
        // Show recent first, then all
        ...recentIds.map(id => ALL_ACTIONS.find(a => a.id === id)).filter(Boolean),
        ...ALL_ACTIONS.filter(a => !recentIds.includes(a.id)).slice(0, 7),
      ];

  // Dynamic system actions
  const systemActions = [
    { id: "sys-dark", label: isDark ? "Switch to Light Mode" : "Switch to Dark Mode", icon: isDark ? <Sun size={16}/> : <Moon size={16}/>, category: "System", action: onToggleDark, keywords: "theme appearance" },
    { id: "sys-refresh", label: "Refresh Page Data", icon: <RefreshCw size={16}/>, category: "System", action: () => { window.location.reload(); onClose(); }, keywords: "reload" },
  ];
  const allFiltered = query.trim()
    ? [
        ...filtered,
        ...systemActions.filter(a =>
          a.label.toLowerCase().includes(query.toLowerCase()) ||
          a.keywords.toLowerCase().includes(query.toLowerCase())
        )
      ]
    : [...filtered, ...systemActions];

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setSelectedIdx(0); }, [query]);

  const execute = useCallback((item) => {
    if (!item) return;
    // Track recent
    const next = [item.id, ...recentIds.filter(id => id !== item.id)].slice(0, 5);
    setRecentIds(next);
    localStorage.setItem("admin_cmd_recent", JSON.stringify(next));

    if (item.action) { item.action(); }
    else if (item.path) { navigate(item.path); }
    onClose();
  }, [navigate, onClose, recentIds]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, allFiltered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); execute(allFiltered[selectedIdx]); }
    if (e.key === "Escape")    { onClose(); }
  };

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx];
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (!open) return null;

  const grouped = allFiltered.reduce((acc, item) => {
    const cat = item.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  // Flatten for index tracking
  let globalIdx = 0;
  const groupedWithIdx = Object.entries(grouped).map(([cat, items]) => ({
    cat,
    items: items.map(item => ({ ...item, _idx: globalIdx++ })),
  }));

  return (
    <>
      <style>{`
        .cmd-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(6px);
          z-index: 9998;
          display: flex; align-items: flex-start; justify-content: center;
          padding-top: 12vh;
          animation: cmdFadeIn .15s ease;
        }
        @keyframes cmdFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes cmdSlideDown { from{opacity:0;transform:translateY(-16px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .cmd-panel {
          width: 100%; max-width: 580px;
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 20px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.8) inset;
          overflow: hidden;
          animation: cmdSlideDown .22s cubic-bezier(.34,1.56,.64,1);
        }
        .admin-dark .cmd-panel {
          background: #1e293b;
          border-color: #334155;
          box-shadow: 0 24px 80px rgba(0,0,0,0.5);
        }
        .cmd-input-row {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .admin-dark .cmd-input-row { border-color: #334155; }
        .cmd-input {
          flex: 1; background: none; border: none; outline: none;
          font-size: 1rem; font-weight: 500; font-family: inherit;
          color: #0f172a;
        }
        .admin-dark .cmd-input { color: #f1f5f9; }
        .cmd-input::placeholder { color: #94a3b8; }
        .cmd-list { max-height: 380px; overflow-y: auto; padding: 8px 0; scrollbar-width: thin; }
        .cmd-group-label {
          padding: 8px 20px 4px;
          font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
          color: #94a3b8;
        }
        .cmd-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 20px; cursor: pointer;
          transition: background .1s;
        }
        .cmd-item:hover, .cmd-item.selected { background: rgba(66,85,255,0.07); }
        .admin-dark .cmd-item:hover,
        .admin-dark .cmd-item.selected { background: rgba(66,85,255,0.15); }
        .cmd-item-icon {
          width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .cmd-item-label { flex: 1; font-size: .88rem; font-weight: 500; color: #0f172a; }
        .admin-dark .cmd-item-label { color: #f1f5f9; }
        .cmd-item-cat {
          font-size: .68rem; padding: 2px 8px; border-radius: 99; font-weight: 600;
        }
        .cmd-item-enter { color: #94a3b8; opacity: 0; transition: opacity .1s; }
        .cmd-item.selected .cmd-item-enter { opacity: 1; }
        .cmd-footer {
          padding: 10px 20px; border-top: 1px solid rgba(0,0,0,0.06);
          display: flex; gap: 16px; align-items: center;
        }
        .admin-dark .cmd-footer { border-color: #334155; }
        .cmd-hint { display: flex; align-items: center; gap: 5px; font-size: .72rem; color: #94a3b8; }
        .cmd-key {
          background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px;
          padding: 1px 6px; font-size: .68rem; font-weight: 700; color: #64748b;
          font-family: monospace;
        }
        .admin-dark .cmd-key { background: #334155; border-color: #475569; color: #94a3b8; }
      `}</style>

      <div className="cmd-overlay" onClick={onClose}>
        <div className="cmd-panel" onClick={e => e.stopPropagation()}>
          {/* Input */}
          <div className="cmd-input-row">
            <Search size={18} color="#94a3b8" style={{ flexShrink: 0 }}/>
            <input
              ref={inputRef}
              className="cmd-input"
              placeholder="Search pages, actions, settings…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button onClick={() => setQuery("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0 }}>
                ✕
              </button>
            )}
            <kbd style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 8px", fontSize: ".72rem", fontWeight: 700, color: "#64748b", fontFamily: "monospace", flexShrink: 0 }}>ESC</kbd>
          </div>

          {/* Results */}
          <div className="cmd-list" ref={listRef}>
            {allFiltered.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: "#94a3b8", fontSize: ".88rem" }}>
                <Zap size={24} style={{ marginBottom: 8, opacity: .4 }}/><br/>
                No results for "{query}"
              </div>
            ) : (
              !query.trim() && recentIds.length > 0 && (
                <div className="cmd-group-label">⏱ Recent</div>
              )
            )}
            {groupedWithIdx.map(({ cat, items }) => (
              <React.Fragment key={cat}>
                {query.trim() && <div className="cmd-group-label">{cat}</div>}
                {items.map((item) => {
                  const catColor = CATEGORY_COLORS[item.category] || "#64748b";
                  return (
                    <div
                      key={item.id}
                      className={`cmd-item${item._idx === selectedIdx ? " selected" : ""}`}
                      onClick={() => execute(item)}
                      onMouseEnter={() => setSelectedIdx(item._idx)}
                    >
                      <div className="cmd-item-icon" style={{ background: `${catColor}15`, color: catColor }}>
                        {item.icon}
                      </div>
                      <span className="cmd-item-label">{highlight(item.label, query)}</span>
                      <span className="cmd-item-cat" style={{ background: `${catColor}12`, color: catColor }}>
                        {item.category}
                      </span>
                      <ArrowRight size={14} className="cmd-item-enter"/>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Footer hints */}
          <div className="cmd-footer">
            <span className="cmd-hint"><kbd className="cmd-key">↑↓</kbd> Navigate</span>
            <span className="cmd-hint"><kbd className="cmd-key">↵</kbd> Open</span>
            <span className="cmd-hint"><kbd className="cmd-key">Esc</kbd> Close</span>
            <span className="cmd-hint" style={{ marginLeft: "auto" }}>
              <Zap size={11} color="#4255ff"/> <span style={{ color: "#4255ff", fontWeight: 700 }}>Ctrl+K</span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
