import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import api from "../../api/api";
import {
  Mail, Trash2, Clock, Search, MessageSquare, Send,
  X, User, Reply, CheckCircle, Tag
} from "lucide-react";
import "../../admin_styles/AdminMessages.css";

const SOURCE_TABS = [
  { id: "all",        label: "All",         icon: <Mail size={14}/> },
  { id: "suggestion", label: "Suggestions", icon: <MessageSquare size={14}/> },
  { id: "contact",    label: "Contact Form",icon: <User size={14}/> },
];

const sourceBadge = (source) => {
  const map = {
    suggestion:  { label: "Suggestion",   color: "#4255ff", bg: "rgba(66,85,255,.1)" },
    contact:     { label: "Contact Form", color: "#10b981", bg: "rgba(16,185,129,.1)" },
    admin_reply: { label: "Admin Reply",  color: "#f59e0b", bg: "rgba(245,158,11,.1)" },
  };
  const s = map[source] || { label: source, color: "#94a3b8", bg: "rgba(148,163,184,.1)" };
  return (
    <span style={{
      fontSize: ".65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 99,
      color: s.color, background: s.bg, textTransform: "uppercase", letterSpacing: ".05em",
    }}>
      {s.label}
    </span>
  );
};

const categoryBadge = (cat) => {
  if (!cat) return null;
  const map = {
    password:   { label: "Password Reset", color: "#ef4444", bg: "rgba(239,68,68,.1)" },
    suggestion: { label: "Suggestion",     color: "#10b981", bg: "rgba(16,185,129,.1)" },
    others:     { label: "Others",         color: "#64748b", bg: "rgba(100,116,139,.1)" },
  };
  const c = map[cat] || { label: cat, color: "#94a3b8", bg: "rgba(148,163,184,.1)" };
  return (
    <span style={{
      fontSize: ".65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 99,
      color: c.color, background: c.bg, textTransform: "uppercase", letterSpacing: ".05em",
    }}>
      {c.label}
    </span>
  );
};

