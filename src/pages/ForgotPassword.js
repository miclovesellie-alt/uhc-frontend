import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import "../styles/auth.css";

const ForgotPassword = () => {
  const navigate  = useNavigate();
  const [email,   setEmail]   = useState("");
  const [message, setMessage] = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await api.post("auth/forgot-password", { email });
      setMessage(res.data.message || "Check your inbox for a reset link.");
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card-wrapper">
        <div className="auth-card">
          <button className="auth-back-btn" onClick={() => navigate("/auth")}>
            <span className="back-circle">←</span>
            <span className="back-label">Back to Login</span>
          </button>

          {/* Icon */}
          <div style={{ textAlign: "center", margin: "8px 0 20px" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", margin: "0 auto 12px",
              background: "linear-gradient(135deg,rgba(66,85,255,0.1),rgba(139,92,246,0.1))",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem"
            }}>🔐</div>
            <h1 className="auth-title" style={{ margin: 0 }}>
              {sent ? "Check Your Inbox" : "Forgot Password?"}
            </h1>
            <p className="auth-subtitle" style={{ margin: "6px 0 0" }}>
              {sent
                ? `We sent a reset link to ${email}`
                : "Enter your email and we'll send you a reset link instantly."}
            </p>
          </div>

          {message && <p className="success-text">{message}</p>}
          {error   && <p className="error-text">{error}</p>}

          {!sent ? (
            <form onSubmit={handleSubmit}>
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
            <div style={{ marginTop: 8 }}>
              {/* Resend */}
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
            </div>
          )}

          {/* Hint: spam folder */}
          {sent && (
            <p style={{ fontSize: "0.78rem", color: "#94a3b8", textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
              Didn't receive it? Check your spam folder.<br />
              The link expires in <strong>1 hour</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;