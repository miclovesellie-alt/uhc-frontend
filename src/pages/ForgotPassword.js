import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import "../styles/auth.css";

const ForgotPassword = () => {
  const navigate = useNavigate();

  // "email" = default email-link flow  |  "manual" = admin contact form
  const [mode, setMode] = useState("email");

  // Shared
  const [loading,   setLoading]   = useState(false);
  const [message,   setMessage]   = useState("");
  const [error,     setError]     = useState("");

  // Email-link flow
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // Manual flow
  const [manualData,      setManualData]      = useState({ name: "", email: "", username: "" });
  const [manualSubmitted, setManualSubmitted] = useState(false);

  const reset = () => {
    setMessage(""); setError("");
    setEmailSent(false); setManualSubmitted(false);
    setEmail(""); setManualData({ name: "", email: "", username: "" });
  };

  /* ── Email link submit ── */
  const handleEmailReset = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage(""); setError("");
    try {
      const res = await api.post("auth/forgot-password", { email });
      setMessage(res.data.message || "Check your inbox for a reset link.");
      setEmailSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  /* ── Manual request submit ── */
  const handleManual = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage(""); setError("");
    try {
      const res = await api.post("auth/manual-reset-request", manualData);
      setMessage(res.data.message || "Request sent to admin.");
      setManualSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card-wrapper">
        <div className="auth-card">

          {/* ── Back button ── */}
          <button
            className="auth-back-btn"
            onClick={() => { if (mode === "manual") { setMode("email"); reset(); } else navigate("/auth"); }}
          >
            <span className="back-circle">←</span>
            <span className="back-label">{mode === "manual" ? "Back" : "Back to Login"}</span>
          </button>

          {/* ══════════════════════════════════
              MODE: EMAIL LINK (DEFAULT)
          ══════════════════════════════════ */}
          {mode === "email" && (
            <>
              <div style={{ textAlign: "center", margin: "8px 0 20px" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%", margin: "0 auto 12px",
                  background: "linear-gradient(135deg,rgba(66,85,255,0.1),rgba(139,92,246,0.1))",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem"
                }}>🔐</div>
                <h1 className="auth-title" style={{ margin: 0 }}>
                  {emailSent ? "Check Your Inbox" : "Forgot Password?"}
                </h1>
                <p className="auth-subtitle" style={{ margin: "6px 0 0" }}>
                  {emailSent
                    ? `We sent a reset link to ${email}`
                    : "Enter your email and we'll send you a reset link instantly."}
                </p>
              </div>

              {message && <p className="success-text">{message}</p>}
              {error   && <p className="error-text">{error}</p>}

              {!emailSent ? (
                <form onSubmit={handleEmailReset}>
                  <label className="input-label">Email Address</label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="auth-button"
                    disabled={loading}
                    style={{ marginTop: 20 }}
                  >
                    {loading ? "Sending…" : "Send Reset Link →"}
                  </button>
                </form>
              ) : (
                <>
                  <button
                    className="auth-button"
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true); setError(""); setMessage("");
                      try {
                        const r = await api.post("auth/forgot-password", { email });
                        setMessage(r.data.message || "New link sent!");
                      } catch { setError("Failed to resend. Try again."); }
                      finally { setLoading(false); }
                    }}
                  >
                    {loading ? "Sending…" : "Resend Reset Email"}
                  </button>
                  <button
                    className="auth-button-secondary"
                    style={{ marginTop: 10 }}
                    onClick={() => navigate("/auth")}
                  >
                    ← Back to Login
                  </button>
                  <p style={{ fontSize: "0.78rem", color: "#94a3b8", textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
                    Didn't receive it? Check your <strong>spam folder</strong>.<br />
                    The link expires in <strong>1 hour</strong>.
                  </p>
                </>
              )}

              {/* ── Manual fallback ── */}
              {!emailSent && (
                <div style={{ marginTop: 24, textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => { setMode("manual"); reset(); }}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: "0.8rem", color: "#94a3b8", textDecoration: "underline",
                      fontWeight: 600,
                    }}
                  >
                    Can't access your email? Request a manual reset
                  </button>
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════
              MODE: MANUAL ADMIN REQUEST
          ══════════════════════════════════ */}
          {mode === "manual" && (
            <>
              <div style={{ textAlign: "center", margin: "8px 0 16px" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%", margin: "0 auto 12px",
                  background: "rgba(245,158,11,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem"
                }}>📋</div>
                <h1 className="auth-title" style={{ margin: 0 }}>
                  {manualSubmitted ? "Request Received" : "Manual Reset Request"}
                </h1>
                <p className="auth-subtitle" style={{ margin: "6px 0 0" }}>
                  {manualSubmitted
                    ? "An admin will contact you to verify your identity."
                    : "Fill in your details and an admin will reset your password."}
                </p>
              </div>

              {/* ⚠️ Caution notice */}
              {!manualSubmitted && (
                <div style={{
                  background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 12,
                  padding: "12px 16px", marginBottom: 18, display: "flex", gap: 10, alignItems: "flex-start"
                }}>
                  <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: 1 }}>⚠️</span>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#92400e", lineHeight: 1.5 }}>
                    <strong>This may take a long time.</strong> Manual resets require admin review and identity
                    verification. If possible, use the <button
                      type="button"
                      onClick={() => { setMode("email"); reset(); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#b45309", fontWeight: 700, fontSize: "0.8rem", padding: 0, textDecoration: "underline" }}
                    >email reset link instead</button>.
                  </p>
                </div>
              )}

              {message && <p className="success-text">{message}</p>}
              {error   && <p className="error-text">{error}</p>}

              {!manualSubmitted ? (
                <form onSubmit={handleManual}>
                  <label className="input-label">Full Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={manualData.name}
                    onChange={(e) => setManualData({ ...manualData, name: e.target.value })}
                    required
                  />
                  <label className="input-label">Email Address</label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={manualData.email}
                    onChange={(e) => setManualData({ ...manualData, email: e.target.value })}
                    required
                  />
                  <label className="input-label">Username / Phone Number</label>
                  <input
                    type="text"
                    placeholder="Enter your username or phone number"
                    value={manualData.username}
                    onChange={(e) => setManualData({ ...manualData, username: e.target.value })}
                    required
                  />
                  <button
                    type="submit"
                    className="auth-button"
                    disabled={loading}
                    style={{ marginTop: 16 }}
                  >
                    {loading ? "Sending Request…" : "Submit Reset Request →"}
                  </button>
                </form>
              ) : (
                <button
                  className="auth-button-secondary"
                  style={{ marginTop: 16 }}
                  onClick={() => navigate("/auth")}
                >
                  Return to Login
                </button>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;