export default function AdminMessages() {
  const [searchParams]                      = useSearchParams();
  const { setUnreadMsgCount }               = useOutletContext() || {};
  const [messages, setMessages]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [searchTerm, setSearchTerm]         = useState("");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [activeTab, setActiveTab]           = useState("all");
  const [showReply, setShowReply]           = useState(false);
  const [replyText, setReplyText]           = useState("");
  const [replySending, setReplySending]     = useState(false);
  const [replySuccess, setReplySuccess]     = useState(false);

  const msgIdParam = searchParams.get("id");

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("contact/messages");
      setMessages(res.data);
    } catch (err) {
      console.error("Fetch messages failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id) => {
    try {
      await api.patch(`/contact/messages/${id}`, { status: "read" });
      setMessages(prev => prev.map(m => m._id === id ? { ...m, status: "read" } : m));
      setSelectedMessage(prev => prev?._id === id ? { ...prev, status: "read" } : prev);
      if (setUnreadMsgCount) {
        setUnreadMsgCount(p => Math.max(0, p - 1));
      }
    } catch (err) {
      console.error("Update status failed", err);
    }
  }, [setUnreadMsgCount]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (msgIdParam && messages.length > 0) {
      const found = messages.find(m => m._id === msgIdParam);
      if (found) {
        setSelectedMessage(found);
        if (found.status === "unread") {
          markAsRead(found._id);
        }
      }
    }
  }, [msgIdParam, messages, markAsRead]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await api.delete(`/contact/messages/${id}`);
      setMessages(prev => prev.filter(m => m._id !== id));
      if (selectedMessage?._id === id) setSelectedMessage(null);
    } catch {
      alert("Failed to delete message");
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;
    setReplySending(true);
    try {
      await api.post(`/contact/messages/${selectedMessage._id}/reply`, { replyText });
      setReplySuccess(true);
      setMessages(prev => prev.map(m =>
        m._id === selectedMessage._id
          ? { ...m, adminReply: replyText, repliedAt: new Date().toISOString(), status: "read" }
          : m
      ));
      setSelectedMessage(prev => ({ ...prev, adminReply: replyText, repliedAt: new Date().toISOString() }));
      setTimeout(() => { setReplySuccess(false); setShowReply(false); setReplyText(""); }, 2000);
    } catch {
      alert("Failed to send reply");
    } finally {
      setReplySending(false);
    }
  };

  /* ── Filter by tab + search ── */
  const filtered = messages.filter(m => {
    const matchTab = activeTab === "all" || m.source === activeTab;
    const term = searchTerm.toLowerCase();
    const matchSearch = !term ||
      (m.name || "").toLowerCase().includes(term) ||
      (m.email || "").toLowerCase().includes(term) ||
      (m.message || "").toLowerCase().includes(term) ||
      (m.subject || "").toLowerCase().includes(term);
    return matchTab && matchSearch;
  });

  const unreadCount = (src) =>
    messages.filter(m => m.status === "unread" && (src === "all" || m.source === src)).length;

  return (
    <div className="admin-page">
      <div className="admin-section-header">
        <div>
          <h1 className="admin-title">Messages & Mail</h1>
          <p className="admin-subtitle">Contact form messages and user suggestions</p>
        </div>
      </div>

      {/* Source Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "var(--admin-border)", padding: 4, borderRadius: 12, width: "fit-content", flexWrap: "wrap" }}>
        {SOURCE_TABS.map(tab => {
          const count = unreadCount(tab.id);
          return (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 16px", borderRadius: 9, border: "none", cursor: "pointer",
                fontWeight: 600, fontSize: ".8rem", transition: "all .15s",
                background: activeTab === tab.id ? "var(--admin-card)" : "transparent",
                color: activeTab === tab.id ? "var(--admin-accent)" : "var(--admin-muted)",
                boxShadow: activeTab === tab.id ? "0 2px 8px rgba(0,0,0,.08)" : "none",
              }}>
              {tab.icon} {tab.label}
              {count > 0 && (
                <span style={{ background: "#ef4444", color: "white", borderRadius: 99, padding: "1px 6px", fontSize: ".65rem", fontWeight: 800 }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="messages-layout">
        {/* Sidebar */}
        <div className="messages-list-card">
          <div className="search-box">
            <Search size={15}/>
            <input
              type="text"
              placeholder="Search messages…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="messages-scroll">
            {loading ? (
              <div className="loading-state">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">No messages found</div>
            ) : (
              filtered.map(m => (
                <div key={m._id}
                  className={`message-item ${m.status === "unread" ? "unread" : ""} ${selectedMessage?._id === m._id ? "selected" : ""}`}
                  onClick={() => { setSelectedMessage(m); setShowReply(false); setReplyText(""); if (m.status === "unread") markAsRead(m._id); }}>
                  <div className="message-item-header">
                    <span className="sender-name">{m.name}</span>
                    <span className="msg-time">{new Date(m.createdAt).toLocaleDateString()}</span>
                  </div>
                  {m.subject && (
                    <div style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--admin-accent)", marginBottom: 2 }}>
                      {m.subject}
                    </div>
                  )}
                  <div className="msg-preview">{m.message?.slice(0, 80)}{m.message?.length > 80 ? "…" : ""}</div>
                  <div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {sourceBadge(m.source)}
                    {categoryBadge(m.category)}
                    {m.adminReply && (
                      <span style={{ fontSize: ".62rem", fontWeight: 700, color: "#16a34a", background: "rgba(22,163,74,.1)", borderRadius: 99, padding: "1px 6px" }}>
                        ✓ Replied
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="message-detail-card">
          {selectedMessage ? (
            <div className="message-detail-view">
              <div className="detail-header">
                <div className="sender-info">
                  <div className="sender-avatar">{selectedMessage.name[0]?.toUpperCase()}</div>
                  <div>
                    <h2>{selectedMessage.name}</h2>
                    <p>{selectedMessage.email}</p>
                    {selectedMessage.userId && (
                      <span style={{ fontSize: ".72rem", color: "#4255ff", fontWeight: 700 }}>
                        <User size={10} style={{ marginRight: 3 }}/>Registered User
                      </span>
                    )}
                  </div>
                </div>
                <div className="detail-meta">
                  <div className="meta-item">
                    <Clock size={13}/>{" "}
                    {new Date(selectedMessage.createdAt).toLocaleString()}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                    {sourceBadge(selectedMessage.source)}
                    {categoryBadge(selectedMessage.category)}
                    {selectedMessage.status === "unread" && (
                      <span className="status-badge unread">New</span>
                    )}
                  </div>
                </div>
              </div>

              {selectedMessage.subject && (
                <div style={{ fontWeight: 800, fontSize: ".95rem", color: "var(--admin-text)", marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
                  <Tag size={14} color="var(--admin-accent)"/>
                  {selectedMessage.subject}
                </div>
              )}

              <div className="message-body">
                <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{selectedMessage.message}</p>
              </div>

              {/* Admin reply thread */}
              {selectedMessage.adminReply && (
                <div style={{
                  background: "linear-gradient(135deg,rgba(16,185,129,.06),rgba(6,182,212,.04))",
                  border: "1px solid rgba(16,185,129,.2)",
                  borderRadius: 12, padding: "14px 16px", marginTop: 16,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, fontSize: ".75rem", fontWeight: 800, color: "#16a34a" }}>
                    <Reply size={13}/> Admin Reply
                    {selectedMessage.repliedAt && (
                      <span style={{ color: "var(--admin-muted)", fontWeight: 500 }}>
                        · {new Date(selectedMessage.repliedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: ".85rem", color: "var(--admin-text)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {selectedMessage.adminReply}
                  </p>
                </div>
              )}

              {/* Reply Compose */}
              {showReply && (
                <div style={{
                  background: "var(--admin-bg,#f8fafc)", border: "1px solid var(--admin-border)",
                  borderRadius: 12, padding: 16, marginTop: 16,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: ".85rem", color: "var(--admin-text)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Reply size={14} color="var(--admin-accent)"/>Reply to {selectedMessage.name}
                    </span>
                    <button onClick={() => setShowReply(false)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--admin-muted)", padding: 4 }}>
                      <X size={15}/>
                    </button>
                  </div>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder={`Type your reply to ${selectedMessage.name}…`}
                    rows={4}
                    style={{
                      width: "100%", resize: "vertical", borderRadius: 10,
                      border: "1.5px solid var(--admin-border)", background: "var(--admin-card)",
                      color: "var(--admin-text)", fontSize: ".85rem", padding: "10px 12px",
                      fontFamily: "inherit", outline: "none", boxSizing: "border-box", lineHeight: 1.55,
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                    <button className="admin-btn secondary sm" onClick={() => { setShowReply(false); setReplyText(""); }}>
                      Cancel
                    </button>
                    <button className="admin-btn primary sm" onClick={handleReply}
                      disabled={replySending || !replyText.trim()}>
                      {replySuccess
                        ? <><CheckCircle size={13}/> Sent!</>
                        : replySending
                          ? "Sending…"
                          : <><Send size={13}/> Send Reply</>
                      }
                    </button>
                  </div>
                  <p style={{ fontSize: ".7rem", color: "var(--admin-muted)", margin: "8px 0 0" }}>
                    The user will receive an email notification and an in-app message.
                  </p>
                </div>
              )}

              <div className="detail-actions" style={{ marginTop: 16 }}>
                {!showReply && (
                  <button className="admin-btn primary" onClick={() => setShowReply(true)}>
                    <Reply size={14}/> Reply to User
                  </button>
                )}
                {selectedMessage.email && (
                  <a href={`mailto:${selectedMessage.email}`} className="admin-btn secondary">
                    <Mail size={14}/> Open in Email
                  </a>
                )}
                <button className="admin-btn secondary text-red" onClick={() => handleDelete(selectedMessage._id)}>
                  <Trash2 size={14}/> Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="no-selection">
              <Mail size={48} className="muted-icon"/>
              <p>Select a message to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
