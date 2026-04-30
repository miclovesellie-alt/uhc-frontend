import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import "../styles/auth.css";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sendingManual, setSendingManual] = useState(false);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const response = await api.post("auth/forgot-password", { email });
      setMessage(response.data.message || "If this email exists, a reset code has been sent.");
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.message || "Something went wrong. Please try again later."
      );
    }
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const response = await api.post("auth/reset-password", { email, otp, newPassword });
      setMessage(response.data.message || "Password reset successful! Redirecting to login...");
      setStep(3); // success state
      setTimeout(() => navigate("/auth"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password. Please check your code.");
    }
  };

  const handleManualRequest = async () => {
    if (!email) {
      setError("Please enter your email first so we know who you are.");
      return;
    }
    setSendingManual(true);
    setMessage("");
    setError("");

    try {
      await api.post("contact", {
        name: "Manual Password Reset Request",
        email: email,
        message: `Hello Admin, I am having trouble resetting my password via email. Please reset my password manually. My email is: ${email}`
      });
      setMessage("Your request has been sent to the Admin. They will contact you shortly.");
    } catch (err) {
      setError("Failed to send request. Please try again later.");
    } finally {
      setSendingManual(false);
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

          <h1 className="auth-title">Forgot Password</h1>
          <p className="auth-subtitle">
            {step === 1 ? "Enter your email and we'll send you a 6-digit reset code" : "Enter the 6-digit code and your new password"}
          </p>

          {message && <p className="success-text">{message}</p>}
          {error && <p className="error-text">{error}</p>}

          {step === 1 && (
            <form onSubmit={handleRequestCode}>
              <label className="input-label">Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <button type="submit" className="auth-button">
                Send Reset Code &nbsp;→
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyAndReset}>
              <label className="input-label">6-Digit Code</label>
              <input
                type="text"
                name="otp"
                placeholder="123456"
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                style={{ fontSize: "24px", letterSpacing: "12px", textAlign: "center", fontWeight: "bold", padding: "12px" }}
              />

              <label className="input-label">New Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  placeholder="Create new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <span className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? "🙈" : "👁️"}
                </span>
              </div>

              <label className="input-label">Confirm New Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="auth-button" style={{ marginTop: "16px" }}>
                Reset Password &nbsp;→
              </button>
            </form>
          )}

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--text-sub)", textAlign: "center", marginBottom: "12px" }}>
            Not receiving the email? Request a manual reset:
          </p>
          
          <button 
            type="button" 
            className="auth-button-secondary" 
            onClick={handleManualRequest}
            disabled={sendingManual}
            style={{ marginTop: 0, fontWeight: 700, color: "var(--primary-green)" }}
          >
            {sendingManual ? "Sending Request..." : "💬 Message Admin for Manual Reset"}
          </button>

          <p className="auth-link">
            Remember your password?{" "}
            <span onClick={() => navigate("/auth")}>Login</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;