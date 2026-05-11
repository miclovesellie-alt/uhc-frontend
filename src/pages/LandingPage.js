import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { motion } from "framer-motion";
import {
  BookOpen, Zap, TrendingUp, Trophy, ArrowRight,
  CheckCircle2, Menu, X, Lock, ChevronRight, Star
} from "lucide-react";
import "../styles/landingpage.css";
import graduation from "../assets/graduation.jpeg";

/* ─── Real nursing questions – visible to Google, answers locked ─────── */
const QUIZ_QUESTIONS = [
  {
    course: "Medical-Surgical Nursing",
    q: "A patient with Type 2 diabetes has a fasting blood glucose of 285 mg/dL. Which nursing intervention is the priority?",
    options: ["A. Administer scheduled insulin as ordered", "B. Encourage increased fluid intake only", "C. Notify the physician immediately", "D. Recheck glucose in 30 minutes without action"],
  },
  {
    course: "Pharmacology",
    q: "A nurse is about to give digoxin (Lanoxin). Which finding should prompt withholding the dose and notifying the doctor?",
    options: ["A. Blood pressure 118/78 mmHg", "B. Apical pulse of 52 beats per minute", "C. Serum potassium 4.1 mEq/L", "D. Respiratory rate 18 breaths/min"],
  },
  {
    course: "Maternal-Newborn Nursing",
    q: "During labour, a nurse observes late decelerations on the fetal monitor. What is the PRIORITY nursing action?",
    options: ["A. Document and continue routine monitoring", "B. Reposition the patient to the left lateral position", "C. Increase the rate of IV oxytocin infusion", "D. Administer oxygen via simple face mask at 2 L/min"],
  },
  {
    course: "Pediatric Nursing",
    q: "A 4-year-old is admitted with suspected epiglottitis. Which action is MOST important?",
    options: ["A. Obtain a throat culture immediately", "B. Place the child in the supine position", "C. Keep the child calm and avoid agitating procedures", "D. Start oral antibiotics as prescribed"],
  },
  {
    course: "Psychiatric Nursing",
    q: "A patient says, 'I have a plan to hurt myself tonight.' What is the nurse's FIRST priority?",
    options: ["A. Document the statement in the medical chart", "B. Notify the healthcare provider", "C. Ensure immediate safety — do not leave the patient alone", "D. Ask the patient to sign a no-harm contract"],
  },
];

const FEATURES = [
  { icon: <Zap />, title: "Adaptive Quizzes", desc: "Smart question banks that focus on your weak areas and track improvement across every nursing course." },
  { icon: <BookOpen />, title: "Study Library", desc: "Access clinical guides, lecture notes, and exam prep documents uploaded by qualified instructors." },
  { icon: <TrendingUp />, title: "Progress Analytics", desc: "Visualise your performance with score history, course breakdowns, and trend charts." },
  { icon: <Trophy />, title: "Leaderboard & Points", desc: "Earn points for every quiz completed and compete with peers on the national leaderboard." },
];

