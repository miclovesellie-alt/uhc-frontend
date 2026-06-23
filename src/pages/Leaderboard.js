import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import api from "../api/api";
import { Flame, Star, Search, Trophy, X, ChevronUp } from "lucide-react";

const medal = ["🥇", "🥈", "🥉"];
const ROW_HEIGHT = 68;
const VISIBLE_BUFFER = 5;

/* ─── Virtual inner list (attaches to an external scroll container) ─── */
function VirtualListInner({ items, renderItem, scrollEl }) {
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const el = scrollEl;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollEl]);

  const containerHeight = scrollEl?.clientHeight || 520;
  const totalHeight = items.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VISIBLE_BUFFER);
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + VISIBLE_BUFFER * 2;
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  return (
    <div style={{ height: totalHeight, position: "relative" }}>
      {items.slice(startIndex, endIndex).map((item, relIdx) => {
        const absIdx = startIndex + relIdx;
        return (
          <div
            key={item._id}
            style={{
              position: "absolute",
              top: absIdx * ROW_HEIGHT,
              left: 0,
              right: 0,
              height: ROW_HEIGHT,
              padding: "4px 0",
            }}
          >
            {renderItem(item, absIdx)}
          </div>
        );
      })}
    </div>
  );
}

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [highlightId, setHighlightId] = useState(null);
  const [scrollEl, setScrollEl] = useState(null);
  const myId = localStorage.getItem("userId");

  useEffect(() => {
    api
      .get("social/leaderboard")
      .then((r) => { setUsers(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  /* My rank in the full list */
  const myRank = useMemo(() => {
    const idx = users.findIndex((u) => u._id === myId);
    return idx === -1 ? null : idx + 1;
  }, [users, myId]);

  /* Filtered list */
  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.category?.toLowerCase().includes(q) ||
        u.country?.toLowerCase().includes(q)
    );
  }, [users, search]);

  /* Scroll to my position in full list */
  const scrollToMe = useCallback(() => {
    if (!myId || !scrollEl) return;
    const myIdx = users.findIndex((u) => u._id === myId);
    if (myIdx === -1) return;
    setSearch("");
    setHighlightId(myId);
    setTimeout(() => {
      if (scrollEl) {
        scrollEl.scrollTop = Math.max(0, myIdx * ROW_HEIGHT - 200);
      }
      setTimeout(() => setHighlightId(null), 2500);
    }, 60);
  }, [myId, users, scrollEl]);

  const renderRow = useCallback(
    (u, absIdx) => {
      const isMe = u._id === myId;
      const isHighlighted = u._id === highlightId;
      const rank = absIdx + 1;
      const isMedal = rank <= 3;

      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "10px 16px",
            height: ROW_HEIGHT - 12,
            borderRadius: 16,
            background: isHighlighted
              ? "rgba(66,85,255,0.18)"
              : isMe
              ? "rgba(66,85,255,0.08)"
              : "var(--card-bg, #fff)",
            border: isHighlighted
              ? "2px solid #4255ff"
              : isMe
              ? "2px solid rgba(66,85,255,0.3)"
              : "1px solid var(--border, #e2e8f0)",
            boxShadow: isMedal ? "0 4px 16px rgba(0,0,0,0.07)" : "none",
            transition: "background .3s, border .3s",
            boxSizing: "border-box",
          }}
        >
          {/* Rank */}
          <div
            style={{
              width: 40,
              textAlign: "center",
              flexShrink: 0,
              fontSize: isMedal ? "1.3rem" : ".85rem",
              fontWeight: 800,
              color: isMedal ? undefined : "var(--text-muted)",
            }}
          >
            {isMedal ? medal[rank - 1] : `#${rank}`}
          </div>

          {/* Avatar */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: `hsl(${((u.name?.charCodeAt(0) || 65) * 11) % 360},65%,55%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 800,
              fontSize: ".95rem",
              flexShrink: 0,
            }}
          >
            {u.name?.[0]?.toUpperCase()}
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: ".875rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {u.name}{" "}
              {isMe && (
                <span style={{ fontSize: ".68rem", color: "#4255ff", fontWeight: 700 }}>
                  (You)
                </span>
              )}
            </div>
            <div style={{ fontSize: ".72rem", color: "var(--text-muted)", marginTop: 1 }}>
              {[u.category, u.country].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>

          {/* Points + streak */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 800, color: "#4255ff", fontSize: ".9rem" }}>
              <Star size={12} fill="#4255ff" />
              {u.points?.toLocaleString() ?? 0}
            </div>
            {u.streak > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: ".68rem", color: "#f59e0b", fontWeight: 600 }}>
                <Flame size={10} />
                {u.streak}d
              </div>
            )}
          </div>
        </div>
      );
    },
    [myId, highlightId]
  );

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
        <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
        Loading leaderboard…
      </div>
    );
  }

  const isSearching = search.trim().length > 0;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: "2.8rem", marginBottom: 8 }}>🏆</div>
        <h1 style={{ fontSize: "1.7rem", fontWeight: 800, margin: 0 }}>Leaderboard</h1>
        <p style={{ color: "var(--text-muted)", fontSize: ".85rem", marginTop: 4 }}>
          {users.length.toLocaleString()} students ranked by points
        </p>
      </div>

      {/* My Rank Banner */}
      {myId && myRank && (
        <div
          onClick={scrollToMe}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 18px",
            borderRadius: 14,
            background: "linear-gradient(135deg, rgba(66,85,255,0.12), rgba(139,92,246,0.1))",
            border: "1.5px solid rgba(66,85,255,0.3)",
            cursor: "pointer",
            marginBottom: 16,
            transition: "box-shadow .2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 18px rgba(66,85,255,0.18)")}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
        >
          <Trophy size={18} color="#4255ff" />
          <span style={{ fontWeight: 700, fontSize: ".875rem", flex: 1 }}>
            Your rank:{" "}
            <span style={{ color: "#4255ff", fontSize: "1rem" }}>#{myRank}</span>{" "}
            out of {users.length.toLocaleString()}
          </span>
          <span style={{ fontSize: ".72rem", color: "#4255ff", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <ChevronUp size={13} /> Jump to me
          </span>
        </div>
      )}

      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search
          size={15}
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, category, or country…"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "11px 40px",
            borderRadius: 12,
            border: "1.5px solid var(--border, #e2e8f0)",
            background: "var(--card-bg, #fff)",
            fontSize: ".875rem",
            outline: "none",
            color: "var(--text)",
            transition: "border-color .2s, box-shadow .2s",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#4255ff";
            e.target.style.boxShadow = "0 0 0 3px rgba(66,85,255,0.1)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border, #e2e8f0)";
            e.target.style.boxShadow = "none";
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Result count while searching */}
      {isSearching && (
        <div style={{ fontSize: ".78rem", color: "var(--text-muted)", marginBottom: 10, paddingLeft: 2 }}>
          {filtered.length === 0
            ? "No results"
            : `${filtered.length} result${filtered.length === 1 ? "" : "s"}`}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 50, color: "var(--text-muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>🔍</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No users found</div>
          <div style={{ fontSize: ".8rem" }}>Try a different name or category</div>
        </div>
      ) : isSearching ? (
        /* Search results — plain list, show real rank from full list */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((u) => {
            const fullRank = users.findIndex((x) => x._id === u._id);
            return (
              <div key={u._id}>
                {renderRow(u, fullRank)}
              </div>
            );
          })}
        </div>
      ) : (
        /* Full list — virtualized scroll container */
        <div
          ref={setScrollEl}
          style={{
            height: Math.min(filtered.length * ROW_HEIGHT, 520),
            overflowY: "auto",
            position: "relative",
          }}
        >
          {scrollEl && (
            <VirtualListInner items={filtered} renderItem={renderRow} scrollEl={scrollEl} />
          )}
        </div>
      )}
    </div>
  );
}
