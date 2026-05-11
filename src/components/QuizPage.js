import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Flag, BookOpen, CheckCircle, Clock, AlertTriangle, Search } from "lucide-react";
import { UserContext } from "../context/UserContext";
import { useToast } from "./Toast";
import "../styles/quiz.css";
import api from "../api/api";
import coursesTopics from "../data/courses_topics.json";
import { usePageEnabled, MaintenanceScreen } from "../hooks/usePageEnabled";

/* ── Book Loader ── */
const BookLoader = ({ text = "Loading…" }) => (
  <div className="book-loader-wrap">
    <div className="book-anim">
      <div className="book-spine" />
      <div className="book-page bp1" />
      <div className="book-page bp2" />
      <div className="book-page bp3" />
    </div>
    <p className="book-loader-text">{text}</p>
  </div>
);

/* ── Circular Timer ── */
const CircleTimer = ({ timeLeft, total = 45 }) => {
  const r = 22, c = 2 * Math.PI * r;
  const pct = Math.max(0, timeLeft / total);
  const col = timeLeft < 10 ? "#ef4444" : timeLeft < 20 ? "#f59e0b" : "#4255ff";
  return (
    <div className="circle-timer">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} stroke="#e2e8f0" strokeWidth="4" fill="none" />
        <circle cx="28" cy="28" r={r} stroke={col} strokeWidth="4" fill="none"
          strokeDasharray={`${pct * c} ${c}`} strokeLinecap="round"
          transform="rotate(-90 28 28)"
          style={{ transition: "stroke-dasharray 1s linear, stroke .3s" }} />
      </svg>
      <span style={{ color: col, fontWeight: 700, fontSize: ".78rem" }}>{timeLeft}s</span>
    </div>
  );
};

/* ── Avatar color ── */
const avatarColor = (name = "") => {
  const cols = ["#4255ff","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4"];
  return cols[(name.charCodeAt(0) || 0) % cols.length];
};

