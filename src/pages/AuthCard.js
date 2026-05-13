import React, { useState, useContext } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import countriesList from "../data/countries";
import "../styles/auth.css";

function AuthCard() {
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const [activePage, setActivePage] = useState("login"); // login | signup | reset | verify-pending
  const [signupStep, setSignupStep] = useState(1); // 1, 2, 3
  const [loginMode, setLoginMode] = useState("email"); // email | phone
  const [signupMode, setSignupMode] = useState("email"); // email | phone
  const [pendingEmail, setPendingEmail] = useState(""); // email waiting for verification
  const [resendMsg,   setResendMsg]   = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", phonePrefix: "+233",
    password: "", confirmPassword: "", category: "", country: "", username: ""
  });
  
  const [resetSubmitted, setResetSubmitted] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [showSplash, setShowSplash] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const HealthSplash = () => {
    const icons = ["🩺","📚","💊","🏥","🧬","📖","❤️","🔬","🩻","🎓"];
    const [iconIdx, setIconIdx] = React.useState(0);
    const [tipIdx, setTipIdx]   = React.useState(0);
    const tips = [
      "Preparing your dashboard…",
      "Loading study resources…",
      "Syncing your progress…",
      "Almost there! 🎓",
    ];
    React.useEffect(() => {
      const i = setInterval(() => setIconIdx(p => (p + 1) % icons.length), 400);
      const t = setInterval(() => setTipIdx(p => (p + 1) % tips.length), 1200);
      return () => { clearInterval(i); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "radial-gradient(at 0% 0%, hsla(161,71%,90%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(199,89%,92%,1) 0, transparent 50%), #f8fafc",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0,
      }}>
        {/* Animated rings */}
        <div style={{ position: "relative", width: 120, height: 120, marginBottom: 28 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid rgba(16,185,129,0.15)", animation: "splRing 2s ease-in-out infinite" }}/>
          <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "3px solid rgba(16,185,129,0.25)", animation: "splRing 2s ease-in-out infinite 0.3s" }}/>
          <div style={{ position: "absolute", inset: 16, borderRadius: "50%", border: "3px solid rgba(16,185,129,0.4)", animation: "splRing 2s ease-in-out infinite 0.6s" }}/>
          <div style={{ position: "absolute", inset: 24, borderRadius: "50%", background: "rgba(16,185,129,0.1)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
            {icons[iconIdx]}
          </div>
        </div>

        {/* Logo */}
        <div style={{ fontWeight: 900, fontSize: "2.2rem", letterSpacing: 3,
          background: "linear-gradient(135deg,#10b981,#0ea5e9)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 6 }}>
          UHC
        </div>
        <div style={{ color: "#94a3b8", fontSize: ".72rem", letterSpacing: 2, textTransform: "uppercase", marginBottom: 40 }}>
          Universal Health Community
        </div>

        {/* Progress bar */}
        <div style={{ width: 200, height: 3, background: "#e2e8f0", borderRadius: 99, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ height: "100%", background: "linear-gradient(90deg,#10b981,#0ea5e9)", borderRadius: 99, animation: "splProgress 1.5s ease-out forwards" }}/>
        </div>

        <div style={{ color: "#64748b", fontSize: ".82rem", fontWeight: 500, minHeight: 20 }}>
          {tips[tipIdx]}
        </div>

        <style>{`
          @keyframes splRing { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.06);opacity:1} }
          @keyframes splProgress { from{width:0} to{width:100%} }
        `}</style>
      </div>
    );
  };

  // ===== LOGIN =====
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      const payload = { password: formData.password };
      if (loginMode === "email") {
        payload.email = formData.email;
      } else {
        payload.phone = formData.phonePrefix + formData.phone;
      }
      const res = await api.post("auth/login", payload);
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("userId", user._id);
      setUser(user);
      setShowSplash(true);
      const dest = (user.role === "admin" || user.role === "superadmin") ? "/admin" : "/dashboard";
      setTimeout(() => navigate(dest), 2000);
    } catch (err) {
      const data = err.response?.data;
      // Unverified email — show the verify-pending screen
      if (data?.requiresVerification) {
        setPendingEmail(data.email || formData.email);
        setActivePage("verify-pending");
        return;
      }
      setError(data?.message || "Invalid credentials");
    }
  };


  // ===== SIGNUP =====
  const handleSignup = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!"); return;
    }
    if (!formData.country) { setError("Please select a country!"); return; }
    if (!formData.category) { setError("Please select a category!"); return; }

    try {
      const res = await api.post("auth/signup", {
        name: formData.name,
        email: formData.email,
        phone: formData.phonePrefix + formData.phone,
        password: formData.password,
        category: formData.category,
        country: formData.country,
      });
      // Backend now returns { requiresVerification: true, email }
      if (res.data.requiresVerification) {
        setPendingEmail(res.data.email || formData.email);
        setFormData({ name:"", email:"", phone:"", phonePrefix:"+233", password:"", confirmPassword:"", category:"", country:"" });
        setSignupStep(1);
        setActivePage("verify-pending");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    }
  };

  // ===== RESET (User) =====
  const handleReset = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setError(""); setSuccess("");
    try {
      const payload = {
        name: formData.name || "Unknown (from modal)",
        email: formData.email,
        username: formData.username
      };
      
      const response = await api.post("auth/manual-reset-request", payload);
      setSuccess(response.data.message || "Your request has been sent to the Admin.");
      setResetSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send request. Please try again later.");
    } finally {
      setResetLoading(false);
    }
  };



  // ===== SIGNUP STEP NAVIGATION =====
  const nextStep = () => {
    setError("");
    if (signupStep === 1) {
      if (!formData.name) { setError("Please enter your name"); return; }
      if (signupMode === "email" && !formData.email) { setError("Please enter your email"); return; }
      if (signupMode === "phone" && !formData.phone) { setError("Please enter your phone number"); return; }
    }
    if (signupStep === 2) {
      if (!formData.country) { setError("Please select your country"); return; }
      if (!formData.category) { setError("Please select your category"); return; }
    }
    setSignupStep((s) => Math.min(s + 1, 3));
  };

  const prevStep = () => { setError(""); setSignupStep((s) => Math.max(s - 1, 1)); };

  return (
    <div className="auth-bg">
      {/* ===== HEALTH SPLASH (post-login 2s screen) ===== */}
      {showSplash && <HealthSplash />}

      <div className="auth-card-wrapper">
        <div className="auth-card">

          {/* ===== LOGIN ===== */}
          {activePage === "login" && (
            <>
              <button className="auth-back-btn" onClick={() => navigate("/")}>
                <span className="back-circle">←</span>
                <span className="back-label">Back to Home</span>
              </button>

              <h1 className="auth-title">Welcome Back</h1>
              <p className="auth-subtitle">Sign in to access your UHC dashboard</p>



              {error && <p className="error-text">{error}</p>}
              {success && <p className="success-text">{success}</p>}

              {/* Email / Phone Toggle */}
              <div className="auth-mode-toggle">
                <button
                  type="button"
                  className={`auth-mode-btn ${loginMode === "email" ? "active" : ""}`}
                  onClick={() => setLoginMode("email")}
                >
                  Email
                </button>
                <button
                  type="button"
                  className={`auth-mode-btn ${loginMode === "phone" ? "active" : ""}`}
                  onClick={() => setLoginMode("phone")}
                >
                  Mobile Number
                </button>
              </div>

              <form onSubmit={handleLogin}>
                {loginMode === "email" ? (
                  <>
                    <label className="input-label">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="user@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </>
                ) : (
                  <>
                    <label className="input-label">Mobile Number</label>
                    <div className="phone-input-wrapper">
                      <input
                        className="phone-prefix"
                        name="phonePrefix"
                        value={formData.phonePrefix}
                        onChange={handleChange}
                      />
                      <input
                        type="tel"
                        name="phone"
                        placeholder="XXX XXX XXXX"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </>
                )}

                <div className="input-label-row">
                  <label className="input-label">Password</label>
                  <span className="auth-forgot" onClick={() => navigate("/forgot-password")}>Forgot?</span>
                </div>
                <div className="password-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <span className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? "🙈" : "👁️"}
                  </span>
                </div>

                <button type="submit" className="auth-button">
                  Sign In &nbsp;→
                </button>
              </form>

              <p className="auth-link">
                Don't have an account?{" "}
                <span onClick={() => { setActivePage("signup"); setSignupStep(1); setError(""); }}>
                  Register
                </span>
              </p>
            </>
          )}

          {/* ===== SIGNUP ===== */}
          {activePage === "signup" && (
            <>
              <button className="auth-back-btn" onClick={() => { if (signupStep > 1) prevStep(); else setActivePage("login"); }}>
                <span className="back-circle">←</span>
                <span className="back-label">{signupStep > 1 ? "Back" : "Back to Login"}</span>
              </button>

              {/* Progress Bar */}
              <div className="auth-progress">
                <div className={`auth-progress-step ${signupStep >= 1 ? "active" : ""} ${signupStep > 1 ? "completed" : ""}`}></div>
                <div className={`auth-progress-step ${signupStep >= 2 ? "active" : ""} ${signupStep > 2 ? "completed" : ""}`}></div>
                <div className={`auth-progress-step ${signupStep >= 3 ? "active" : ""}`}></div>
              </div>

              {error && <p className="error-text">{error}</p>}
              {success && <p className="success-text">{success}</p>}

              {/* STEP 1: Name + Contact */}
              {signupStep === 1 && (
                <>
                  <div className="auth-step-label">Step 1 of 3</div>
                  <h1 className="auth-title">Start Journey</h1>
                  <p className="auth-subtitle">Join the UHC student & educator community</p>

                  <div className="auth-mode-toggle">
                    <button type="button" className={`auth-mode-btn ${signupMode === "email" ? "active" : ""}`} onClick={() => setSignupMode("email")}>
                      Email
                    </button>
                    <button type="button" className={`auth-mode-btn ${signupMode === "phone" ? "active" : ""}`} onClick={() => setSignupMode("phone")}>
                      Mobile Number
                    </button>
                  </div>

                  <label className="input-label">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />

                  {signupMode === "email" ? (
                    <>
                      <label className="input-label">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        placeholder="user@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </>
                  ) : (
                    <>
                      <label className="input-label">Mobile Number</label>
                      <div className="phone-input-wrapper">
                        <input
                          className="phone-prefix"
                          name="phonePrefix"
                          value={formData.phonePrefix}
                          onChange={handleChange}
                        />
                        <input
                          type="tel"
                          name="phone"
                          placeholder="XXX XXX XXXX"
                          value={formData.phone}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </>
                  )}

                  <button type="button" className="auth-button" onClick={nextStep}>
                    Continue &nbsp;→
                  </button>

                  <p className="auth-link">
                    Already have an account?{" "}
                    <span onClick={() => { setActivePage("login"); setError(""); }}>Login</span>
                  </p>
                </>
              )}

              {/* STEP 2: Academic Details */}
              {signupStep === 2 && (
                <>
                  <div className="auth-step-label">Step 2 of 3</div>
                  <h1 className="auth-title">Academic Details</h1>
                  <p className="auth-subtitle">Help us personalize your learning experience</p>

                  <label className="input-label">Country</label>
                  <select name="country" value={formData.country} onChange={handleChange} required>
                    <option value="">Select Country</option>
                    {countriesList.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <label className="input-label">Category</label>
                  <select name="category" value={formData.category} onChange={handleChange} required>
                    <option value="">Select Category</option>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="healthWorker">Health Worker</option>
                    <option value="patient">Patient</option>
                  </select>

                  {signupMode === "phone" && (
                    <>
                      <label className="input-label">Email Address (required)</label>
                      <input
                        type="email"
                        name="email"
                        placeholder="user@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </>
                  )}

                  <button type="button" className="auth-button" onClick={nextStep}>
                    Continue &nbsp;→
                  </button>
                  <button type="button" className="auth-button-secondary" onClick={prevStep}>
                    ← Back
                  </button>
                </>
              )}

              {/* STEP 3: Password */}
              {signupStep === 3 && (
                <form onSubmit={handleSignup}>
                  <div className="auth-step-label">Step 3 of 3</div>
                  <h1 className="auth-title">Secure Account</h1>
                  <p className="auth-subtitle">Create a strong password for your account</p>

                  <label className="input-label">Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Create password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                    <span className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? "🙈" : "👁️"}
                    </span>
                  </div>

                  <label className="input-label">Confirm Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                    <span className="eye-icon" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? "🙈" : "👁️"}
                    </span>
                  </div>

                  <button type="submit" className="auth-button">
                    Create Account &nbsp;→
                  </button>
                  <button type="button" className="auth-button-secondary" onClick={prevStep}>
                    ← Back
                  </button>
                </form>
              )}
            </>
          )}

          {/* ===== VERIFY PENDING ===== */}
          {activePage === "verify-pending" && (
            <>
              <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%",
                  background: "linear-gradient(135deg,rgba(16,185,129,0.12),rgba(14,165,233,0.12))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "2rem", margin: "0 auto 20px"
                }}>📧</div>
                <h1 className="auth-title">Check Your Email</h1>
                <p className="auth-subtitle" style={{ marginBottom: 0 }}>
                  We sent a verification link to<br />
                  <strong style={{ color: "#0f172a" }}>{pendingEmail}</strong>
                </p>
              </div>

              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14,
                padding: "16px 20px", marginBottom: 20, fontSize: "0.84rem", color: "#475569", lineHeight: 1.6
              }}>
                <strong>What to do next:</strong>
                <ol style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  <li>Open your inbox for <strong>{pendingEmail}</strong></li>
                  <li>Click the <strong>"Verify My Email"</strong> button in the email</li>
                  <li>You'll be redirected back to log in</li>
                </ol>
              </div>

              {resendMsg && (
                <p style={{ color: "#10b981", fontSize: "0.82rem", fontWeight: 700, textAlign: "center", marginBottom: 12 }}>
                  {resendMsg}
                </p>
              )}

              <button
                className="auth-button"
                disabled={resendLoading}
                onClick={async () => {
                  setResendLoading(true); setResendMsg("");
                  try {
                    const r = await api.post("auth/resend-verification", { email: pendingEmail });
                    setResendMsg(r.data.message || "New link sent!");
                  } catch { setResendMsg("Failed to resend. Try again."); }
                  finally { setResendLoading(false); }
                }}
              >
                {resendLoading ? "Sending…" : "Resend Verification Email"}
              </button>

              <button
                className="auth-button-secondary"
                style={{ marginTop: 10 }}
                onClick={() => { setActivePage("login"); setError(""); setSuccess(""); }}
              >
                ← Back to Login
              </button>
            </>
          )}

          {activePage === "reset" && (
            <>
              <button className="auth-back-btn" onClick={() => { setActivePage("login"); setResetSubmitted(false); setError(""); setSuccess(""); }}>
                <span className="back-circle">←</span>
                <span className="back-label">Back to Login</span>
              </button>

              <h1 className="auth-title">Password Reset Request</h1>
              <p className="auth-subtitle">
                {resetSubmitted 
                  ? "Your request has been received." 
                  : "Please fill out this form to request a manual password reset from the administrators."}
              </p>

              {error && <p className="error-text">{error}</p>}
              {success && <p className="success-text">{success}</p>}

              {!resetSubmitted ? (
                <form onSubmit={handleReset}>
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

                  <button type="submit" className="auth-button" disabled={resetLoading} style={{ marginTop: "16px" }}>
                    {resetLoading ? "Sending Request..." : "Submit Reset Request \u00a0\u2192"}
                  </button>
                </form>
              ) : (
                <button className="auth-button-secondary" onClick={() => { setActivePage("login"); setResetSubmitted(false); setSuccess(""); }} style={{ marginTop: "24px" }}>
                  Return to Login
                </button>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default AuthCard;