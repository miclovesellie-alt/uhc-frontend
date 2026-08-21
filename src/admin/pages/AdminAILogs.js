import React, { useState, useEffect } from "react";
import { Sparkles, Bot, Zap, MessageSquare, BookOpen, RefreshCw, Search, ShieldAlert, CheckCircle2 } from "lucide-react";
import api from "../../api/api";

export default function AdminAILogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get("ai/questions");
      if (res.data && res.data.success) {
        setLogs(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch AI logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const qText = (log.question || "").toLowerCase();
    const rText = (log.response || "").toLowerCase();
    const matchesSearch = qText.includes(search.toLowerCase()) || rText.includes(search.toLowerCase());
    const matchesType = filterType === "all" || log.type === filterType;
    return matchesSearch && matchesType;
  });

  const chatCount = logs.filter(l => l.type === "chat" || !l.type).length;
  const explCount = logs.filter(l => l.type === "explanation").length;
  const adminCount = logs.filter(l => ["shorten", "similar", "from_notes"].includes(l.type)).length;

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "var(--admin-text)", display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles color="#6366f1" size={24} />
            AI Activity Logs & Analytics
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--admin-muted)", margin: "4px 0 0" }}>
            Monitor real-time AI questions, quiz explanations, credit usage, and admin generation requests.
          </p>
        </div>

        <button
          className="admin-btn secondary sm"
          onClick={fetchLogs}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Logs
        </button>
      </div>

      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 16, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--admin-muted)", fontWeight: 600 }}>TOTAL AI QUERIES</span>
            <Bot size={18} color="#6366f1" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--admin-text)" }}>{logs.length}</div>
          <div style={{ fontSize: "0.75rem", color: "#16a34a", marginTop: 4 }}>Live user & system activity</div>
        </div>

        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 16, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--admin-muted)", fontWeight: 600 }}>CHAT ASSISTANT</span>
            <MessageSquare size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--admin-text)" }}>{chatCount}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--admin-muted)", marginTop: 4 }}>Floating Assistant chats</div>
        </div>

        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 16, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--admin-muted)", fontWeight: 600 }}>QUIZ EXPLANATIONS</span>
            <Zap size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--admin-text)" }}>{explCount}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--admin-muted)", marginTop: 4 }}>"Why option X" requests</div>
        </div>

        <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 16, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--admin-muted)", fontWeight: 600 }}>ADMIN TRANSFORMATIONS</span>
            <BookOpen size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--admin-text)" }}>{adminCount}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--admin-muted)", marginTop: 4 }}>Option shorteners & Notes MCQs</div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--admin-muted)" }} />
          <input
            type="text"
            placeholder="Search AI questions or responses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input"
            style={{ width: "100%", paddingLeft: 36, boxSizing: "border-box" }}
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="admin-input"
          style={{ width: 180 }}
        >
          <option value="all">All Event Types</option>
          <option value="chat">Floating Chat</option>
          <option value="explanation">Quiz Explanation</option>
          <option value="shorten">Option Shortener</option>
          <option value="from_notes">From Study Notes</option>
        </select>
      </div>

      {/* Logs Table */}
      <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--admin-border)" }}>
              <th style={{ padding: "12px 16px", color: "var(--admin-muted)", fontWeight: 600 }}>TIME</th>
              <th style={{ padding: "12px 16px", color: "var(--admin-muted)", fontWeight: 600 }}>TYPE</th>
              <th style={{ padding: "12px 16px", color: "var(--admin-muted)", fontWeight: 600 }}>PROMPT / QUESTION</th>
              <th style={{ padding: "12px 16px", color: "var(--admin-muted)", fontWeight: 600 }}>AI RESPONSE PREVIEW</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--admin-muted)" }}>
                  Loading AI log activity...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--admin-muted)" }}>
                  No AI activity recorded matching filter criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log._id} style={{ borderBottom: "1px solid var(--admin-border)" }}>
                  <td style={{ padding: "12px 16px", whiteSpace: "nowrap", color: "var(--admin-muted)", fontSize: "0.78rem" }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>

                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 12,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background:
                          log.type === "explanation"
                            ? "#fef3c7"
                            : log.type === "shorten"
                            ? "#dcfce7"
                            : "#e0e7ff",
                        color:
                          log.type === "explanation"
                            ? "#b45309"
                            : log.type === "shorten"
                            ? "#15803d"
                            : "#3730a3"
                      }}
                    >
                      {log.type || "chat"}
                    </span>
                  </td>

                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--admin-text)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.question}
                  </td>

                  <td style={{ padding: "12px 16px", color: "var(--admin-muted)", maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.response || "No response recorded"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
