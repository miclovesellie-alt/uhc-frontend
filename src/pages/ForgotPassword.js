import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import "../styles/auth.css";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", username: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleManualRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await api.post("auth/manual-reset-request", formData);
      setMessage(response.data.message || "Your request has been sent to the Admin.");
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send request. Please try again later.");
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

          <h1 className="auth-title">Password Reset Request</h1>
          <p className="auth-subtitle">
            {submitted 
              ? "Your request has been received." 
              : "Please fill out this form to request a manual password reset from the administrators."}
          </p>

          {message && <p className="success-text">{message}</p>}
          {error && <p className="error-text">{error}</p>}

          {!submitted ? (
            <form onSubmit={handleManualRequest}>
              <label className="input-label">Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
              />

              <label className="input-label">Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />

              <label className="input-label">Username / Phone Number</label>
              <input
                type="text"
                name="username"
                placeholder="Enter your username or phone number"
                value={formData.username}
                onChange={handleChange}
                required
              />

              <button type="submit" className="auth-button" disabled={loading} style={{ marginTop: "16px" }}>
                {loading ? "Sending Request..." : "Submit Reset Request \u00a0\u2192"}
              </button>
            </form>
          ) : (
            <button className="auth-button-secondary" onClick={() => navigate("/auth")} style={{ marginTop: "24px" }}>
              Return to Login
            </button>
          )}

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;