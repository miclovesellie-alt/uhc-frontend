import React, { useState, useEffect } from "react";
import api from "../../api/api";
import {
  Book, Plus, Trash2, Search, BookOpen, FileUp, Download, EyeOff,
  Layers, CreditCard, Edit2
} from "lucide-react";
import "../../admin_styles/AdminLibrary.css";

/* ══════════════════════════════════════
   SHARED: INLINE COURSE ADDER
   Renders below any course <select> so
   the admin can create a new course on the fly.
   onAdd(newCourseObject) is called on success.
══════════════════════════════════════ */
function InlineCourseAdder({ onAdd }) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    const name = val.trim();
    if (!name) return;
    setBusy(true);
    try {
      const res = await api.post("courses", { name });
      onAdd(res.data);
      setVal("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create course");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
      <input
        type="text"
        placeholder="New course name…"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); create(); } }}
        style={{
          flex: 1, padding: "7px 10px", borderRadius: 8,
          border: "1px dashed var(--admin-border, #e2e8f0)",
          fontSize: "0.83rem", background: "var(--admin-input-bg, #f8fafc)",
          color: "var(--admin-text, #0f172a)", outline: "none",
        }}
      />
      <button
        type="button"
        onClick={create}
        disabled={!val.trim() || busy}
        style={{
          padding: "7px 13px", borderRadius: 8, border: "none", cursor: val.trim() ? "pointer" : "default",
          background: val.trim() ? "#10b981" : "#e2e8f0",
          color: val.trim() ? "white" : "#94a3b8",
          fontWeight: 700, fontSize: "0.79rem", transition: "all .15s", whiteSpace: "nowrap",
        }}
      >
        {busy ? "…" : "+ Create"}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════
   TAB: BOOKS
