import React, { useState, useEffect } from "react";
import api from "../api/api";
import { Flame, Star } from "lucide-react";

const medal = ["🥇","🥈","🥉"];

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const myId = localStorage.getItem("userId");

  useEffect(() => {
    api.get("social/leaderboard").then(r => { setUsers(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign:"center", padding: 60, color:"var(--text-muted)" }}>Loading leaderboard…</div>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ textAlign:"center", marginBottom: 28 }}>
        <div style={{ fontSize:"2.5rem", marginBottom: 8 }}>🏆</div>
        <h1 style={{ fontSize:"1.6rem", fontWeight: 800, margin: 0 }}>Leaderboard</h1>
        <p style={{ color:"var(--text-muted)", fontSize:".875rem", marginTop: 4 }}>Top students by points</p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
        {users.map((u, i) => {
          const isMe = u._id === myId;
          return (
            <div key={u._id} style={{
              display:"flex", alignItems:"center", gap: 14, padding:"14px 18px", borderRadius: 16,
              background: isMe ? "rgba(66,85,255,0.08)" : "var(--card-bg, #fff)",
              border: isMe ? "2px solid rgba(66,85,255,0.3)" : "1px solid var(--border, #e2e8f0)",
              boxShadow: i < 3 ? "0 4px 16px rgba(0,0,0,0.06)" : "none",
              transition: "transform .15s",
            }}>
              <div style={{ width: 36, textAlign:"center", fontSize: i < 3 ? "1.4rem" : ".95rem", fontWeight: 800, color: i < 3 ? undefined : "var(--text-muted)" }}>
                {i < 3 ? medal[i] : `#${i + 1}`}
              </div>
              <div style={{ width: 38, height: 38, borderRadius:"50%", background: `hsl(${(u.name?.charCodeAt(0) || 65) * 11 % 360},65%,55%)`, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight: 800, fontSize:"1rem", flexShrink: 0 }}>
                {u.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize:".9rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {u.name} {isMe && <span style={{ fontSize:".7rem", color:"#4255ff", fontWeight: 600 }}>(You)</span>}
                </div>
                <div style={{ fontSize:".75rem", color:"var(--text-muted)" }}>{u.category} · {u.country}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap: 3 }}>
                <div style={{ display:"flex", alignItems:"center", gap: 4, fontWeight: 800, color:"#4255ff", fontSize:".95rem" }}>
                  <Star size={13} fill="#4255ff" /> {u.points?.toLocaleString()}
                </div>
                {u.streak > 0 && (
                  <div style={{ display:"flex", alignItems:"center", gap: 3, fontSize:".72rem", color:"#f59e0b", fontWeight: 600 }}>
                    <Flame size={11} /> {u.streak}d streak
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {users.length === 0 && (
          <div style={{ textAlign:"center", padding: 40, color:"var(--text-muted)" }}>No data yet. Complete quizzes to earn points!</div>
        )}
      </div>
    </div>
  );
}
