import React, { useState, useEffect, useContext, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import api from "../api/api";
import {
  GraduationCap, Search, RotateCcw, ExternalLink, BookOpen,
  Layers, Link2, ChevronDown, Play, FileText, Wrench,
  HelpCircle, ChevronRight, BookMarked, ArrowLeft, Heart, X, BookText
} from "lucide-react";
import { useToast } from "../components/Toast";
import { usePageEnabled, MaintenanceScreen } from "../hooks/usePageEnabled";
import "../styles/StudyHub.css";

/* ════════════════════════════════════════════════════════
   STORAGE HELPER — track studied cards per session
════════════════════════════════════════════════════════ */
const STORAGE_KEY = "uhc_studied_cards";
const LIKED_KEY   = "uhc_liked_cards";
function getStudied()      { try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { return new Set(); } }
function saveStudied(set)  { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); }
function getLiked()        { try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY)   || "[]")); } catch { return new Set(); } }
function saveLiked(set)    { localStorage.setItem(LIKED_KEY,   JSON.stringify([...set])); }

/* Strip HTML tags — used for plain-text preview in NoteCard */
function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/* ════════════════════════════════════════════════════════
   COURSE EMOJI MAP
════════════════════════════════════════════════════════ */
const COURSE_EMOJIS = {
  "anatomy": "🫀", "physiology": "🧬", "pharmacology": "💊",
  "microbiology": "🦠", "pathology": "🔬", "nursing": "🩺",
  "surgery": "🔪", "pediatrics": "👶", "obstetrics": "🤰",
  "psychiatry": "🧠", "cardiology": "❤️", "neurology": "🧠",
  "dermatology": "🩹", "nutrition": "🥗", "health": "💉",
  "community health": "🏘️", "biochemistry": "⚗️", "immunology": "🛡️",
};
function getCourseEmoji(courseName = "") {
  const lower = courseName.toLowerCase();
  for (const [key, emoji] of Object.entries(COURSE_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return "📚";
}

const COURSE_GRADIENTS = [
  "linear-gradient(135deg,#10b981,#06b6d4)",
  "linear-gradient(135deg,#4255ff,#8b5cf6)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#ec4899,#f43f5e)",
  "linear-gradient(135deg,#06b6d4,#3b82f6)",
  "linear-gradient(135deg,#8b5cf6,#ec4899)",
  "linear-gradient(135deg,#10b981,#4255ff)",
  "linear-gradient(135deg,#f59e0b,#10b981)",
];
function getCourseGradient(idx) {
  return COURSE_GRADIENTS[idx % COURSE_GRADIENTS.length];
}

/* ════════════════════════════════════════════════════════
   SKELETON LOADER
════════════════════════════════════════════════════════ */
function SkeletonGrid({ count = 6 }) {
  return (
    <div className="sh-flashcard-grid">
      {[...Array(count)].map((_, i) => <div key={i} className="sh-skeleton" />)}
    </div>
  );
}

function CourseSkeletonGrid() {
  return (
    <div className="sh-course-grid">
      {[...Array(6)].map((_, i) => <div key={i} className="sh-course-skeleton" />)}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   EMPTY STATE
════════════════════════════════════════════════════════ */
function EmptyState({ icon, title, sub }) {
  return (
    <div className="sh-empty">
      <div className="sh-empty-icon">{icon}</div>
      <div className="sh-empty-title">{title}</div>
      <div className="sh-empty-sub">{sub}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   COURSE SELECTOR  (dropdown style for notes / resources)
════════════════════════════════════════════════════════ */
function CourseSelector({ courses, activeCourse, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = activeCourse || "All Courses";

  return (
    <div className="sh-course-selector">
      <button
        className="sh-course-selector-btn"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="sh-course-selector-emoji">
          {activeCourse ? getCourseEmoji(activeCourse) : "📚"}
        </span>
        <span className="sh-course-selector-label">{selected}</span>
        <ChevronDown size={14} className={`sh-course-selector-chevron${open ? " open" : ""}`} />
      </button>

      {open && (
        <>
          <div className="sh-course-selector-backdrop" onClick={() => setOpen(false)} />
          <div className="sh-course-selector-dropdown" role="listbox">
            <button
              className={`sh-course-selector-option${!activeCourse ? " active" : ""}`}
              onClick={() => { onChange(null); setOpen(false); }}
            >
              <span>📚</span> All Courses
            </button>
            {courses.map(c => (
              <button
                key={c}
                className={`sh-course-selector-option${activeCourse === c ? " active" : ""}`}
                onClick={() => { onChange(c); setOpen(false); }}
                role="option"
                aria-selected={activeCourse === c}
              >
                <span>{getCourseEmoji(c)}</span> {c}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   NOTE MODAL  (shown when a note card is clicked)
════════════════════════════════════════════════════════ */
function NoteModal({ note, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="sh-note-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="sh-note-modal"
        style={{ "--note-color": note.color || "#10b981" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sh-note-modal-header">
          <div className="sh-note-modal-title-row">
            <span className="sh-note-modal-emoji">{note.emoji || "📝"}</span>
            <div>
              <div className="sh-note-modal-title">{note.title}</div>
              <span
                className="sh-note-modal-course"
                style={{ background: `${note.color || "#10b981"}20`, color: note.color || "#10b981" }}
              >
                {note.course}
              </span>
            </div>
          </div>
          <button className="sh-note-modal-close" onClick={onClose} aria-label="Close note">
            <X size={18} />
          </button>
        </div>

        {/* Divider */}
        <div className="sh-note-modal-divider" style={{ background: note.color || "#10b981" }} />

        {/* Body */}
        <div className="sh-note-modal-body sh-note-html-content" dangerouslySetInnerHTML={{ __html: note.body }} />

        {/* Footer with a gentle close button */}
        <div className="sh-note-modal-footer">
          <button className="sh-note-modal-close-btn" onClick={onClose}>
            <ArrowLeft size={14} /> Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   COURSE SELECTION CARD
════════════════════════════════════════════════════════ */
function CourseCard({ course, count, gradient, emoji, onClick }) {
  return (
    <button className="sh-course-card" onClick={onClick}>
      <div className="sh-course-card-top" style={{ background: gradient }}>
        <span className="sh-course-card-emoji">{emoji}</span>
        <span className="sh-course-card-count">{count} cards</span>
      </div>
      <div className="sh-course-card-body">
        <div className="sh-course-card-name">{course}</div>
        <div className="sh-course-card-cta">
          Study now <ChevronRight size={14} />
        </div>
      </div>
    </button>
  );
}

/* ════════════════════════════════════════════════════════
   FLASHCARD  (flip effect + like button)
════════════════════════════════════════════════════════ */
function FlashCard({ card, studied, liked, onToggleStudied, onToggleLiked }) {
  const [flipped, setFlipped] = useState(false);

  // Parse hint into option list if it's a question-converted card (has •)
  const isQuestionCard = card.hint && card.hint.includes("  •  ");
  const options = isQuestionCard ? card.hint.split("  •  ") : [];

  return (
    <div
      className={`sh-fc-scene${flipped ? " flipped" : ""}${isQuestionCard ? " question-card" : ""}`}
      onClick={() => setFlipped(f => !f)}
      title="Click to flip"
    >
      <div className="sh-fc-card">

        {/* ── FRONT ── */}
        <div className="sh-fc-front">
          <div className="sh-fc-front-top">
            <span className="sh-fc-emoji">{card.emoji || "🃏"}</span>
            <div className="sh-fc-front-actions">
              <button
                className={`sh-fc-like-btn${liked ? " liked" : ""}`}
                onClick={e => { e.stopPropagation(); onToggleLiked(card._id); }}
                title={liked ? "Unlike" : "Like this card"}
                aria-label={liked ? "Unlike" : "Like"}
              >
                <Heart size={13} fill={liked ? "currentColor" : "none"} />
              </button>
              <span className="sh-fc-course-badge">{card.course}</span>
            </div>
          </div>
          <div className="sh-fc-question">{card.question}</div>
          {/* For question cards show the 4 options on the front as well */}
          {isQuestionCard && (
            <div className="sh-fc-options">
              {options.map((opt, i) => (
                <div key={i} className="sh-fc-option">{opt}</div>
              ))}
            </div>
          )}
          {!isQuestionCard && card.hint && <div className="sh-fc-hint">💡 {card.hint}</div>}
          <div className="sh-fc-footer">
            <span className="sh-fc-flip-hint"><RotateCcw size={11} /> Tap to reveal</span>
            <button
              className={`sh-fc-studied-btn${studied ? " studied" : ""}`}
              onClick={e => { e.stopPropagation(); onToggleStudied(card._id); }}
            >
              {studied ? "✓ Studied" : "Mark studied"}
            </button>
          </div>
        </div>

        {/* ── BACK ── */}
        <div className="sh-fc-back">
          <div className="sh-fc-back-label">✦ Correct Answer</div>
          <div className="sh-fc-answer">{card.answer}</div>
          {isQuestionCard && (
            <div className="sh-fc-options-back">
              {options.map((opt, i) => {
                const isCorrect = opt.trim().slice(3).trim() === card.answer.trim();
                return (
                  <div
                    key={i}
                    className={`sh-fc-option-back${isCorrect ? " correct" : ""}`}
                  >
                    {opt}
                  </div>
                );
              })}
            </div>
          )}
          <div className="sh-fc-back-footer">Tap again to flip back</div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   NOTE CARD  (click to open modal)
════════════════════════════════════════════════════════ */
function NoteCard({ note, onOpen }) {
  const PREVIEW_LEN = 160;
  const plainText = stripHtml(note.body || "");
  const preview = plainText.length > PREVIEW_LEN
    ? plainText.slice(0, PREVIEW_LEN) + "…"
    : plainText;

  return (
    <button className="sh-note-card" style={{ "--note-color": note.color || "#10b981" }} onClick={() => onOpen(note)}>
      <div className="sh-note-header">
        <span className="sh-note-emoji">{note.emoji || "📝"}</span>
        <div className="sh-note-header-text">
          <span className="sh-note-title">{note.title}</span>
          <span className="sh-note-course-badge" style={{ background: `${note.color || "#10b981"}18`, color: note.color || "#10b981" }}>
            {note.course}
          </span>
        </div>
      </div>
      <div className="sh-note-body">{preview}</div>
      <div className="sh-note-open-hint">
        <BookText size={11} /> Tap to read full note
      </div>
    </button>
  );
}

/* ════════════════════════════════════════════════════════
   RESOURCE CARD
════════════════════════════════════════════════════════ */
const TYPE_META = {
  video:   { label: "Video",   icon: <Play size={11} />,      cls: "sh-res-type-video"   },
  article: { label: "Article", icon: <FileText size={11} />,  cls: "sh-res-type-article" },
  tool:    { label: "Tool",    icon: <Wrench size={11} />,    cls: "sh-res-type-tool"    },
  other:   { label: "Other",   icon: <HelpCircle size={11} />,cls: "sh-res-type-other"   },
};

function ResourceCard({ resource }) {
  const meta = TYPE_META[resource.type] || TYPE_META.other;
  return (
    <a
      className="sh-res-card"
      href={resource.url}
      target="_blank"
      rel="noreferrer"
    >
      <span className={`sh-res-type-badge ${meta.cls}`}>
        {meta.icon} {meta.label}
      </span>
      <div className="sh-res-title">{resource.title}</div>
      {resource.description && <div className="sh-res-desc">{resource.description}</div>}
      <span className="sh-res-course-badge">{resource.course}</span>
      <span className="sh-res-link-row">
        <ExternalLink size={12} /> Open resource
      </span>
    </a>
  );
}

/* ════════════════════════════════════════════════════════
   COURSE FLASHCARD VIEW  (shown after selecting a course)
════════════════════════════════════════════════════════ */
function CourseFlashcardView({ course, cards, studiedSet, likedSet, onToggleStudied, onToggleLiked, onBack, searchQuery }) {
  const q = (searchQuery || "").toLowerCase().trim();
  const filtered = cards.filter(c =>
    !q || c.question.toLowerCase().includes(q) || c.answer.toLowerCase().includes(q)
  );
  const studiedCount = filtered.filter(c => studiedSet.has(c._id)).length;
  const total = filtered.length;

  return (
    <div>
      {/* Back button + course header */}
      <div className="sh-course-view-header">
        <button className="sh-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> All Courses
        </button>
        <div className="sh-course-view-title">
          <span className="sh-course-view-emoji">{getCourseEmoji(course)}</span>
          <div>
            <div className="sh-course-view-name">{course}</div>
            <div className="sh-course-view-sub">{total} flashcard{total !== 1 ? "s" : ""}</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="sh-progress-bar">
          <span className="sh-progress-label">Today's Progress</span>
          <div className="sh-progress-track">
            <div className="sh-progress-fill" style={{ width: `${total === 0 ? 0 : (studiedCount / total) * 100}%` }} />
          </div>
          <span className="sh-progress-count">{studiedCount}/{total} studied</span>
        </div>
      )}

      {/* Cards */}
      {total === 0
        ? <EmptyState icon="🃏" title="No flashcards found" sub={q ? "Try a different search term" : "No flashcards available for this course yet."} />
        : (
          <div className="sh-flashcard-grid">
            {filtered.map(card => (
              <FlashCard
                key={card._id}
                card={card}
                studied={studiedSet.has(card._id)}
                liked={likedSet.has(card._id)}
                onToggleStudied={onToggleStudied}
                onToggleLiked={onToggleLiked}
              />
            ))}
          </div>
        )
      }
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN STUDY HUB PAGE
════════════════════════════════════════════════════════ */
export default function Library() {
  const { user }  = useContext(UserContext);
  const isAdmin   = user?.role === "admin" || user?.role === "superadmin";
  const { disabled, loading: checkingFlag } = usePageEnabled("disableLibrary", isAdmin);
  const { searchQuery } = useOutletContext();
  const toast = useToast();

  /* ── Data ── */
  const [flashcards, setFlashcards] = useState([]);
  const [notes,      setNotes]      = useState([]);
  const [resources,  setResources]  = useState([]);
  const [loading,    setLoading]    = useState(true);

  /* ── UI state ── */
  const [activeTab,      setActiveTab]      = useState("flashcards"); // flashcards | notes | resources
  const [selectedCourse, setSelectedCourse] = useState(null);        // null = show course grid (flashcards)
  const [activeCourse,   setActiveCourse]   = useState(null);        // for notes/resources filter
  const [localSearch,    setLocalSearch]    = useState("");
  const [studiedSet,     setStudiedSet]     = useState(() => getStudied());
  const [likedSet,       setLikedSet]       = useState(() => getLiked());
  const [openNote,       setOpenNote]       = useState(null);         // note modal

  /* ── Fetch ── */
  const fetchAll = useCallback(() => {
    if (disabled) return;
    setLoading(true);
    api.get("studyhub/all")
      .then(r => {
        const { flashcards: fc = [], notes: n = [], resources: res = [] } = r.data;
        setFlashcards(fc);
        setNotes(n);
        setResources(res);
      })
      .catch(() => toast("Failed to load Study Hub", "error"))
      .finally(() => setLoading(false));
  }, [disabled, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Studied toggle ── */
  const toggleStudied = useCallback((id) => {
    setStudiedSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast("Removed from studied", "info"); }
      else              { next.add(id);    toast("Marked as studied ✓", "success"); }
      saveStudied(next);
      return next;
    });
  }, [toast]);

  /* ── Like toggle ── */
  const toggleLiked = useCallback((id) => {
    setLikedSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast("Removed from liked", "info"); }
      else              { next.add(id);    toast("Added to liked ❤️", "success"); }
      saveLiked(next);
      return next;
    });
  }, [toast]);

  /* ── Early returns ── */
  if (checkingFlag) return null;
  if (disabled)     return <MaintenanceScreen pageName="Study Hub" />;

  /* ── Filter helpers ── */
  const q = (localSearch || searchQuery || "").toLowerCase().trim();

  // Group flashcards by course
  const flashcardsByCourse = {};
  flashcards.forEach(card => {
    if (!card.course) return;
    if (!flashcardsByCourse[card.course]) flashcardsByCourse[card.course] = [];
    flashcardsByCourse[card.course].push(card);
  });
  const fcCourseList = Object.keys(flashcardsByCourse).sort();

  // Filter course list if there's a search query (on course selection screen)
  const filteredFcCourses = q
    ? fcCourseList.filter(c => {
        const hasMatch = flashcardsByCourse[c].some(card =>
          card.question.toLowerCase().includes(q) || card.answer.toLowerCase().includes(q)
        );
        return c.toLowerCase().includes(q) || hasMatch;
      })
    : fcCourseList;

  const filteredNotes = notes.filter(n => {
    const matchCourse = !activeCourse || n.course === activeCourse;
    const matchSearch = !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
    return matchCourse && matchSearch;
  });

  // Derive note courses
  const noteCourses = [...new Set(notes.map(n => n.course).filter(Boolean))].sort();

  const filteredRes = resources.filter(r => {
    const matchCourse = !activeCourse || r.course === activeCourse;
    const matchSearch = !q || r.title.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q);
    return matchCourse && matchSearch;
  });

  // Derive resource courses
  const resCourses = [...new Set(resources.map(r => r.course).filter(Boolean))].sort();

  /* ═══ RENDER ═══ */
  return (
    <div className="sh-wrapper">

      {/* ─── Note Modal ─── */}
      {openNote && <NoteModal note={openNote} onClose={() => setOpenNote(null)} />}

      {/* ─── Header ─── */}
      <div className="sh-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <GraduationCap size={22} color="#10b981" />
          <h1 className="sh-title">Study Hub</h1>
        </div>
        <div className="sh-search">
          <Search size={14} />
          <input
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="Search content…"
          />
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="sh-tabs">
        <button
          className={`sh-tab${activeTab === "flashcards" ? " active" : ""}`}
          onClick={() => { setActiveTab("flashcards"); setSelectedCourse(null); setActiveCourse(null); }}
        >
          <Layers size={15} /> Flashcards
          <span className="sh-tab-count">{flashcards.length}</span>
        </button>
        <button
          className={`sh-tab${activeTab === "notes" ? " active" : ""}`}
          onClick={() => { setActiveTab("notes"); setSelectedCourse(null); setActiveCourse(null); }}
        >
          <BookOpen size={15} /> Quick Notes
          <span className="sh-tab-count">{filteredNotes.length}</span>
        </button>
        <button
          className={`sh-tab${activeTab === "resources" ? " active" : ""}`}
          onClick={() => { setActiveTab("resources"); setSelectedCourse(null); setActiveCourse(null); }}
        >
          <Link2 size={15} /> Resources
          <span className="sh-tab-count">{filteredRes.length}</span>
        </button>
      </div>

      {/* ─── Loading ─── */}
      {loading && activeTab === "flashcards" && <CourseSkeletonGrid />}
      {loading && activeTab !== "flashcards" && <SkeletonGrid count={6} />}

      {/* ═══════════════════════════════════════════
          FLASHCARDS TAB
      ═══════════════════════════════════════════ */}
      {!loading && activeTab === "flashcards" && (

        selectedCourse ? (
          /* ── Individual course view ── */
          <CourseFlashcardView
            course={selectedCourse}
            cards={flashcardsByCourse[selectedCourse] || []}
            studiedSet={studiedSet}
            likedSet={likedSet}
            onToggleStudied={toggleStudied}
            onToggleLiked={toggleLiked}
            onBack={() => setSelectedCourse(null)}
            searchQuery={localSearch || searchQuery}
          />
        ) : (
          /* ── Course selection grid ── */
          <div>
            {/* Course selection hero */}
            <div className="sh-course-hero">
              <div className="sh-course-hero-icon">
                <BookMarked size={28} color="#10b981" />
              </div>
              <div>
                <div className="sh-course-hero-title">Choose a Course to Study</div>
                <div className="sh-course-hero-sub">
                  {fcCourseList.length} course{fcCourseList.length !== 1 ? "s" : ""}
                  · {flashcards.length} total flashcards
                </div>
              </div>
            </div>

            {filteredFcCourses.length === 0 ? (
              <EmptyState
                icon="🃏"
                title={q ? "No courses match your search" : "No flashcards yet"}
                sub={q ? "Try a different keyword" : "Your instructor will add flashcards soon. Check back later!"}
              />
            ) : (
              <div className="sh-course-grid">
                {filteredFcCourses.map((course, idx) => (
                  <CourseCard
                    key={course}
                    course={course}
                    count={flashcardsByCourse[course].length}
                    gradient={getCourseGradient(idx)}
                    emoji={getCourseEmoji(course)}
                    onClick={() => setSelectedCourse(course)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* ═══════════════════════════════════════════
          NOTES TAB
      ═══════════════════════════════════════════ */}
      {!loading && activeTab === "notes" && (
        <div>
          {/* Course selector for notes */}
          <div className="sh-tab-toolbar">
            <div className="sh-tab-toolbar-left">
              <CourseSelector
                courses={noteCourses}
                activeCourse={activeCourse}
                onChange={setActiveCourse}
              />
              {activeCourse && (
                <span className="sh-active-course-chip">
                  {getCourseEmoji(activeCourse)} {activeCourse}
                  <button
                    className="sh-active-course-chip-x"
                    onClick={() => setActiveCourse(null)}
                    aria-label="Clear course filter"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>
            <span className="sh-result-count">
              {filteredNotes.length} note{filteredNotes.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredNotes.length === 0
            ? <EmptyState icon="📝" title="No notes yet" sub={q ? "Try a different search term" : "Your instructor's study notes will appear here."} />
            : (
              <div className="sh-notes-grid">
                {filteredNotes.map(n => (
                  <NoteCard key={n._id} note={n} onOpen={setOpenNote} />
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ═══════════════════════════════════════════
          RESOURCES TAB
      ═══════════════════════════════════════════ */}
      {!loading && activeTab === "resources" && (
        <div>
          {/* Course selector for resources */}
          <div className="sh-tab-toolbar">
            <div className="sh-tab-toolbar-left">
              <CourseSelector
                courses={resCourses}
                activeCourse={activeCourse}
                onChange={setActiveCourse}
              />
              {activeCourse && (
                <span className="sh-active-course-chip">
                  {getCourseEmoji(activeCourse)} {activeCourse}
                  <button
                    className="sh-active-course-chip-x"
                    onClick={() => setActiveCourse(null)}
                    aria-label="Clear course filter"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>
            <span className="sh-result-count">
              {filteredRes.length} resource{filteredRes.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredRes.length === 0
            ? <EmptyState icon="🔗" title="No resources yet" sub={q ? "Try a different search term" : "Curated videos, articles, and tools will be added here by your instructor."} />
            : (
              <div className="sh-resources-grid">
                {filteredRes.map(r => <ResourceCard key={r._id} resource={r} />)}
              </div>
            )
          }
        </div>
      )}

    </div>
  );
}