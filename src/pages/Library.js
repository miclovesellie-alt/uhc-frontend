import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import api from "../api/api";
import { BookMarked, BookOpen, ChevronRight, ArrowLeft, GraduationCap, Bookmark, Search } from "lucide-react";
import { useToast } from "../components/Toast";
import { toggleBookmark, getBookmarks } from "../utils/bookmarks";
import "../styles/library.css";

function Library() {
  const navigate = useNavigate();
  const toast = useToast();
  const { searchQuery } = useOutletContext();
  const [books, setBooks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("courses");
  const [activeCourse, setActiveCourse] = useState(null);
  const [bookmarkedBooks, setBookmarkedBooks] = useState(
    () => new Set(getBookmarks('book').map(b => String(b._id)))
  );

  const [localSearch, setLocalSearch] = useState("");

  // Combine local search with global search from topbar
  const combinedSearch = (localSearch || searchQuery || "").toLowerCase();

  const handleBookmarkBook = (book) => {
    const added = toggleBookmark('book', book);
    setBookmarkedBooks(prev => {
      const next = new Set(prev);
      added ? next.add(String(book._id)) : next.delete(String(book._id));
      return next;
    });
    toast(added ? '🔖 Book saved!' : 'Removed from saved', added ? 'success' : 'info');
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const fetchLibrary = async () => {
    try {
      const [booksRes, coursesRes] = await Promise.all([
        api.get("library/books"),
        api.get("library/courses")
      ]);
      setBooks(booksRes.data);
      setCourses(coursesRes.data);
    } catch (err) {
      console.error("Library fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const getBookCount = (courseName) => {
    return books.filter(b => b.course === courseName).length;
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(combinedSearch) || 
                          book.author?.toLowerCase().includes(combinedSearch);
    const matchesCourse = activeCourse ? book.course === activeCourse : true;
    return matchesSearch && matchesCourse;
  });

  const selectCourse = (course) => {
    setActiveCourse(course);
    setView("books");
  };

  const goBack = () => {
    setView("courses");
    setActiveCourse(null);
    setLocalSearch("");
  };

  if (loading) return <div className="viewer-loading">Loading Study Library...</div>;

  return (
    <div className="library-wrapper">
      <div className="library-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {view === "books" && (
            <button className="viewer-back-btn" onClick={goBack} style={{ width: 36, height: 36 }}>
              <ArrowLeft size={18} />
            </button>
          )}
          <h1 className="library-title">
            {view === "courses" ? "Explore Courses" : activeCourse}
          </h1>
        </div>
        
        {/* Inline search bar */}
        <div style={{ position: 'relative', minWidth: 200, maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.5 }} />
          <input
            type="text"
            placeholder={view === "courses" ? "Search courses..." : "Search books..."}
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '9px 14px 9px 36px', borderRadius: 12,
              border: '1px solid var(--border, #e2e8f0)',
              background: 'var(--card-bg, #f8fafc)',
              color: 'var(--text, #0f172a)',
              fontSize: '.85rem', outline: 'none',
            }}
          />
        </div>
      </div>

      {view === "courses" ? (
        <div className="library-topics-grid">
          {courses
            .filter(c => c.toLowerCase().includes(combinedSearch))
            .map(course => (
            <div key={course} className="course-card-classic" onClick={() => selectCourse(course)}>
              <div className="course-card-icon">
                <GraduationCap size={32} />
              </div>
              <div className="course-card-info">
                <h3>{course}</h3>
                <span className="book-count-badge">{getBookCount(course)} Resources</span>
              </div>
              <ChevronRight className="course-arrow" size={20} />
            </div>
          ))}
          {courses.length === 0 && (
            <div className="empty-library">
              <BookOpen size={48} />
              <p>No courses available yet. Contact admin to add resources.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="library-books-grid">
          {filteredBooks.length === 0 ? (
            <div className="text-center py-20" style={{ gridColumn: '1/-1' }}>
              <BookOpen size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <p style={{ color: 'var(--text-muted)' }}>No books found in this section.</p>
            </div>
          ) : (
            filteredBooks.map(book => (
              <div key={book._id} className="book-card">
                <div className="book-cover">
                  {book.coverImage ? (
                    <img src={book.coverImage} alt={book.title} />
                  ) : (
                    <div className="book-cover-placeholder">
                      <BookMarked size={50} strokeWidth={1.5} />
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, marginTop: 4 }}>UHC CLASSIC</span>
                    </div>
                  )}
                </div>
                <div className="book-info">
                  <h3 className="book-title">{book.title}</h3>
                  <p className="book-author">{book.author || "Unknown Author"}</p>
                  <div className="book-actions" style={{ display: 'flex', gap: 8 }}>
                    <button className="book-btn" style={{ flex: 1 }} onClick={() => navigate(`/library/view/${book._id}`)}>
                      <BookOpen size={16} /> Open Reader
                    </button>
                    <button
                      className="book-btn"
                      onClick={() => handleBookmarkBook(book)}
                      title={bookmarkedBooks.has(String(book._id)) ? 'Remove bookmark' : 'Save book'}
                      style={{ padding: '0 12px', background: bookmarkedBooks.has(String(book._id)) ? 'var(--accent-pale)' : undefined, color: bookmarkedBooks.has(String(book._id)) ? 'var(--accent)' : undefined }}
                    >
                      <Bookmark size={16} fill={bookmarkedBooks.has(String(book._id)) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Library;