/* ─── Leaderboard preview – static placeholder with real-looking data ── */
const LEADERBOARD_PREVIEW = [
  { rank: 1, name: "Abena M.", score: 4820, badge: "🥇" },
  { rank: 2, name: "Kwame A.", score: 4610, badge: "🥈" },
  { rank: 3, name: "Efua S.", score: 4390, badge: "🥉" },
  { rank: 4, name: "Nana K.", score: 4150, badge: "⭐" },
  { rank: 5, name: "Ama B.",  score: 3980, badge: "⭐" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled]       = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactForm, setContactForm]  = useState({ name: "", email: "", message: "" });
  const [contactStatus, setContactStatus] = useState(null);

  /* Quiz state */
  const [quizAnswers, setQuizAnswers]  = useState({});   // { qIdx: optionIdx }
  const [quizCourse, setQuizCourse]    = useState(0);    // which question showing

  /* Leaderboard from API (with static fallback) */
  const [leaders, setLeaders] = useState(LEADERBOARD_PREVIEW);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  /* Try to load real leaderboard – graceful fallback to static */
  useEffect(() => {
    api.get("/user/leaderboard").then(r => {
      if (r.data?.length) setLeaders(r.data.slice(0, 5).map((u, i) => ({
        rank: i + 1,
        name: u.name || u.username || "Student",
        score: u.totalPoints || u.points || 0,
        badge: ["🥇","🥈","🥉","⭐","⭐"][i],
      })));
    }).catch(() => {}); // keep static fallback silently
  }, []);

  const handleContact = async (e) => {
    e.preventDefault();
    try {
      await api.post("/contact", contactForm);
      setContactStatus({ type: "success", msg: "Thank you! Your message has been sent." });
      setContactForm({ name: "", email: "", message: "" });
      setTimeout(() => setContactStatus(null), 5000);
    } catch {
      setContactStatus({ type: "error", msg: "Failed to send. Please try again." });
    }
  };

  return (
    <div className="landing-container">
      {/* ── SEO: machine-readable description for Google ─────────────── */}
      <meta name="description" content="Universal Health Community (UHC) — the free nursing education platform with adaptive quizzes, study resources, and a national leaderboard for nursing students in Ghana and beyond." />

      {/* ══ NAVBAR ════════════════════════════════════════════════════ */}
      <nav className={`landing-navbar ${scrolled ? "scrolled" : ""} ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="landing-logo" onClick={() => { window.scrollTo(0,0); setMobileMenuOpen(false); }}>
          <span className="logo-text wave-text">
            {"UHC".split("").map((c,i) => <span key={i} style={{"--i":i}}>{c}</span>)}
          </span>
        </div>

        <div className={`landing-nav-links ${mobileMenuOpen ? "active" : ""}`}>
          <span className="nav-link" onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}>Quiz Library</span>
          <span className="nav-link" onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}>Study Library</span>
          <span className="nav-link" onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}>Leaderboard</span>
          <div className="nav-divider" />
          <span className="landing-login mobile-only" onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}>Log In</span>
          <button className="landing-signup mobile-only" onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}>Get Started</button>
        </div>

        <div className="landing-nav-right">
          <span className="landing-login desktop-only" onClick={() => navigate("/auth")}>Log In</span>
          <button className="landing-signup desktop-only" onClick={() => navigate("/auth")}>Get Started Free</button>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={28}/> : <Menu size={28}/>}
          </button>
        </div>
      </nav>

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <section className="hero-section">
        <div className="hero-text">
          <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}>
            <span className="section-label">Free Nursing Education Platform</span>
            <h1>Study Smarter.<br /><span className="highlight">Pass Your Exams.</span></h1>
            <p>
              Universal Health Community gives nursing students access to adaptive quizzes,
              a curated study library, and a live leaderboard — all free. Built for student
              nurses in Ghana and across Africa.
            </p>
            <div className="hero-actions">
              <button className="hero-btn" onClick={() => navigate("/auth")}>Create Free Account</button>
              <button className="hero-btn-secondary" onClick={() => navigate("/auth")}>Browse Library</button>
            </div>
          </motion.div>
        </div>
        <div className="hero-image-wrapper">
          <div className="hero-image-container">
            <img src={graduation} alt="Nursing student graduating with degree" />
            <div className="hero-floating-card">
              <div style={{ background:"#10b981", padding:"8px", borderRadius:"10px", color:"white" }}>
                <Trophy size={20}/>
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:"0.9rem" }}>Free forever</div>
                <div style={{ fontSize:"0.75rem", color:"#64748b" }}>No credit card needed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ QUIZ PREVIEW — indexable by Google ═══════════════════════ */}
      <section className="quiz-section">
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <span className="section-label">🧠 Sample Quiz</span>
          <h2 className="section-title" style={{ textAlign:"left" }}>Test Your Nursing Knowledge</h2>
          <p style={{ color:"var(--text-secondary)", fontSize:"1.05rem", marginBottom:40, maxWidth:600 }}>
            Answer the question below — then <strong>create a free account</strong> to unlock
            all questions and see your correct answers instantly.
          </p>

          {/* Course tabs */}
          <div className="quiz-courses">
            {QUIZ_QUESTIONS.map((q,i) => (
              <button key={i} onClick={() => { setQuizCourse(i); setQuizAnswers(a => ({...a})); }}
                style={{
                  padding:"7px 16px", borderRadius:99, border:"1px solid",
                  borderColor: quizCourse===i ? "#10b981" : "#e2e8f0",
                  background: quizCourse===i ? "#10b981" : "white",
                  color: quizCourse===i ? "white" : "#475569",
                  fontSize:".78rem", fontWeight:700, cursor:"pointer", transition:"all .2s"
                }}>
                {q.course}
              </button>
            ))}
          </div>

          {/* Question card */}
          {(() => {
            const q = QUIZ_QUESTIONS[quizCourse];
            const answered = quizAnswers[quizCourse] !== undefined;
            return (
              <div className="quiz-card">
                <div style={{ fontSize:".8rem", fontWeight:700, color:"#10b981", marginBottom:14, textTransform:"uppercase", letterSpacing:".05em" }}>
                  Question {quizCourse+1} of {QUIZ_QUESTIONS.length} · {q.course}
                </div>
                <p style={{ fontSize:"1.08rem", fontWeight:700, color:"#0f172a", lineHeight:1.6, marginBottom:28 }}>{q.q}</p>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {q.options.map((opt, oi) => {
                    const selected = quizAnswers[quizCourse] === oi;
                    return (
                      <button key={oi}
                        onClick={() => setQuizAnswers(a => ({...a, [quizCourse]: oi}))}
                        style={{
                          display:"flex", alignItems:"center", gap:14,
                          padding:"14px 20px", borderRadius:12,
                          border: `2px solid ${selected ? "#10b981" : "#e2e8f0"}`,
                          background: selected ? "rgba(16,185,129,0.06)" : "white",
                          color: "#0f172a", textAlign:"left", cursor:"pointer",
                          fontWeight: selected ? 700 : 500, fontSize:".95rem",
                          transition:"all .2s"
                        }}>
                        <span style={{
                          width:28, height:28, borderRadius:"50%", flexShrink:0,
                          border:`2px solid ${selected ? "#10b981" : "#d1d5db"}`,
                          background: selected ? "#10b981" : "transparent",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          color: selected ? "white" : "transparent", fontSize:".8rem"
                        }}>✓</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {/* Answer lock / CTA */}
                {answered && (
                  <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                    className="quiz-lock-bar">
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <Lock size={20} color="#10b981"/>
                      <span style={{ fontWeight:700, fontSize:".95rem" }}>
                        Create a free account to see the correct answer &amp; explanation
                      </span>
                    </div>
                    <button onClick={() => navigate("/auth")}
                      style={{ padding:"10px 24px", background:"#10b981", color:"white", border:"none",
                        borderRadius:10, fontWeight:800, fontSize:".9rem", cursor:"pointer", whiteSpace:"nowrap" }}>
                      See Answer →
                    </button>
                  </motion.div>
                )}
              </div>
            );
          })()}
        </div>
      </section>

      {/* ══ LEADERBOARD PREVIEW ═══════════════════════════════════════ */}
      <section className="lb-section">
        <div className="lb-grid">
          {/* Left copy */}
          <div>
            <span className="section-label">🏆 Leaderboard</span>
            <h2 className="section-title" style={{ textAlign:"left", fontSize:"2.4rem" }}>Compete &amp; Climb the Rankings</h2>
            <p style={{ color:"var(--text-secondary)", fontSize:"1rem", lineHeight:1.7, marginBottom:32 }}>
              Every quiz you complete earns you points. Top scorers appear on the national
              leaderboard — visible to all students. Join today and start climbing.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:36 }}>
              {["Earn points for every completed quiz","Compete with students across all courses","Weekly rankings reset — everyone has a chance","Your rank is shown on your public profile"].map((f,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, fontSize:".95rem", color:"#0f172a", fontWeight:500 }}>
                  <CheckCircle2 size={18} color="#10b981"/>
                  {f}
                </div>
              ))}
            </div>
            <button onClick={() => navigate("/auth")}
              style={{ padding:"14px 32px", background:"#0f172a", color:"white", border:"none",
                borderRadius:12, fontWeight:800, fontSize:"1rem", cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
              Join &amp; Compete <ChevronRight size={18}/>
            </button>
          </div>

          {/* Right: live leaderboard card */}
          <div className="lb-card">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
              <div style={{ fontWeight:800, fontSize:"1rem", color:"#0f172a" }}>🏆 Top Students</div>
              <span style={{ fontSize:".75rem", color:"#10b981", fontWeight:700, background:"rgba(16,185,129,.08)", padding:"4px 12px", borderRadius:99 }}>Live</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {leaders.map((l, i) => (
                <div key={i} style={{
                  display:"flex", alignItems:"center", gap:14, padding:"12px 16px",
                  borderRadius:12, background: i===0 ? "linear-gradient(135deg,rgba(255,215,0,.1),rgba(255,215,0,.05))" : "#f8fafc",
                  border:`1px solid ${i===0 ? "rgba(255,215,0,.3)" : "#f1f5f9"}`
                }}>
                  <span style={{ fontSize:"1.3rem", width:28, textAlign:"center" }}>{l.badge}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:".9rem", color:"#0f172a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.name}</div>
                    <div style={{ fontSize:".72rem", color:"#94a3b8" }}>Rank #{l.rank}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:4, fontWeight:800, fontSize:".9rem", color:"#10b981" }}>
                    <Star size={13} fill="#10b981" color="#10b981"/>
                    {l.score.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => navigate("/auth")}
              style={{ width:"100%", marginTop:20, padding:"12px", background:"#f8fafc", border:"1px solid #e2e8f0",
                borderRadius:12, fontWeight:700, fontSize:".88rem", color:"#0f172a", cursor:"pointer" }}>
              View Full Leaderboard →
            </button>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════════════ */}
      <section className="features-section">
        <span className="section-label">What you get</span>
        <h2 className="section-title">Everything to pass your exams</h2>
        <p className="section-subtitle">Built specifically for nursing students — free, mobile-friendly, and always growing.</p>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <motion.div key={i} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══ CTA ═══════════════════════════════════════════════════════ */}
      <section className="cta-section">
        <div className="cta-box">
          <div className="cta-content">
            <h2>Start studying smarter today</h2>
            <p>Create your free account in under 2 minutes. No credit card. No hidden fees.</p>
            <button className="cta-btn" onClick={() => navigate("/auth")}>Get Started Free</button>
          </div>
          <div style={{ flex:1, display:"flex", justifyContent:"center" }}>
            <div style={{ width:"100%", maxWidth:360, padding:"28px 32px", background:"rgba(255,255,255,0.12)",
              borderRadius:20, backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.2)" }}>
              {["✅ Adaptive quiz system","📚 Full study library access","🏆 Leaderboard &amp; points","📊 Personal progress analytics","📱 Works on mobile &amp; desktop"].map((item,i) => (
                <div key={i} style={{ color:"white", fontWeight:600, fontSize:".95rem", marginBottom:14,
                  display:"flex", alignItems:"center", gap:8 }}
                  dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════ */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-contact">
            <h3>Contact Us</h3>
            <p>Questions? Reach us at <strong>boafokyei3@gmail.com</strong> or WhatsApp <strong>+233 598 173 019</strong>.</p>

            {contactStatus && (
              <div className={`contact-status-msg ${contactStatus.type}`}>
                {contactStatus.type === "success" ? "✓ " : "✕ "}{contactStatus.msg}
              </div>
            )}

            <form className="footer-contact-form" onSubmit={handleContact}>
              <div className="input-group">
                <input type="text" placeholder="Full Name" value={contactForm.name}
                  onChange={e => setContactForm({...contactForm, name:e.target.value})} required />
                <input type="email" placeholder="Email Address" value={contactForm.email}
                  onChange={e => setContactForm({...contactForm, email:e.target.value})} required />
              </div>
              <textarea placeholder="How can we help?"
                value={contactForm.message}
                onChange={e => setContactForm({...contactForm, message:e.target.value})} required />
              <button type="submit" className="contact-submit-btn">
                <span>Send Message</span>
                <ArrowRight size={18}/>
              </button>
            </form>
          </div>

          <div className="footer-links">
            <h4>Platform</h4>
            <ul>
              <li><a href="/auth">Quiz Library</a></li>
              <li><a href="/auth">Study Library</a></li>
              <li><a href="/auth">Leaderboard</a></li>
              <li><a href="/auth">My Analytics</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>About</h4>
            <ul>
              <li><a href="/auth">About UHC</a></li>
              <li><a href="/auth">For Students</a></li>
              <li><a href="/auth">For Instructors</a></li>
              <li><a href="#contact" onClick={e => { e.preventDefault(); document.querySelector(".footer-contact-form")?.scrollIntoView({ behavior:"smooth" }); }}>Contact</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Connect</h4>
            <ul>
              <li><a href="https://wa.me/233598173019" target="_blank" rel="noreferrer">WhatsApp Us</a></li>
              <li><a href="mailto:boafokyei3@gmail.com">Email Us</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Universal Health Community. All rights reserved.</span>
          <div style={{ display:"flex", gap:24 }}>
            <a href="/auth" style={{ color:"inherit", textDecoration:"none" }}>Privacy</a>
            <a href="/auth" style={{ color:"inherit", textDecoration:"none" }}>Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}