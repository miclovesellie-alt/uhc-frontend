import React, { useEffect, useContext, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UserContext } from "../context/UserContext";

/**
 * GoogleAuthCallback
 * ------------------
 * The backend redirects here after successful Google OAuth with:
 *   ?token=<jwt>&user=<urlencoded-json>
 *
 * This page reads those params, saves them to localStorage, sets
 * the app context, and forwards the user to their dashboard.
 */
function GoogleAuthCallback() {
  const navigate        = useNavigate();
  const [params]        = useSearchParams();
  const { setUser }     = useContext(UserContext);
  const processed       = useRef(false); // prevent double-run in strict mode

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const token     = params.get("token");
    const userRaw   = params.get("user");
    const error     = params.get("error");

    if (error || !token || !userRaw) {
      // Something went wrong — send back to auth page with a readable message
      navigate("/auth?googleError=1", { replace: true });
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userRaw));

      localStorage.setItem("token",  token);
      localStorage.setItem("user",   JSON.stringify(user));
      localStorage.setItem("userId", user._id);
      setUser(user);

      const dest =
        user.role === "admin" || user.role === "superadmin"
          ? "/admin"
          : "/dashboard";

      navigate(dest, { replace: true });
    } catch {
      navigate("/auth?googleError=1", { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      fontFamily: "Inter, sans-serif",
      background: "radial-gradient(at 0% 0%, hsla(161,71%,90%,1) 0, transparent 50%), #f8fafc",
    }}>
      {/* Spinner */}
      <div style={{
        width: 48, height: 48,
        border: "4px solid #e2e8f0",
        borderTop: "4px solid #10b981",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ color: "#64748b", fontSize: "0.9rem", fontWeight: 500 }}>
        Signing you in with Google…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default GoogleAuthCallback;
