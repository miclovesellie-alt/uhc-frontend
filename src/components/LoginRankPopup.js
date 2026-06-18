import React, { useState, useEffect, useRef } from "react";
import { Trophy, TrendingUp, X, Flame, Star } from "lucide-react";

/* ──────────────────────────────────────────────────────────
   LoginRankPopup
   Shows once per session after login, slides up from bottom.
   Props:
     rank       {number}  — current leaderboard position
     overtook   {number}  — how many users were passed (0 = none)
     gainedPoint{boolean} — whether a point was earned this login
     streak     {number}  — current day streak
     points     {number}  — total points
     onClose    {fn}      — called when dismissed
     onLeaderboard {fn}   — navigate to leaderboard
────────────────────────────────────────────────────────── */

const MEDAL = ["🥇", "🥈", "🥉"];
const AUTO_DISMISS_MS = 8000;

function Particle({ delay, color }) {
  const angle = Math.random() * 360;
  const dist  = 40 + Math.random() * 80;
  const x     = Math.cos((angle * Math.PI) / 180) * dist;
  const y     = Math.sin((angle * Math.PI) / 180) * dist;
  return (
    <div style={{
      position: "absolute",
      top: "50%", left: "50%",
      width: 6, height: 6,
      borderRadius: "50%",
      background: color,
      animation: `particle ${0.8 + Math.random() * 0.4}s ease-out ${delay}s both`,
      "--x": `${x}px`, "--y": `${y}px`,
      opacity: 0,
    }}/>
  );
}