══════════════════════════════════════ */
function BooksTab({ courses, onCourseAdded }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBook, setNewBook] = useState({ title: "", author: "", course: "", description: "", isDownloadable: true });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);

  useEffect(() => { fetchBooks(); }, []);

  const fetchBooks = async () => {
    try {
      const res = await api.get("library/books");
      setBooks(res.data);
    } catch { } finally { setLoading(false); }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    if (!selectedFile) return alert("Please select a document file");
    if (!newBook.course) return alert("Please select or create a course first");
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("title", newBook.title);
    formData.append("author", newBook.author);
    formData.append("course", newBook.course);
    formData.append("description", newBook.description);
    formData.append("isDownloadable", newBook.isDownloadable);
    try {
      await api.post("library/books", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded * 100) / e.total))
      });
      setShowAddModal(false);
      setNewBook({ title: "", author: "", course: "", description: "", isDownloadable: true });
      setSelectedFile(null); setUploadProgress(0);
      fetchBooks();
    } catch (err) { alert(err.response?.data?.message || "Failed to add book"); setUploadProgress(0); }
  };

  const confirmDelete = async () => {
    if (!bookToDelete) return;
    try {
      await api.delete(`/library/books/${bookToDelete}`);
      setShowDeleteModal(false); setBookToDelete(null); fetchBooks();
    } catch (err) { alert(err.response?.data?.message || "Delete failed."); }
  };

  const filtered = books.filter(b =>
    (b.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.course || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="library-admin-controls">
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search books..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <button className="admin-btn primary" onClick={() => setShowAddModal(true)}><Plus size={18} /> Upload Book</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Title</th><th>Course</th><th className="desktop-only">Permissions</th><th className="desktop-only">Added</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="5" className="text-center">Loading...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan="5" className="text-center">No books found</td></tr>
              : filtered.map(book => (
                <tr key={book._id}>
                  <td><div className="book-cell"><div className="book-icon-sm"><Book size={14} /></div><div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontWeight: 600 }}>{book.title}</span><span style={{ fontSize: "0.75rem", color: "var(--admin-muted)" }}>{book.author}</span></div></div></td>
                  <td><span className="admin-badge blue">{book.course}</span></td>
                  <td className="desktop-only">{book.isDownloadable ? <span className="admin-badge green"><Download size={12} /> Downloadable</span> : <span className="admin-badge red"><EyeOff size={12} /> View Only</span>}</td>
                  <td className="desktop-only">{new Date(book.createdAt).toLocaleDateString()}</td>
                  <td><button className="admin-btn danger sm" onClick={() => { setBookToDelete(book._id); setShowDeleteModal(true); }}><Trash2 size={16} /></button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3><BookOpen size={20} /> Upload Study Resource</h3>
            <form onSubmit={handleAddBook}>
              <div className="form-group">
                <label>Select Document (PDF, Word)</label>
                <div className="file-input-wrapper">
                  <input type="file" id="file-upload" accept=".pdf,.doc,.docx,.txt" onChange={e => setSelectedFile(e.target.files[0])} style={{ display: "none" }} />
                  <label htmlFor="file-upload" className="file-drop-area"><FileUp size={24} /><span>{selectedFile ? selectedFile.name : "Click to select a file"}</span></label>
                </div>
              </div>
              <div className="form-group"><label>Title</label><input required type="text" placeholder="e.g. Advanced Anatomy Guide" value={newBook.title} onChange={e => setNewBook({ ...newBook, title: e.target.value })} /></div>
              <div className="form-group"><label>Author</label><input type="text" value={newBook.author} onChange={e => setNewBook({ ...newBook, author: e.target.value })} /></div>
              <div className="form-group">
                <label>Course</label>
                <select value={newBook.course} onChange={e => setNewBook({ ...newBook, course: e.target.value })}>
                  <option value="">— Select Course —</option>
                  {courses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {/* Inline create new course */}
                <InlineCourseAdder onAdd={(newCourse) => {
                  onCourseAdded(newCourse);
                  setNewBook(prev => ({ ...prev, course: newCourse.name }));
                }} />
                {newBook.course && (
                  <div style={{ marginTop: 6, fontSize: "0.78rem", color: "#10b981", fontWeight: 600 }}>
                    ✓ Course selected: {newBook.course}
                  </div>
                )}
              </div>
              <div className="form-group">
                <div className="toggle-wrapper" onClick={() => setNewBook({ ...newBook, isDownloadable: !newBook.isDownloadable })}>
                  <div className={`toggle-switch ${newBook.isDownloadable ? "on" : "off"}`}><div className="toggle-handle" /></div>
                  <span className="toggle-label">Allow students to download</span>
                </div>
              </div>
              {uploadProgress > 0 && <div className="upload-progress-bar"><div className="progress-fill" style={{ width: `${uploadProgress}%` }} /><span>{uploadProgress}% Uploading...</span></div>}
              <div className="modal-actions">
                <button type="button" className="admin-btn secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="admin-btn primary" disabled={uploadProgress > 0}>{uploadProgress > 0 ? "Uploading..." : "Upload & Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}><Trash2 size={28} /></div>
            <h3 style={{ marginBottom: 8 }}>Delete this document?</h3>
            <p style={{ color: "var(--admin-muted)", marginBottom: 24 }}>It will be moved to the Recycle Bin.</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="admin-btn secondary" style={{ flex: 1 }} onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="admin-btn primary" style={{ flex: 1, background: "#ef4444", border: "none" }} onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════
   TAB: STUDY HUB MANAGER
══════════════════════════════════════ */
function StudyHubTab({ courses, onCourseAdded }) {
  const [subTab, setSubTab] = useState("flashcards");
  const [flashcards, setFlashcards] = useState([]);   // manually-created only (editable)
  const [flashcardsTotal, setFlashcardsTotal] = useState(0); // all flashcards incl. question-derived
  const [notes, setNotes]      = useState([]);
  const [resources, setResources]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]  = useState(false);
  const [courseFilter, setCourseFilter] = useState(""); // "" = All

  // Edit state
  const [editItem, setEditItem]   = useState(null); // item data
  const [editType, setEditType]   = useState(null); // "flashcards" | "notes" | "resources"
  const [editSaving, setEditSaving] = useState(false);

  // Add form state
  const [fc,   setFc]   = useState({ question: "", answer: "", hint: "", course: "", emoji: "🃏" });
  const [note, setNote] = useState({ title: "", body: "", course: "", emoji: "📝", color: "#10b981" });
  const [res,  setRes]  = useState({ title: "", url: "", description: "", type: "video", course: "" });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const r = await api.get("studyhub/all");
      const allFc = r.data.flashcards || [];
      // Total count = everything students see (manual + question-derived)
      setFlashcardsTotal(allFc.length);
      // Editable list = only manually-created cards (not question-derived)
      setFlashcards(allFc.filter(c => !String(c._id).startsWith("q_")));
      setNotes(r.data.notes || []);
      setResources(r.data.resources || []);
    } catch { } finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (subTab === "flashcards") {
        if (!fc.question || !fc.answer || !fc.course) { alert("Question, answer, and course are required"); setSaving(false); return; }
        await api.post("studyhub/flashcards", fc);
        setFc({ question: "", answer: "", hint: "", course: "", emoji: "🃏" });
      } else if (subTab === "notes") {
        if (!note.title || !note.body || !note.course) { alert("Title, body, and course are required"); setSaving(false); return; }
        await api.post("studyhub/notes", note);
        setNote({ title: "", body: "", course: "", emoji: "📝", color: "#10b981" });
      } else {
        if (!res.title || !res.url || !res.course) { alert("Title, URL, and course are required"); setSaving(false); return; }
        await api.post("studyhub/resources", res);
        setRes({ title: "", url: "", description: "", type: "video", course: "" });
      }
      setShowForm(false);
      fetchAll();
    } catch (err) { alert(err.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm("Delete this item?")) return;
    try { await api.delete(`studyhub/${type}/${id}`); fetchAll(); }
    catch { alert("Delete failed"); }
  };

  const handleEditSave = async () => {
    if (!editItem || !editType) return;
    setEditSaving(true);
    try {
      await api.put(`studyhub/${editType}/${editItem._id}`, editItem);
      setEditItem(null); setEditType(null);
      fetchAll();
    } catch (err) { alert(err.response?.data?.message || "Update failed"); }
    finally { setEditSaving(false); }
  };

  // When a course is created from within this tab's inline adder
  const handleCourseCreated = (newCourse) => {
    onCourseAdded(newCourse);
    const name = newCourse.name;
    if (subTab === "flashcards") setFc(prev => ({ ...prev, course: name }));
    else if (subTab === "notes") setNote(prev => ({ ...prev, course: name }));
    else setRes(prev => ({ ...prev, course: name }));
  };

  // Derived lists
  const currentList = subTab === "flashcards" ? flashcards : subTab === "notes" ? notes : resources;
  const filteredList = courseFilter ? currentList.filter(item => item.course === courseFilter) : currentList;

  // All unique courses that exist in the Study Hub items (for filter pills)
  const allItemCourses = [...new Set([
    ...flashcards.map(f => f.course),
    ...notes.map(n => n.course),
    ...resources.map(r => r.course),
  ].filter(Boolean))].sort();

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid var(--admin-border, #e2e8f0)", fontSize: "0.88rem",
    marginTop: 4, boxSizing: "border-box",
    background: "var(--admin-input-bg, #f8fafc)", color: "var(--admin-text, #0f172a)",
  };
  const labelStyle = { fontSize: "0.82rem", fontWeight: 600, color: "var(--admin-muted, #64748b)", display: "block", marginTop: 12 };

  return (
    <>
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {[
        { key: "flashcards", label: "🃏 Flashcards", count: flashcardsTotal },
          { key: "notes",      label: "📝 Notes",       count: notes.length },
          { key: "resources",  label: "🔗 Resources",   count: resources.length },
        ].map(t => (
          <button key={t.key} onClick={() => { setSubTab(t.key); setShowForm(false); setCourseFilter(""); }}
            style={{
              padding: "7px 18px", borderRadius: 99, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem",
              background: subTab === t.key ? "#10b981" : "var(--admin-surface, #f1f5f9)",
              color: subTab === t.key ? "white" : "var(--admin-muted, #475569)",
            }}>
            {t.label} <span style={{ marginLeft: 4, background: subTab === t.key ? "rgba(255,255,255,0.25)" : "#e2e8f0", color: subTab === t.key ? "white" : "#64748b", padding: "1px 7px", borderRadius: 99, fontSize: "0.7rem" }}>{t.count}</span>
          </button>
        ))}
        <button className="admin-btn primary" style={{ marginLeft: "auto" }} onClick={() => setShowForm(f => !f)}>
          <Plus size={16} /> {showForm ? "Cancel" : `Add ${subTab === "flashcards" ? "Flashcard" : subTab === "notes" ? "Note" : "Resource"}`}
        </button>
      </div>

      {/* Course Filter Pills */}
      {allItemCourses.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "var(--admin-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginRight: 4 }}>Filter:</span>
          <button onClick={() => setCourseFilter("")}
            style={{ padding: "4px 12px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, background: !courseFilter ? "#4255ff" : "var(--admin-surface, #f1f5f9)", color: !courseFilter ? "white" : "var(--admin-muted, #475569)", transition: "all .15s" }}>
            All
          </button>
          {allItemCourses.map(c => (
            <button key={c} onClick={() => setCourseFilter(courseFilter === c ? "" : c)}
              style={{ padding: "4px 12px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700, background: courseFilter === c ? "#4255ff" : "var(--admin-surface, #f1f5f9)", color: courseFilter === c ? "white" : "var(--admin-muted, #475569)", transition: "all .15s" }}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div style={{ background: "var(--admin-surface, #f8fafc)", border: "1px solid var(--admin-border, #e2e8f0)", borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: 12, color: "var(--admin-text, #0f172a)" }}>
            {subTab === "flashcards" ? "🃏 New Flashcard" : subTab === "notes" ? "📝 New Note" : "🔗 New Resource"}
          </div>

          {subTab === "flashcards" && (
            <>
              <label style={labelStyle}>Question *</label>
              <textarea rows={2} value={fc.question} onChange={e => setFc({ ...fc, question: e.target.value })} placeholder="e.g. What is the antidote for heparin overdose?" style={{ ...inputStyle, resize: "vertical" }} />
              <label style={labelStyle}>Answer *</label>
              <textarea rows={2} value={fc.answer} onChange={e => setFc({ ...fc, answer: e.target.value })} placeholder="Protamine sulfate" style={{ ...inputStyle, resize: "vertical" }} />
              <label style={labelStyle}>Hint (optional)</label>
              <input value={fc.hint} onChange={e => setFc({ ...fc, hint: e.target.value })} placeholder="Think about reversal agents…" style={inputStyle} />
              <label style={labelStyle}>Emoji</label>
              <input value={fc.emoji} onChange={e => setFc({ ...fc, emoji: e.target.value })} style={{ ...inputStyle, width: 80 }} />
              <label style={labelStyle}>Course *</label>
              <select value={fc.course} onChange={e => setFc({ ...fc, course: e.target.value })} style={inputStyle}>
                <option value="">— Select course —</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <InlineCourseAdder onAdd={handleCourseCreated} />
              {fc.course && <div style={{ marginTop: 6, fontSize: "0.78rem", color: "#10b981", fontWeight: 600 }}>✓ {fc.course}</div>}
            </>
          )}

          {subTab === "notes" && (
            <>
              <label style={labelStyle}>Title *</label>
              <input value={note.title} onChange={e => setNote({ ...note, title: e.target.value })} placeholder="e.g. Key Cardiac Drugs" style={inputStyle} />
              <label style={labelStyle}>Body *</label>
              <textarea rows={5} value={note.body} onChange={e => setNote({ ...note, body: e.target.value })} placeholder="Write your note here. Use line breaks for formatting." style={{ ...inputStyle, resize: "vertical" }} />
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Emoji</label>
                  <input value={note.emoji} onChange={e => setNote({ ...note, emoji: e.target.value })} style={{ ...inputStyle, width: 80 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Accent Color</label>
                  <input type="color" value={note.color} onChange={e => setNote({ ...note, color: e.target.value })} style={{ height: 38, marginTop: 4, cursor: "pointer", border: "none", background: "none" }} />
                </div>
              </div>
              <label style={labelStyle}>Course *</label>
              <select value={note.course} onChange={e => setNote({ ...note, course: e.target.value })} style={inputStyle}>
                <option value="">— Select course —</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <InlineCourseAdder onAdd={handleCourseCreated} />
              {note.course && <div style={{ marginTop: 6, fontSize: "0.78rem", color: "#10b981", fontWeight: 600 }}>✓ {note.course}</div>}
            </>
          )}

          {subTab === "resources" && (
            <>
              <label style={labelStyle}>Title *</label>
              <input value={res.title} onChange={e => setRes({ ...res, title: e.target.value })} placeholder="e.g. Pharmacology Crash Course" style={inputStyle} />
              <label style={labelStyle}>URL *</label>
              <input value={res.url} onChange={e => setRes({ ...res, url: e.target.value })} placeholder="https://youtube.com/..." style={inputStyle} />
              <label style={labelStyle}>Description</label>
              <textarea rows={2} value={res.description} onChange={e => setRes({ ...res, description: e.target.value })} placeholder="Short description of what students will find..." style={{ ...inputStyle, resize: "vertical" }} />
              <label style={labelStyle}>Type</label>
              <select value={res.type} onChange={e => setRes({ ...res, type: e.target.value })} style={inputStyle}>
                <option value="video">Video</option>
                <option value="article">Article</option>
                <option value="tool">Tool</option>
                <option value="other">Other</option>
              </select>
              <label style={labelStyle}>Course *</label>
              <select value={res.course} onChange={e => setRes({ ...res, course: e.target.value })} style={inputStyle}>
                <option value="">— Select course —</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <InlineCourseAdder onAdd={handleCourseCreated} />
              {res.course && <div style={{ marginTop: 6, fontSize: "0.78rem", color: "#10b981", fontWeight: 600 }}>✓ {res.course}</div>}
            </>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button className="admin-btn secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="admin-btn primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && editType && (
        <div className="admin-modal-overlay" onClick={() => { setEditItem(null); setEditType(null); }}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>
                {editType === "flashcards" ? "✏️ Edit Flashcard" : editType === "notes" ? "✏️ Edit Note" : "✏️ Edit Resource"}
              </h3>
              <button className="admin-btn secondary sm" onClick={() => { setEditItem(null); setEditType(null); }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {editType === "flashcards" && (
                <>
                  <div><label style={labelStyle}>Question *</label><textarea rows={2} value={editItem.question || ""} onChange={e => setEditItem(p => ({ ...p, question: e.target.value }))} style={{ ...inputStyle, resize: "vertical" }} /></div>
                  <div><label style={labelStyle}>Answer *</label><textarea rows={2} value={editItem.answer || ""} onChange={e => setEditItem(p => ({ ...p, answer: e.target.value }))} style={{ ...inputStyle, resize: "vertical" }} /></div>
                  <div><label style={labelStyle}>Hint</label><input value={editItem.hint || ""} onChange={e => setEditItem(p => ({ ...p, hint: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Emoji</label><input value={editItem.emoji || ""} onChange={e => setEditItem(p => ({ ...p, emoji: e.target.value }))} style={{ ...inputStyle, width: 80 }} /></div>
                  <div>
                    <label style={labelStyle}>Course *</label>
                    <select value={editItem.course || ""} onChange={e => setEditItem(p => ({ ...p, course: e.target.value }))} style={inputStyle}>
                      <option value="">— Select course —</option>
                      {courses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </>
              )}

              {editType === "notes" && (
                <>
                  <div><label style={labelStyle}>Title *</label><input value={editItem.title || ""} onChange={e => setEditItem(p => ({ ...p, title: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Body *</label><textarea rows={5} value={editItem.body || ""} onChange={e => setEditItem(p => ({ ...p, body: e.target.value }))} style={{ ...inputStyle, resize: "vertical" }} /></div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1 }}><label style={labelStyle}>Emoji</label><input value={editItem.emoji || ""} onChange={e => setEditItem(p => ({ ...p, emoji: e.target.value }))} style={{ ...inputStyle, width: 80 }} /></div>
                    <div style={{ flex: 1 }}><label style={labelStyle}>Accent Color</label><input type="color" value={editItem.color || "#10b981"} onChange={e => setEditItem(p => ({ ...p, color: e.target.value }))} style={{ height: 38, marginTop: 4, cursor: "pointer", border: "none", background: "none" }} /></div>
                  </div>
                  <div>
                    <label style={labelStyle}>Course *</label>
                    <select value={editItem.course || ""} onChange={e => setEditItem(p => ({ ...p, course: e.target.value }))} style={inputStyle}>
                      <option value="">— Select course —</option>
                      {courses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </>
              )}

              {editType === "resources" && (
                <>
                  <div><label style={labelStyle}>Title *</label><input value={editItem.title || ""} onChange={e => setEditItem(p => ({ ...p, title: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>URL *</label><input value={editItem.url || ""} onChange={e => setEditItem(p => ({ ...p, url: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Description</label><textarea rows={2} value={editItem.description || ""} onChange={e => setEditItem(p => ({ ...p, description: e.target.value }))} style={{ ...inputStyle, resize: "vertical" }} /></div>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select value={editItem.type || "video"} onChange={e => setEditItem(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                      <option value="video">Video</option>
                      <option value="article">Article</option>
                      <option value="tool">Tool</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Course *</label>
                    <select value={editItem.course || ""} onChange={e => setEditItem(p => ({ ...p, course: e.target.value }))} style={inputStyle}>
                      <option value="">— Select course —</option>
                      {courses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="admin-btn secondary" onClick={() => { setEditItem(null); setEditType(null); }}>Cancel</button>
              <button className="admin-btn primary" onClick={handleEditSave} disabled={editSaving}>{editSaving ? "Saving…" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Items List */}
      {loading ? <p style={{ color: "var(--admin-muted)" }}>Loading…</p> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Content</th>
                <th>Course</th>
                <th className="desktop-only">Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 && (
                <tr><td colSpan={4} className="text-center">
                  No {subTab}{courseFilter ? ` in "${courseFilter}"` : " yet"}
                </td></tr>
              )}

              {subTab === "flashcards" && filteredList.map(c => (
                <tr key={c._id}>
                  <td><span style={{ fontWeight: 600 }}>{c.emoji} {c.question.slice(0, 60)}{c.question.length > 60 ? "…" : ""}</span></td>
                  <td><span className="admin-badge blue">{c.course}</span></td>
                  <td className="desktop-only">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="admin-btn secondary sm" title="Edit" onClick={() => { setEditItem({ ...c }); setEditType("flashcards"); }}><Edit2 size={13} /></button>
                      <button className="admin-btn danger sm" title="Delete" onClick={() => handleDelete("flashcards", c._id)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}

              {subTab === "notes" && filteredList.map(n => (
                <tr key={n._id}>
                  <td><span style={{ fontWeight: 600 }}>{n.emoji} {n.title}</span></td>
                  <td><span className="admin-badge blue">{n.course}</span></td>
                  <td className="desktop-only">{new Date(n.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="admin-btn secondary sm" title="Edit" onClick={() => { setEditItem({ ...n }); setEditType("notes"); }}><Edit2 size={13} /></button>
                      <button className="admin-btn danger sm" title="Delete" onClick={() => handleDelete("notes", n._id)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}

              {subTab === "resources" && filteredList.map(r => (
                <tr key={r._id}>
                  <td><a href={r.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: "#4255ff", textDecoration: "none" }}>{r.title}</a></td>
                  <td><span className="admin-badge blue">{r.course}</span></td>
                  <td className="desktop-only">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="admin-btn secondary sm" title="Edit" onClick={() => { setEditItem({ ...r }); setEditType("resources"); }}><Edit2 size={13} /></button>
                      <button className="admin-btn danger sm" title="Delete" onClick={() => handleDelete("resources", r._id)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════
   MAIN ADMIN LIBRARY PAGE
══════════════════════════════════════ */
export default function AdminLibrary() {
  const [mainTab, setMainTab] = useState("books");
  const [courses, setCourses] = useState([]);

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    try {
      const res = await api.get("courses");
      // GET /api/courses returns [{ name, slug }] — extract names and sort
      setCourses(Array.isArray(res.data) ? res.data.map(c => c.name).sort() : []);
    } catch { }
  };

  // Called by either tab when a new course is created inline
  const handleCourseAdded = (newCourse) => {
    setCourses(prev => {
      const all = [...prev, newCourse.name];
      return [...new Set(all)].sort();
    });
  };

  return (
    <div className="admin-page">
      <div className="admin-section-header">
        <div>
          <h1 className="admin-title">Library Management</h1>
          <p className="admin-subtitle">Manage documents and Study Hub content</p>
        </div>
      </div>

      {/* Main tab switcher */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--admin-border, #e2e8f0)", marginBottom: 24 }}>
        {[
          { key: "books",    label: "📂 Document Library", icon: <CreditCard size={15} /> },
          { key: "studyhub", label: "🎓 Study Hub",        icon: <Layers size={15} /> },
        ].map(t => (
          <button key={t.key} onClick={() => setMainTab(t.key)}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "10px 22px",
              fontWeight: 700, fontSize: "0.88rem", background: "none", border: "none",
              borderBottom: mainTab === t.key ? "3px solid #10b981" : "3px solid transparent",
              marginBottom: -2, cursor: "pointer",
              color: mainTab === t.key ? "#10b981" : "var(--admin-muted, #64748b)",
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {mainTab === "books"    && <BooksTab    courses={courses} onCourseAdded={handleCourseAdded} />}
      {mainTab === "studyhub" && <StudyHubTab courses={courses} onCourseAdded={handleCourseAdded} />}
    </div>
  );
}
