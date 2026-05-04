import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Trophy, RotateCcw, Trash2 } from "lucide-react";

export default function QuizHistory() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const histKey = `quizHistory_${userId}`;
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(histKey) || "[]")); } catch { setHistory([]); }
  }, [histKey]);

  const clearHistory = () => {
    if (window.confirm("Clear all quiz history?")) {
      localStorage.removeItem(histKey);
      setHistory([]);
    }
  };

  const gradeColor = (pct) => pct >= 70 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";
  const gradeLabel = (pct) => pct >= 90 ? "Excellent" : pct >= 70 ? "Great" : pct >= 50 ? "OK" : "Retry";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize:"1.5rem", fontWeight: 800, margin: 0 }}>📋 Quiz History</h1>
          <p style={{ color:"var(--text-muted)", fontSize:".8rem", marginTop: 4 }}>Your last {history.length} quizzes</p>
        </div>
        <div style={{ display:"flex", gap: 8 }}>
          <button onClick={() => navigate("/quiz")} style={{ display:"flex", alignItems:"center", gap: 6, padding:"8px 14px", borderRadius: 10, border:"1px solid var(--border, #e2e8f0)", background:"var(--card-bg,#fff)", color:"var(--text,#0f172a)", fontWeight: 600, fontSize:".82rem", cursor:"pointer" }}>
            <RotateCcw size={14} /> New Quiz
          </button>
          {history.length > 0 && (
            <button onClick={clearHistory} style={{ display:"flex", alignItems:"center", gap: 6, padding:"8px 12px", borderRadius: 10, border:"1px solid #fecaca", background:"#fef2f2", color:"#dc2626", fontWeight: 600, fontSize:".82rem", cursor:"pointer" }}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div style={{ textAlign:"center", padding: 60 }}>
          <BookOpen size={48} style={{ opacity:.2, marginBottom: 12 }} />
          <p style={{ color:"var(--text-muted)" }}>No quizzes completed yet. Start one to track your progress!</p>
          <button onClick={() => navigate("/quiz")} style={{ marginTop: 16, padding:"10px 24px", borderRadius: 12, background:"#4255ff", color:"white", fontWeight: 700, border:"none", cursor:"pointer" }}>Start a Quiz</button>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label:"Quizzes", val: history.length, icon:"📝" },
              { label:"Avg Score", val: `${Math.round(history.reduce((s,h) => s + h.pct, 0) / history.length)}%`, icon:"📊" },
              { label:"Best Streak", val: Math.max(...history.map(h => h.bestStreak || 0)), icon:"🔥" },
            ].map(s => (
              <div key={s.label} style={{ padding:"12px 14px", borderRadius: 14, background:"var(--card-bg,#fff)", border:"1px solid var(--border,#e2e8f0)", textAlign:"center" }}>
                <div style={{ fontSize:"1.4rem" }}>{s.icon}</div>
                <div style={{ fontWeight: 800, fontSize:"1.1rem" }}>{s.val}</div>
                <div style={{ fontSize:".72rem", color:"var(--text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
            {history.map((h, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap: 14, padding:"14px 16px", borderRadius: 14, background:"var(--card-bg,#fff)", border:"1px solid var(--border,#e2e8f0)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background:`${gradeColor(h.pct)}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink: 0 }}>
                  <Trophy size={20} color={gradeColor(h.pct)} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize:".875rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h.course}</div>
                  <div style={{ fontSize:".72rem", color:"var(--text-muted)" }}>{new Date(h.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontWeight: 800, fontSize:".95rem", color: gradeColor(h.pct) }}>{h.pct}%</div>
                  <div style={{ fontSize:".7rem", color:"var(--text-muted)" }}>{h.score}/{h.total} · {gradeLabel(h.pct)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