export default function LoginRankPopup({ rank, overtook, gainedPoint, streak, points, onClose, onLeaderboard }) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef(null);
  const rafRef   = useRef(null);
  const startRef = useRef(Date.now());

  const isOvertake  = overtook > 0;
  const isTopThree  = rank <= 3;

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
      setProgress(pct);
      if (pct > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        handleClose();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setVisible(false);
    timerRef.current = setTimeout(onClose, 450);
  };

  const particles = isOvertake
    ? Array.from({ length: 14 }, (_, i) => ({
        id: i,
        delay: i * 0.04,
        color: ["#f59e0b","#4255ff","#10b981","#ec4899","#8b5cf6"][i % 5],
      }))
    : [];

  return (
    <>
      <style>{`
        @keyframes rankSlideUp {
          from { transform: translateX(-50%) translateY(120px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);     opacity: 1; }
        }
        @keyframes rankSlideDown {
          from { transform: translateX(-50%) translateY(0);     opacity: 1; }
          to   { transform: translateX(-50%) translateY(120px); opacity: 0; }
        }
        @keyframes rankPulse {
          0%,100% { transform: scale(1);    box-shadow: 0 0 0 0   rgba(66,85,255,.4); }
          50%      { transform: scale(1.04); box-shadow: 0 0 0 12px rgba(66,85,255,.0); }
        }
        @keyframes particle {
          0%   { opacity: 1; transform: translate(0,0) scale(1); }
          100% { opacity: 0; transform: translate(var(--x), var(--y)) scale(0); }
        }
        @keyframes overtakeBadge {
          0%   { transform: scale(0) rotate(-8deg); opacity: 0; }
          60%  { transform: scale(1.1) rotate(2deg); opacity: 1; }
          100% { transform: scale(1)   rotate(0);   opacity: 1; }
        }
        @keyframes trophySpin {
          0%   { transform: rotate(-15deg) scale(1); }
          50%  { transform: rotate(15deg)  scale(1.15); }
          100% { transform: rotate(-15deg) scale(1); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
      `}</style>

      <div style={{
        position: "fixed",
        bottom: 90, left: "50%",
        zIndex: 99999,
        width: "calc(100% - 32px)",
        maxWidth: 380,
        animation: `${visible ? "rankSlideUp" : "rankSlideDown"} .45s cubic-bezier(.34,1.56,.64,1) both`,
      }}>
        {/* ── Card ── */}
        <div style={{
          background: isOvertake
            ? "linear-gradient(135deg,rgba(245,158,11,.95),rgba(239,68,68,.92))"
            : isTopThree
            ? "linear-gradient(135deg,rgba(66,85,255,.97),rgba(139,92,246,.95))"
            : "linear-gradient(135deg,rgba(30,41,59,.97),rgba(51,65,85,.95))",
          backdropFilter: "blur(24px)",
          borderRadius: 22,
          padding: "20px 20px 16px",
          boxShadow: isOvertake
            ? "0 24px 60px rgba(245,158,11,.45), 0 0 0 1.5px rgba(255,255,255,.15)"
            : "0 24px 60px rgba(66,85,255,.4), 0 0 0 1.5px rgba(255,255,255,.12)",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}>

          {/* Particles on overtake */}
          {particles.map(p => <Particle key={p.id} delay={p.delay} color={p.color}/>)}

          {/* Background shine */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: 22,
            background: "linear-gradient(135deg,rgba(255,255,255,.08),transparent 60%)",
            pointerEvents: "none",
          }}/>

          {/* Close button */}
          <button onClick={handleClose} style={{
            position: "absolute", top: 12, right: 12,
            background: "rgba(255,255,255,.15)", border: "none",
            borderRadius: 8, width: 28, height: 28,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "white",
          }}>
            <X size={14}/>
          </button>

          {/* ── Content ── */}
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>

            {/* Trophy / icon */}
            <div style={{
              width: 56, height: 56, borderRadius: 16, flexShrink: 0,
              background: "rgba(255,255,255,.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.8rem",
              animation: isOvertake ? "trophySpin 1.5s ease-in-out infinite" : "rankPulse 2s ease infinite",
            }}>
              {isOvertake ? "⚡" : isTopThree ? MEDAL[rank - 1] : "🏆"}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {isOvertake ? (
                <>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: "rgba(255,255,255,.25)", borderRadius: 8,
                    padding: "3px 10px", fontSize: ".7rem", fontWeight: 800,
                    letterSpacing: ".5px", marginBottom: 6,
                    animation: "overtakeBadge .5s cubic-bezier(.34,1.56,.64,1) .2s both",
                  }}>
                    <TrendingUp size={11}/> YOU MOVED UP!
                  </div>
                  <div style={{ fontWeight: 900, fontSize: "1.1rem", lineHeight: 1.2, marginBottom: 3 }}>
                    Overtook {overtook} {overtook === 1 ? "player" : "players"}! 🔥
                  </div>
                  <div style={{ fontSize: ".82rem", opacity: .85 }}>
                    You're now ranked <strong>#{rank}</strong> on the leaderboard
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: ".72rem", fontWeight: 700, opacity: .7, marginBottom: 4, letterSpacing: ".5px" }}>
                    WELCOME BACK
                  </div>
                  <div style={{ fontWeight: 900, fontSize: "1.55rem", lineHeight: 1, marginBottom: 4 }}>
                    #{rank}
                    {isTopThree && <span style={{ fontSize: ".85rem", marginLeft: 6, opacity: .9 }}>on the leaderboard</span>}
                  </div>
                  <div style={{ fontSize: ".82rem", opacity: .8 }}>
                    {isTopThree ? "You're in the top 3 — keep it up!" : "Your current leaderboard position"}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            display: "flex", gap: 8, marginTop: 14,
            borderTop: "1px solid rgba(255,255,255,.15)", paddingTop: 12,
          }}>
            {gainedPoint && (
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontWeight: 800, fontSize: ".82rem" }}>
                  <Star size={12}/> {points} pts
                </div>
                <div style={{ fontSize: ".62rem", opacity: .65, marginTop: 1 }}>+1 today</div>
              </div>
            )}
            {streak > 0 && (
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontWeight: 800, fontSize: ".82rem" }}>
                  <Flame size={12}/> {streak}d streak
                </div>
                <div style={{ fontSize: ".62rem", opacity: .65, marginTop: 1 }}>🔥 Keep going</div>
              </div>
            )}
            <button onClick={() => { handleClose(); onLeaderboard(); }} style={{
              flex: 1.5, padding: "8px 0",
              background: "rgba(255,255,255,.2)",
              border: "1px solid rgba(255,255,255,.25)",
              borderRadius: 10, color: "white",
              fontWeight: 700, fontSize: ".76rem",
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", gap: 5,
              transition: "background .15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.3)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.2)"}
            >
              <Trophy size={12}/> View Board
            </button>
          </div>

          {/* Progress bar */}
          <div style={{
            marginTop: 10, height: 3, borderRadius: 99,
            background: "rgba(255,255,255,.15)", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 99,
              width: `${progress}%`,
              background: "rgba(255,255,255,.5)",
              transition: "width .1s linear",
            }}/>
          </div>
        </div>
      </div>
    </>
  );
}
