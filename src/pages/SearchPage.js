import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, BookOpen, FileText, HelpCircle, ArrowLeft } from 'lucide-react';
import api from '../api/api';
import { SkeletonLine } from '../components/Skeleton';
import '../styles/dashboard.css';

const TABS = ['All', 'Library', 'Feed', 'Courses'];

export default function SearchPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = params.get('q') || '';

  const [tab, setTab] = useState('All');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ books: [], posts: [], courses: [] });

  useEffect(() => {
    if (!query.trim()) return;
    doSearch(query);
  }, [query]);

  const doSearch = async (q) => {
    setLoading(true);
    try {
      const [booksRes, postsRes, coursesRes] = await Promise.allSettled([
        api.get('library/books'),
        api.get('admin/feed'),
        api.get('courses'),
      ]);

      const q_lower = q.toLowerCase();

      const books = (booksRes.status === 'fulfilled' ? booksRes.value.data : [])
        .filter(b => b.title?.toLowerCase().includes(q_lower) || b.author?.toLowerCase().includes(q_lower));

      const posts = (postsRes.status === 'fulfilled' ? postsRes.value.data : [])
        .filter(p => p.title?.toLowerCase().includes(q_lower) || p.content?.toLowerCase().includes(q_lower));

      const courses = (coursesRes.status === 'fulfilled' ? coursesRes.value.data : [])
        .filter(c => (c.name || c).toLowerCase?.().includes(q_lower));

      setResults({ books, posts, courses });
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const allCount = results.books.length + results.posts.length + results.courses.length;

  const filteredBooks   = tab === 'All' || tab === 'Library'  ? results.books   : [];
  const filteredPosts   = tab === 'All' || tab === 'Feed'     ? results.posts   : [];
  const filteredCourses = tab === 'All' || tab === 'Courses'  ? results.courses : [];

  const noResults = !loading && allCount === 0 && query;

  return (
    <div className="search-page-wrap" style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10,
            width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-heading)' }}>
            Search Results
          </h1>
          {query && (
            <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {loading ? 'Searching…' : `${allCount} result${allCount !== 1 ? 's' : ''} for `}
              {!loading && <strong style={{ color: 'var(--text-heading)' }}>"{query}"</strong>}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 16px', borderRadius: 20, border: '1.5px solid',
            borderColor: tab === t ? 'var(--accent)' : 'var(--border)',
            background: tab === t ? 'var(--accent)' : 'white',
            color: tab === t ? 'white' : 'var(--text-body)',
            fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all 0.18s',
          }}>{t}</button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center' }}>
              <SkeletonLine width={40} height={40} style={{ borderRadius: 10, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <SkeletonLine width="60%" height={13} />
                <SkeletonLine width="40%" height={11} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No query */}
      {!query && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Search size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
          <p style={{ fontSize: '1rem', fontWeight: 600 }}>Type something to search</p>
          <p style={{ fontSize: '0.85rem', marginTop: 6 }}>Search across library, feed, and courses</p>
        </div>
      )}

      {/* No results */}
      {noResults && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: 12 }}>🔍</span>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: 6 }}>No results found</p>
          <p style={{ fontSize: '0.88rem' }}>Try different keywords or check your spelling.</p>
        </div>
      )}

      {/* Books */}
      {!loading && filteredBooks.length > 0 && (
        <Section icon={<BookOpen size={16} />} title="Library Books" count={filteredBooks.length}>
          {filteredBooks.map(book => (
            <ResultCard
              key={book._id}
              icon="📖"
              title={book.title}
              subtitle={book.author || 'Unknown Author'}
              badge={book.course}
              onClick={() => navigate(`/library/view/${book._id}`)}
            />
          ))}
        </Section>
      )}

      {/* Posts */}
      {!loading && filteredPosts.length > 0 && (
        <Section icon={<FileText size={16} />} title="Health Feed" count={filteredPosts.length}>
          {filteredPosts.map(post => (
            <ResultCard
              key={post._id}
              icon="📰"
              title={post.title}
              subtitle={post.content?.slice(0, 80) + (post.content?.length > 80 ? '…' : '')}
              badge={post.category}
              onClick={() => navigate('/dashboard')}
            />
          ))}
        </Section>
      )}

      {/* Courses */}
      {!loading && filteredCourses.length > 0 && (
        <Section icon={<HelpCircle size={16} />} title="Quiz Courses" count={filteredCourses.length}>
          {filteredCourses.map((c, i) => {
            const name = c.name || c;
            return (
              <ResultCard
                key={i}
                icon="🎯"
                title={name}
                subtitle="Click to start a quiz in this course"
                onClick={() => navigate('/quiz')}
              />
            );
          })}
        </Section>
      )}
    </div>
  );
}

function Section({ icon, title, count, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-heading)' }}>{title}</span>
        <span style={{
          background: 'var(--accent-pale)', color: 'var(--accent)',
          fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20
        }}>{count}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function ResultCard({ icon, title, subtitle, badge, onClick }) {
  return (
    <div
      className="search-result-card"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px', background: 'white',
        border: '1px solid var(--border)', borderRadius: 14,
        cursor: 'pointer', transition: 'all 0.18s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        background: 'var(--accent-pale)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-heading)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
      </div>
      {badge && (
        <span style={{
          background: 'var(--bg-input)', color: 'var(--text-muted)',
          fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, flexShrink: 0
        }}>{badge}</span>
      )}
    </div>
  );
}
