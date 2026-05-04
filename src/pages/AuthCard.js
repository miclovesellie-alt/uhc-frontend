import React, { useState, useContext } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import countriesList from "../data/countries";
import "../styles/auth.css";

function AuthCard() {
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();

  const [activePage, setActivePage] = useState("login"); // login | signup | reset
  const [signupStep, setSignupStep] = useState(1); // 1, 2, 3
  const [loginMode, setLoginMode] = useState("email"); // email | phone
  const [signupMode, setSignupMode] = useState("email"); // email | phone

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", phonePrefix: "+233",
    password: "", confirmPassword: "", category: "", country: "", username: ""
  });
  
  const [resetSubmitted, setResetSubmitted] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [showSplash, setShowSplash] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const HealthSplash = () => {
    const icons = ["🩺","📚","💊","🏥","🧬","📖","❤️","🔬","🩻","🎓"];
    const [iconIdx, setIconIdx] = React.useState(0);
    const [tipIdx, setTipIdx]   = React.useState(0);
    const tips = [
      "Preparing your health dashboard…",
      "Loading study resources…",
      "Syncing your progress…",
      "Almost there — stay healthy! 💙",
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
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 0,
      }}>
        {/* Animated rings */}
        <div style={{ position: "relative", width: 120, height: 120, marginBottom: 28 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid rgba(66,85,255,0.2)", animation: "ring1 2s ease-in-out infinite" }}/>
          <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "3px solid rgba(66,85,255,0.35)", animation: "ring1 2s ease-in-out infinite 0.3s" }}/>
          <div style={{ position: "absolute", inset: 16, borderRadius: "50%", border: "3px solid rgba(66,85,255,0.5)", animation: "ring1 2s ease-in-out infinite 0.6s" }}/>
          {/* Center icon */}
          <div style={{ position: "absolute", inset: 24, borderRadius: "50%", background: "rgba(66,85,255,0.15)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", transition: "all 0.3s" }}>
            {icons[iconIdx]}
          </div>
        </div>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ fontWeight: 900, fontSize: "2rem", letterSpacing: 3, background: "linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            UHC
          </div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: ".75rem", letterSpacing: 2, textTransform: "uppercase", marginBottom: 36 }}>
          Universal Health Campus
        </div>

        {/* Progress bar */}
        <div style={{ width: 200, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ height: "100%", background: "linear-gradient(90deg,#4255ff,#a78bfa)", borderRadius: 99, animation: "progress 1.5s ease-out forwards" }}/>
        </div>

        {/* Tip text */}
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: ".82rem", fontWeight: 500, transition: "opacity .4s", minHeight: 20 }}>
          {tips[tipIdx]}
        </div>

        <style>{`
          @keyframes ring1 { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.06);opacity:1} }
          @keyframes progress { from{width:0} to{width:100%} }
        `}</style>
      </div>
    );
  };

  // ===== LOGIN =====
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setIsLoading(true);
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
      // Show health splash for 2s before redirecting
      setShowSplash(true);
      const dest = (user.role === "admin" || user.role === "superadmin") ? "/admin" : "/dashboard";
      setTimeout(() => navigate(dest), 2000);
    } catch (err) {
      setIsLoading(false);
      setError(err.response?.data?.message || "Invalid credentials");
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
      await api.post("auth/signup", {
        name: formData.name,
        email: formData.email,
        phone: formData.phonePrefix + formData.phone,
        password: formData.password,
        category: formData.category,
        country: formData.country,
      });
      setSuccess("Account created! Redirecting to login...");
      setFormData({ name:"", email:"", phone:"", phonePrefix:"+233", password:"", confirmPassword:"", category:"", country:"" });
      setTimeout(() => { setActivePage("login"); setSignupStep(1); }, 2000);
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
                  <span className="auth-forgot" onClick={() => setActivePage("reset")}>Forgot?</span>
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

          {/* ===== RESET PASSWORD ===== */}
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