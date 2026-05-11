import { useState, useEffect } from "react";
import api from "../api/api";

/**
 * Returns { disabled: bool, loading: bool } for a given settings key.
 * Uses the public GET /settings/:key endpoint — no auth needed.
 *
 * Pass bypass=true (e.g. for admin users) to skip the check entirely.
 * No in-memory cache — always fetches fresh so toggles take effect immediately.
 */
export function usePageEnabled(key, bypass = false) {
  const [disabled, setDisabled] = useState(false);
  const [loading,  setLoading]  = useState(!bypass);

  useEffect(() => {
    if (bypass) { setDisabled(false); setLoading(false); return; }
    api.get(`settings/${key}`)
      .then(r  => setDisabled(r.data?.value ?? false))
      .catch(() => setDisabled(false))
      .finally(() => setLoading(false));
  }, [key, bypass]);

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
