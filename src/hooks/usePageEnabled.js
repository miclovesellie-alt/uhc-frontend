import { useState, useEffect } from "react";
import api from "../api/api";

/**
 * Returns { disabled: bool, loading: bool } for a given settings key.
 * Uses the public GET /settings/:key endpoint — no auth needed.
 * Result is cached in memory for the lifetime of the page.
 */
const cache = {};

export function usePageEnabled(key) {
  const [disabled, setDisabled] = useState(cache[key] ?? false);
  const [loading,  setLoading]  = useState(!(key in cache));

  useEffect(() => {
    if (key in cache) { setDisabled(cache[key]); setLoading(false); return; }
    api.get(`settings/${key}`)
      .then(r => {
        const val = r.data?.value ?? false;
        cache[key] = val;
        setDisabled(val);
      })
      .catch(() => { cache[key] = false; })
      .finally(() => setLoading(false));
  }, [key]);

  return { disabled, loading };
}

/** Drop-in maintenance screen rendered when a page is disabled */
export function MaintenanceScreen({ pageName }) {
  return (
    <div style={{
      minHeight: "60vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      padding: "60px 24px", gap: 16
    }}>
      <div style={{ fontSize: "4rem" }}>🔧</div>
      <h2 style={{ fontWeight: 800, fontSize: "1.4rem", color: "#0f172a", margin: 0 }}>
        {pageName} — Under Development
      </h2>
      <p style={{ color: "#64748b", maxWidth: 400, lineHeight: 1.7, margin: 0 }}>
        This section is temporarily unavailable while our team works on improvements.
        Please check back soon!
      </p>
      <div style={{
        padding: "10px 20px", background: "rgba(245,158,11,0.08)",
        border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10,
        fontSize: ".82rem", color: "#d97706", fontWeight: 600
      }}>
        ⚠️ Temporarily disabled by administrator
      </div>
    </div>
  );
}
