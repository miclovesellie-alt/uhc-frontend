import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { motion } from "framer-motion";
import { BookOpen, Zap, TrendingUp, Trophy, ArrowRight, CheckCircle2, Menu, X, Lock, ChevronRight, Star } from "lucide-react";
import "../styles/landingpage.css";
import graduation from "../assets/graduation.jpeg";

const QUIZ_DATA = [
  { course: "Med-Surg", questions: [
    { q: "A patient with Type 2 diabetes has fasting blood glucose 285 mg/dL. Priority intervention?", options: ["A. Administer scheduled insulin", "B. Encourage fluids only", "C. Notify physician immediately", "D. Recheck in 30 min"] },
    { q: "A patient on IV heparin has aPTT of 120 sec (range 60–80 sec). Priority action?", options: ["A. Continue current rate", "B. Increase rate by 20%", "C. Stop infusion, notify physician", "D. Document and reassess in 4 hours"] },
    { q: "A nurse caring for a patient with AKI sees which lab as MOST concerning?", options: ["A. Creatinine 3.2 mg/dL", "B. BUN 45 mg/dL", "C. Potassium 6.8 mEq/L", "D. Urine output 25 mL/hr"] },
  ]},
  { course: "Pharmacology", questions: [
    { q: "Before giving digoxin (Lanoxin), which finding prompts withholding the dose?", options: ["A. BP 118/78 mmHg", "B. Apical pulse 52 bpm", "C. K⁺ 4.1 mEq/L", "D. RR 18 breaths/min"] },
    { q: "A patient taking warfarin reports eating large amounts of spinach. What is the concern?", options: ["A. Bleeding risk increases", "B. Vitamin K may reduce anticoagulation effect", "C. Warfarin becomes toxic", "D. No concern — diet has no effect"] },
    { q: "A nurse is about to give IV vancomycin. Which precaution is priority?", options: ["A. Administer over 15 minutes", "B. Monitor for Red Man Syndrome — infuse over 60+ min", "C. Give with milk to reduce GI upset", "D. No special monitoring needed"] },
  ]},
  { course: "Maternal-Newborn", questions: [
    { q: "Late decelerations appear on the fetal monitor during labour. Priority nursing action?", options: ["A. Document and continue monitoring", "B. Reposition to left lateral & notify provider", "C. Increase oxytocin infusion rate", "D. Administer O₂ at 2 L/min via nasal cannula"] },
    { q: "A new mother's fundus is boggy 1 hour post-delivery. First action?", options: ["A. Notify the physician", "B. Massage the fundus firmly", "C. Increase IV fluids", "D. Apply ice pack to abdomen"] },
    { q: "A newborn's Apgar score is 4 at 1 minute. Priority action?", options: ["A. Reassess at 5 minutes only", "B. Provide stimulation and supplemental O₂", "C. Administer epinephrine", "D. Transfer to NICU immediately"] },
  ]},
  { course: "Pediatric", questions: [
    { q: "A 4-year-old with suspected epiglottitis arrives. Most important action?", options: ["A. Obtain throat culture immediately", "B. Place in supine position", "C. Keep calm, avoid agitating procedures", "D. Start oral antibiotics"] },
    { q: "An 8-month-old presents with high-pitched cry, bulging fontanelle, and fever. Suspected diagnosis?", options: ["A. Colic", "B. Bacterial meningitis", "C. Roseola", "D. Intussusception"] },
    { q: "A child with sickle cell disease is in vaso-occlusive crisis. Priority intervention?", options: ["A. Restrict IV fluids", "B. Apply cold compresses to painful areas", "C. Administer IV fluids and pain management", "D. Prepare for immediate blood transfusion"] },
  ]},
  { course: "Psychiatric", questions: [
    { q: "A patient says 'I have a plan to hurt myself tonight.' First priority?", options: ["A. Document in chart", "B. Notify physician", "C. Ensure immediate safety — stay with patient", "D. Ask patient to sign no-harm contract"] },
    { q: "A patient taking lithium reports nausea, tremors, and confusion. What does the nurse suspect?", options: ["A. Common side effects — no action needed", "B. Lithium toxicity — hold dose, notify provider", "C. Medication is not working", "D. Allergic reaction — give diphenhydramine"] },
    { q: "Which statement by a patient taking an MAOI indicates a need for further teaching?", options: ["A. 'I will avoid aged cheeses and red wine'", "B. 'I eat a lot of leftover meats and pickled foods'", "C. 'I carry a list of unsafe medications'", "D. 'I will tell my dentist about this medication'"] },
  ]},
];