/* ── Load questions ── */
const loadQ = async (course, limit) => {
  try {
    const res = await api.get(`/questions?course=${encodeURIComponent(course)}&limit=${limit}`);
    return res.data;
  } catch { return []; }
};

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function QuizPage() {
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const { disabled: quizDisabled, loading: checkingQuizFlag } = usePageEnabled("disableQuiz", isAdmin);
  const toast    = useToast();
  const userId   = localStorage.getItem("userId");
  const storeKey = `activeQuiz_${userId}`;
  const userName = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}").name || "Student"; } catch { return "Student"; } })();

  // Save a quiz result to history
  const saveQuizHistory = (course, score, total, bstreak) => {
    const histKey = `quizHistory_${userId}`;
    const prev = (() => { try { return JSON.parse(localStorage.getItem(histKey) || '[]'); } catch { return []; } })();
    const entry = { course, score, total, pct: total ? Math.round((score/total)*100) : 0, bestStreak: bstreak, date: new Date().toISOString() };
    localStorage.setItem(histKey, JSON.stringify([entry, ...prev].slice(0, 30)));
  };

  const [stage, setStage]               = useState("selectCourse");
  const [courses, setCourses]           = useState([]);
  const [selCourse, setSelCourse]       = useState(null);
  const [courseSearch, setCourseSearch] = useState("");
  const [questions, setQuestions]       = useState([]);
  const [loadingQ, setLoadingQ]         = useState(false);
  const [idx, setIdx]                   = useState(0);
  const [answers, setAnswers]           = useState([]);
  const [flagged, setFlagged]           = useState([]);
  const [selAns, setSelAns]             = useState(null);
  const [locked, setLocked]             = useState(false);
  const [score, setScore]               = useState(0);
  const [streak, setStreak]             = useState(0);
  const [bestStreak, setBestStreak]     = useState(0);
  const [done, setDone]                 = useState(false);
  const [reviewMode, setReviewMode]     = useState(false);
  const [showNav, setShowNav]           = useState(false);
  const [timeLeft, setTimeLeft]         = useState(45);
  const [blurred, setBlurred]           = useState(false);
  const { user, setUser } = React.useContext(UserContext);
  const timerRef = useRef(null);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Typo");

  const awardPoints = async (amount, reason) => {
    try {
      const res = await api.post("points/add", { amount, reason });
      if (user) setUser({ ...user, points: res.data.totalPoints });
    } catch (err) {
      console.error("Failed to award points", err);
    }
  };

  const [noSS, setNoSS] = useState(false);

  /* ── Fetch Global Settings ── */
  useEffect(() => {
    api.get("settings/noScreenshot").then(res => {
      if (res.data.value !== null) setNoSS(res.data.value);
    }).catch(() => {});
  }, []);

  /* ── Fetch courses ── */
  useEffect(() => { api.get("courses").then(r => setCourses(r.data)).catch(() => {}); }, []);

  /* ── No-screenshot ── */
  useEffect(() => {
    if (!noSS || stage !== "quiz") return;
    const blockKey = (e) => { if (e.key === "PrintScreen" || e.key === "F12") e.preventDefault(); };
    const blockCtx = (e) => e.preventDefault();
    const onBlur = () => setBlurred(true);
    const onFocus = () => setBlurred(false);
    
    // Attempt to clear clipboard on PrintScreen keyup
    const handleKeyUp = (e) => {
      if (e.key === "PrintScreen") {
        navigator.clipboard.writeText("");
      }
    };

    document.addEventListener("keydown", blockKey);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("contextmenu", blockCtx);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("keydown", blockKey);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("contextmenu", blockCtx);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [noSS, stage]);

  /* ── Restore from storage ── */
  useEffect(() => {
    const s = localStorage.getItem(storeKey);
    if (!s) return;
    try {
      const d = JSON.parse(s);
      setStage(d.stage); setSelCourse(d.selCourse); setQuestions(d.questions);
      setIdx(d.idx); setAnswers(d.answers); setFlagged(d.flagged || []);
      setSelAns(d.selAns); setLocked(d.locked || false);
      setScore(d.score); setStreak(d.streak || 0); setBestStreak(d.bestStreak || 0);
      setDone(d.done); setTimeLeft(d.timeLeft || 45);
    } catch {}
  }, [storeKey]);

  /* ── Persist state ── */
  useEffect(() => {
    if (stage !== "quiz") return;
    localStorage.setItem(storeKey, JSON.stringify({
      stage, selCourse, questions, idx, answers, flagged,
      selAns, locked, score, streak, bestStreak, done, timeLeft,
    }));
  }, [stage, selCourse, questions, idx, answers, flagged, selAns, locked, score, streak, bestStreak, done, timeLeft, storeKey]);

  /* ── Per-question timer ── */
  useEffect(() => {
    if (stage !== "quiz" || done || locked) { clearInterval(timerRef.current); return; }
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); confirmAnswer(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, idx, done, locked]);

  /* ── Load questions handler ── */
  const handleNumSelect = async (num) => {
    setLoadingQ(true);
    const qs = await loadQ(selCourse, num);
    setLoadingQ(false);
    if (!qs.length) { toast("No questions found for this course yet.", "warning"); return; }
    const fixed = qs.map(q => ({ ...q, correctAnswerText: q.options[q.answer] }));
    setQuestions(fixed);
    setAnswers(new Array(fixed.length).fill(null));
    setFlagged(new Array(fixed.length).fill(false));
    setIdx(0); setSelAns(null); setLocked(false);
    setScore(0); setStreak(0); setBestStreak(0);
    setDone(false); setTimeLeft(45); setStage("quiz");
  };

  /* ── Confirm answer ── */
  const confirmAnswer = useCallback((timedOut = false) => {
    clearInterval(timerRef.current);
    const ans = timedOut ? null : selAns;
    const updated = [...answers];
    updated[idx] = ans;
    setAnswers(updated);
    setLocked(true);
    const q = questions[idx];
    if (ans === q?.answer) {
      setScore(s => s + 1);
      const ns = streak + 1;
      setStreak(ns);
      setBestStreak(b => Math.max(b, ns));
    } else {
      setStreak(0);
    }
  }, [selAns, answers, idx, questions, streak]);

  /* ── Navigate to question ── */
  const goTo = (i) => {
    if (i < 0 || i >= questions.length) return;
    setIdx(i); setSelAns(answers[i]); setLocked(answers[i] !== null);
    setTimeLeft(45); setShowNav(false);
  };

  const handleNext = () => {
    if (idx < questions.length - 1) {
      goTo(idx + 1);
    } else {
      const completedQuizPoints = 1;
      const questionsAnsweredPoints = Math.floor(questions.length / 10) * 3;
      const totalPoints = completedQuizPoints + questionsAnsweredPoints;
      if (totalPoints > 0) awardPoints(totalPoints, "Quiz Completion");
      // Save to history
      const fs = answers.filter((a, i) => a === questions[i]?.answer).length;
      saveQuizHistory(selCourse, fs, questions.length, bestStreak);
      setDone(true);
    }
  };

  const submitReport = async () => {
    if (!reportReason) return;
    const q = questions[idx];
    try {
      await api.post("questions/report", {
        questionId: q._id || q.id || idx,
        questionText: q.question,
        reason: reportReason
      });
      toast("Question reported — thank you for your feedback!", "success");
      setShowReportModal(false);
    } catch (err) {
      toast("Failed to send report. Please try again.", "error");
    }
  };

  const toggleFlag = () => {
    const f = [...flagged]; f[idx] = !f[idx]; setFlagged(f);
  };

  const handleReview = () => {
    setReviewMode(true);
    setDone(false);
    goTo(0);
  };

  const q = questions[idx];
  const finalScore = answers.filter((a, i) => a === questions[i]?.answer).length;
  const pct = questions.length ? Math.round((finalScore / questions.length) * 100) : 0;

  if (checkingQuizFlag) return null;
  if (quizDisabled) return <MaintenanceScreen pageName="Quiz / Questions" />;

  return (
    <div className={`quiz-page-wrap ${noSS && stage === "quiz" ? "no-screenshot-mode" : ""}`}>
      {/* Watermark */}
      {noSS && stage === "quiz" && (
        <div className="quiz-watermark-overlay">
          {Array(15).fill(0).map((_, i) => (
            <div key={i} className="quiz-watermark-row" style={{ marginLeft: i % 2 === 0 ? "0" : "-100px" }}>
              {Array(10).fill(`${userName} · UHC CONFIDENTIAL · `).join("")}
            </div>
          ))}
        </div>
      )}

      {/* Blur overlay */}
      {noSS && stage === "quiz" && blurred && (
        <div className="quiz-blur-overlay" onClick={() => setBlurred(false)}>
          <div className="quiz-blur-inner">🔒<br /><b>Quiz Paused</b><br /><small>Click to resume</small></div>
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ══ COURSE SELECT ══ */}
        {stage === "selectCourse" && (
          <motion.div key="course" initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="quiz-card scrollable-card">
            <motion.button className="quiz-back-button" onClick={() => window.history.back()} animate={{ x: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              <ArrowLeft size={22} />
            </motion.button>
            <div className="quiz-header-badge"><BookOpen size={16} /> Quiz Arena</div>
            <h1 className="quiz-card-title">Choose a Course</h1>
            <p className="quiz-card-sub">Select the subject you want to practice</p>

            {/* Search bar */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #94a3b8)' }} />
              <input
                type="text"
                placeholder="Search courses..."
                value={courseSearch}
                onChange={e => setCourseSearch(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '10px 14px 10px 38px', borderRadius: 12,
                  border: '1.5px solid var(--border, #e2e8f0)',
                  background: 'var(--card-bg, #f8fafc)',
                  color: 'var(--text, #0f172a)',
                  fontSize: '.875rem', outline: 'none',
                }}
              />
            </div>

            <div className="quiz-course-grid">
              {(courses.length > 0 ? courses.map(c => c.name) : Object.keys(coursesTopics))
                .filter(name => name.toLowerCase().includes(courseSearch.toLowerCase()))
                .map(name => (
                  <button key={name} className="quiz-course-card" onClick={() => { setSelCourse(name); setStage("selectNumber"); }}>
                    <span className="quiz-course-icon">📚</span>
                    <span>{name}</span>
                  </button>
                ))
              }
              {(courses.length > 0 ? courses.map(c => c.name) : Object.keys(coursesTopics))
                .filter(name => name.toLowerCase().includes(courseSearch.toLowerCase())).length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px', color: 'var(--text-muted, #94a3b8)', fontSize: '.875rem' }}>
                  No courses match "{courseSearch}"
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ══ NUMBER SELECT ══ */}
        {stage === "selectNumber" && (
          <motion.div key="num" initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="quiz-card scrollable-card">
            <motion.button className="quiz-back-button" onClick={() => setStage("selectCourse")}>
              <ArrowLeft size={22} />
            </motion.button>
            <div className="quiz-header-badge"><Clock size={16} /> Select Mode</div>
            <h1 className="quiz-card-title">How Many Questions?</h1>
            <p className="quiz-card-sub">Course: <strong>{selCourse}</strong></p>
            {loadingQ ? <BookLoader text="Loading questions…" /> : (
              <div className="quiz-num-grid">
                {[
                  { n: 5,   label: "Quick",    icon: "⚡", desc: "~4 min",  col: "#10b981" },
                  { n: 10,  label: "Standard", icon: "📖", desc: "~8 min",  col: "#4255ff" },
                  { n: 20,  label: "Practice", icon: "💪", desc: "~15 min", col: "#8b5cf6" },
                  { n: 50,  label: "Advanced", icon: "🔥", desc: "~38 min", col: "#f59e0b" },
                  { n: 100, label: "Marathon", icon: "🏆", desc: "~75 min", col: "#ef4444" },
                ].map(({ n, label, icon, desc, col }) => (
                  <button key={n} className="quiz-num-card" style={{ "--nc": col }} onClick={() => handleNumSelect(n)}>
                    <span className="qnc-icon">{icon}</span>
                    <span className="qnc-count">{n}</span>
                    <span className="qnc-label">{label}</span>
                    <span className="qnc-desc">{desc}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ══ ACTIVE QUIZ ══ */}
        {stage === "quiz" && !done && q && (
          <motion.div 
            key={`q${idx}`} 
            initial={{ x: 60, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            exit={{ x: -60, opacity: 0 }} 
            transition={{ type: "spring", stiffness: 300, damping: 30 }} 
            className="quiz-card quiz-active-card"
            style={noSS ? { userSelect: "none", MozUserSelect: "none", WebkitUserSelect: "none", msUserSelect: "none" } : {}}
          >

            {/* Review Mode Banner */}
            {reviewMode && (
              <div style={{ background: 'linear-gradient(135deg,rgba(66,85,255,0.1),rgba(139,92,246,0.1))', border: '1px solid rgba(66,85,255,0.2)', borderRadius: 10, padding: '8px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent)' }}>📝 Review Mode — Q{idx + 1} of {questions.length}</span>
                <button onClick={() => { setReviewMode(false); setDone(true); }} style={{ background: 'none', border: '1px solid rgba(66,85,255,0.3)', borderRadius: 6, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }}>✕ Exit Review</button>
              </div>
            )}

            {/* Top bar */}
            <div className="quiz-top-bar">
              <div className="quiz-tb-left">
                <span className="quiz-q-counter">{idx + 1} / {questions.length}</span>
                {streak >= 3 && <span className="quiz-streak-badge">🔥 {streak}</span>}
              </div>
              <div className="quiz-tb-right">
                <button 
                  className="quiz-report-btn-header" 
                  onClick={() => setShowReportModal(true)}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#ef4444',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <AlertTriangle size={12} /> Report
                </button>
                <button className={`quiz-flag-btn${flagged[idx] ? " flagged" : ""}`} onClick={toggleFlag}><Flag size={14} /></button>
                <button className="quiz-nav-toggle-btn" onClick={() => setShowNav(s => !s)}>⊞</button>
                <CircleTimer timeLeft={timeLeft} total={45} />
              </div>
            </div>

            {/* Progress bar */}
            <div className="quiz-prog-wrap">
              <div className="quiz-prog-bar" style={{ width: `${(idx / questions.length) * 100}%` }} />
            </div>

            {/* Nav panel */}
            {showNav && (
              <div className="quiz-nav-panel">
                <div className="quiz-nav-grid">
                  {questions.map((_, i) => (
                    <button key={i} onClick={() => goTo(i)}
                      className={`qnd${i === idx ? " cur" : ""}${answers[i] !== null ? (answers[i] === questions[i]?.answer ? " ok" : " bad") : ""}${flagged[i] ? " flag" : ""}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                <div className="quiz-nav-legend">
                  <span><b className="qnd cur" />Current</span>
                  <span><b className="qnd ok" />Correct</span>
                  <span><b className="qnd bad" />Wrong</span>
                  <span><b className="qnd flag" />Flagged</span>
                </div>

              </div>
            )}

            {/* Question */}
            <div className="quiz-q-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                {q.difficulty && <span className={`qdiff qdiff-${(q.difficulty || "medium").toLowerCase()}`}>{q.difficulty}</span>}
                <h2 className="quiz-question">{q.question}</h2>
              </div>
            </div>

            {/* Options */}
            <div className="quiz-opts">
              {q.options.map((opt, i) => {
                let cls = "quiz-opt";
                const effectiveLocked = reviewMode || locked;
                const effectiveSel = reviewMode ? answers[idx] : selAns;
                if (effectiveLocked) {
                  if (i === q.answer) cls += " correct";
                  else if (i === effectiveSel) cls += " wrong";
                  else cls += " dimmed";
                } else if (selAns === i) cls += " selected";
                return (
                  <div
                    key={i}
                    className={cls}
                    onClick={() => !effectiveLocked && setSelAns(i)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if(!effectiveLocked && (e.key === 'Enter' || e.key === ' ')) setSelAns(i); }}
                    style={{ cursor: effectiveLocked ? 'default' : 'pointer' }}
                  >
                    <span className="opt-letter">{String.fromCharCode(65 + i)}</span>
                    <div className="opt-text">{opt}</div>
                    {effectiveLocked && i === q.answer && <CheckCircle size={15} className="opt-check" />}
                  </div>
                );
              })}
            </div>

            {/* Explanation */}
            {locked && q.explanation && (
              <motion.div className="quiz-explanation" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                💡 <strong>Explanation:</strong> {q.explanation}
              </motion.div>
            )}

            {/* Actions */}
            <div className="quiz-act-row">
              {reviewMode ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                  <button className="quiz-btn ghost" disabled={idx === 0} onClick={() => goTo(idx - 1)}>← Prev</button>
                  <button className="quiz-btn primary" onClick={() => { setReviewMode(false); setDone(true); }}>Back to Results</button>
                  <button className="quiz-btn ghost" disabled={idx === questions.length - 1} onClick={() => goTo(idx + 1)}>Next →</button>
                </div>
              ) : !locked ? (
                <button className="quiz-btn primary" disabled={selAns === null} onClick={() => confirmAnswer(false)}>Confirm Answer</button>
              ) : (
                <button className="quiz-btn success" onClick={handleNext}>{idx < questions.length - 1 ? "Next →" : "Finish 🏁"}</button>
              )}
            </div>

            {/* Mini stats */}
            <div className="quiz-mini-stats">
              <span>✅ {answers.filter((a, i) => a === questions[i]?.answer).length}</span>
              <span>❌ {answers.filter((a, i) => a !== null && a !== questions[i]?.answer).length}</span>
              <span>📌 {flagged.filter(Boolean).length}</span>
              <span>⏳ {questions.length - answers.filter(a => a !== null).length} left</span>
            </div>
          </motion.div>
        )}

        {/* ══ RESULTS ══ */}
        {done && (
          <motion.div key="result" initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 22 }} className="quiz-card quiz-result-card">
            <div className="qr-avatar" style={{ background: avatarColor(userName) }}>{userName[0]?.toUpperCase()}</div>
            <h1 className="qr-title">Quiz Complete!</h1>

            {/* Score ring */}
            <div className="qr-ring-wrap">
              <svg viewBox="0 0 120 120" width="130" height="130">
                <circle cx="60" cy="60" r="50" stroke="#e2e8f0" strokeWidth="10" fill="none" />
                <circle cx="60" cy="60" r="50"
                  stroke={pct >= 70 ? "#4255ff" : pct >= 50 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="10" fill="none"
                  strokeDasharray={`${(pct / 100) * 314} 314`} strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  style={{ transition: "stroke-dasharray 1.5s ease" }} />
              </svg>
              <div className="qr-ring-label">
                <span className="qr-big">{pct}%</span>
                <span className="qr-small">{finalScore}/{questions.length}</span>
              </div>
            </div>

            <div className="qr-grade">
              {pct >= 90 ? "🏆 Excellent!" : pct >= 70 ? "🎯 Great Work!" : pct >= 50 ? "📈 Keep Going!" : "💪 Try Again!"}
            </div>

            <div className="qr-stats-row">
              {[["✅","Correct",finalScore],["❌","Wrong",questions.length-finalScore],["🔥","Best Streak",bestStreak],["📌","Flagged",flagged.filter(Boolean).length]].map(([ic, lb, vl]) => (
                <div key={lb} className="qrs">
                  <span className="qrs-ic">{ic}</span>
                  <span className="qrs-vl">{vl}</span>
                  <span className="qrs-lb">{lb}</span>
                </div>
              ))}
            </div>

            <div className="qr-actions">
              <button className="quiz-btn primary" onClick={handleReview}>Review Answers</button>
              <button className="quiz-btn ghost" onClick={() => { localStorage.removeItem(storeKey); setStage("selectCourse"); setDone(false); setReviewMode(false); }}>New Quiz</button>
              {pct >= 70 && (
                <button className="quiz-btn secondary"
                  onClick={() => {
                    const date = new Date().toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" });
                    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>UHC Certificate</title>
                    <style>
                      body{margin:0;font-family:'Georgia',serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh}
                      .cert{width:760px;padding:60px;border:12px double #4255ff;background:white;text-align:center;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.15)}
                      .logo{font-size:2.2rem;font-weight:900;color:#4255ff;letter-spacing:4px;margin-bottom:4px}
                      .tagline{font-size:.85rem;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;margin-bottom:36px}
                      h2{font-size:1.1rem;color:#64748b;font-weight:400;margin:0 0 8px}
                      .name{font-size:2.6rem;color:#0f172a;font-weight:700;margin:8px 0 20px;border-bottom:2px solid #4255ff;padding-bottom:16px}
                      .desc{font-size:1rem;color:#374151;line-height:1.7;margin-bottom:24px}
                      .score{display:inline-block;padding:10px 28px;background:#4255ff;color:white;border-radius:99px;font-size:1.1rem;font-weight:700;margin-bottom:28px}
                      .date{font-size:.85rem;color:#94a3b8;margin-top:24px}
                      .seal{font-size:3rem;margin:20px 0 0}
                      @media print{body{background:white}.cert{box-shadow:none;border-color:#4255ff}}
                    </style></head><body>
                    <div class="cert">
                      <div class="logo">UHC</div>
                      <div class="tagline">Universal Health Campus</div>
                      <h2>This is to certify that</h2>
                      <div class="name">${userName}</div>
                      <div class="desc">has successfully completed the<br><strong>${selCourse}</strong><br>quiz assessment with distinction</div>
                      <div class="score">Score: ${pct}% &nbsp;·&nbsp; ${finalScore}/${questions.length} correct</div>
                      <div class="date">Awarded on ${date}</div>
                      <div class="seal">🎓</div>
                    </div>
                    <script>setTimeout(()=>window.print(),600)</script>
                    </body></html>`;
                    const w = window.open("","_blank");
                    w.document.write(html);
                    w.document.close();
                  }}>
                  🎓 Download Certificate
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ REPORT MODAL ══ */}
      {showReportModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#fff", padding: "24px", borderRadius: "16px",
            width: "90%", maxWidth: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
          }}>
            <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px", color: "#0f172a" }}>
              <AlertTriangle size={20} color="#ef4444" /> Report Question
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "16px" }}>
              Please select the reason for reporting this question.
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {["Typo", "Wrong Answer"].map(reason => (
                <label key={reason} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.9rem", color: "#334155" }}>
                  <input 
                    type="radio" 
                    name="reportReason" 
                    value={reason}
                    checked={reportReason === reason}
                    onChange={(e) => setReportReason(e.target.value)}
                    style={{ cursor: "pointer" }}
                  />
                  {reason}
                </label>
              ))}
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setShowReportModal(false)}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontWeight: 600, color: "#64748b" }}
              >
                Cancel
              </button>
              <button 
                onClick={submitReport}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#ef4444", cursor: "pointer", fontWeight: 600, color: "white" }}
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}