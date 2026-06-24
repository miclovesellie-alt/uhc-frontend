import React, { useState, useEffect } from "react";
import api from "../../api/api";
import { Upload, FileText, CheckCircle, AlertCircle, X, BookOpen, Plus, ChevronRight } from "lucide-react";
import "../../admin_styles/BulkUpload.css";

export default function BulkUpload() {
  const [questions, setQuestions] = useState([]);
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: '' }

  // Course assignment
  const [courseMode, setCourseMode] = useState("existing"); // "existing" | "new"
  const [selectedCourse, setSelectedCourse] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [coursesFromDB, setCoursesFromDB] = useState([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [courseReady, setCourseReady] = useState(false); // true when a valid course is confirmed

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await api.get("courses");
      setCoursesFromDB(Array.isArray(res.data) ? res.data : []);
    } catch { /* silent */ }
  };

  // Derived: the final course name that will be used
  const resolvedCourse = courseMode === "existing" ? selectedCourse : newCourseName.trim();
  const canUpload = questions.length > 0 && resolvedCourse.length > 0;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.questions && Array.isArray(data.questions)) {
          setQuestions(data.questions);
          setJsonInput(JSON.stringify(data, null, 2));
          setStatus(null);
          setCourseReady(false);
        } else {
          throw new Error("Invalid format. Expected { questions: [...] }");
        }
      } catch (err) {
        setStatus({ type: "error", message: "Invalid JSON file: " + err.message });
      }
    };
    reader.readAsText(file);
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setJsonInput(val);
    try {
      const data = JSON.parse(val);
      if (data.questions && Array.isArray(data.questions)) {
        setQuestions(data.questions);
        setStatus(null);
        setCourseReady(false);
      }
    } catch {
      // Don't set error while typing
    }
  };

  const handleCreateCourse = async () => {
    const name = newCourseName.trim();
    if (!name) return;
    setCreatingCourse(true);
    try {
      const res = await api.post("courses", { name });
      setCoursesFromDB(prev => [...prev, res.data]);
      setStatus({ type: "success", message: `Course "${res.data.name}" created! It will be applied to all uploaded questions.` });
      setCourseMode("existing");
      setSelectedCourse(res.data.name);
      setNewCourseName("");
    } catch (err) {
      setStatus({ type: "error", message: err.response?.data?.message || "Failed to create course" });
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleUpload = async () => {
    if (!canUpload) {
      setStatus({ type: "error", message: "Please assign a course before uploading." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // Override every question's course with the selected one
      const questionsWithCourse = questions.map(q => ({ ...q, course: resolvedCourse }));
      const res = await api.post("upload-questions", { questions: questionsWithCourse });
      setStatus({ type: "success", message: res.data.message });
      setQuestions([]);
      setJsonInput("");
      setSelectedCourse("");
      setNewCourseName("");
      setCourseMode("existing");
      fetchCourses(); // refresh so the new course shows in dropdown
    } catch (err) {
      setStatus({ type: "error", message: err.response?.data?.message || "Upload failed" });
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = coursesFromDB.filter(c =>
    c.name?.toLowerCase().includes(courseSearch.toLowerCase())
  );

  return (
    <div className="admin-page">
      <div className="admin-section-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 className="admin-title">Bulk Question Upload <span style={{ color: 'red', fontSize: '10px' }}>v3.4.0</span></h1>
            <p className="admin-subtitle">Add hundreds of questions at once via JSON — assign to a course before uploading</p>
          </div>
          {questions.length > 0 && (
            <button
              className="admin-btn primary mobile-only"
              onClick={handleUpload}
              disabled={loading || !canUpload}
              title={!canUpload ? "Assign a course first" : ""}
              style={{ boxShadow: canUpload ? '0 4px 15px rgba(66, 85, 255, 0.4)' : 'none', opacity: canUpload ? 1 : 0.5 }}
            >
              {loading ? "..." : "Upload"}
            </button>
          )}
        </div>
      </div>

      <div className="bulk-upload-container">

        {/* ── Step 1: File + Format ── */}
        <div className="upload-options">
          {/* File Upload */}
          <div className="upload-card">
            <h3><Upload size={18} /> Upload JSON File</h3>
            <p>Select a .json file containing your questions array.</p>
            <input
              type="file"
              id="file-upload"
              accept=".json"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-upload" className="admin-btn primary">
              Browse Files
            </label>
          </div>

          {/* Format Helper */}
          <div className="upload-card info">
            <h3><FileText size={18} /> Required Format</h3>
            <pre className="code-snippet">
{`{
  "questions": [
    {
      "question": "What is...?",
      "options": ["A", "B", "C", "D"],
      "answer": 0
    }
  ]
}`}
            </pre>
            <p style={{ fontSize: '0.75rem', marginTop: 4 }}>
              💡 <strong>Course is optional in the JSON</strong> — you assign it below.
            </p>
          </div>
        </div>

        {/* Manual Input */}
        <div className="manual-input-section">
          <h3>Manual JSON Input</h3>
          <textarea
            className="json-textarea"
            placeholder="Paste your JSON here..."
            value={jsonInput}
            onChange={handleTextChange}
          />
        </div>

        {/* ── Step 2: Course Assignment (shown once questions are parsed) ── */}
        {questions.length > 0 && (
          <div className="course-assignment-panel">
            <div className="course-assignment-header">
              <BookOpen size={18} />
              <div>
                <h3>Step 2 — Assign a Course <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>Required</span></h3>
                <p>Choose which course these <strong>{questions.length} questions</strong> will be added to.</p>
              </div>
            </div>

            {/* Mode toggle */}
            <div className="course-mode-toggle">
              <button
                className={`course-mode-btn ${courseMode === 'existing' ? 'active' : ''}`}
                onClick={() => { setCourseMode('existing'); setNewCourseName(''); }}
              >
                <BookOpen size={15} /> Use Existing Course
              </button>
              <button
                className={`course-mode-btn ${courseMode === 'new' ? 'active' : ''}`}
                onClick={() => { setCourseMode('new'); setSelectedCourse(''); }}
              >
                <Plus size={15} /> Create New Course
              </button>
            </div>

            {/* Existing course picker */}
            {courseMode === 'existing' && (
              <div className="course-picker-area">
                <input
                  className="admin-input"
                  placeholder="Search courses..."
                  value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)}
                  style={{ marginBottom: 10 }}
                />
                <div className="course-picker-list">
                  {filteredCourses.length === 0 && (
                    <div style={{ padding: '14px', textAlign: 'center', color: 'var(--admin-muted)', fontSize: '0.85rem' }}>
                      No courses found. Switch to "Create New Course" above.
                    </div>
                  )}
                  {filteredCourses.map(c => (
                    <div
                      key={c.name}
                      className={`course-picker-row ${selectedCourse === c.name ? 'selected' : ''}`}
                      onClick={() => setSelectedCourse(c.name)}
                    >
                      <div className="course-radio">
                        {selectedCourse === c.name && <div className="course-radio-dot" />}
                      </div>
                      <span>{c.name}</span>
                      {selectedCourse === c.name && (
                        <CheckCircle size={16} style={{ marginLeft: 'auto', color: '#10b981', flexShrink: 0 }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New course input */}
            {courseMode === 'new' && (
              <div className="new-course-input-area">
                <input
                  className="admin-input"
                  placeholder="Enter new course name..."
                  value={newCourseName}
                  onChange={e => setNewCourseName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newCourseName.trim()) handleCreateCourse(); }}
                  style={{ flex: 1 }}
                />
                <button
                  className="admin-btn primary sm"
                  onClick={handleCreateCourse}
                  disabled={!newCourseName.trim() || creatingCourse}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {creatingCourse ? '...' : '+ Save Course'}
                </button>
                <p style={{ fontSize: '0.78rem', color: 'var(--admin-muted)', marginTop: 8, width: '100%' }}>
                  The course will be created in the system and all questions will be assigned to it.
                </p>
              </div>
            )}

            {/* Selected course confirmation */}
            {resolvedCourse && (
              <div className="course-confirmed-bar">
                <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>All {questions.length} questions will be uploaded to <strong>"{resolvedCourse}"</strong></span>
              </div>
            )}

            {!resolvedCourse && (
              <div className="course-warning-bar">
                <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <span>You must assign a course before uploading.</span>
              </div>
            )}
          </div>
        )}

        {/* Status banner */}
        {status && (
          <div className={`status-banner ${status.type}`}>
            {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{status.message}</span>
            <button className="close-btn" onClick={() => setStatus(null)}><X size={14} /></button>
          </div>
        )}

        {/* ── Preview ── */}
        {questions.length > 0 && (
          <div className="preview-section">
            <div className="preview-header" style={{ position: 'sticky', top: '0', zIndex: 10, background: 'var(--admin-bg)', padding: '10px 0' }}>
              <h3>Preview ({questions.length} questions)</h3>
              <button
                className="admin-btn primary"
                onClick={handleUpload}
                disabled={loading || !canUpload}
                title={!canUpload ? "Assign a course above before uploading" : ""}
                style={{
                  boxShadow: canUpload ? '0 4px 15px rgba(66, 85, 255, 0.4)' : 'none',
                  opacity: canUpload ? 1 : 0.5,
                  cursor: canUpload ? 'pointer' : 'not-allowed',
                }}
              >
                {loading ? "Uploading..." : canUpload ? `Confirm & Upload All → ${resolvedCourse}` : "⚠️ Assign Course First"}
              </button>
            </div>

            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Course</th>
                    <th>Question</th>
                    <th>Options</th>
                    <th>Answer</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.slice(0, 10).map((q, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>
                        <span className={`admin-badge ${resolvedCourse ? 'green' : 'red'}`}>
                          {resolvedCourse || '⚠ No course'}
                        </span>
                      </td>
                      <td className="bulk-q-text">{q.question}</td>
                      <td className="bulk-opt-text">{q.options?.join(" | ")}</td>
                      <td><span className="admin-badge blue">Index {q.answer}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {questions.length > 10 && (
                <div className="table-more">And {questions.length - 10} more questions...</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Mobile Action Bar */}
      {questions.length > 0 && (
        <div className="mobile-upload-bar">
          <div className="mobile-bar-info">
            <strong>{questions.length}</strong> Questions Ready
            {resolvedCourse && <span style={{ color: '#10b981', marginLeft: 8, fontSize: '0.8rem' }}>→ {resolvedCourse}</span>}
          </div>
          <button
            className="admin-btn primary"
            onClick={handleUpload}
            disabled={loading || !canUpload}
            style={{ opacity: canUpload ? 1 : 0.5 }}
          >
            {loading ? "Uploading..." : canUpload ? "Upload All" : "Assign Course"}
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .mobile-upload-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #ffffff;
            padding: 18px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 3px solid #4255ff;
            z-index: 9999;
            box-shadow: 0 -10px 40px rgba(0,0,0,0.4);
          }
          .admin-wrapper.admin-dark .mobile-upload-bar {
            background: #1e293b;
            border-top-color: #60a5fa;
          }
          .mobile-bar-info {
            font-size: 0.95rem;
            font-weight: 700;
            color: inherit;
          }
          .admin-page {
            padding-bottom: 120px !important;
          }
        }
        @media (min-width: 1025px) {
          .mobile-upload-bar {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
