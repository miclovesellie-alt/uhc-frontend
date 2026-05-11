import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { motion } from "framer-motion";
import { BookOpen, Zap, TrendingUp, Trophy, ArrowRight, Lock, Star, CheckCircle2, Menu, X } from "lucide-react";
import "../styles/landingpage.css";
import graduation from "../assets/graduation.jpeg";

/* ─── Static data ──────────────────────────────────────────────── */
const QUIZ_DATA = [
  { course: "Med-Surg", questions: [
    { q: "A diabetic patient has fasting blood glucose of 285 mg/dL. Priority intervention?", options: ["A. Administer scheduled insulin", "B. Encourage fluids only", "C. Notify physician immediately", "D. Recheck in 30 minutes"] },
    { q: "IV heparin patient has aPTT of 120 sec (range 60–80 sec). Priority action?", options: ["A. Continue current rate", "B. Increase rate by 20%", "C. Stop infusion, notify physician", "D. Document and reassess in 4 hours"] },
    { q: "A patient with AKI — which lab result is MOST concerning?", options: ["A. Creatinine 3.2 mg/dL", "B. BUN 45 mg/dL", "C. Potassium 6.8 mEq/L", "D. Urine output 25 mL/hr"] },
  ]},
  { course: "Pharmacology", questions: [
    { q: "Before giving digoxin (Lanoxin), which finding prompts withholding the dose?", options: ["A. BP 118/78 mmHg", "B. Apical pulse 52 bpm", "C. K⁺ 4.1 mEq/L", "D. RR 18/min"] },
    { q: "A warfarin patient eats large amounts of spinach. The concern is?", options: ["A. Bleeding risk increases", "B. Vitamin K reduces anticoagulation", "C. Warfarin becomes toxic", "D. No concern"] },
    { q: "Priority precaution before giving IV vancomycin?", options: ["A. Infuse over 15 minutes", "B. Monitor for Red Man Syndrome — infuse 60+ min", "C. Give with milk", "D. No special monitoring"] },
  ]},
  { course: "Maternal-Newborn", questions: [
    { q: "Late decelerations on fetal monitor. Priority nursing action?", options: ["A. Document and continue", "B. Reposition to left lateral & notify provider", "C. Increase oxytocin rate", "D. Administer O₂ at 2 L/min nasal"] },
    { q: "Fundus is boggy 1 hour post-delivery. First action?", options: ["A. Notify physician", "B. Firmly massage the fundus", "C. Increase IV fluids", "D. Apply ice pack"] },
    { q: "Newborn Apgar score is 4 at 1 minute. Priority action?", options: ["A. Reassess at 5 minutes only", "B. Provide stimulation and supplemental O₂", "C. Administer epinephrine", "D. Transfer to NICU immediately"] },
  ]},
  { course: "Pediatric", questions: [
    { q: "4-year-old with suspected epiglottitis arrives. Most important action?", options: ["A. Obtain throat culture", "B. Place in supine position", "C. Keep calm, avoid agitating procedures", "D. Start oral antibiotics"] },
    { q: "8-month-old: high-pitched cry, bulging fontanelle, fever. Suspected diagnosis?", options: ["A. Colic", "B. Bacterial meningitis", "C. Roseola", "D. Intussusception"] },
    { q: "Child with sickle-cell disease in vaso-occlusive crisis. Priority intervention?", options: ["A. Restrict IV fluids", "B. Apply cold compresses", "C. IV fluids and pain management", "D. Immediate blood transfusion"] },
  ]},
  { course: "Psychiatric", questions: [
    { q: "Patient says 'I have a plan to hurt myself tonight.' First priority?", options: ["A. Document in chart", "B. Notify physician", "C. Stay with patient — ensure immediate safety", "D. No-harm contract"] },
    { q: "Lithium patient reports nausea, tremors, confusion. Nurse suspects?", options: ["A. Common side effects — no action", "B. Lithium toxicity — hold dose, notify provider", "C. Medication not working", "D. Allergic reaction"] },
    { q: "MAOI patient statement needing further teaching?", options: ["A. 'I avoid aged cheeses and red wine'", "B. 'I eat a lot of leftover meats and pickled foods'", "C. 'I carry a list of unsafe medications'", "D. 'I told my dentist about this medication'"] },
  ]},
];

