import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Flag, BookOpen, CheckCircle, Clock, AlertTriangle, Search, Pause, Play, ChevronDown, ChevronUp, Share2, Copy, X } from "lucide-react";
import { UserContext } from "../context/UserContext";
import { useToast } from "./Toast";
import "../styles/quiz.css";
import api from "../api/api";
import coursesTopics from "../data/courses_topics.json";
import { usePageEnabled, MaintenanceScreen } from "../hooks/usePageEnabled";
import {
  playSelect, playCorrect, playWrong, playFinish,
  playStreak, playTimerWarn, playRefresh,
} from "../utils/sounds";

/* ── Shuffle helper ── */
const shuffleArray = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

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
  const toast = useToast();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BUG FIX #1 — Stable storeKey
  // Previously recomputed from localStorage on every render, causing the
  // restore useEffect to re-fire with a different key after UserContext
  // hydrates, wiping quiz state and leaving a blank stage="quiz" screen.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const storeKeyRef = useRef(`activeQuiz_${localStorage.getItem("userId")}`);
  const storeKey = storeKeyRef.current;

  const userName = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").name || "Student"; }
    catch { return "Student"; }
  })();

  const saveQuizHistory = (course, sc, total, bstreak) => {
    const histKey = `quizHistory_${localStorage.getItem("userId")}`;
    const prev = (() => { try { return JSON.parse(localStorage.getItem(histKey) || "[]"); } catch { return []; } })();
    const entry = { course, score: sc, total, pct: total ? Math.round((sc / total) * 100) : 0, bestStreak: bstreak, date: new Date().toISOString() };
    localStorage.setItem(histKey, JSON.stringify([entry, ...prev].slice(0, 30)));
  };

  // ── Core state ──
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

  // ── New state: mode & pause ──
  const [mode, setMode]               = useState("timed"); // "timed" | "practice"
  const [paused, setPaused]           = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const { user, setUser } = useContext(UserContext);
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const { disabled: quizDisabled, loading: checkingQuizFlag } = usePageEnabled("disableQuiz", isAdmin);
  const timerRef = useRef(null);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Typo");
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [noSS, setNoSS] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState("score"); // "score" | "question"
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [previewDataUrl, setPreviewDataUrl] = useState("");

  // ── Always-fresh refs for functions used in closures/effects ──
  const confirmAnswerRef = useRef(null);
  const handleNextRef    = useRef(null);
  const toggleFlagRef    = useRef(null);

  // ── State snapshot ref for keyboard handler (registered once) ──
  const kbStateRef = useRef({});
  kbStateRef.current = { stage, done, locked, selAns, paused, mode };

  const awardPoints = async (amount, reason, course, questionsAnswered, totalQuestions) => {
    try {
      const res = await api.post("points/add", { amount, reason, course, questionsAnswered, totalQuestions });
      if (user) setUser({ ...user, points: res.data.totalPoints });

      // Dispatch rank toast event if rank changed (climbed)
      if (res.data.rankAfter && res.data.rankBefore && res.data.rankAfter < res.data.rankBefore) {
        const event = new CustomEvent("show-rank-toast", {
          detail: {
            rank: res.data.rankAfter,
            overtook: res.data.overtook || 0,
            gainedPoint: false
          }
        });
        window.dispatchEvent(event);
      }
    } catch (err) {
      console.error("Failed to award points", err);
    }
  };

  /* ─────────────────────────────────────────
     FETCH GLOBAL SETTINGS
  ───────────────────────────────────────── */
  useEffect(() => {
    api.get("settings/noScreenshot").then(res => {
      if (res.data.value !== null) setNoSS(res.data.value);
    }).catch(() => {});
  }, []);

  /* ─────────────────────────────────────────
     FETCH COURSES
  ───────────────────────────────────────── */
  useEffect(() => {
    api.get("courses").then(r => setCourses(r.data)).catch(() => {});
  }, []);

  /* ─────────────────────────────────────────
     NO-SCREENSHOT GUARDS
  ───────────────────────────────────────── */
  useEffect(() => {
    if (!noSS || stage !== "quiz") return;
    const blockKey   = (e) => { if (e.key === "PrintScreen" || e.key === "F12") e.preventDefault(); };
    const blockCtx   = (e) => e.preventDefault();
    const onBlur     = () => setBlurred(true);
    const onFocus    = () => setBlurred(false);
    const handleKeyUp = (e) => { if (e.key === "PrintScreen") navigator.clipboard.writeText(""); };

    document.addEventListener("keydown",  blockKey);
    document.addEventListener("keyup",    handleKeyUp);
    document.addEventListener("contextmenu", blockCtx);
    window.addEventListener("blur",  onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("keydown",     blockKey);
      document.removeEventListener("keyup",       handleKeyUp);
      document.removeEventListener("contextmenu", blockCtx);
      window.removeEventListener("blur",  onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [noSS, stage]);

  /* ─────────────────────────────────────────
     RESTORE FROM STORAGE
  ───────────────────────────────────────── */
  useEffect(() => {
    const s = localStorage.getItem(storeKey);
    if (!s) return;
    try {
      const d = JSON.parse(s);
      setStage(d.stage);
      setSelCourse(d.selCourse);
      setQuestions(d.questions || []);
      setIdx(d.idx);
      setAnswers(d.answers);
      setFlagged(d.flagged || []);
      setSelAns(d.selAns);
      setLocked(d.locked || false);
      setScore(d.score);
      setStreak(d.streak || 0);
      setBestStreak(d.bestStreak || 0);
      setDone(d.done);
      setTimeLeft(d.timeLeft || 45);
      setMode(d.mode || "timed");
    } catch {}
  }, [storeKey]);

  /* ─────────────────────────────────────────
     PERSIST STATE
  ───────────────────────────────────────── */
  useEffect(() => {
    if (stage !== "quiz") return;
    localStorage.setItem(storeKey, JSON.stringify({
      stage, selCourse, questions, idx, answers, flagged,
      selAns, locked, score, streak, bestStreak, done, timeLeft, mode,
    }));
  }, [stage, selCourse, questions, idx, answers, flagged, selAns, locked, score, streak, bestStreak, done, timeLeft, storeKey, mode]);

  /* ─────────────────────────────────────────
     CONFIRM ANSWER
  ───────────────────────────────────────── */
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
      if (ns > 0 && ns % 3 === 0) playStreak();
      else playCorrect();
      // Streak milestone toasts
      if ([3, 5, 10, 15, 20].includes(ns)) {
        toast(`🔥 ${ns} in a row! You're on fire!`, "success");
      }
    } else {
      setStreak(0);
      if (!timedOut) playWrong();
    }
  }, [selAns, answers, idx, questions, streak, toast]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BUG FIX #2 — Always-fresh confirmAnswer in timer
  // Previously the timer setInterval captured a stale confirmAnswer closure
  // (since confirmAnswer wasn't in the timer's deps), which could run with
  // stale answers/questions arrays and corrupt state or cause blank screen.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => { confirmAnswerRef.current = confirmAnswer; }, [confirmAnswer]);

  /* ─────────────────────────────────────────
     PER-QUESTION TIMER
  ───────────────────────────────────────── */
  useEffect(() => {
    // Practice mode — no timer
    if (mode !== "timed") { clearInterval(timerRef.current); return; }
    if (stage !== "quiz" || done || locked || paused) { clearInterval(timerRef.current); return; }
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if ((t === 10 || t === 5) && !locked) playTimerWarn();
        if (t <= 1) {
          clearInterval(timerRef.current);
          confirmAnswerRef.current(true); // always-fresh via ref
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, idx, done, locked, paused, mode]);

  /* ─────────────────────────────────────────
     NAVIGATION
  ───────────────────────────────────────── */
  const goTo = (i) => {
    if (i < 0 || i >= questions.length) return;
    setIdx(i);
    setSelAns(answers[i]);
    setLocked(answers[i] !== null);
    setTimeLeft(45);
    setShowNav(false);
  };

  const handleNext = useCallback(() => {
    if (idx < questions.length - 1) {
      // Inline goTo to avoid stale closure on the captured goTo fn
      const nextIdx = idx + 1;
      setIdx(nextIdx);
      setSelAns(answers[nextIdx]);
      setLocked(answers[nextIdx] !== null);
      setTimeLeft(45);
      setShowNav(false);
    } else {
      const completedQuizPoints = 1;
      const questionsAnsweredPoints = Math.floor(questions.length / 10) * 3;
      const totalPoints = completedQuizPoints + questionsAnsweredPoints;
      const fs = answers.filter((a, i) => a === questions[i]?.answer).length;
      if (totalPoints > 0) awardPoints(totalPoints, "Quiz Completion", selCourse, fs, questions.length);
      saveQuizHistory(selCourse, fs, questions.length, bestStreak);
      playFinish();
      setDone(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, questions, answers, selCourse, bestStreak]);

  useEffect(() => { handleNextRef.current = handleNext; }, [handleNext]);

  const toggleFlag = useCallback(() => {
    const f = [...flagged];
    f[idx] = !f[idx];
    setFlagged(f);
  }, [flagged, idx]);

  useEffect(() => { toggleFlagRef.current = toggleFlag; }, [toggleFlag]);

  /* ─────────────────────────────────────────
     KEYBOARD SHORTCUTS (registered once)
  ───────────────────────────────────────── */
  useEffect(() => {
    const handleKey = (e) => {
      const { stage, done, locked, selAns, paused, mode } = kbStateRef.current;
      if (stage !== "quiz" || done || paused) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

      if (!locked) {
        // A/B/C/D → select answer option
        const optMap = { a: 0, b: 1, c: 2, d: 3, A: 0, B: 1, C: 2, D: 3 };
        if (optMap[e.key] !== undefined) {
          setSelAns(optMap[e.key]);
          playSelect();
          return;
        }
        // Enter or Space → confirm selected answer
        if ((e.key === "Enter" || e.key === " ") && selAns !== null) {
          e.preventDefault();
          confirmAnswerRef.current(false);
          return;
        }
      } else {
        // Arrow Right or Enter → next question
        if (e.key === "ArrowRight" || e.key === "Enter") {
          e.preventDefault();
          handleNextRef.current();
          return;
        }
      }

      // F → toggle flag
      if (e.key === "f" || e.key === "F") {
        toggleFlagRef.current();
      }

      // P → pause/resume (timed mode only)
      if ((e.key === "p" || e.key === "P") && mode === "timed") {
        setPaused(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []); // Intentionally register once — state accessed via kbStateRef

  /* ─────────────────────────────────────────
     LOAD QUESTIONS
  ───────────────────────────────────────── */
  const handleNumSelect = async (num) => {
    setLoadingQ(true);
    const qs = await loadQ(selCourse, num);
    setLoadingQ(false);
    if (!qs.length) { toast("No questions found for this course yet.", "warning"); return; }

    // Shuffle question order
    const shuffledQs = shuffleArray(qs);

    // Shuffle options within each question and remap the correct answer index
    const fixed = shuffledQs.map(q => {
      const correctText = q.options[q.answer];
      const shuffledOptions = shuffleArray([...q.options]);
      const newAnswerIdx = shuffledOptions.indexOf(correctText);
      return { ...q, options: shuffledOptions, answer: newAnswerIdx, correctAnswerText: correctText };
    });

    setQuestions(fixed);
    setAnswers(new Array(fixed.length).fill(null));
    setFlagged(new Array(fixed.length).fill(false));
    setIdx(0); setSelAns(null); setLocked(false);
    setScore(0); setStreak(0); setBestStreak(0);
    setDone(false); setTimeLeft(45); setPaused(false);
    setStage("quiz");
    playRefresh();
  };

  /* ─────────────────────────────────────────
     REPORT
  ───────────────────────────────────────── */
  const submitReport = async () => {
    if (!reportReason) return;
    const q = questions[idx];
    try {
      await api.post("questions/report", {
        questionId: q._id || q.id || idx,
        questionText: q.question,
        reason: reportReason,
      });
      toast("Question reported — thank you for your feedback!", "success");
      setShowReportModal(false);
    } catch {
      toast("Failed to send report. Please try again.", "error");
    }
  };

  /* ─────────────────────────────────────────
     REVIEW
  ───────────────────────────────────────── */
  const handleReview = (startIdx = 0) => {
    setReviewMode(true);
    setDone(false);
    goTo(startIdx);
  };

  /* ─────────────────────────────────────────
     DERIVED
  ───────────────────────────────────────── */
  const q = questions[idx];
  const finalScore = answers.filter((a, i) => a === questions[i]?.answer).length;
  const pct = questions.length ? Math.round((finalScore / questions.length) * 100) : 0;

  const generateShareCanvas = (type, selectedIndex) => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d");

      if (!questions || !questions.length) {
        resolve(canvas);
        return;
      }

      const isDark = document.body.classList.contains("dark-theme");
      const primaryColor = "#4255ff";
      const secondaryColor = "#7c3aed";
      const cardBg = isDark ? "#1e293b" : "#ffffff";
      const textColor = isDark ? "#f1f5f9" : "#0f172a";
      const textMutedColor = isDark ? "#94a3b8" : "#475569";
      const borderColor = isDark ? "#334155" : "#e2e8f0";
      const badgeBg = isDark ? "rgba(66, 85, 255, 0.15)" : "rgba(66, 85, 255, 0.08)";

      // 1. Draw Linear Gradient Background
      const grad = ctx.createLinearGradient(0, 0, 1200, 630);
      grad.addColorStop(0, primaryColor);
      grad.addColorStop(1, secondaryColor);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 630);

      // 2. Draw Subtle Background Circles
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx.beginPath();
      ctx.arc(100, 100, 200, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(1100, 530, 250, 0, Math.PI * 2);
      ctx.fill();

      // 3. Draw Shadowed Rounded Card Container
      ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
      ctx.shadowBlur = 35;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 15;

      const drawRoundRect = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
      };

      ctx.fillStyle = cardBg;
      drawRoundRect(80, 50, 1040, 530, 24);

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Helper function to draw SVG logo onto canvas
      const drawLogoPromise = () => {
        return new Promise((resolveLogo) => {
          const img = new Image();
          const logoColor = encodeURIComponent(isDark ? "#818cf8" : primaryColor);
          const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="50" height="50">
            <path d="M50,8 C75,8 85,18 85,45 C85,72 50,90 50,90 C50,90 15,72 15,45 C15,18 25,8 50,8 Z" fill="none" stroke="${logoColor}" stroke-width="2.5" stroke-linejoin="round"/>
            <polygon points="50,11 68,17 50,23 32,17" fill="${logoColor}"/>
            <path d="M39,19.5 L39,23.5 C39,23.5 50,27 61,23.5 L61,19.5" fill="none" stroke="${logoColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M50,17 L35,20 L35,26" fill="none" stroke="${logoColor}" stroke-width="0.8" stroke-linecap="round"/>
            <circle cx="35" cy="26.5" r="1" fill="${logoColor}"/>
            <path d="M47,34 H53 V39 H58 V45 H53 V50 H47 V45 H42 V39 H47 Z" fill="${logoColor}"/>
            <path d="M50,75 C37,67 24,76 24,76 L24,62 C24,62 37,53 50,61" fill="none" stroke="${logoColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M50,75 C63,67 76,76 76,76 L76,62 C76,62 63,53 50,61" fill="none" stroke="${logoColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M50,61 L50,75" fill="none" stroke="${logoColor}" stroke-width="2" stroke-linecap="round"/>
          </svg>`;
          img.src = "data:image/svg+xml;utf8," + logoSvg;
          img.onload = () => {
            ctx.drawImage(img, 130, 90, 56, 56);
            resolveLogo();
          };
          img.onerror = () => resolveLogo();
        });
      };

      drawLogoPromise().then(() => {
        // Draw Header Text
        ctx.fillStyle = isDark ? "#818cf8" : primaryColor;
        ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
        ctx.fillText("UNIVERSAL HEALTH CAMPUS", 200, 115);

        ctx.fillStyle = textMutedColor;
        ctx.font = "14px system-ui, -apple-system, sans-serif";
        ctx.fillText("Empowering Healthcare Education", 200, 140);

        // Divider line
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(130, 170);
        ctx.lineTo(1070, 170);
        ctx.stroke();

        if (type === "score") {
          // --- SCORE CARD LAYOUT ---
          ctx.fillStyle = textColor;
          ctx.font = "bold 42px system-ui, -apple-system, sans-serif";
          ctx.fillText("Quiz Achievement!", 130, 240);

          ctx.fillStyle = textMutedColor;
          ctx.font = "500 18px system-ui, -apple-system, sans-serif";
          ctx.fillText("STUDENT", 130, 295);

          ctx.fillStyle = isDark ? "#818cf8" : primaryColor;
          ctx.font = "bold 34px system-ui, -apple-system, sans-serif";
          ctx.fillText(userName, 130, 340);

          ctx.fillStyle = textMutedColor;
          ctx.font = "500 18px system-ui, -apple-system, sans-serif";
          ctx.fillText("COURSE / TOPIC", 130, 400);

          ctx.fillStyle = textColor;
          ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
          const displayCourse = selCourse.length > 42 ? selCourse.slice(0, 42) + "..." : selCourse;
          ctx.fillText(displayCourse, 130, 440);

          // Draw bottom date & website link
          ctx.fillStyle = textMutedColor;
          ctx.font = "14px system-ui, -apple-system, sans-serif";
          const dateStr = new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
          ctx.fillText(dateStr + "  •  uhc-learning.com", 130, 520);

          // Draw circular score ring on the right
          const ringX = 860;
          const ringY = 320;
          const ringRadius = 90;

          // Background gray ring
          ctx.strokeStyle = isDark ? "#334155" : "#e2e8f0";
          ctx.lineWidth = 18;
          ctx.beginPath();
          ctx.arc(ringX, ringY, ringRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Active colored ring based on score
          const pctColor = pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
          ctx.strokeStyle = pctColor;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(ringX, ringY, ringRadius, -Math.PI / 2, -Math.PI / 2 + (pct / 100) * Math.PI * 2);
          ctx.stroke();

          // Draw score text inside ring
          ctx.fillStyle = textColor;
          ctx.font = "bold 44px system-ui, -apple-system, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${pct}%`, ringX, ringY + 8);

          ctx.fillStyle = textMutedColor;
          ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
          ctx.fillText(`${finalScore}/${questions.length} Correct`, ringX, ringY + 36);

          // Restore text alignment
          ctx.textAlign = "left";

        } else {
          // --- QUIZ QUESTION LAYOUT ---
          const qObj = questions[selectedIndex];
          const userAns = answers[selectedIndex];
          const isCorrect = userAns === qObj.answer;
          const wasAnswered = userAns !== null;

          // Draw Question badge
          ctx.fillStyle = badgeBg;
          drawRoundRect(130, 195, 180, 30, 15);
          ctx.fillStyle = isDark ? "#818cf8" : primaryColor;
          ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
          ctx.fillText(`QUESTION ${selectedIndex + 1} OF ${questions.length}`, 150, 215);

          // Draw status badge
          const statusText = isCorrect ? "CORRECT" : wasAnswered ? "INCORRECT" : "SKIPPED";
          const statusColor = isCorrect ? "#10b981" : wasAnswered ? "#ef4444" : "#f59e0b";
          const statusBg = isCorrect 
            ? "rgba(16, 185, 129, 0.12)" 
            : wasAnswered 
              ? "rgba(239, 68, 68, 0.12)" 
              : "rgba(245, 158, 11, 0.12)";
          
          ctx.fillStyle = statusBg;
          drawRoundRect(325, 195, 110, 30, 15);
          ctx.fillStyle = statusColor;
          ctx.fillText(statusText, 345, 215);

          // Draw Course name tag right-aligned
          ctx.fillStyle = textMutedColor;
          ctx.font = "italic 13px system-ui, -apple-system, sans-serif";
          ctx.textAlign = "right";
          const courseTag = selCourse.length > 40 ? selCourse.slice(0, 40) + "..." : selCourse;
          ctx.fillText(courseTag, 1070, 215);
          ctx.textAlign = "left";

          // Wrap question text
          ctx.fillStyle = textColor;
          ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
          
          const wrapText = (text, x, y, maxWidth, lineHeight) => {
            const words = text.split(" ");
            let line = "";
            let currentY = y;
            const lines = [];

            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + " ";
              const metrics = ctx.measureText(testLine);
              if (metrics.width > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + " ";
              } else {
                line = testLine;
              }
            }
            lines.push(line);

            const displayLines = lines.slice(0, 4);
            displayLines.forEach((l, i) => {
              if (i === 3 && lines.length > 4) {
                ctx.fillText(l.trim() + "...", x, currentY);
              } else {
                ctx.fillText(l.trim(), x, currentY);
              }
              currentY += lineHeight;
            });
            return currentY;
          };

          const endQuestionY = wrapText(qObj.question, 130, 270, 940, 30);

          // Draw Option box
          const drawOptionBox = (yPos, titleText, optIndex, typeStyle) => {
            const boxHeight = 65;
            const boxWidth = 940;
            const radius = 12;

            let bColor = borderColor;
            let bgColor = isDark ? "#0f172a" : "#f8fafc";
            let optLetBg = isDark ? "#334155" : "#e2e8f0";
            let optLetColor = textColor;

            if (typeStyle === "correct") {
              bColor = "#10b981";
              bgColor = isDark ? "rgba(16, 185, 129, 0.12)" : "rgba(16, 185, 129, 0.05)";
              optLetBg = "#10b981";
              optLetColor = "#ffffff";
            } else if (typeStyle === "wrong") {
              bColor = "#ef4444";
              bgColor = isDark ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.05)";
              optLetBg = "#ef4444";
              optLetColor = "#ffffff";
            }

            ctx.strokeStyle = bColor;
            ctx.fillStyle = bgColor;
            ctx.lineWidth = 1.5;
            drawRoundRect(130, yPos, boxWidth, boxHeight, radius);
            ctx.stroke();

            ctx.fillStyle = typeStyle === "correct" ? "#10b981" : typeStyle === "wrong" ? "#ef4444" : textMutedColor;
            ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
            ctx.fillText(titleText, 145, yPos + 18);

            const circleX = 160;
            const circleY = yPos + 41;
            ctx.fillStyle = optLetBg;
            ctx.beginPath();
            ctx.arc(circleX, circleY, 15, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = optLetColor;
            ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
            ctx.textAlign = "center";
            const optLetter = String.fromCharCode(65 + optIndex);
            ctx.fillText(optLetter, circleX, circleY + 5);
            ctx.textAlign = "left";

            ctx.fillStyle = textColor;
            ctx.font = "500 15px system-ui, -apple-system, sans-serif";
            const fullText = qObj.options[optIndex] || "";
            const optionText = fullText.length > 85 ? fullText.slice(0, 82) + "..." : fullText;
            ctx.fillText(optionText, 190, yPos + 46);

            const indicatorX = 1040;
            const indicatorY = yPos + boxHeight / 2;
            if (typeStyle === "correct") {
              ctx.fillStyle = "#10b981";
              ctx.beginPath();
              ctx.arc(indicatorX, indicatorY, 12, 0, Math.PI * 2);
              ctx.fill();
              
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.moveTo(indicatorX - 5, indicatorY);
              ctx.lineTo(indicatorX - 1, indicatorY + 4);
              ctx.lineTo(indicatorX + 5, indicatorY - 4);
              ctx.stroke();
            } else if (typeStyle === "wrong") {
              ctx.fillStyle = "#ef4444";
              ctx.beginPath();
              ctx.arc(indicatorX, indicatorY, 12, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.moveTo(indicatorX - 4, indicatorY - 4);
              ctx.lineTo(indicatorX + 4, indicatorY + 4);
              ctx.moveTo(indicatorX + 4, indicatorY - 4);
              ctx.lineTo(indicatorX - 4, indicatorY + 4);
              ctx.stroke();
            }
          };

          const box1Y = Math.min(endQuestionY + 15, 410);
          if (wasAnswered) {
            if (isCorrect) {
              drawOptionBox(box1Y, "YOUR ANSWER (CORRECT)", userAns, "correct");
            } else {
              drawOptionBox(box1Y, "YOUR ANSWER (INCORRECT)", userAns, "wrong");
              const box2Y = box1Y + 75;
              drawOptionBox(box2Y, "CORRECT ANSWER", qObj.answer, "correct");
            }
          } else {
            drawOptionBox(box1Y, "CORRECT ANSWER (YOU SKIPPED)", qObj.answer, "correct");
          }

          ctx.fillStyle = textMutedColor;
          ctx.font = "14px system-ui, -apple-system, sans-serif";
          ctx.fillText("Challenge your knowledge on uhc-learning.com", 130, 545);
        }

        resolve(canvas);
      });
    });
  };

  const handleNativeShare = () => {
    generateShareCanvas(shareType, selectedQuestionIndex).then((canvas) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], "uhc_quiz_achievement.png", { type: "image/png" });
        const shareText = shareType === "score" 
          ? `I just scored ${pct}% in the ${selCourse} quiz on Universal Health Campus!`
          : `Check out this interesting question from the ${selCourse} quiz on Universal Health Campus!`;

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: "Universal Health Campus",
            text: shareText,
            url: window.location.origin
          }).catch(err => {
            console.log("Share failed:", err);
            handleDownload();
          });
        } else {
          handleDownload();
        }
      }, "image/png");
    });
  };

  const handleDownload = () => {
    generateShareCanvas(shareType, selectedQuestionIndex).then((canvas) => {
      const link = document.createElement("a");
      const cleanCourse = selCourse.replace(/[^a-zA-Z0-9]/g, "_");
      link.download = `UHC_Quiz_${cleanCourse}_${shareType}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  };

  const handleCopyImage = () => {
    generateShareCanvas(shareType, selectedQuestionIndex).then((canvas) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        try {
          navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ]).then(() => {
            toast("Image copied to clipboard!", "success");
          }).catch(err => {
            console.error("Clipboard copy error:", err);
            toast("Browser copy not supported. Try downloading instead.", "error");
          });
        } catch (e) {
          toast("Browser copy not supported. Try downloading instead.", "error");
        }
      }, "image/png");
    });
  };

  const getWhatsAppShareUrl = () => {
    const text = shareType === "score"
      ? `I scored ${pct}% in the ${selCourse} quiz! Try to beat my score:`
      : `Check out this quiz on ${selCourse}:`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + window.location.origin)}`;
  };

  const getFacebookShareUrl = () => {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`;
  };

  const getTwitterShareUrl = () => {
    const text = shareType === "score"
      ? `I scored ${pct}% in the ${selCourse} quiz on @UHC! beat my score:`
      : `Try this medical quiz on ${selCourse}:`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`;
  };

  useEffect(() => {
    if (showShareModal && done) {
      generateShareCanvas(shareType, selectedQuestionIndex).then((canvas) => {
        setPreviewDataUrl(canvas.toDataURL("image/png"));
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showShareModal, shareType, selectedQuestionIndex, done]);

  if (checkingQuizFlag) return null;
  if (quizDisabled) return <MaintenanceScreen pageName="Quiz / Questions" />;

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className={`quiz-page-wrap ${noSS && stage === "quiz" ? "no-screenshot-mode" : ""}`}>

      {/* ── Watermark ── */}
      {noSS && stage === "quiz" && (
        <div className="quiz-watermark-overlay">
          {Array(15).fill(0).map((_, i) => (
            <div key={i} className="quiz-watermark-row" style={{ marginLeft: i % 2 === 0 ? "0" : "-100px" }}>
              {Array(10).fill(`${userName} · UHC CONFIDENTIAL · `).join("")}
            </div>
          ))}
        </div>
      )}

      {/* ── Blur overlay (window-focus loss) ── */}
      {noSS && stage === "quiz" && blurred && (
        <div className="quiz-blur-overlay" onClick={() => setBlurred(false)}>
          <div className="quiz-blur-inner">
            🔒<br /><b>Quiz Paused</b><br /><small>Click to resume</small>
          </div>
        </div>
      )}

      {/* ── Pause overlay (manual pause) ── */}
      {paused && stage === "quiz" && !done && (
        <div className="quiz-pause-overlay" onClick={() => setPaused(false)}>
          <motion.div
            className="quiz-pause-card"
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: "3.2rem", marginBottom: 8 }}>⏸️</div>
            <h3>Quiz Paused</h3>
            <p>Timer stopped. Resume when you're ready.</p>
            <button className="quiz-btn primary" style={{ marginTop: 8 }} onClick={() => setPaused(false)}>
              <Play size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
              Resume
            </button>
            <p className="quiz-pause-hint">Press <kbd>P</kbd> to toggle pause</p>
          </motion.div>
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ══════════ COURSE SELECT ══════════ */}
        {stage === "selectCourse" && (
          <motion.div
            key="course"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="quiz-card scrollable-card"
          >
            <motion.button
              className="quiz-back-button"
              onClick={() => window.history.back()}
              animate={{ x: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ArrowLeft size={22} />
            </motion.button>
            <div className="quiz-header-badge"><BookOpen size={16} /> Quiz Arena</div>
            <h1 className="quiz-card-title">Choose a Course</h1>
            <p className="quiz-card-sub">Select the subject you want to practice</p>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted, #94a3b8)" }} />
              <input
                type="text"
                placeholder="Search courses..."
                value={courseSearch}
                onChange={e => setCourseSearch(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "10px 14px 10px 38px", borderRadius: 12,
                  border: "1.5px solid var(--border, #e2e8f0)",
                  background: "var(--card-bg, #f8fafc)",
                  color: "var(--text, #0f172a)",
                  fontSize: ".875rem", outline: "none",
                }}
              />
            </div>

            <div className="quiz-course-grid">
              {(courses.length > 0 ? courses.map(c => c.name) : Object.keys(coursesTopics))
                .filter(name => name.toLowerCase().includes(courseSearch.toLowerCase()))
                .map(name => (
                  <button
                    key={name}
                    className="quiz-course-card"
                    onClick={() => { setSelCourse(name); setStage("selectNumber"); }}
                  >
                    <span className="quiz-course-icon">📚</span>
                    <span>{name}</span>
                  </button>
                ))}
              {(courses.length > 0 ? courses.map(c => c.name) : Object.keys(coursesTopics))
                .filter(name => name.toLowerCase().includes(courseSearch.toLowerCase())).length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "20px", color: "var(--text-muted, #94a3b8)", fontSize: ".875rem" }}>
                  No courses match "{courseSearch}"
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ══════════ NUMBER + MODE SELECT ══════════ */}
        {stage === "selectNumber" && (
          <motion.div
            key="num"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="quiz-card scrollable-card"
          >
            <motion.button className="quiz-back-button" onClick={() => setStage("selectCourse")}>
              <ArrowLeft size={22} />
            </motion.button>
            <button
              onClick={() => setShowQuitModal(true)}
              title="Exit quiz setup"
              style={{
                position: "absolute", top: 14, right: 14,
                background: "none", border: "1px solid #fecaca",
                borderRadius: 8, padding: "4px 10px",
                color: "#ef4444", fontSize: "0.75rem",
                fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >✕ Exit</button>

            <div className="quiz-header-badge"><Clock size={16} /> Select Mode</div>
            <h1 className="quiz-card-title">How Many Questions?</h1>
            <p className="quiz-card-sub">Course: <strong>{selCourse}</strong></p>

            {/* ── Mode Toggle ── */}
            <div className="quiz-mode-toggle">
              <button
                className={`quiz-mode-btn${mode === "timed" ? " active" : ""}`}
                onClick={() => setMode("timed")}
              >
                <span className="qmb-icon">⏱️</span>
                <span className="qmb-label">Timed</span>
                <span className="qmb-desc">45s per question</span>
              </button>
              <button
                className={`quiz-mode-btn${mode === "practice" ? " active" : ""}`}
                onClick={() => setMode("practice")}
              >
                <span className="qmb-icon">📖</span>
                <span className="qmb-label">Practice</span>
                <span className="qmb-desc">No time limit</span>
              </button>
            </div>

            {loadingQ ? <BookLoader text="Loading questions…" /> : (
              <div className="quiz-num-grid">
                {[
                  { n: 5,   label: "Quick",    icon: "⚡", desc: "~4 min",  col: "#10b981" },
                  { n: 10,  label: "Standard", icon: "📖", desc: "~8 min",  col: "#4255ff" },
                  { n: 20,  label: "Practice", icon: "💪", desc: "~15 min", col: "#8b5cf6" },
                  { n: 50,  label: "Advanced", icon: "🔥", desc: "~38 min", col: "#f59e0b" },
                  { n: 100, label: "Marathon", icon: "🏆", desc: "~75 min", col: "#ef4444" },
                ].map(({ n, label, icon, desc, col }) => (
                  <button
                    key={n}
                    className="quiz-num-card"
                    style={{ "--nc": col }}
                    onClick={() => handleNumSelect(n)}
                  >
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

        {/* ══════════ ACTIVE QUIZ ══════════ */}
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
              <div style={{ background: "linear-gradient(135deg,rgba(66,85,255,0.1),rgba(139,92,246,0.1))", border: "1px solid rgba(66,85,255,0.2)", borderRadius: 10, padding: "8px 14px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent)" }}>📝 Review Mode — Q{idx + 1} of {questions.length}</span>
                <button onClick={() => { setReviewMode(false); setDone(true); }} style={{ background: "none", border: "1px solid rgba(66,85,255,0.3)", borderRadius: 6, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 600, color: "var(--accent)", cursor: "pointer" }}>✕ Exit Review</button>
              </div>
            )}

            {/* Top bar */}
            <div className="quiz-top-bar">
              <div className="quiz-tb-left">
                <span className="quiz-q-counter">{idx + 1} / {questions.length}</span>
                {streak >= 3 && <span className="quiz-streak-badge">🔥 {streak}</span>}
                {mode === "practice" && <span className="quiz-mode-badge">📖 Practice</span>}
              </div>
              <div className="quiz-tb-right">
                <button
                  onClick={() => setShowQuitModal(true)}
                  title="Exit quiz"
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, border: "1px solid #fecaca", background: "#fef2f2", color: "#ef4444", fontSize: "0.65rem", fontWeight: 700, cursor: "pointer" }}
                >✕ Exit</button>

                <button
                  className="quiz-report-btn-header"
                  onClick={() => setShowReportModal(true)}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, border: "1px solid #fecaca", background: "#fef2f2", color: "#ef4444", fontSize: "0.65rem", fontWeight: 700, cursor: "pointer" }}
                >
                  <AlertTriangle size={12} /> Report
                </button>

                <button className={`quiz-flag-btn${flagged[idx] ? " flagged" : ""}`} onClick={toggleFlag} title="Flag (F)">
                  <Flag size={14} />
                </button>

                <button className="quiz-nav-toggle-btn" onClick={() => setShowNav(s => !s)}>⊞</button>

                {/* Pause button — timed mode only, not in review */}
                {mode === "timed" && !reviewMode && (
                  <button
                    className="quiz-pause-btn"
                    onClick={() => setPaused(p => !p)}
                    title={paused ? "Resume (P)" : "Pause (P)"}
                  >
                    {paused ? <Play size={14} /> : <Pause size={14} />}
                  </button>
                )}

                {/* Timer or infinity badge */}
                {mode === "timed"
                  ? <CircleTimer timeLeft={timeLeft} total={45} />
                  : <span className="quiz-practice-badge">∞</span>
                }
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
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      className={`qnd${i === idx ? " cur" : ""}${answers[i] !== null ? (answers[i] === questions[i]?.answer ? " ok" : " bad") : ""}${flagged[i] ? " flag" : ""}`}
                    >{i + 1}</button>
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
            <div className="quiz-q-wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
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
                  if (i === q.answer)      cls += " correct";
                  else if (i === effectiveSel) cls += " wrong";
                  else                         cls += " dimmed";
                } else if (selAns === i)   cls += " selected";
                return (
                  <div
                    key={i}
                    className={cls}
                    onClick={() => { if (!effectiveLocked) { setSelAns(i); playSelect(); } }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (!effectiveLocked && (e.key === "Enter" || e.key === " ")) { setSelAns(i); playSelect(); } }}
                    style={{ cursor: effectiveLocked ? "default" : "pointer" }}
                  >
                    <span className="opt-letter">{String.fromCharCode(65 + i)}</span>
                    <div className="opt-text">{opt}</div>
                    {effectiveLocked && i === q.answer && <CheckCircle size={15} className="opt-check" />}
                  </div>
                );
              })}
            </div>

            {/* Keyboard shortcut hints */}
            {!reviewMode && (
              <div className="quiz-kb-hints">
                <span><kbd>A</kbd>–<kbd>D</kbd> Select</span>
                {!locked && selAns !== null && <span><kbd>Enter</kbd> Confirm</span>}
                {locked && <span><kbd>→</kbd> Next</span>}
                <span><kbd>F</kbd> Flag</span>
                {mode === "timed" && <span><kbd>P</kbd> Pause</span>}
              </div>
            )}

            {/* Explanation */}
            {locked && q.explanation && (
              <motion.div className="quiz-explanation" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                💡 <strong>Explanation:</strong> {q.explanation}
              </motion.div>
            )}

            {/* Actions */}
            <div className="quiz-act-row">
              {reviewMode ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
                  <button className="quiz-btn ghost" disabled={idx === 0} onClick={() => goTo(idx - 1)}>← Prev</button>
                  <button className="quiz-btn primary" onClick={() => { setReviewMode(false); setDone(true); }}>Back to Results</button>
                  <button className="quiz-btn ghost" disabled={idx === questions.length - 1} onClick={() => goTo(idx + 1)}>Next →</button>
                </div>
              ) : !locked ? (
                <button className="quiz-btn primary" disabled={selAns === null} onClick={() => confirmAnswer(false)}>
                  Confirm Answer
                </button>
              ) : (
                <button className="quiz-btn success" onClick={handleNext}>
                  {idx < questions.length - 1 ? "Next →" : "Finish 🏁"}
                </button>
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

        {/* ══════════ RESULTS ══════════ */}
        {done && (
          <motion.div
            key="result"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="quiz-card quiz-result-card"
          >
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
              <button className="quiz-btn primary" onClick={() => handleReview(0)}>Review Answers</button>
              <button className="quiz-btn share-btn" onClick={() => {
                setShareType("score");
                setSelectedQuestionIndex(0);
                setShowShareModal(true);
              }}>
                <Share2 size={16} style={{ marginRight: 8, display: "inline-block", verticalAlign: "middle" }} /> Share Progress
              </button>
              <button className="quiz-btn ghost" onClick={() => {
                localStorage.removeItem(storeKey);
                setStage("selectCourse"); setDone(false); setReviewMode(false);
              }}>New Quiz</button>
              {pct >= 70 && (
                <button className="quiz-btn secondary" onClick={() => {
                  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
                  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width:100%;height:100%">
                    <path d="M50,8 C75,8 85,18 85,45 C85,72 50,90 50,90 C50,90 15,72 15,45 C15,18 25,8 50,8 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
                    <!-- Graduation Cap -->
                    <polygon points="50,11 68,17 50,23 32,17" fill="currentColor"/>
                    <path d="M39,19.5 L39,23.5 C39,23.5 50,27 61,23.5 L61,19.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M50,17 L35,20 L35,26" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
                    <circle cx="35" cy="26.5" r="1" fill="currentColor"/>
                    <!-- Medical Cross -->
                    <path d="M47,34 H53 V39 H58 V45 H53 V50 H47 V45 H42 V39 H47 Z" fill="currentColor"/>
                    <!-- Open Book -->
                    <path d="M50,75 C37,67 24,76 24,76 L24,62 C24,62 37,53 50,61" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M50,75 C63,67 76,76 76,76 L76,62 C76,62 63,53 50,61" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M50,61 L50,75" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <!-- Book lines -->
                    <line x1="30" y1="65" x2="44" y2="65" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
                    <line x1="30" y1="69" x2="44" y2="69" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
                    <line x1="56" y1="65" x2="70" y2="65" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
                    <line x1="56" y1="69" x2="70" y2="69" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
                    <!-- Syringe -->
                    <rect x="37" y="80" width="26" height="4" rx="1" fill="currentColor"/>
                    <line x1="25" y1="82" x2="37" y2="82" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
                    <line x1="25" y1="79.5" x2="25" y2="84.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <line x1="37" y1="78" x2="37" y2="86" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <polygon points="63,80.5 66,81 66,83 63,83.5" fill="currentColor"/>
                    <line x1="66" y1="82" x2="74" y2="82" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
                  </svg>`;

                  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>UHC Certificate of Achievement</title>
                  <link rel="preconnect" href="https://fonts.googleapis.com">
                  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Montserrat:wght@400;500;600;700;800&family=Great+Vibes&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap" rel="stylesheet">
                  <style>
                    :root {
                      --uhc-green: #10b981;
                      --uhc-green-dark: #059669;
                      --uhc-green-light: #d1fae5;
                      --uhc-green-pale: #f0fdf4;
                      --text-dark: #0f172a;
                      --text-muted: #475569;
                    }
                    body {
                      margin: 0;
                      padding: 0;
                      background: #f1f5f9;
                      font-family: 'Montserrat', sans-serif;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      min-height: 100vh;
                      box-sizing: border-box;
                    }
                    .cert-card {
                      width: 900px;
                      height: 630px;
                      background: #ffffff;
                      box-sizing: border-box;
                      position: relative;
                      padding: 40px;
                      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15);
                      border-radius: 8px;
                      overflow: hidden;
                      display: flex;
                      flex-direction: column;
                      justify-content: space-between;
                    }
                    .cert-border-outer {
                      position: absolute;
                      top: 15px;
                      left: 15px;
                      right: 15px;
                      bottom: 15px;
                      border: 3px solid var(--uhc-green-dark);
                      pointer-events: none;
                      border-radius: 4px;
                    }
                    .cert-border-inner {
                      position: absolute;
                      top: 22px;
                      left: 22px;
                      right: 22px;
                      bottom: 22px;
                      border: 1px solid var(--uhc-green);
                      pointer-events: none;
                      border-radius: 2px;
                    }
                    .corner-ornament {
                      position: absolute;
                      width: 30px;
                      height: 30px;
                      border-color: var(--uhc-green-dark);
                      border-style: solid;
                      pointer-events: none;
                    }
                    .top-left { top: 28px; left: 28px; border-width: 3px 0 0 3px; }
                    .top-right { top: 28px; right: 28px; border-width: 3px 3px 0 0; }
                    .bottom-left { bottom: 28px; left: 28px; border-width: 0 0 3px 3px; }
                    .bottom-right { bottom: 28px; right: 28px; border-width: 0 3px 3px 0; }
                    
                    .watermark-container {
                      position: absolute;
                      top: 50%;
                      left: 50%;
                      transform: translate(-50%, -50%);
                      width: 320px;
                      height: 320px;
                      opacity: 0.05;
                      pointer-events: none;
                      z-index: 0;
                      color: var(--uhc-green-dark);
                    }
                    
                    .cert-content {
                      position: relative;
                      z-index: 1;
                      height: 100%;
                      display: flex;
                      flex-direction: column;
                      justify-content: space-between;
                      align-items: center;
                      text-align: center;
                    }
                    
                    .cert-header {
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      margin-top: 10px;
                    }
                    .header-logo-icon {
                      width: 50px;
                      height: 50px;
                      color: var(--uhc-green);
                      margin-bottom: 8px;
                    }
                    .header-title {
                      font-size: 0.75rem;
                      font-weight: 800;
                      letter-spacing: 4px;
                      color: var(--uhc-green-dark);
                      text-transform: uppercase;
                    }
                    .header-subtitle {
                      font-size: 0.6rem;
                      font-weight: 500;
                      letter-spacing: 2px;
                      color: var(--text-muted);
                      margin-top: 2px;
                      text-transform: uppercase;
                    }
                    
                    .cert-body {
                      margin: 20px 0;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                    }
                    .cert-title {
                      font-family: 'Cinzel', serif;
                      font-size: 2.2rem;
                      font-weight: 700;
                      color: var(--text-dark);
                      letter-spacing: 2px;
                      margin-bottom: 5px;
                    }
                    .cert-award-to {
                      font-size: 0.85rem;
                      font-weight: 600;
                      color: var(--text-muted);
                      letter-spacing: 3px;
                      text-transform: uppercase;
                      margin: 15px 0 10px 0;
                    }
                    .recipient-name {
                      font-family: 'Playfair Display', serif;
                      font-size: 2.8rem;
                      font-weight: 700;
                      color: var(--text-dark);
                      margin: 5px 0 15px 0;
                      border-bottom: 2px solid var(--uhc-green);
                      padding-bottom: 8px;
                      min-width: 320px;
                      display: inline-block;
                    }
                    .cert-description {
                      font-size: 0.95rem;
                      color: var(--text-muted);
                      line-height: 1.6;
                      max-width: 600px;
                      font-weight: 500;
                    }
                    .course-title {
                      color: var(--uhc-green-dark);
                      font-weight: 700;
                      font-size: 1.1rem;
                    }
                    .cert-score-badge {
                      display: inline-flex;
                      align-items: center;
                      justify-content: center;
                      margin-top: 15px;
                      background: var(--uhc-green-pale);
                      border: 1px solid var(--uhc-green-light);
                      border-radius: 99px;
                      padding: 6px 20px;
                      font-size: 0.85rem;
                      font-weight: 700;
                      color: var(--uhc-green-dark);
                    }
                    
                    .cert-footer {
                      width: 100%;
                      display: flex;
                      justify-content: space-between;
                      align-items: flex-end;
                      padding: 0 40px;
                      box-sizing: border-box;
                      margin-bottom: 10px;
                    }
                    .footer-col {
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      width: 200px;
                    }
                    .signature-line {
                      width: 100%;
                      border-bottom: 1px solid #cbd5e1;
                      margin-bottom: 8px;
                      display: flex;
                      justify-content: center;
                      height: 35px;
                    }
                    .signature-img {
                      font-family: 'Great Vibes', cursive;
                      font-size: 1.8rem;
                      color: var(--uhc-green-dark);
                      transform: translateY(-5px);
                    }
                    .footer-label {
                      font-size: 0.65rem;
                      font-weight: 600;
                      color: var(--text-muted);
                      letter-spacing: 1px;
                      text-transform: uppercase;
                    }
                    .award-date {
                      font-size: 0.7rem;
                      font-weight: 700;
                      color: var(--text-dark);
                      margin-top: 4px;
                    }
                    
                    .seal-col {
                      display: flex;
                      justify-content: center;
                      align-items: center;
                    }
                    
                    @media print {
                      body {
                        background: #ffffff;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                      }
                      .cert-card {
                        box-shadow: none !important;
                        border: none !important;
                        width: 100vw;
                        height: 100vh;
                        padding: 40px;
                      }
                      @page {
                        size: landscape;
                        margin: 0;
                      }
                    }
                  </style></head><body>
                  <div class="cert-card">
                    <div class="cert-border-outer"></div>
                    <div class="cert-border-inner"></div>
                    <div class="corner-ornament top-left"></div>
                    <div class="corner-ornament top-right"></div>
                    <div class="corner-ornament bottom-left"></div>
                    <div class="corner-ornament bottom-right"></div>
                    
                    <div class="watermark-container">
                      ${logoSvg}
                    </div>
                    
                    <div class="cert-content">
                      <div class="cert-header">
                        <div class="header-logo-icon">
                          ${logoSvg}
                        </div>
                        <div class="header-title">Universal Health Campus</div>
                        <div class="header-subtitle">Empowering Healthcare Education</div>
                      </div>
                      
                      <div class="cert-body">
                        <div class="cert-title">Certificate of Achievement</div>
                        <div class="cert-award-to">This is proudly presented to</div>
                        <div class="recipient-name">${userName}</div>
                        <div class="cert-description">
                          for successfully completing the quiz assessment in<br>
                          <span class="course-title">${selCourse}</span><br>
                          demonstrating excellent academic performance.
                        </div>
                        <div class="cert-score-badge">
                          Score: ${pct}% &nbsp;·&nbsp; ${finalScore}/${questions.length} Correct
                        </div>
                      </div>
                      
                      <div class="cert-footer">
                        <div class="footer-col">
                          <div class="signature-line" style="align-items: flex-end; justify-content: center;">
                            <span class="award-date">${date}</span>
                          </div>
                          <span class="footer-label">Date of Issuance</span>
                        </div>
                        
                        <div class="footer-col seal-col">
                          <svg class="cert-seal" viewBox="0 0 100 100" width="90" height="90">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--uhc-green)" stroke-width="1.5" stroke-dasharray="3 2"/>
                            <circle cx="50" cy="50" r="41" fill="none" stroke="var(--uhc-green-dark)" stroke-width="0.8"/>
                            
                            <path id="seal-text-path" d="M 18,50 A 32,32 0 1,1 82,50" fill="none" stroke="none"/>
                            <text font-size="5" font-family="'Montserrat', sans-serif" font-weight="800" fill="var(--uhc-green-dark)" letter-spacing="1">
                              <textPath href="#seal-text-path" startOffset="50%" text-anchor="middle">
                                UNIVERSAL HEALTH CAMPUS
                              </textPath>
                            </text>
                            
                            <path id="seal-text-path-bottom" d="M 82,50 A 32,32 0 0,1 18,50" fill="none" stroke="none"/>
                            <text font-size="5" font-family="'Montserrat', sans-serif" font-weight="800" fill="var(--uhc-green-dark)" letter-spacing="1">
                              <textPath href="#seal-text-path-bottom" startOffset="50%" text-anchor="middle">
                                SEAL OF EXCELLENCE
                              </textPath>
                            </text>
                            
                            <path d="M50,38 L63,42 L50,46 L37,42 Z" fill="var(--uhc-green)"/>
                            <path d="M43,44.5 L43,47.5 C43,47.5 50,50.5 57,47.5 L57,44.5" fill="none" stroke="var(--uhc-green)" stroke-width="1" stroke-linecap="round"/>
                            <path d="M48,51.5 H52 V54 H54.5 V58 H52 V60.5 H48 V58 H45.5 V54 H48 Z" fill="var(--uhc-green-dark)"/>
                          </svg>
                        </div>
                        
                        <div class="footer-col">
                          <div class="signature-line" style="justify-content: center; align-items: flex-end;">
                            <span class="signature-img">Academic Director</span>
                          </div>
                          <span class="footer-label">Authorized Signature</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <script>setTimeout(()=>window.print(),1000)</script>
                  </body></html>`;
                  const w = window.open("", "_blank");
                  w.document.write(html);
                  w.document.close();
                }}>🎓 Download Certificate</button>
              )}
            </div>

            {/* ── Per-question breakdown ── */}
            <div className="qr-breakdown-section">
              <button className="qr-breakdown-toggle" onClick={() => setShowBreakdown(s => !s)}>
                {showBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showBreakdown ? "Hide" : "View"} Question Breakdown
              </button>

              <AnimatePresence>
                {showBreakdown && (
                  <motion.div
                    className="qr-breakdown"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: "hidden" }}
                  >
                    {questions.map((question, i) => {
                      const userAnswer  = answers[i];
                      const isCorrect   = userAnswer === question.answer;
                      const wasAnswered = userAnswer !== null;
                      return (
                        <div key={i} className={`qr-bd-item ${isCorrect ? "bd-correct" : wasAnswered ? "bd-wrong" : "bd-skipped"}`}>
                          <div className="qr-bd-icon">{isCorrect ? "✅" : wasAnswered ? "❌" : "⏭️"}</div>
                          <div className="qr-bd-content">
                            <div className="qr-bd-q">
                              Q{i + 1}: {question.question.length > 90 ? question.question.slice(0, 90) + "…" : question.question}
                            </div>
                            <div className="qr-bd-ans">
                              {wasAnswered
                                ? isCorrect
                                  ? <span className="bd-ans-correct">✓ {question.options[userAnswer]}</span>
                                  : <>
                                      <span className="bd-ans-wrong">✗ {question.options[userAnswer]}</span>
                                      <span className="bd-ans-correct"> → {question.options[question.answer]}</span>
                                    </>
                                : <span className="bd-ans-skip">Timed out → {question.options[question.answer]}</span>
                              }
                            </div>
                          </div>
                          <button
                            className="qr-bd-goto"
                            onClick={() => {
                              setShowBreakdown(false);
                              setReviewMode(true);
                              setDone(false);
                              goTo(i);
                            }}
                          >Review</button>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ QUIT MODAL ══════════ */}
      {showQuitModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.55)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{ background: "var(--card-bg, #fff)", padding: "28px 28px 24px", borderRadius: 18, width: "90%", maxWidth: 400, boxShadow: "0 16px 40px rgba(0,0,0,0.25)", textAlign: "center" }}
          >
            <div style={{ fontSize: "2.4rem", marginBottom: 8 }}>🚪</div>
            <h3 style={{ margin: "0 0 8px", color: "var(--text, #0f172a)", fontSize: "1.15rem" }}>Leave Quiz?</h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
              {stage === "quiz"
                ? "Would you like to save your progress so you can continue later, or discard it?"
                : "Are you sure you want to go back to course selection?"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stage === "quiz" && (
                <button
                  onClick={() => { setShowQuitModal(false); clearInterval(timerRef.current); setStage("selectCourse"); setDone(false); setReviewMode(false); }}
                  style={{ padding: "11px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#4255ff,#7c3aed)", color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}
                >
                  💾 Save Progress &amp; Exit
                </button>
              )}
              <button
                onClick={() => {
                  localStorage.removeItem(storeKey);
                  setShowQuitModal(false); clearInterval(timerRef.current);
                  setStage("selectCourse"); setDone(false); setReviewMode(false);
                  setQuestions([]); setAnswers([]); setFlagged([]);
                  setIdx(0); setSelAns(null); setLocked(false);
                  setScore(0); setStreak(0); setBestStreak(0); setTimeLeft(45);
                }}
                style={{ padding: "11px 0", borderRadius: 10, border: "1.5px solid #fca5a5", background: "#fef2f2", color: "#ef4444", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}
              >
                🗑️ {stage === "quiz" ? "Discard Progress & Exit" : "Yes, Go Back"}
              </button>
              <button
                onClick={() => setShowQuitModal(false)}
                style={{ padding: "9px 0", borderRadius: 10, border: "1px solid #e2e8f0", background: "var(--bg, #f8fafc)", color: "#64748b", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
              >Cancel</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ══════════ REPORT MODAL ══════════ */}
      {showReportModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 16, width: "90%", maxWidth: 400, boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8, color: "#0f172a" }}>
              <AlertTriangle size={20} color="#ef4444" /> Report Question
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 16 }}>
              Please select the reason for reporting this question.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {["Typo", "Wrong Answer"].map(reason => (
                <label key={reason} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.9rem", color: "#334155" }}>
                  <input type="radio" name="reportReason" value={reason} checked={reportReason === reason} onChange={e => setReportReason(e.target.value)} style={{ cursor: "pointer" }} />
                  {reason}
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setShowReportModal(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontWeight: 600, color: "#64748b" }}>Cancel</button>
              <button onClick={submitReport} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#ef4444", cursor: "pointer", fontWeight: 600, color: "white" }}>Submit Report</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ SHARE MODAL ══════════ */}
      {showShareModal && (
        <div className="quiz-share-overlay" onClick={() => setShowShareModal(false)}>
          <div className="quiz-share-card" onClick={(e) => e.stopPropagation()}>
            <div className="qsc-header">
              <h3>Share Your Progress</h3>
              <button className="qsc-close" onClick={() => setShowShareModal(false)}><X size={20} /></button>
            </div>

            <div className="qsc-tabs">
              <button 
                className={`qsc-tab ${shareType === "score" ? "active" : ""}`} 
                onClick={() => setShareType("score")}
              >
                🏆 Score Card
              </button>
              <button 
                className={`qsc-tab ${shareType === "question" ? "active" : ""}`} 
                onClick={() => {
                  setShareType("question");
                  setSelectedQuestionIndex(0);
                }}
              >
                ❓ Quiz Question
              </button>
            </div>

            {shareType === "question" && (
              <div className="qsc-question-selector">
                <label>Select a question to share:</label>
                <select 
                  value={selectedQuestionIndex} 
                  onChange={(e) => setSelectedQuestionIndex(parseInt(e.target.value))}
                >
                  {questions.map((qObj, idx) => (
                    <option key={idx} value={idx}>
                      Q{idx + 1}: {qObj.question.slice(0, 50)}...
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="qsc-preview-container">
              {previewDataUrl ? (
                <img src={previewDataUrl} alt="Share preview" className="qsc-preview-img" />
              ) : (
                <div className="qsc-preview-loader">
                  <div className="qsc-loader-spinner"></div>
                  Generating preview...
                </div>
              )}
            </div>

            <div className="qsc-actions-grid">
              <button className="quiz-btn primary" onClick={handleNativeShare}>
                <Share2 size={16} style={{ marginRight: 8, display: "inline-block", verticalAlign: "middle" }} /> Share Card
              </button>
              <button className="quiz-btn ghost" onClick={handleDownload}>
                Download PNG
              </button>
              <button className="quiz-btn ghost" onClick={handleCopyImage}>
                <Copy size={16} style={{ marginRight: 8, display: "inline-block", verticalAlign: "middle" }} /> Copy Image
              </button>
            </div>

            <div className="qsc-social-divider">
              <span>Or share website link</span>
            </div>

            <div className="qsc-social-links">
              <a href={getWhatsAppShareUrl()} target="_blank" rel="noopener noreferrer" className="qsc-social-btn whatsapp">
                WhatsApp
              </a>
              <a href={getFacebookShareUrl()} target="_blank" rel="noopener noreferrer" className="qsc-social-btn facebook">
                Facebook
              </a>
              <a href={getTwitterShareUrl()} target="_blank" rel="noopener noreferrer" className="qsc-social-btn twitter">
                Twitter / X
              </a>
            </div>

            <p className="qsc-ig-hint">
              💡 <strong>Instagram/Snapchat Tip</strong>: Download the image to your gallery and upload it directly to your Stories or post!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}