import React, { useState, useEffect, useContext, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import api from "../api/api";
import {
  GraduationCap, Search, RotateCcw, ExternalLink, BookOpen,
  Layers, Link2, ChevronDown, ChevronUp, Play, FileText, Wrench, HelpCircle
} from "lucide-react";
import { useToast } from "../components/Toast";
import { usePageEnabled, MaintenanceScreen } from "../hooks/usePageEnabled";
import "../styles/StudyHub.css";

/* ════════════════════════════════════════════════════════
   STORAGE HELPER — track studied cards per session
════════════════════════════════════════════════════════ */
const STORAGE_KEY = "uhc_studied_cards";
function getStudied()     { try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { return new Set(); } }
function saveStudied(set) { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); }

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
   FLASHCARD  (flip effect)
════════════════════════════════════════════════════════ */
function FlashCard({ card, studied, onToggleStudied }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className={`sh-fc-scene${flipped ? " flipped" : ""}`}
      onClick={() => setFlipped(f => !f)}
      title="Click to flip"
    >
      <div className="sh-fc-card">

        {/* ── FRONT ── */}
        <div className="sh-fc-front">
          <div className="sh-fc-front-top">
            <span className="sh-fc-emoji">{card.emoji || "🃏"}</span>
            <span className="sh-fc-course-badge">{card.course}</span>
          </div>
          <div className="sh-fc-question">{card.question}</div>
          {card.hint && <div className="sh-fc-hint">💡 {card.hint}</div>}
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
          <div className="sh-fc-back-label">✦ Answer</div>
          <div className="sh-fc-answer">{card.answer}</div>
          <div className="sh-fc-back-footer">Tap again to flip back</div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   NOTE CARD  (expandable body)
════════════════════════════════════════════════════════ */
function NoteCard({ note }) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_LEN = 200;
  const isLong = (note.body || "").length > PREVIEW_LEN;

  return (
    <div className="sh-note-card" style={{ "--note-color": note.color || "#10b981" }}>
      <div className="sh-note-header">
        <span className="sh-note-emoji">{note.emoji || "📝"}</span>
        <span className="sh-note-title">{note.title}</span>
        <span className="sh-note-course-badge" style={{ background: `${note.color || "#10b981"}18`, color: note.color || "#10b981" }}>
          {note.course}
        </span>
      </div>
      <div className="sh-note-body">
        {expanded || !isLong ? note.body : note.body.slice(0, PREVIEW_LEN) + "…"}
      </div>
      {isLong && (
        <button className="sh-note-expand-btn" onClick={() => setExpanded(e => !e)}>
          {expanded ? <><ChevronUp size={13} style={{ verticalAlign: "middle" }} /> Show less</> : <><ChevronDown size={13} style={{ verticalAlign: "middle" }} /> Read more</>}
        </button>
      )}
    </div>
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
  const [courses,    setCourses]    = useState([]);
  const [loading,    setLoading]    = useState(true);

  /* ── UI state ── */
  const [activeTab,    setActiveTab]    = useState("flashcards"); // flashcards | notes | resources
  const [activeCourse, setActiveCourse] = useState(null);         // null = All
  const [localSearch,  setLocalSearch]  = useState("");
  const [studiedSet,   setStudiedSet]   = useState(() => getStudied());

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

        // Derive unique courses from all content
        const allCourses = new Set([
          ...fc.map(x => x.course),
          ...n.map(x => x.course),
          ...res.map(x => x.course),
        ]);
        setCourses([...allCourses].filter(Boolean).sort());
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

  /* ── Early returns ── */
  if (checkingFlag) return null;
  if (disabled)     return <MaintenanceScreen pageName="Study Hub" />;

  /* ── Filter helpers ── */
  const q = (localSearch || searchQuery || "").toLowerCase().trim();

  const filteredFC = flashcards.filter(c => {
    const matchCourse = !activeCourse || c.course === activeCourse;
    const matchSearch = !q || c.question.toLowerCase().includes(q) || c.answer.toLowerCase().includes(q);
    return matchCourse && matchSearch;
  });

  const filteredNotes = notes.filter(n => {
    const matchCourse = !activeCourse || n.course === activeCourse;
    const matchSearch = !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
    return matchCourse && matchSearch;
  });

  const filteredRes = resources.filter(r => {
    const matchCourse = !activeCourse || r.course === activeCourse;
    const matchSearch = !q || r.title.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q);
    return matchCourse && matchSearch;
  });

  /* ── Progress (flashcards only) ── */
  const studiedCount = filteredFC.filter(c => studiedSet.has(c._id)).length;
  const totalFC      = filteredFC.length;

  /* ════ RENDER ════ */
  return (
    <div className="sh-wrapper">

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

      {/* ─── Course filter pills ─── */}
      <div className="sh-pills">
        <button className={`sh-pill${!activeCourse ? " active" : ""}`} onClick={() => setActiveCourse(null)}>All</button>
        {courses.map(c => (
          <button
            key={c}
            className={`sh-pill${activeCourse === c ? " active" : ""}`}
            onClick={() => setActiveCourse(c)}
          >{c}</button>
        ))}
      </div>

      {/* ─── Tabs ─── */}
      <div className="sh-tabs">
        <button className={`sh-tab${activeTab === "flashcards" ? " active" : ""}`} onClick={() => setActiveTab("flashcards")}>
          <Layers size={15} /> Flashcards
          <span className="sh-tab-count">{filteredFC.length}</span>
        </button>
        <button className={`sh-tab${activeTab === "notes" ? " active" : ""}`} onClick={() => setActiveTab("notes")}>
          <BookOpen size={15} /> Quick Notes
          <span className="sh-tab-count">{filteredNotes.length}</span>
        </button>
        <button className={`sh-tab${activeTab === "resources" ? " active" : ""}`} onClick={() => setActiveTab("resources")}>
          <Link2 size={15} /> Resources
          <span className="sh-tab-count">{filteredRes.length}</span>
        </button>
      </div>

      {/* ─── Flashcard progress bar ─── */}
      {activeTab === "flashcards" && totalFC > 0 && (
        <div className="sh-progress-bar">
          <span className="sh-progress-label">Today's Progress</span>
          <div className="sh-progress-track">
            <div className="sh-progress-fill" style={{ width: `${(studiedCount / totalFC) * 100}%` }} />
          </div>
          <span className="sh-progress-count">{studiedCount}/{totalFC} studied</span>
        </div>
      )}

      {/* ─── Loading ─── */}
      {loading && <SkeletonGrid count={6} />}

      {/* ─── FLASHCARDS TAB ─── */}
      {!loading && activeTab === "flashcards" && (
        filteredFC.length === 0
          ? <EmptyState icon="🃏" title="No flashcards yet" sub={q ? "Try a different search term" : "Flashcards for this course will appear here once added by your instructor."} />
          : (
            <div className="sh-flashcard-grid">
              {filteredFC.map(card => (
                <FlashCard
                  key={card._id}
                  card={card}
                  studied={studiedSet.has(card._id)}
                  onToggleStudied={toggleStudied}
                />
              ))}
            </div>
          )
      )}

      {/* ─── NOTES TAB ─── */}
      {!loading && activeTab === "notes" && (
        filteredNotes.length === 0
          ? <EmptyState icon="📝" title="No notes yet" sub={q ? "Try a different search term" : "Your instructor's study notes will appear here."} />
          : (
            <div className="sh-notes-grid">
              {filteredNotes.map(n => <NoteCard key={n._id} note={n} />)}
            </div>
          )
      )}

      {/* ─── RESOURCES TAB ─── */}
      {!loading && activeTab === "resources" && (
        filteredRes.length === 0
          ? <EmptyState icon="🔗" title="No resources yet" sub={q ? "Try a different search term" : "Curated videos, articles, and tools will be added here by your instructor."} />
          : (
            <div className="sh-resources-grid">
              {filteredRes.map(r => <ResourceCard key={r._id} resource={r} />)}
            </div>
          )
      )}

    </div>
  );
}