const FEATURES = [
  { icon: <Zap size={22}/>, title: "Adaptive Quizzes",       desc: "Smart question banks that focus on your weak areas across every nursing course." },
  { icon: <BookOpen size={22}/>, title: "Study Library",      desc: "Clinical guides, lecture notes, and exam prep documents from qualified instructors." },
  { icon: <TrendingUp size={22}/>, title: "Progress Analytics", desc: "Score history, course breakdowns, and trend charts to visualise your growth." },
  { icon: <Trophy size={22}/>, title: "Leaderboard & Points", desc: "Earn points for every quiz and compete with peers on the national leaderboard." },
];

const LEADERS_FALLBACK = [
  { rank:1, name:"Abena M.", score:4820, badge:"🥇" },
  { rank:2, name:"Kwame A.", score:4610, badge:"🥈" },
  { rank:3, name:"Efua S.",  score:4390, badge:"🥉" },
  { rank:4, name:"Nana K.", score:4150,  badge:"⭐" },
  { rank:5, name:"Ama B.",  score:3980,  badge:"⭐" },
];

/* ─── Component ────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled,        setScrolled]        = useState(false);
  const [mobileOpen,      setMobileOpen]       = useState(false);
  const [heroImage,       setHeroImage]        = useState(graduation);
  const [leaders,         setLeaders]          = useState(LEADERS_FALLBACK);
  const [contactForm,     setContactForm]      = useState({ name:"", email:"", message:"" });
  const [contactStatus,   setContactStatus]    = useState(null);
  const [siteContact,     setSiteContact]      = useState({ email:"boafokyei3@gmail.com", phone:"", whatsapp:"+233598173019", facebook:"", instagram:"", tiktok:"", twitter:"", youtube:"" });

  // Quiz
  const [course,   setCourse]   = useState(0);
  const [qIdx,     setQIdx]     = useState(0);
  const [phase,    setPhase]    = useState("quiz"); // "quiz" | "done"
  const [busy,     setBusy]     = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    api.get("/user/leaderboard").then(r => {
      if (r.data?.length) setLeaders(r.data.slice(0,5).map((u,i) => ({
        rank:i+1, name:u.name||"Student",
        score:u.totalPoints||u.points||0,
        badge:["🥇","🥈","🥉","⭐","⭐"][i],
      })));
    }).catch(()=>{});
    api.get("settings/heroImageUrl").then(r => {
      if (r.data?.value) setHeroImage(r.data.value);
    }).catch(()=>{});
    api.get("settings/contactInfo").then(r => {
      if (r.data?.value && typeof r.data.value === "object")
        setSiteContact(prev => ({ ...prev, ...r.data.value }));
    }).catch(()=>{});
  }, []);

  const selectCourse = (i) => { setCourse(i); setQIdx(0); setPhase("quiz"); setBusy(false); };

  const handleAnswer = () => {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      const next = qIdx + 1;
      if (next >= QUIZ_DATA[course].questions.length) setPhase("done");
      else setQIdx(next);
      setBusy(false);
    }, 600);
  };

  const handleContact = async (e) => {
    e.preventDefault();
    try {
      await api.post("/contact", contactForm);
      setContactStatus("success");
      setContactForm({ name:"", email:"", message:"" });
      setTimeout(() => setContactStatus(null), 5000);
    } catch { setContactStatus("error"); }
  };

  const q = QUIZ_DATA[course].questions[qIdx];

  return (
    <div className="landing-container">

      {/* ════════════════ NAVBAR ════════════════ */}
      <nav className={`landing-navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="landing-logo" onClick={() => { window.scrollTo(0,0); setMobileOpen(false); }}>
          <span className="logo-text wave-text">
            {"UHC".split("").map((c,i) => <span key={i} style={{"--i":i}}>{c}</span>)}
          </span>
        </div>
        <div className={`landing-nav-links ${mobileOpen ? "active" : ""}`}>
          <span className="nav-link" onClick={() => { navigate("/auth"); setMobileOpen(false); }}>Quizzes</span>
          <span className="nav-link" onClick={() => { navigate("/auth"); setMobileOpen(false); }}>Library</span>
          <span className="nav-link" onClick={() => { navigate("/auth"); setMobileOpen(false); }}>Leaderboard</span>
        </div>
        <div className="landing-nav-right">
          <span className="landing-login desktop-only" onClick={() => navigate("/auth")}>Log In</span>
          <button className="landing-signup desktop-only" onClick={() => navigate("/auth")}>Get Started Free</button>
          <button className="mobile-menu-btn" onClick={() => setMobileOpen(o => !o)}>
            {mobileOpen ? <X size={26}/> : <Menu size={26}/>}
          </button>
        </div>
      </nav>

      {/* ════════════════ HERO ════════════════ */}
      <section className="hero-section">
        <div className="hero-text">
          <motion.div initial={{ opacity:0, x:-24 }} animate={{ opacity:1, x:0 }} transition={{ duration:.6 }}>
            <span className="section-label">Free Nursing Education Platform</span>
            <h1>Study Smarter.<br /><span className="highlight">Pass Your Exams.</span></h1>
            <p style={{ color:"var(--text-secondary)", fontSize:"1.05rem", lineHeight:1.75, margin:"20px 0 32px", maxWidth:480 }}>
              UHC Academy gives nursing students in Ghana &amp; Africa access to adaptive quizzes,
              a curated study library, and a live national leaderboard — completely free.
            </p>
            <div className="hero-actions">
              <button className="hero-btn" onClick={() => navigate("/auth")}>Create Free Account</button>
              <button className="hero-btn-secondary" onClick={() => navigate("/auth")}>Browse Library</button>
            </div>
          </motion.div>
        </div>
        <div className="hero-image-wrapper">
          <div className="hero-image-container">
            <img src={heroImage} alt="Nursing student" onError={e => { e.target.onerror=null; e.target.src=graduation; }} />
            <div className="hero-floating-card">
              <div style={{ background:"#10b981", padding:8, borderRadius:10, color:"white" }}><Trophy size={18}/></div>
              <div>
                <div style={{ fontWeight:800, fontSize:".88rem" }}>Free forever</div>
                <div style={{ fontSize:".73rem", color:"#64748b" }}>No credit card needed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ FEATURES ════════════════ */}
      <section className="features-section">
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <span className="section-label">What you get</span>
          <h2 className="section-title">Everything to pass your exams</h2>
          <p className="section-subtitle">Built specifically for nursing students — free, mobile-friendly, always growing.</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f,i) => (
            <motion.div key={i} className="feature-card"
              initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
              viewport={{ once:true }} transition={{ delay:i*.08 }}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ════════════════ QUIZ ════════════════ */}
      <section className="quiz-section">
        <div style={{ maxWidth:820, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <span className="section-label">🧠 Sample Quiz</span>
            <h2 className="section-title">Test Your Nursing Knowledge</h2>
            <p style={{ color:"var(--text-secondary)", fontSize:".95rem" }}>
              Answer 3 questions per course. <strong>Sign up free</strong> to unlock answers &amp; unlimited practice.
            </p>
          </div>

          {/* Course tabs */}
          <div className="quiz-courses">
            {QUIZ_DATA.map((c,i) => (
              <button key={i} onClick={() => selectCourse(i)} style={{
                padding:"7px 18px", borderRadius:99, cursor:"pointer",
                fontWeight:700, fontSize:".8rem", transition:"all .18s",
                border: course===i ? "none" : "1px solid #e2e8f0",
                background: course===i ? "#10b981" : "white",
                color: course===i ? "white" : "#475569",
              }}>{c.course}</button>
            ))}
          </div>

          {/* Card */}
          {phase === "done" ? (
            <motion.div className="quiz-card" initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ textAlign:"center", padding:"48px 28px" }}>
              <div style={{ fontSize:"3rem", marginBottom:12 }}>🎉</div>
              <h3 style={{ fontWeight:800, fontSize:"1.2rem", color:"#0f172a", margin:"0 0 10px" }}>
                You've used all 3 guest questions!
              </h3>
              <p style={{ color:"#64748b", fontSize:".92rem", lineHeight:1.7, marginBottom:28 }}>
                Create a free account to see the correct answers, get detailed explanations,
                and access thousands more questions across all nursing courses.
              </p>
              <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
                <button onClick={() => navigate("/auth")}
                  style={{ padding:"12px 28px", background:"#10b981", color:"white", border:"none",
                    borderRadius:12, fontWeight:800, fontSize:"1rem", cursor:"pointer" }}>
                  Create Free Account →
                </button>
                <button onClick={() => selectCourse((course+1) % QUIZ_DATA.length)}
                  style={{ padding:"12px 20px", background:"#f1f5f9", color:"#0f172a",
                    border:"1px solid #e2e8f0", borderRadius:12, fontWeight:700, cursor:"pointer" }}>
                  Try another course
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key={`${course}-${qIdx}`}
              initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ duration:.28 }}
              className="quiz-card">
              {/* Progress */}
              <div style={{ display:"flex", gap:6, marginBottom:16 }}>
                {QUIZ_DATA[course].questions.map((_,i) => (
                  <div key={i} style={{ flex:1, height:4, borderRadius:99,
                    background: i < qIdx ? "#10b981" : i===qIdx ? "#10b981" : "#e2e8f0",
                    opacity: i < qIdx ? .45 : 1 }}/>
                ))}
              </div>
              <div style={{ fontSize:".75rem", fontWeight:700, color:"#10b981", marginBottom:10,
                textTransform:"uppercase", letterSpacing:".05em" }}>
                Question {qIdx+1} of {QUIZ_DATA[course].questions.length} · {QUIZ_DATA[course].course}
              </div>
              <p style={{ fontSize:"1rem", fontWeight:700, color:"#0f172a", lineHeight:1.65, marginBottom:20 }}>
                {q.q}
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                {q.options.map((opt,i) => (
                  <button key={i} onClick={handleAnswer} disabled={busy}
                    style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px",
                      borderRadius:11, border:"2px solid #e2e8f0", background:"white",
                      color:"#0f172a", textAlign:"left", cursor:busy?"not-allowed":"pointer",
                      fontSize:".91rem", fontWeight:500, transition:"border-color .12s",
                      opacity: busy ? .6 : 1 }}
                    onMouseEnter={e=>{ if(!busy) e.currentTarget.style.borderColor="#10b981"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor="#e2e8f0"; }}>
                    <span style={{ width:24, height:24, borderRadius:"50%", border:"2px solid #d1d5db",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:".7rem", color:"#94a3b8", flexShrink:0 }}>{opt[0]}</span>
                    {opt.slice(3)}
                  </button>
                ))}
              </div>
              <div style={{ marginTop:14, display:"flex", alignItems:"center", gap:6 }}>
                <Lock size={12} color="#94a3b8"/>
                <span style={{ fontSize:".73rem", color:"#94a3b8" }}>Correct answers revealed after free sign-up</span>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ════════════════ LEADERBOARD ════════════════ */}
      <section className="lb-section">
        <div className="lb-grid">
          <div>
            <span className="section-label">🏆 Leaderboard</span>
            <h2 className="section-title" style={{ textAlign:"left", fontSize:"2.2rem", lineHeight:1.2 }}>
              Compete &amp; Climb<br/>the Rankings
            </h2>
            <p style={{ color:"var(--text-secondary)", lineHeight:1.75, margin:"16px 0 28px", maxWidth:400 }}>
              Every quiz earns you points. Top scorers appear on the national leaderboard,
              visible to all students. Join today and start climbing.
            </p>
            {["Earn points for every quiz","Compete across all courses","Your rank on your public profile","Rankings update in real time"].map((t,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:9,
                fontSize:".92rem", fontWeight:500, color:"#0f172a", marginBottom:10 }}>
                <CheckCircle2 size={17} color="#10b981"/>{t}
              </div>
            ))}
            <button onClick={() => navigate("/auth")}
              style={{ marginTop:24, padding:"13px 28px", background:"#0f172a", color:"white",
                border:"none", borderRadius:12, fontWeight:800, fontSize:".95rem",
                cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
              Join &amp; Compete <ArrowRight size={16}/>
            </button>
          </div>

          <div className="lb-card">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
              <div style={{ fontWeight:800, fontSize:".95rem", color:"#0f172a" }}>🏆 Top Students</div>
              <span style={{ fontSize:".7rem", color:"#10b981", fontWeight:700,
                background:"rgba(16,185,129,.1)", padding:"3px 10px", borderRadius:99 }}>Live</span>
            </div>
            {leaders.map((l,i) => (
              <div key={i} style={{
                display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:11,
                marginBottom:6,
                background: i===0 ? "linear-gradient(135deg,rgba(255,215,0,.1),rgba(255,215,0,.03))" : "#f8fafc",
                border:`1px solid ${i===0 ? "rgba(255,215,0,.25)" : "#f1f5f9"}`
              }}>
                <span style={{ fontSize:"1.15rem", width:24, textAlign:"center" }}>{l.badge}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:".85rem", color:"#0f172a",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.name}</div>
                  <div style={{ fontSize:".68rem", color:"#94a3b8" }}>Rank #{l.rank}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:3,
                  fontWeight:800, fontSize:".83rem", color:"#10b981" }}>
                  <Star size={11} fill="#10b981" color="#10b981"/>{l.score.toLocaleString()}
                </div>
              </div>
            ))}
            <button onClick={() => navigate("/auth")}
              style={{ width:"100%", marginTop:14, padding:"10px",
                background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:11,
                fontWeight:700, fontSize:".83rem", color:"#0f172a", cursor:"pointer" }}>
              View Full Leaderboard →
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════ CTA ════════════════ */}
      <section className="cta-section">
        <div className="cta-box">
          <div className="cta-content">
            <h2>Start studying smarter today</h2>
            <p>Create your free account in under 2 minutes. No credit card. No hidden fees.</p>
            <button className="cta-btn" onClick={() => navigate("/auth")}>Get Started Free →</button>
          </div>
          <div style={{ flex:1, display:"flex", justifyContent:"center" }}>
            <div style={{ padding:"28px 32px", background:"rgba(255,255,255,.12)",
              borderRadius:20, backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,.2)",
              maxWidth:300, width:"100%" }}>
              {["✅ Adaptive quiz system","📚 Full study library","🏆 Leaderboard & points","📊 Progress analytics","📱 Mobile-friendly"].map((t,i) => (
                <div key={i} style={{ color:"white", fontWeight:600, fontSize:".9rem", marginBottom:12 }}>{t}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-contact">
            <h3>Contact Us</h3>
            {siteContact.email && <p>Email: <strong>{siteContact.email}</strong></p>}
            {siteContact.phone && <p>Phone: <strong>{siteContact.phone}</strong></p>}
            {siteContact.whatsapp && <p>WhatsApp: <a href={`https://wa.me/${siteContact.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{color:"#10b981",fontWeight:700}}>{siteContact.whatsapp}</a></p>}
            {/* Social icons row */}
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:10 }}>
              {siteContact.facebook  && <a href={siteContact.facebook}  target="_blank" rel="noreferrer" style={{textDecoration:"none",fontSize:".8rem",padding:"5px 12px",borderRadius:99,background:"rgba(255,255,255,.1)",color:"white",fontWeight:600}}>Facebook</a>}
              {siteContact.instagram && <a href={siteContact.instagram} target="_blank" rel="noreferrer" style={{textDecoration:"none",fontSize:".8rem",padding:"5px 12px",borderRadius:99,background:"rgba(255,255,255,.1)",color:"white",fontWeight:600}}>Instagram</a>}
              {siteContact.tiktok    && <a href={siteContact.tiktok}    target="_blank" rel="noreferrer" style={{textDecoration:"none",fontSize:".8rem",padding:"5px 12px",borderRadius:99,background:"rgba(255,255,255,.1)",color:"white",fontWeight:600}}>TikTok</a>}
              {siteContact.twitter   && <a href={siteContact.twitter}   target="_blank" rel="noreferrer" style={{textDecoration:"none",fontSize:".8rem",padding:"5px 12px",borderRadius:99,background:"rgba(255,255,255,.1)",color:"white",fontWeight:600}}>Twitter/X</a>}
              {siteContact.youtube   && <a href={siteContact.youtube}   target="_blank" rel="noreferrer" style={{textDecoration:"none",fontSize:".8rem",padding:"5px 12px",borderRadius:99,background:"rgba(255,255,255,.1)",color:"white",fontWeight:600}}>YouTube</a>}
            </div>
            {contactStatus === "success" && <div style={{ color:"#10b981", fontSize:".83rem", marginBottom:10, fontWeight:600 }}>✓ Message sent!</div>}
            {contactStatus === "error"   && <div style={{ color:"#ef4444", fontSize:".83rem", marginBottom:10, fontWeight:600 }}>✕ Failed. Please try again.</div>}
            <form className="footer-contact-form" onSubmit={handleContact}>
              <div className="input-group">
                <input type="text" placeholder="Full Name" value={contactForm.name} onChange={e=>setContactForm({...contactForm,name:e.target.value})} required/>
                <input type="email" placeholder="Email Address" value={contactForm.email} onChange={e=>setContactForm({...contactForm,email:e.target.value})} required/>
              </div>
              <textarea placeholder="How can we help?" value={contactForm.message} onChange={e=>setContactForm({...contactForm,message:e.target.value})} required/>
              <button type="submit" className="contact-submit-btn"><span>Send Message</span><ArrowRight size={16}/></button>
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
            <h4>Community</h4>
            <ul>
              <li><a href="https://wa.me/233598173019" target="_blank" rel="noreferrer">WhatsApp Us</a></li>
              <li><a href="mailto:boafokyei3@gmail.com">Email Us</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Universal Health Community. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}