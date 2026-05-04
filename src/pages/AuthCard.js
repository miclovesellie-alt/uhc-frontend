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

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

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
      setSuccess("Login successful! Redirecting...");
      if (user.role === "admin" || user.role === "superadmin") {
        setTimeout(() => navigate("/admin"), 800);
      } else {
        setTimeout(() => navigate("/dashboard"), 800);
      }
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
      {/* ===== LOADING OVERLAY ===== */}
      {isLoading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24
        }}>
          {/* Pulsing rings */}
          <div style={{ position: 'relative', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(66,85,255,0.3)', animation: 'uhcPulse 1.8s ease-out infinite' }} />
            <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '3px solid rgba(66,85,255,0.5)', animation: 'uhcPulse 1.8s ease-out infinite 0.3s' }} />
            <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', border: '3px solid rgba(66,85,255,0.7)', animation: 'uhcPulse 1.8s ease-out infinite 0.6s' }} />
            {/* UHC logo */}
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#4255ff,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', color: 'white', letterSpacing: '0.05em', boxShadow: '0 0 30px rgba(66,85,255,0.6)' }}>UHC</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '1.2rem', marginBottom: 8 }}>Signing you in…</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Please wait while we load your dashboard</div>
          </div>
          {/* Animated dots */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#4255ff', animation: `uhcDot 1.2s ease-in-out infinite ${i * 0.2}s` }} />
            ))}
          </div>
          <style>{`
            @keyframes uhcPulse { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
            @keyframes uhcDot { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
          `}</style>
        </div>
      )}
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