const FEATURES = [
  { icon: <Zap />, title: "Adaptive Quizzes", desc: "Smart question banks that focus on your weak areas and track improvement across every nursing course." },
  { icon: <BookOpen />, title: "Study Library", desc: "Access clinical guides, lecture notes, and exam prep documents uploaded by qualified instructors." },
  { icon: <TrendingUp />, title: "Progress Analytics", desc: "Visualise your performance with score history, course breakdowns, and trend charts." },
  { icon: <Trophy />, title: "Leaderboard & Points", desc: "Earn points for every quiz completed and compete with peers on the national leaderboard." },
];

const LEADERBOARD_PREVIEW = [
  { rank: 1, name: "Abena M.", score: 4820, badge: "🥇" },
  { rank: 2, name: "Kwame A.", score: 4610, badge: "🥈" },
  { rank: 3, name: "Efua S.",  score: 4390, badge: "🥉" },
  { rank: 4, name: "Nana K.", score: 4150, badge: "⭐" },
  { rank: 5, name: "Ama B.",  score: 3980, badge: "⭐" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactStatus, setContactStatus] = useState(null);

  // Quiz state
  const [activeCourse, setActiveCourse] = useState(0);
  const [questionIdx, setQuestionIdx]   = useState(0);   // 0 | 1 | 2
  const [phase, setPhase]               = useState("quiz"); // "quiz" | "done"
  const [advancing, setAdvancing]       = useState(false);

  // Leaderboard
  const [leaders, setLeaders] = useState(LEADERBOARD_PREVIEW);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    api.get("/user/leaderboard").then(r => {
      if (r.data?.length) setLeaders(r.data.slice(0, 5).map((u, i) => ({
        rank: i + 1, name: u.name || "Student",
        score: u.totalPoints || u.points || 0,
        badge: ["🥇","🥈","🥉","⭐","⭐"][i],
      })));
    }).catch(() => {});
  }, []);

  const switchCourse = (idx) => {
    setActiveCourse(idx);
    setQuestionIdx(0);
    setPhase("quiz");
    setAdvancing(false);
  };

  const handleAnswer = () => {
    if (advancing) return;
    setAdvancing(true);
    setTimeout(() => {
      const nextIdx = questionIdx + 1;
      if (nextIdx >= QUIZ_DATA[activeCourse].questions.length) {
        setPhase("done");
      } else {
        setQuestionIdx(nextIdx);
      }
      setAdvancing(false);
    }, 700);
  };

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

  const courseData = QUIZ_DATA[activeCourse];
  const currentQ  = courseData.questions[questionIdx];

  return (
    <div className="landing-container">
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
            <p>Universal Health Community gives nursing students access to adaptive quizzes, a curated study library, and a live leaderboard — all free. Built for student nurses in Ghana and across Africa.</p>
            <div className="hero-actions">
              <button className="hero-btn" onClick={() => navigate("/auth")}>Create Free Account</button>
              <button className="hero-btn-secondary" onClick={() => navigate("/auth")}>Browse Library</button>
            </div>
          </motion.div>
        </div>
        <div className="hero-image-wrapper">
          <div className="hero-image-container">
            <img src={graduation} alt="Nursing student graduating" />
            <div className="hero-floating-card">
              <div style={{ background:"#10b981", padding:"8px", borderRadius:"10px", color:"white" }}><Trophy size={20}/></div>
              <div>
                <div style={{ fontWeight:800, fontSize:"0.9rem" }}>Free forever</div>
                <div style={{ fontSize:"0.75rem", color:"#64748b" }}>No credit card needed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ QUIZ PREVIEW ══════════════════════════════════════════════ */}
      <section className="quiz-section">
        <div style={{ maxWidth:860, margin:"0 auto" }}>
          <span className="section-label">🧠 Sample Quiz</span>
          <h2 className="section-title" style={{ textAlign:"left" }}>Test Your Nursing Knowledge</h2>
          <p style={{ color:"var(--text-secondary)", fontSize:"1rem", marginBottom:32, maxWidth:560 }}>
            Select a course and answer 3 questions. <strong>Create a free account</strong> to see correct answers and unlock unlimited practice.
          </p>

          {/* Course tabs */}
          <div className="quiz-courses">
            {QUIZ_DATA.map((c,i) => (
              <button key={i} onClick={() => switchCourse(i)}
                style={{
                  padding:"7px 16px", borderRadius:99, border:"1px solid",
                  borderColor: activeCourse===i ? "#10b981" : "#e2e8f0",
                  background: activeCourse===i ? "#10b981" : "white",
                  color: activeCourse===i ? "white" : "#475569",
                  fontSize:".78rem", fontWeight:700, cursor:"pointer", transition:"all .2s"
                }}>{c.course}</button>
            ))}
          </div>

          {/* Question card or Done screen */}
          {phase === "done" ? (
            <motion.div initial={{ opacity:0, scale:.96 }} animate={{ opacity:1, scale:1 }}
              className="quiz-card" style={{ textAlign:"center", padding:"48px 32px" }}>
              <div style={{ fontSize:"3rem", marginBottom:16 }}>🎉</div>
              <h3 style={{ fontWeight:800, fontSize:"1.3rem", color:"#0f172a", marginBottom:12 }}>
                You've used all 3 guest questions for {courseData.course}!
              </h3>
              <p style={{ color:"#64748b", fontSize:".95rem", marginBottom:28, lineHeight:1.6 }}>
                Create a free account to see your answers, get detailed explanations, and access <strong>thousands more nursing questions</strong> across all courses.
              </p>
              <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
                <button onClick={() => navigate("/auth")}
                  style={{ padding:"12px 32px", background:"#10b981", color:"white", border:"none", borderRadius:12, fontWeight:800, fontSize:"1rem", cursor:"pointer" }}>
                  Create Free Account →
                </button>
                <button onClick={() => switchCourse((activeCourse+1) % QUIZ_DATA.length)}
                  style={{ padding:"12px 24px", background:"#f1f5f9", color:"#0f172a", border:"1px solid #e2e8f0", borderRadius:12, fontWeight:700, fontSize:".9rem", cursor:"pointer" }}>
                  Try another course
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key={`${activeCourse}-${questionIdx}`}
              initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ duration:.3 }}
              className="quiz-card">
              {/* Progress dots */}
              <div style={{ display:"flex", gap:6, marginBottom:18 }}>
                {courseData.questions.map((_,i) => (
                  <div key={i} style={{
                    height:4, flex:1, borderRadius:99,
                    background: i < questionIdx ? "#10b981" : i === questionIdx ? "#10b981" : "#e2e8f0",
                    opacity: i === questionIdx ? 1 : i < questionIdx ? 0.5 : 0.3
                  }}/>
                ))}
              </div>
              <div style={{ fontSize:".78rem", fontWeight:700, color:"#10b981", marginBottom:12, textTransform:"uppercase", letterSpacing:".05em" }}>
                Question {questionIdx+1} of {courseData.questions.length} · {courseData.course}
              </div>
              <p style={{ fontSize:"1.05rem", fontWeight:700, color:"#0f172a", lineHeight:1.6, marginBottom:24 }}>
                {currentQ.q}
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {currentQ.options.map((opt, oi) => (
                  <button key={oi} onClick={handleAnswer}
                    disabled={advancing}
                    style={{
                      display:"flex", alignItems:"center", gap:12,
                      padding:"13px 18px", borderRadius:12,
                      border:"2px solid #e2e8f0", background:"white",
                      color:"#0f172a", textAlign:"left", cursor: advancing ? "not-allowed" : "pointer",
                      fontWeight:500, fontSize:".93rem", transition:"all .15s",
                      opacity: advancing ? 0.6 : 1
                    }}
                    onMouseEnter={e => { if(!advancing) e.currentTarget.style.borderColor="#10b981"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor="#e2e8f0"; }}>
                    <span style={{ width:26, height:26, borderRadius:"50%", flexShrink:0,
                      border:"2px solid #d1d5db", display:"flex", alignItems:"center",
                      justifyContent:"center", fontSize:".75rem", color:"#94a3b8" }}>
                      {opt.charAt(0)}
                    </span>
                    {opt.substring(3)}
                  </button>
                ))}
              </div>
              <div style={{ marginTop:16, display:"flex", alignItems:"center", gap:6 }}>
                <Lock size={13} color="#94a3b8"/>
                <span style={{ fontSize:".75rem", color:"#94a3b8" }}>
                  Answers are revealed after you create a free account
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ══ LEADERBOARD ═══════════════════════════════════════════════ */}
      <section className="lb-section">
        <div className="lb-grid">
          <div>
            <span className="section-label">🏆 Leaderboard</span>
            <h2 className="section-title" style={{ textAlign:"left", fontSize:"2.4rem" }}>Compete &amp; Climb the Rankings</h2>
            <p style={{ color:"var(--text-secondary)", fontSize:"1rem", lineHeight:1.7, marginBottom:32 }}>
              Every quiz you complete earns you points. Top scorers appear on the national leaderboard — visible to all students. Join today and start climbing.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:36 }}>
              {["Earn points for every completed quiz","Compete with students across all courses","Your rank is shown on your public profile","Rankings update in real time"].map((f,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, fontSize:".95rem", color:"#0f172a", fontWeight:500 }}>
                  <CheckCircle2 size={18} color="#10b981"/>{f}
                </div>
              ))}
            </div>
            <button onClick={() => navigate("/auth")}
              style={{ padding:"14px 32px", background:"#0f172a", color:"white", border:"none",
                borderRadius:12, fontWeight:800, fontSize:"1rem", cursor:"pointer",
                display:"flex", alignItems:"center", gap:10 }}>
              Join &amp; Compete <ChevronRight size={18}/>
            </button>
          </div>
          <div className="lb-card">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <div style={{ fontWeight:800, fontSize:"1rem", color:"#0f172a" }}>🏆 Top Students</div>
              <span style={{ fontSize:".72rem", color:"#10b981", fontWeight:700, background:"rgba(16,185,129,.08)", padding:"3px 10px", borderRadius:99 }}>Live</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {leaders.map((l,i) => (
                <div key={i} style={{
                  display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:12,
                  background: i===0 ? "linear-gradient(135deg,rgba(255,215,0,.1),rgba(255,215,0,.04))" : "#f8fafc",
                  border:`1px solid ${i===0 ? "rgba(255,215,0,.25)" : "#f1f5f9"}`
                }}>
                  <span style={{ fontSize:"1.2rem", width:26, textAlign:"center" }}>{l.badge}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:".87rem", color:"#0f172a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.name}</div>
                    <div style={{ fontSize:".7rem", color:"#94a3b8" }}>Rank #{l.rank}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:3, fontWeight:800, fontSize:".87rem", color:"#10b981" }}>
                    <Star size={12} fill="#10b981" color="#10b981"/>{l.score.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => navigate("/auth")}
              style={{ width:"100%", marginTop:16, padding:"11px", background:"#f8fafc",
                border:"1px solid #e2e8f0", borderRadius:12, fontWeight:700,
                fontSize:".85rem", color:"#0f172a", cursor:"pointer" }}>
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
          {FEATURES.map((f,i) => (
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
            <div style={{ width:"100%", maxWidth:340, padding:"28px 32px", background:"rgba(255,255,255,0.12)", borderRadius:20, backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.2)" }}>
              {["✅ Adaptive quiz system","📚 Full study library access","🏆 Leaderboard & points","📊 Personal progress analytics","📱 Works on mobile & desktop"].map((item,i) => (
                <div key={i} style={{ color:"white", fontWeight:600, fontSize:".92rem", marginBottom:13 }}>{item}</div>
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
                <input type="text" placeholder="Full Name" value={contactForm.name} onChange={e => setContactForm({...contactForm, name:e.target.value})} required />
                <input type="email" placeholder="Email Address" value={contactForm.email} onChange={e => setContactForm({...contactForm, email:e.target.value})} required />
              </div>
              <textarea placeholder="How can we help?" value={contactForm.message} onChange={e => setContactForm({...contactForm, message:e.target.value})} required />
              <button type="submit" className="contact-submit-btn"><span>Send Message</span><ArrowRight size={18}/></button>
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