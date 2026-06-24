import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Search, Edit2, Trash2, BookOpen, ChevronDown, ChevronUp, Copy, AlertTriangle, Pencil, MoveRight, FileDown, BookmarkX, ClipboardCopy } from "lucide-react";
import api from "../../api/api";
import { useToast } from "../../hooks/useToast";

export default function AdminQuestions() {
  const location = useLocation();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [totalCount, setTotalCount] = useState(0); // real DB total, not capped by fetch limit
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("All");
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | az | difficulty
  const [selectedIds, setSelectedIds] = useState(new Set()); // bulk select
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [filterNoCourse, setFilterNoCourse] = useState(false); // filter questions with no course
  const [inlineEditCourse, setInlineEditCourse] = useState(null); // question._id being inline-edited
  const [inlineEditCourseVal, setInlineEditCourseVal] = useState("");
  const [addValidationErrors, setAddValidationErrors] = useState({}); // field-level errors for Add panel
  const [duplicateWarning, setDuplicateWarning] = useState(""); // duplicate question warning

  // Parse initial filter from URL
  const queryParams = new URLSearchParams(location.search);
  const initialFilterReported = queryParams.get("filter") === "reported";
  const [filterReported, setFilterReported] = useState(initialFilterReported);

  const [expanded, setExpanded] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [coursesFromDB, setCoursesFromDB] = useState([]);
  const [courseQuestionCounts, setCourseQuestionCounts] = useState({}); // real per-course counts from DB
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [addingCourse, setAddingCourse] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  // Inline course creation (inside Add Question panel)
  const [inlineNewCourse, setInlineNewCourse] = useState("");
  const [creatingInlineCourse, setCreatingInlineCourse] = useState(false);

  // Rename course
  const [editingCourseName, setEditingCourseName] = useState(null); // the course name currently being edited
  const [renameValue, setRenameValue] = useState("");

  // Move questions to course
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetCourse, setMoveTargetCourse] = useState("");

  // Export
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCourse, setExportCourse] = useState("__ALL__");

  const [newQ, setNewQ] = useState({ question: "", options: ["","","",""], answer: null, course: "", difficulty: "Medium", explanation: "" });

  const { showToast, ToastEl } = useToast();

  useEffect(() => { fetchQuestions(); fetchCourses(); fetchCourseCounts(); }, []);

  // Sync URL changes to state (in case user clicks notification while already on page)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("filter") === "reported") {
      setFilterReported(true);
    }
  }, [location.search]);

  // Update URL when filter changes manually
  const toggleReportedFilter = () => {
    const newVal = !filterReported;
    setFilterReported(newVal);
    if (newVal) {
      navigate("/admin/questions?filter=reported", { replace: true });
    } else {
      navigate("/admin/questions", { replace: true });
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      // Increased limit to 50000 so that older questions aren't dropped
      const res = await api.get("admin/questions/?limit=50000");
      let data = res.data;
      
      // Handle different response formats
      if (data && data.questions && Array.isArray(data.questions)) {
        setQuestions(data.questions);
        // ✅ Bug fix: use backend total, not the array length (which is capped at 1000)
        if (typeof data.total === "number") setTotalCount(data.total);
        else setTotalCount(data.questions.length);
      } else if (Array.isArray(data)) {
        setQuestions(data);
        setTotalCount(data.length);
      } else {
        const fallback = await api.get("questions/all").catch(() => null);
        if (fallback && Array.isArray(fallback.data)) {
          setQuestions(fallback.data);
          setTotalCount(fallback.data.length);
        } else {
          setQuestions([]);
          setTotalCount(0);
        }
      }
    } catch (err) {
      console.error("Questions load error:", err);
      setQuestions([]);
    } finally { setLoading(false); }
  };

  const fetchCourses = async () => {
    try {
      const res = await api.get("courses");
      setCoursesFromDB(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error("Courses load error:", err); }
  };

  // ✅ Bug fix: fetch real per-course counts from DB aggregation
  const fetchCourseCounts = async () => {
    try {
      const res = await api.get("admin/questions/counts-by-course");
      if (res.data?.counts) {
        const map = {};
        res.data.counts.forEach(c => { map[c._id || ""] = c.count; });
        setCourseQuestionCounts(map);
        // Also update totalCount if we got it
        if (typeof res.data.total === "number") setTotalCount(res.data.total);
      }
    } catch (err) { console.error("Course counts error:", err); }
  };

  const courses = ["All", ...new Set([
    ...questions.map(q => q.course).filter(Boolean),
    ...coursesFromDB.map(c => c.name).filter(Boolean),
  ])];

  const difficultyOrder = { Easy: 0, Medium: 1, Hard: 2 };

  const noCourseCount = questions.filter(q => !q.course || !q.course.trim()).length;

  const filtered = questions
    .filter(q => {
      const txt = search.toLowerCase();
      const matchSearch = q.question?.toLowerCase().includes(txt) ||
        q.options?.some(o => o?.toLowerCase().includes(txt));
      const matchCourse = selectedCourse === "All" || q.course === selectedCourse;
      const matchReported = filterReported ? q.isReported === true : true;
      const matchNoCourse = filterNoCourse ? (!q.course || !q.course.trim()) : true;
      return matchSearch && matchCourse && matchReported && matchNoCourse;
    })
    .sort((a, b) => {
      if (sortBy === "oldest") return a._id > b._id ? 1 : -1;
      if (sortBy === "az")     return (a.course || "").localeCompare(b.course || "");
      if (sortBy === "difficulty") return (difficultyOrder[a.difficulty] ?? 1) - (difficultyOrder[b.difficulty] ?? 1);
      // default: newest first
      return a._id < b._id ? 1 : -1;
    });

  /* ── Delete single ── */
  const handleDelete = async () => {
    try {
      await api.delete(`admin/questions/${deleteId}`);
      setQuestions(prev => prev.filter(q => q._id !== deleteId));
      setTotalCount(prev => prev - 1);
      showToast("Question deleted");
      setDeleteId(null);
      fetchCourseCounts();
    } catch (err) { showToast("Delete failed", "error"); }
  };

  /* ── Bulk delete ── */
  const handleBulkDelete = async () => {
    try {
      await Promise.all([...selectedIds].map(id => api.delete(`admin/questions/${id}`)));
      setQuestions(prev => prev.filter(q => !selectedIds.has(q._id)));
      setTotalCount(prev => prev - selectedIds.size);
      showToast(`${selectedIds.size} questions deleted`);
      setSelectedIds(new Set());
      setShowBulkConfirm(false);
      fetchCourseCounts();
    } catch (err) { showToast("Bulk delete failed", "error"); }
  };

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(q => q._id)));
    }
  };

  /* ── Edit ── */
  const handleSave = async () => {
    try {
      const res = await api.put(`admin/questions/${editData._id}`, editData);
      setQuestions(prev => prev.map(q => q._id === res.data._id ? res.data : q));
      showToast("Question updated");
      setEditModal(false);
    } catch (err) { showToast("Update failed", "error"); }
  };

  /* ── Add question ── */
  const handleAddQuestion = async () => {
    // Live validation
    const errors = {};
    if (!newQ.question.trim()) errors.question = true;
    if (!newQ.course) errors.course = true;
    if (newQ.answer === null) errors.answer = true;
    if (newQ.options.some(o => !o.trim())) errors.options = true;
    if (Object.keys(errors).length > 0) {
      setAddValidationErrors(errors);
      showToast("Please fill all required fields", "error");
      return;
    }
    setAddValidationErrors({});
    try {
      const res = await api.post("admin/questions", newQ);
      setQuestions(prev => [res.data, ...prev]);
      setTotalCount(prev => prev + 1);
      showToast("Question added!");
      setShowAddModal(false);
      setNewQ({ question: "", options: ["","","",""], answer: null, course: "", difficulty: "Medium", explanation: "" });
      setAddValidationErrors({});
      setDuplicateWarning("");
      fetchCourseCounts();
    } catch (err) { showToast("Add failed", "error"); }
  };

  /* ── Duplicate detection ── */
  const checkDuplicate = (text) => {
    if (!text || text.length < 15) { setDuplicateWarning(""); return; }
    const lower = text.toLowerCase();
    const match = questions.find(q => {
      const qLower = q.question?.toLowerCase() || "";
      return qLower.includes(lower.slice(0, 30)) || lower.includes(qLower.slice(0, 30));
    });
    if (match) {
      setDuplicateWarning(`⚠️ Possible duplicate: "${match.question.slice(0, 60)}..."`);
    } else {
      setDuplicateWarning("");
    }
  };

  /* ── Copy question into Add panel ── */
  const handleCopyQuestion = (q) => {
    setNewQ({
      question: q.question + " (copy)",
      options: [...(q.options || ["","","",""])],
      answer: q.answer,
      course: q.course || "",
      difficulty: q.difficulty || "Medium",
      explanation: q.explanation || "",
    });
    setDuplicateWarning("");
    setAddValidationErrors({});
    setShowAddModal(true);
    showToast("Question copied into editor");
  };

  /* ── Inline course update from table badge ── */
  const handleInlineCourseUpdate = async (questionId) => {
    const newCourse = inlineEditCourseVal.trim();
    if (!newCourse) { setInlineEditCourse(null); return; }
    try {
      const res = await api.put(`admin/questions/${questionId}`, { ...questions.find(q => q._id === questionId), course: newCourse });
      setQuestions(prev => prev.map(q => q._id === questionId ? { ...q, course: newCourse } : q));
      showToast(`Course updated to "${newCourse}"`);
      fetchCourseCounts();
    } catch (err) {
      showToast("Course update failed", "error");
    } finally {
      setInlineEditCourse(null);
      setInlineEditCourseVal("");
    }
  };

  /* ── Rename course ── */
  const handleRenameCourse = async (oldName) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === oldName) { setEditingCourseName(null); return; }
    try {
      await api.put(`courses/${encodeURIComponent(oldName)}`, { name: trimmed });
      // Update coursesFromDB list
      setCoursesFromDB(prev => prev.map(c => c.name === oldName ? { ...c, name: trimmed, slug: trimmed.toLowerCase().replace(/\s+/g, "-") } : c));
      // Remap questions in local state
      setQuestions(prev => prev.map(q => q.course === oldName ? { ...q, course: trimmed } : q));
      // If the active filter was this course, update it
      if (selectedCourse === oldName) setSelectedCourse(trimmed);
      showToast(`Course renamed to "${trimmed}"`);
      setEditingCourseName(null);
      fetchCourseCounts();
    } catch (err) {
      showToast(err.response?.data?.message || "Rename failed", "error");
    }
  };

  /* ── Move questions to another course ── */
  const handleMoveToCourse = async () => {
    if (!moveTargetCourse) { showToast("Pick a target course", "error"); return; }
    const ids = [...selectedIds];
    try {
      await api.put("admin/questions/move-to-course", { ids, targetCourse: moveTargetCourse });
      setQuestions(prev => prev.map(q => selectedIds.has(q._id) ? { ...q, course: moveTargetCourse } : q));
      showToast(`${ids.length} question${ids.length !== 1 ? "s" : ""} moved to "${moveTargetCourse}"`);
      setSelectedIds(new Set());
      setShowMoveModal(false);
      setMoveTargetCourse("");
      fetchCourseCounts();
    } catch (err) {
      showToast("Move failed", "error");
    }
  };

  /* ── Export questions ── */
  const handleExport = () => {
    const toExport = questions.filter(q =>
      exportCourse === "__ALL__" ? true : q.course === exportCourse
    );

    if (toExport.length === 0) {
      showToast("No questions found for this selection", "error");
      return;
    }

    // Group by course for nicer output
    const grouped = {};
    toExport.forEach(q => {
      const c = q.course || "(No Course)";
      if (!grouped[c]) grouped[c] = [];
      grouped[c].push(q);
    });

    const lines = [];
    const totalLabel = exportCourse === "__ALL__" ? "All Courses" : exportCourse;
    lines.push(`═══════════════════════════════════════════`);
    lines.push(`  QUESTION EXPORT — ${totalLabel}`);
    lines.push(`  Exported: ${new Date().toLocaleString()}`);
    lines.push(`  Total Questions: ${toExport.length}`);
    lines.push(`═══════════════════════════════════════════`);
    lines.push("");

    Object.keys(grouped).sort().forEach(courseName => {
      const qs = grouped[courseName];
      lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      lines.push(`  📚 ${courseName.toUpperCase()}  (${qs.length} question${qs.length !== 1 ? "s" : ""})`);
      lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      lines.push("");

      qs.forEach((q, idx) => {
        const diff = q.difficulty || "Medium";
        lines.push(`Q${idx + 1}. [${diff}] ${q.question}`);
        (q.options || []).forEach((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const correct = q.answer === i;
          lines.push(`   ${letter}. ${opt}${correct ? "  ✓" : ""}`);
        });
        if (q.explanation) {
          lines.push(`   💡 Explanation: ${q.explanation}`);
        }
        lines.push("");
      });
    });

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename = exportCourse === "__ALL__"
      ? `questions_all_courses_${new Date().toISOString().slice(0, 10)}.txt`
      : `questions_${exportCourse.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`✓ Exported ${toExport.length} questions`);
    setShowExportModal(false);
  };

  /* ── Add course (Course Manager modal) ── */
  const handleAddCourse = async () => {
    if (!newCourseName.trim()) return;
    try {
      const res = await api.post("courses", { name: newCourseName });
      setCoursesFromDB(prev => [...prev, res.data]);
      showToast("Course added");
      setNewCourseName(""); setAddingCourse(false);
    } catch (err) { showToast("Course add failed", "error"); }
  };

  /* ── Inline create course (inside Add Question panel) ── */
  const handleInlineCreateCourse = async () => {
    const name = inlineNewCourse.trim();
    if (!name) return;
    setCreatingInlineCourse(true);
    try {
      const res = await api.post("courses", { name });
      setCoursesFromDB(prev => [...prev, res.data]);
      setNewQ(p => ({ ...p, course: res.data.name }));
      setInlineNewCourse("");
      showToast(`Course "${res.data.name}" created!`);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create course", "error");
    } finally { setCreatingInlineCourse(false); }
  };

  /* ── Delete course ── */
  const handleDeleteCourse = async (name) => {
    const qCount = questions.filter(q => q.course === name).length;
    if (qCount > 0) {
      if (!window.confirm(`There are ${qCount} questions in this course. Deleting the course category will leave these questions without a course. Continue?`)) return;
    } else {
      if (!window.confirm(`Delete course "${name}"?`)) return;
    }

    try {
      await api.delete(`courses/${encodeURIComponent(name)}`);
      setCoursesFromDB(prev => prev.filter(c => c.name !== name));
      setQuestions(prev => prev.map(q => q.course === name ? { ...q, course: "" } : q));
      showToast("Course deleted");
    } catch (err) { showToast("Course delete failed", "error"); }
  };

  /* ── Book loader ── */
  const BookLoader = () => (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"60px 20px", gap:16 }}>
      <div style={{ width:50, height:60, position:"relative" }}>
        <div style={{ position:"absolute", left:0, top:0, width:10, height:60, background:"linear-gradient(180deg,#4255ff,#8b5cf6)", borderRadius:"3px 0 0 3px" }} />
        {[0,1,2].map(i => (
          <div key={i} style={{
            position:"absolute", left:10, top:3, width:36, height:54,
            background:["#c7d2fe","#a5b4fc","#818cf8"][i],
            borderRadius:"0 8px 8px 0", transformOrigin:"left center",
            animation:`flipPage 1.4s ease-in-out ${i*0.35}s infinite`,
          }}/>
        ))}
      </div>
      <p style={{ color:"var(--admin-muted)", fontSize:".85rem", fontWeight:500 }}>Loading questions…</p>
      <style>{`@keyframes flipPage{0%{transform:rotateY(0);}40%{transform:rotateY(-140deg);}60%{transform:rotateY(-140deg);}100%{transform:rotateY(0);}}`}</style>
    </div>
  );

  return (
    <div className="admin-page">
      {ToastEl}

      {/* Header */}
      <div className="admin-section-header" style={{ marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--admin-text)", margin: 0 }}>
            📝 Question Manager
          </h1>
          <p style={{ fontSize: ".82rem", color: "var(--admin-muted)", margin: "4px 0 0" }}>
            {/* ✅ Bug fix: show real DB total, not local array length */}
            {totalCount.toLocaleString()} total questions · {courses.length - 1} courses
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="admin-btn secondary sm" onClick={() => window.location.href = "/admin/duplicates"}>
            <Copy size={14} /> Find Duplicates
          </button>
          <button className="admin-btn secondary sm" onClick={() => setShowCourseModal(true)}>
            <BookOpen size={14} /> Courses
          </button>
          <button
            className="admin-btn secondary sm"
            onClick={() => { setExportCourse("__ALL__"); setShowExportModal(true); }}
            title="Export questions as plain text"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <FileDown size={14} /> Export
          </button>
          <button className="admin-btn primary" onClick={() => setShowAddModal(true)}>
            <Plus size={15} /> Add Question
          </button>
        </div>
      </div>

      {/* Stats pills bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {[
          { label: "Total",    val: totalCount,                                                color: "#4255ff",  bg: "rgba(66,85,255,0.08)",   onClick: null },
          { label: "Easy",     val: questions.filter(q => q.difficulty === "Easy").length,     color: "#16a34a",  bg: "rgba(22,163,74,0.08)",   onClick: null },
          { label: "Medium",   val: questions.filter(q => q.difficulty === "Medium" || !q.difficulty).length, color: "#d97706", bg: "rgba(217,119,6,0.08)", onClick: null },
          { label: "Hard",     val: questions.filter(q => q.difficulty === "Hard").length,     color: "#dc2626",  bg: "rgba(220,38,38,0.08)",   onClick: null },
          { label: "Reported", val: questions.filter(q => q.isReported).length,               color: "#8b5cf6",  bg: "rgba(139,92,246,0.08)",  onClick: null },
        ].map(pill => (
          <div key={pill.label} style={{
            padding: "5px 12px", borderRadius: 20,
            background: pill.bg, color: pill.color,
            fontSize: ".78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 5,
            border: `1px solid ${pill.color}30`,
          }}>
            <span style={{ fontSize: ".9rem", fontWeight: 800 }}>{pill.val}</span> {pill.label}
          </div>
        ))}
        {/* No Course pill — clickable filter shortcut */}
        {noCourseCount > 0 && (
          <div
            onClick={() => setFilterNoCourse(f => !f)}
            title="Filter questions with no course assigned"
            style={{
              padding: "5px 12px", borderRadius: 20,
              background: filterNoCourse ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.08)",
              color: "#b45309",
              fontSize: ".78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 5,
              border: `1.5px solid ${filterNoCourse ? "#f59e0b" : "rgba(245,158,11,0.3)"}`,
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            <BookmarkX size={13} />
            <span style={{ fontSize: ".9rem", fontWeight: 800 }}>{noCourseCount}</span> No Course
          </div>
        )}
      </div>

      {/* Search + filter + sort */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--admin-muted)" }} />
          <input
            className="admin-input"
            style={{ width: "100%", paddingLeft: 36, boxSizing: "border-box" }}
            placeholder="Search questions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="admin-select" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
          {courses.map((c, i) => <option key={i} value={c}>{c}</option>)}
        </select>
        <select className="admin-select" value={sortBy} onChange={e => setSortBy(e.target.value)} title="Sort questions">
          <option value="newest">↓ Newest First</option>
          <option value="oldest">↑ Oldest First</option>
          <option value="az">A–Z by Course</option>
          <option value="difficulty">By Difficulty</option>
        </select>
        <button
          className={`admin-btn ${filterReported ? 'danger' : 'secondary'}`}
          onClick={toggleReportedFilter}
          style={{ padding: "8px 12px", border: filterReported ? "none" : "" }}
        >
          <AlertTriangle size={15} />
          {filterReported ? "Clear Reported" : "Reported"}
        </button>
        <button
          className={`admin-btn`}
          onClick={() => setFilterNoCourse(f => !f)}
          style={{
            padding: "8px 12px",
            background: filterNoCourse ? "rgba(245,158,11,0.15)" : undefined,
            color: filterNoCourse ? "#b45309" : undefined,
            border: filterNoCourse ? "1.5px solid #f59e0b" : undefined,
            fontWeight: filterNoCourse ? 700 : undefined,
          }}
          title="Show only questions with no course assigned"
        >
          <BookmarkX size={15} />
          {filterNoCourse ? "Clear Unassigned" : "Unassigned"}
          {noCourseCount > 0 && !filterNoCourse && (
            <span style={{
              background: "#f59e0b", color: "white",
              borderRadius: 99, fontSize: ".68rem",
              padding: "1px 6px", marginLeft: 4, fontWeight: 800,
            }}>{noCourseCount}</span>
          )}
        </button>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
          background: "rgba(66,85,255,0.06)", border: "1px solid rgba(66,85,255,0.2)",
          borderRadius: 12, marginBottom: 12, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: ".85rem", fontWeight: 700, color: "#4255ff" }}>
            {selectedIds.size} selected
          </span>
          <button className="admin-btn primary sm" onClick={() => { setMoveTargetCourse(""); setShowMoveModal(true); }}
            title="Move selected questions to another course">
            <MoveRight size={13} /> Move to Course
          </button>
          <button className="admin-btn danger sm" onClick={() => setShowBulkConfirm(true)}>
            <Trash2 size={13} /> Delete Selected
          </button>
          <button className="admin-btn secondary sm" onClick={() => setSelectedIds(new Set())}>
            Clear
          </button>
        </div>
      )}

      {/* Questions list */}
      {loading ? (
        <BookLoader />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--admin-muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📭</div>
          No questions found
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {/* Bulk select all checkbox */}
                <th style={{ width: 36 }}>
                  <input type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer", accentColor: "#4255ff" }}
                  />
                </th>
                <th style={{ width: 36 }}>#</th>
                <th>Question</th>
                <th>Course</th>
                <th>Difficulty</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q, idx) => {
                const diffColor = q.difficulty === "Easy" ? "#16a34a" : q.difficulty === "Hard" ? "#dc2626" : "#d97706";
                const diffBg   = q.difficulty === "Easy" ? "rgba(22,163,74,0.08)" : q.difficulty === "Hard" ? "rgba(220,38,38,0.08)" : "rgba(217,119,6,0.08)";
                const isSelected = selectedIds.has(q._id);
                return (
                  <>
                    <tr
                      key={q._id}
                      style={{ cursor: "pointer", background: isSelected ? "rgba(66,85,255,0.04)" : undefined }}
                      onClick={() => setExpanded(expanded === q._id ? null : q._id)}
                    >
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(q._id)}
                          style={{ cursor: "pointer", accentColor: "#4255ff" }}
                        />
                      </td>
                      <td style={{ color: "var(--admin-muted)", fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {expanded === q._id ? <ChevronUp size={13} style={{ color: "var(--admin-muted)", flexShrink: 0 }} /> : <ChevronDown size={13} style={{ color: "var(--admin-muted)", flexShrink: 0 }} />}
                          <span style={{ fontSize: ".87rem", lineHeight: 1.4 }}>{q.question}</span>
                          {q.isReported && <span className="admin-badge red" title={`Reported: ${q.reportReason}`} style={{ padding: "2px 6px", fontSize: "0.65rem", flexShrink: 0 }}><AlertTriangle size={10} style={{ marginRight: 3 }}/> Reported</span>}
                        </div>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        {inlineEditCourse === q._id ? (
                          <div style={{ display: "flex", gap: 4, alignItems: "center", minWidth: 160 }}>
                            <select
                              className="admin-select"
                              style={{ flex: 1, padding: "4px 8px", fontSize: ".8rem" }}
                              value={inlineEditCourseVal}
                              onChange={e => setInlineEditCourseVal(e.target.value)}
                              autoFocus
                            >
                              <option value="">— pick course —</option>
                              {coursesFromDB.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                            <button className="admin-btn primary sm" style={{ padding: "4px 8px", fontSize: ".75rem" }}
                              onClick={() => handleInlineCourseUpdate(q._id)}>✓</button>
                            <button className="admin-btn secondary sm" style={{ padding: "4px 8px", fontSize: ".75rem" }}
                              onClick={() => { setInlineEditCourse(null); setInlineEditCourseVal(""); }}>✕</button>
                          </div>
                        ) : (
                          <span
                            className={`admin-badge ${q.course ? 'blue' : 'red'}`}
                            title={q.course ? "Click to change course" : "⚠ No course assigned — click to fix"}
                            onClick={() => { setInlineEditCourse(q._id); setInlineEditCourseVal(q.course || ""); }}
                            style={{ cursor: "pointer", userSelect: "none" }}
                          >
                            {q.course || "⚠ Unassigned"}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          padding: "3px 8px", borderRadius: 6, fontSize: ".72rem",
                          fontWeight: 700, color: diffColor, background: diffBg,
                          border: `1px solid ${diffColor}30`,
                        }}>
                          {q.difficulty || "Medium"}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="admin-btn secondary sm" title="Edit"
                            onClick={() => { setEditData({ ...q }); setEditModal(true); }}>
                            <Edit2 size={13} />
                          </button>
                          <button className="admin-btn danger sm" title="Delete"
                            onClick={() => setDeleteId(q._id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded === q._id && (
                      <tr key={`${q._id}-expanded`} style={{ background: "rgba(66,85,255,0.03)" }}>
                        <td colSpan={6} style={{ padding: "12px 16px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                            {q.options?.map((opt, i) => (
                              <div key={i} style={{
                                padding: "8px 12px", borderRadius: 8,
                                background: q.answer === i ? "rgba(22,163,74,0.08)" : "#f8fafc",
                                border: `1px solid ${q.answer === i ? "rgba(22,163,74,0.35)" : "var(--admin-border)"}`,
                                color: q.answer === i ? "#16a34a" : "var(--admin-muted)",
                                fontSize: ".83rem", fontWeight: q.answer === i ? 600 : 400,
                              }}>
                                {String.fromCharCode(65 + i)}. {opt}
                                {q.answer === i && " ✓"}
                              </div>
                            ))}
                          </div>
                          {q.explanation && (
                            <div style={{ marginTop:10, padding:"8px 12px", background:"rgba(66,85,255,0.05)", borderRadius:8, fontSize:".8rem", color:"#4255ff" }}>
                              💡 {q.explanation}
                            </div>
                          )}
                          {q.isReported && (
                            <div style={{ marginTop:10, padding:"8px 12px", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, fontSize:".8rem", color:"#ef4444", display:"flex", alignItems:"center", gap:8 }}>
                              <AlertTriangle size={14} /> <strong>Report Reason:</strong> {q.reportReason || "Not specified"}
                            </div>
                          )}
                          {/* Copy & quick-edit actions in expanded row */}
                          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              className="admin-btn secondary sm"
                              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: ".78rem" }}
                              onClick={() => handleCopyQuestion(q)}
                              title="Duplicate this question into the editor"
                            >
                              <ClipboardCopy size={13} /> Copy Question
                            </button>
                            <button
                              className="admin-btn secondary sm"
                              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: ".78rem" }}
                              onClick={() => { setEditData({ ...q }); setEditModal(true); }}
                            >
                              <Edit2 size={13} /> Edit Full
                            </button>
                            {!q.course && (
                              <button
                                className="admin-btn sm"
                                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: ".78rem", background: "rgba(245,158,11,0.12)", color: "#b45309", border: "1px solid rgba(245,158,11,0.3)" }}
                                onClick={() => { setInlineEditCourse(q._id); setInlineEditCourseVal(""); }}
                              >
                                <BookmarkX size={13} /> Assign Course
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ADD QUESTION — slide-in panel ── */}
      {showAddModal && (
        <div style={{ position:"fixed", inset:0, zIndex:1000, display:"flex" }}>
          {/* Backdrop */}
          <div style={{ flex:1, background:"rgba(0,0,0,0.35)", backdropFilter:"blur(4px)" }} onClick={() => { setShowAddModal(false); setAddValidationErrors({}); setDuplicateWarning(""); }} />
          {/* Panel */}
          <div style={{
            width:"min(540px, 100vw)", background:"white", height:"100%", overflowY:"auto",
            boxShadow:"-8px 0 40px rgba(0,0,0,0.12)", display:"flex", flexDirection:"column",
            animation:"slideInR .25s ease",
            padding: window.innerWidth < 600 ? "0" : "0" // Ensuring no weird overflow
          }}>
            {/* Panel header */}
            <div style={{ padding: window.innerWidth < 600 ? "16px 20px" : "20px 24px", borderBottom:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, background:"#f8fafc" }}>
              <div>
                <h2 style={{ margin:0, fontSize: window.innerWidth < 600 ? "1rem" : "1.1rem", fontWeight:800, color:"#0f172a" }}>➕ Add New Question</h2>
                <p style={{ margin:"2px 0 0", fontSize:".78rem", color:"#64748b" }}>Fill all fields and pick the correct option</p>
              </div>
              <button className="admin-btn secondary sm" onClick={() => { setShowAddModal(false); setAddValidationErrors({}); setDuplicateWarning(""); }}>✕</button>
            </div>

            {/* Panel body */}
            <div style={{ padding: window.innerWidth < 600 ? "16px" : "24px", display:"flex", flexDirection:"column", gap:18, flex:1 }}>

              {/* Course */}
              <div>
                <label style={{ fontSize:".78rem", fontWeight:700, color: addValidationErrors.course ? "#ef4444" : "#64748b", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:".06em" }}>Course *</label>
                <select className="admin-select" style={{ width:"100%", borderColor: addValidationErrors.course ? "#ef4444" : undefined }}
                  value={newQ.course} onChange={e => { setNewQ(p => ({ ...p, course: e.target.value })); setAddValidationErrors(p => ({ ...p, course: false })); }}>
                  <option value="">— Select a course —</option>
                  {coursesFromDB.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                {addValidationErrors.course && (
                  <div style={{ fontSize: ".73rem", color: "#ef4444", marginTop: 4, fontWeight: 500 }}>⚠ Course is required</div>
                )}
                {/* Inline: create a new course without leaving this panel */}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <input
                    className="admin-input"
                    style={{ flex: 1, fontSize: ".82rem" }}
                    placeholder="Or type new course name…"
                    value={inlineNewCourse}
                    onChange={e => setInlineNewCourse(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleInlineCreateCourse(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleInlineCreateCourse}
                    disabled={!inlineNewCourse.trim() || creatingInlineCourse}
                    style={{
                      padding: "8px 13px", borderRadius: 8, border: "none", cursor: inlineNewCourse.trim() ? "pointer" : "default",
                      background: inlineNewCourse.trim() ? "#10b981" : "#e2e8f0",
                      color: inlineNewCourse.trim() ? "white" : "#94a3b8",
                      fontWeight: 700, fontSize: ".78rem", whiteSpace: "nowrap", transition: "all .15s",
                    }}
                  >
                    {creatingInlineCourse ? "…" : "+ Create"}
                  </button>
                </div>
                {newQ.course && (
                  <div style={{ marginTop: 6, fontSize: ".75rem", color: "#10b981", fontWeight: 600 }}>✓ {newQ.course}</div>
                )}
              </div>

              {/* Difficulty */}
              <div>
                <label style={{ fontSize:".78rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:".06em" }}>Difficulty</label>
                <div style={{ display:"flex", gap:8 }}>
                  {["Easy","Medium","Hard"].map(d => (
                    <button key={d} onClick={() => setNewQ(p => ({ ...p, difficulty: d }))}
                      style={{
                        flex:1, padding:"8px", borderRadius:10, border:"2px solid",
                        borderColor: newQ.difficulty===d ? "#4255ff" : "#e2e8f0",
                        background: newQ.difficulty===d ? "rgba(66,85,255,0.08)" : "#f8fafc",
                        color: newQ.difficulty===d ? "#4255ff" : "#64748b",
                        fontWeight:700, fontSize:".82rem", cursor:"pointer",
                      }}>{d}</button>
                  ))}
                </div>
              </div>

              {/* Question text */}
              <div>
                <label style={{ fontSize:".78rem", fontWeight:700, color: addValidationErrors.question ? "#ef4444" : "#64748b", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:".06em" }}>
                  Question Text * <span style={{ textTransform:"none", fontWeight:400, color: newQ.question.length > 500 ? "#ef4444" : "#94a3b8" }}>({newQ.question.length} chars{newQ.question.length > 500 ? " — very long!" : ""})</span>
                </label>
                <textarea
                  className="admin-input"
                  style={{ width:"100%", minHeight:100, resize:"vertical", boxSizing:"border-box", lineHeight:1.6, borderColor: addValidationErrors.question ? "#ef4444" : undefined }}
                  placeholder="Type your question here…"
                  value={newQ.question}
                  onChange={e => { setNewQ(p => ({ ...p, question: e.target.value })); setAddValidationErrors(p => ({ ...p, question: false })); }}
                  onBlur={e => checkDuplicate(e.target.value)}
                />
                {duplicateWarning && (
                  <div style={{ marginTop: 6, padding: "7px 10px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", color: "#92400e", fontSize: ".75rem", fontWeight: 500 }}>
                    {duplicateWarning}
                  </div>
                )}
                {addValidationErrors.question && (
                  <div style={{ fontSize: ".73rem", color: "#ef4444", marginTop: 4, fontWeight: 500 }}>⚠ Question text is required</div>
                )}
              </div>

              {/* Options */}
              <div>
                <label style={{ fontSize:".78rem", fontWeight:700, color: (addValidationErrors.options || addValidationErrors.answer) ? "#ef4444" : "#64748b", display:"block", marginBottom:8, textTransform:"uppercase", letterSpacing:".06em" }}>
                  Options * <span style={{ textTransform:"none", fontWeight:500, color:"#16a34a" }}>— click the letter to mark correct answer</span>
                </label>
                {newQ.options.map((opt, i) => (
                  <div key={i} style={{ display:"flex", gap:8, marginBottom:10, alignItems:"center" }}>
                    <button
                      onClick={() => { setNewQ(p => ({ ...p, answer: i })); setAddValidationErrors(p => ({ ...p, answer: false })); }}
                      style={{
                        width:32, height:32, borderRadius:10, border:"2px solid",
                        borderColor: newQ.answer===i ? "#16a34a" : addValidationErrors.answer ? "#ef4444" : "#e2e8f0",
                        background: newQ.answer===i ? "#16a34a" : "white",
                        color: newQ.answer===i ? "white" : "#64748b",
                        fontSize:".8rem", cursor:"pointer", flexShrink:0,
                        display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800,
                        boxShadow: newQ.answer===i ? "0 2px 8px rgba(22,163,74,.3)" : "none",
                        transition:"all .15s",
                      }}>
                      {String.fromCharCode(65+i)}
                    </button>
                    <input
                      className="admin-input"
                      style={{ flex:1, borderColor: newQ.answer===i ? "rgba(22,163,74,.4)" : addValidationErrors.options && !opt.trim() ? "#ef4444" : undefined, background: newQ.answer===i ? "rgba(22,163,74,.04)" : undefined }}
                      placeholder={`Option ${String.fromCharCode(65+i)}…`}
                      value={opt}
                      onChange={e => {
                        const opts=[...newQ.options]; opts[i]=e.target.value;
                        setNewQ(p => ({ ...p, options:opts }));
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Explanation */}
              <div>
                <label style={{ fontSize:".78rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:".06em" }}>Explanation <span style={{ textTransform:"none", fontWeight:400, color:"#94a3b8" }}>(optional — shown after answering)</span></label>
                <textarea
                  className="admin-input"
                  style={{ width:"100%", minHeight:70, resize:"vertical", boxSizing:"border-box", lineHeight:1.6 }}
                  placeholder="Explain why the correct answer is correct…"
                  value={newQ.explanation || ""}
                  onChange={e => setNewQ(p => ({ ...p, explanation: e.target.value }))}
                />
              </div>

              {/* Preview */}
              {newQ.question && (
                <div style={{ background:"rgba(66,85,255,0.04)", border:"1px solid rgba(66,85,255,0.15)", borderRadius:14, padding:16 }}>
                  <div style={{ fontSize:".72rem", fontWeight:700, color:"#4255ff", marginBottom:8, textTransform:"uppercase", letterSpacing:".06em" }}>📋 Preview</div>
                  <div style={{ fontWeight:600, fontSize:".9rem", color:"#0f172a", marginBottom:10, lineHeight:1.5 }}>{newQ.question}</div>
                  {newQ.options.map((o,i) => o && (
                    <div key={i} style={{ padding:"6px 10px", marginBottom:5, borderRadius:8, fontSize:".82rem",
                      background: newQ.answer===i ? "rgba(22,163,74,.1)" : "#f8fafc",
                      border: `1px solid ${newQ.answer===i ? "rgba(22,163,74,.3)" : "#e2e8f0"}`,
                      color: newQ.answer===i ? "#16a34a" : "#475569", fontWeight: newQ.answer===i ? 600 : 400,
                    }}>
                      {String.fromCharCode(65+i)}. {o} {newQ.answer===i && "✓"}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div style={{ padding:"16px 24px", borderTop:"1px solid #e2e8f0", display:"flex", gap:10, flexShrink:0, background:"#f8fafc" }}>
              <button className="admin-btn secondary" style={{ flex:1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="admin-btn primary" style={{ flex:2 }} onClick={handleAddQuestion}>
                ✓ Save Question
              </button>
            </div>
          </div>
          <style>{`@keyframes slideInR{from{transform:translateX(60px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editModal && editData && (
        <div className="admin-modal-overlay" onClick={() => setEditModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>✏️ Edit Question</h3>
              <button className="admin-btn secondary sm" onClick={() => setEditModal(false)}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: ".8rem", color: "var(--admin-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>COURSE</label>
                <select className="admin-select" style={{ width:"100%", boxSizing:"border-box" }}
                  value={editData.course || ""}
                  onChange={e => setEditData(p => ({ ...p, course: e.target.value }))}>
                  <option value="">— Select a course —</option>
                  {coursesFromDB.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: ".8rem", color: "var(--admin-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>DIFFICULTY</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Easy", "Medium", "Hard"].map(d => {
                    const dColor = d === "Easy" ? "#16a34a" : d === "Hard" ? "#dc2626" : "#d97706";
                    const active = (editData.difficulty || "Medium") === d;
                    return (
                      <button key={d} onClick={() => setEditData(p => ({ ...p, difficulty: d }))}
                        style={{
                          flex: 1, padding: "8px", borderRadius: 10, border: `2px solid ${active ? dColor : "var(--admin-border)"}`,
                          background: active ? `${dColor}15` : "transparent",
                          color: active ? dColor : "var(--admin-muted)",
                          fontWeight: 700, fontSize: ".82rem", cursor: "pointer", transition: "all .15s",
                        }}>{d}</button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label style={{ fontSize: ".8rem", color: "var(--admin-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>QUESTION</label>
                <textarea className="admin-input"
                  style={{ width: "100%", minHeight: 90, resize: "vertical", boxSizing: "border-box" }}
                  value={editData.question || ""}
                  onChange={e => setEditData(p => ({ ...p, question: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: ".8rem", color: "var(--admin-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>
                  OPTIONS <span style={{ color: "#16a34a", fontWeight: 400 }}>(click letter to set correct)</span>
                </label>
                {editData.options?.map((opt, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                    <button
                      onClick={() => setEditData(p => ({ ...p, answer: i }))}
                      style={{
                        width: 32, height: 32, borderRadius: 10, border: "2px solid",
                        borderColor: editData.answer === i ? "#16a34a" : "var(--admin-border)",
                        background: editData.answer === i ? "#16a34a" : "transparent",
                        color: editData.answer === i ? "white" : "var(--admin-muted)",
                        fontSize: ".8rem", cursor: "pointer", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800,
                        boxShadow: editData.answer === i ? "0 2px 8px rgba(22,163,74,.3)" : "none",
                        transition: "all .15s",
                      }}>
                      {String.fromCharCode(65 + i)}
                    </button>
                    <input className="admin-input"
                      style={{ flex: 1, borderColor: editData.answer === i ? "rgba(22,163,74,.4)" : undefined, background: editData.answer === i ? "rgba(22,163,74,.04)" : undefined }}
                      value={opt}
                      onChange={e => {
                        const opts = [...editData.options]; opts[i] = e.target.value;
                        setEditData(p => ({ ...p, options: opts }));
                      }} />
                  </div>
                ))}
              </div>
              <div>
                <label style={{ fontSize: ".8rem", color: "var(--admin-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>EXPLANATION <span style={{ fontWeight: 400, color: "var(--admin-muted)" }}>(optional — {(editData.explanation || "").length} chars)</span></label>
                <textarea className="admin-input"
                  style={{ width: "100%", minHeight: 70, resize: "vertical", boxSizing: "border-box" }}
                  placeholder="Why is this answer correct?"
                  value={editData.explanation || ""}
                  onChange={e => setEditData(p => ({ ...p, explanation: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="admin-btn secondary" onClick={() => setEditModal(false)}>Cancel</button>
                <button className="admin-btn primary" onClick={handleSave}>✓ Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COURSE MANAGER MODAL ── */}
      {showCourseModal && (
        <div className="admin-modal-overlay" onClick={() => { setShowCourseModal(false); setEditingCourseName(null); }}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>📚 Course Manager</h3>
              <button className="admin-btn secondary sm" onClick={() => { setShowCourseModal(false); setEditingCourseName(null); }}>✕</button>
            </div>
            <input className="admin-input" style={{ width: "100%", marginBottom: 12, boxSizing: "border-box" }}
              placeholder="Search courses..." value={courseSearch}
              onChange={e => setCourseSearch(e.target.value)} />
            <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {coursesFromDB.filter(c => c.name?.toLowerCase().includes(courseSearch.toLowerCase())).map(c => (
                <div key={c.name} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", borderRadius: 10,
                  background: editingCourseName === c.name ? "rgba(66,85,255,0.05)" : "#f8fafc",
                  border: `1px solid ${editingCourseName === c.name ? "rgba(66,85,255,0.35)" : "var(--admin-border)"}`,
                  gap: 10, flexWrap: "wrap",
                }}>
                  {editingCourseName === c.name ? (
                    /* ── Inline rename input ── */
                    <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
                      <input
                        className="admin-input"
                        style={{ flex: 1, padding: "6px 10px", fontSize: ".85rem" }}
                        value={renameValue}
                        autoFocus
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleRenameCourse(c.name);
                          if (e.key === "Escape") setEditingCourseName(null);
                        }}
                      />
                      <button className="admin-btn primary sm" onClick={() => handleRenameCourse(c.name)}>Save</button>
                      <button className="admin-btn secondary sm" onClick={() => setEditingCourseName(null)}>✕</button>
                    </div>
                  ) : (
                    /* ── Normal row ── */
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: ".875rem", color: "var(--admin-text)", fontWeight: 600 }}>{c.name}</span>
                        {/* Mini count bar */}
                        {(() => {
                          const count = courseQuestionCounts[c.name] ?? questions.filter(q => q.course === c.name).length;
                          const maxCount = Math.max(...Object.values(courseQuestionCounts), 1);
                          const pct = Math.max(4, Math.round((count / maxCount) * 100));
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                              <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--admin-border)', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #4255ff, #8b5cf6)', transition: 'width .3s' }} />
                              </div>
                              <span style={{ fontSize: ".7rem", color: 'var(--admin-muted)', fontWeight: 600, flexShrink: 0 }}>{count}</span>
                            </div>
                          );
                        })()}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: 'center' }}>
                        <button
                          className="admin-btn secondary sm"
                          style={{ padding: '5px 9px', borderRadius: '8px', fontSize: '.72rem' }}
                          title="Filter to this course"
                          onClick={() => { setSelectedCourse(c.name); setShowCourseModal(false); setEditingCourseName(null); }}
                        >
                          <Search size={11} /> View
                        </button>
                        <button
                          className="admin-btn secondary sm"
                          style={{ padding: '6px', borderRadius: '8px' }}
                          title="Rename course"
                          onClick={() => { setEditingCourseName(c.name); setRenameValue(c.name); }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="admin-btn danger sm"
                          style={{ padding: '6px', borderRadius: '8px' }}
                          title="Delete course"
                          onClick={() => handleDeleteCourse(c.name)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            {addingCourse ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input className="admin-input" style={{ flex: 1 }} placeholder="New course name..."
                  value={newCourseName} onChange={e => setNewCourseName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddCourse()} />
                <button className="admin-btn primary sm" onClick={handleAddCourse}>Save</button>
                <button className="admin-btn secondary sm" onClick={() => setAddingCourse(false)}>✕</button>
              </div>
            ) : (
              <button className="admin-btn primary" style={{ width: "100%" }} onClick={() => setAddingCourse(true)}>
                <Plus size={14} /> Add Course
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteId && (
        <div className="admin-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px" }}>Delete Question?</h3>
            <p style={{ color: "var(--admin-muted)", fontSize: ".875rem", marginBottom: 20 }}>
              This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="admin-btn secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="admin-btn danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK DELETE CONFIRM ── */}
      {showBulkConfirm && (
        <div className="admin-modal-overlay" onClick={() => setShowBulkConfirm(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px" }}>Delete {selectedIds.size} Questions?</h3>
            <p style={{ color: "var(--admin-muted)", fontSize: ".875rem", marginBottom: 20 }}>
              This will permanently delete <strong>{selectedIds.size}</strong> selected questions. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="admin-btn secondary" onClick={() => setShowBulkConfirm(false)}>Cancel</button>
              <button className="admin-btn danger" onClick={handleBulkDelete}>Delete All</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MOVE TO COURSE MODAL ── */}
      {showMoveModal && (
        <div className="admin-modal-overlay" onClick={() => setShowMoveModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>🚚</div>
            <h3 style={{ margin: "0 0 6px" }}>Move {selectedIds.size} Question{selectedIds.size !== 1 ? "s" : ""}</h3>
            <p style={{ color: "var(--admin-muted)", fontSize: ".875rem", marginBottom: 20 }}>
              Select the course you want to move {selectedIds.size === 1 ? "this question" : "these questions"} to.
            </p>
            <select
              className="admin-select"
              style={{ width: "100%", marginBottom: 20 }}
              value={moveTargetCourse}
              onChange={e => setMoveTargetCourse(e.target.value)}
            >
              <option value="">— Select a course —</option>
              {coursesFromDB.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="admin-btn secondary" onClick={() => setShowMoveModal(false)}>Cancel</button>
              <button
                className="admin-btn primary"
                disabled={!moveTargetCourse}
                style={{ opacity: moveTargetCourse ? 1 : 0.5 }}
                onClick={handleMoveToCourse}
              >
                <MoveRight size={14} /> Move Questions
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>

      {/* ── EXPORT MODAL ── */}
      {showExportModal && (
        <div className="admin-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "var(--admin-text)" }}>
                  <FileDown size={18} style={{ verticalAlign: "middle", marginRight: 8 }} />
                  Export Questions
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: ".78rem", color: "var(--admin-muted)" }}>
                  Downloads a plain-text (.txt) file formatted exactly as students see the questions.
                </p>
              </div>
              <button className="admin-btn secondary sm" onClick={() => setShowExportModal(false)}>✕</button>
            </div>

            {/* Course picker */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                fontSize: ".75rem", fontWeight: 700, color: "var(--admin-muted)",
                textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 8,
              }}>
                Select Course to Export
              </label>

              {/* Export All pill */}
              <div
                onClick={() => setExportCourse("__ALL__")}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                  borderRadius: 10, cursor: "pointer", marginBottom: 8,
                  border: `2px solid ${exportCourse === "__ALL__" ? "#4255ff" : "var(--admin-border)"}`,
                  background: exportCourse === "__ALL__" ? "rgba(66,85,255,0.06)" : "var(--admin-surface, #f8fafc)",
                  transition: "all .15s",
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", border: "2px solid",
                  borderColor: exportCourse === "__ALL__" ? "#4255ff" : "var(--admin-border)",
                  background: exportCourse === "__ALL__" ? "#4255ff" : "transparent",
                  flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {exportCourse === "__ALL__" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: ".88rem", color: exportCourse === "__ALL__" ? "#4255ff" : "var(--admin-text)" }}>
                    📦 Export All Courses
                  </div>
                  <div style={{ fontSize: ".73rem", color: "var(--admin-muted)", marginTop: 1 }}>
                    {questions.length.toLocaleString()} total questions across all courses
                  </div>
                </div>
              </div>

              {/* Individual course pills */}
              <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 4 }}>
                {courses.filter(c => c !== "All").map(c => {
                  const count = questions.filter(q => q.course === c).length;
                  const isActive = exportCourse === c;
                  return (
                    <div
                      key={c}
                      onClick={() => setExportCourse(c)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
                        borderRadius: 10, cursor: "pointer",
                        border: `2px solid ${isActive ? "#10b981" : "var(--admin-border)"}`,
                        background: isActive ? "rgba(16,185,129,0.06)" : "var(--admin-surface, #f8fafc)",
                        transition: "all .15s",
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%", border: "2px solid",
                        borderColor: isActive ? "#10b981" : "var(--admin-border)",
                        background: isActive ? "#10b981" : "transparent",
                        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isActive && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: ".85rem", color: isActive ? "#10b981" : "var(--admin-text)" }}>{c}</div>
                        <div style={{ fontSize: ".72rem", color: "var(--admin-muted)", marginTop: 1 }}>{count} question{count !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preview info */}
            <div style={{
              padding: "10px 14px", borderRadius: 10,
              background: "rgba(66,85,255,0.04)", border: "1px solid rgba(66,85,255,0.15)",
              fontSize: ".78rem", color: "#4255ff", marginBottom: 20, lineHeight: 1.6,
            }}>
              📄 <strong>Plain Text Format:</strong> Questions numbered, options A–D with correct answer marked ✓, explanations included. Ready to paste or print.
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="admin-btn secondary" style={{ flex: 1 }} onClick={() => setShowExportModal(false)}>Cancel</button>
              <button
                className="admin-btn primary"
                style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                onClick={handleExport}
              >
                <FileDown size={16} />
                Download .txt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
