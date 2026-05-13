import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/api";

export default function VerifyEmail() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get("token");

  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setMessage("No verification token found in this link."); return; }

    api.get(`/auth/verify-email?token=${token}`)
      .then(r => {
        setStatus("success");
        setMessage(r.data.message || "Email verified successfully!");
        setTimeout(() => navigate("/login"), 3500);
      })
      .catch(e => {
        setStatus("error");
        setMessage(e.response?.data?.message || "Verification failed. The link may have expired.");
      });
  }, [token, navigate]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(at 0% 0%, hsla(161,71%,90%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(199,89%,92%,1) 0, transparent 50%), #f8fafc",
      fontFamily: "Inter, sans-serif", padding: "24px"
    }}>
      <div style={{
        background: "white", borderRadius: 24, padding: "48px 40px", maxWidth: 480, width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.08)", textAlign: "center", border: "1px solid #e2e8f0"
      }}>

        {/* Logo */}
        <div style={{ fontSize: "1.8rem", fontWeight: 900, marginBottom: 4,
          background: "linear-gradient(135deg,#10b981,#0ea5e9)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
        }}>UHC Academy</div>
        <div style={{ fontSize: "0.7rem", letterSpacing: 2, textTransform: "uppercase", color: "#94a3b8", marginBottom: 40 }}>
          Universal Health Community
        </div>

        {/* Loading */}
        {status === "loading" && (
          <>
            <div style={{ fontSize: "3rem", marginBottom: 16, animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
            <h2 style={{ color: "#0f172a", margin: "0 0 8px" }}>Verifying your email…</h2>
            <p style={{ color: "#64748b", margin: 0 }}>Please wait a moment.</p>
          </>
        )}

        {/* Success */}
        {status === "success" && (
          <>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(16,185,129,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 20px"
            }}>✅</div>
            <h2 style={{ color: "#0f172a", margin: "0 0 10px" }}>Email Verified!</h2>
            <p style={{ color: "#475569", margin: "0 0 28px" }}>{message}</p>
            <p style={{ color: "#94a3b8", fontSize: "0.82rem", margin: "0 0 24px" }}>Redirecting you to login in a moment…</p>
            <button
              onClick={() => navigate("/login")}
              style={{ padding: "12px 28px", background: "linear-gradient(135deg,#10b981,#0ea5e9)", color: "white",
                border: "none", borderRadius: 12, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}
            >
              Go to Login →
            </button>
          </>
        )}

        {/* Error */}
        {status === "error" && (
          <>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(239,68,68,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 20px"
            }}>❌</div>
            <h2 style={{ color: "#0f172a", margin: "0 0 10px" }}>Verification Failed</h2>
            <p style={{ color: "#64748b", margin: "0 0 28px" }}>{message}</p>
            <button
              onClick={() => navigate("/login")}
              style={{ padding: "12px 28px", background: "#f1f5f9", color: "#334155",
                border: "1px solid #e2e8f0", borderRadius: 12, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}
            >
              Back to Login
            </button>
          </>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
