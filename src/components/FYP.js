import React, { useState, useEffect, useContext } from "react";
import { useOutletContext } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import { getFileUrl } from "../utils/config";
import api from "../api/api";
import axios from "axios";
import "../styles/dashboard.css";
import { useToast } from "./Toast";
import { toggleBookmark, getBookmarks } from "../utils/bookmarks";



const healthEmojis = ["🫀","🧠","🩺","💊","🩻","🩹","🏥","🔬","🧬","💉"];
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }



export default function FYP({ refresh }) {
  const { user, setUser } = useContext(UserContext);
  const toast = useToast();
  const { searchQuery } = useOutletContext();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [replyInputs, setReplyInputs] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [bookmarkedPosts, setBookmarkedPosts] = useState(
    () => new Set(getBookmarks('post').map(b => String(b._id)))
  );
  const [flaggedPosts, setFlaggedPosts] = useState(
    () => new Set(JSON.parse(localStorage.getItem('uhc_flagged') || '[]'))
  );

  const toggleExpand = (postId) => {
    setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleBookmarkPost = (post) => {
    const added = toggleBookmark('post', post);
    setBookmarkedPosts(prev => {
      const next = new Set(prev);
      added ? next.add(String(post._id)) : next.delete(String(post._id));
      return next;
    });
    toast(added ? '🔖 Post saved to bookmarks!' : 'Removed from bookmarks', added ? 'success' : 'info');
  };

  const awardPoints = async (amount, reason) => {
    try {
      const res = await api.post("points/add", { amount, reason });
      // Update local user context so profile shows new points
      if (user) setUser({ ...user, points: res.data.totalPoints });
    } catch (err) {
      console.error("Failed to award points", err);
    }
  };

  useEffect(() => {
    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      // 1. Try fetching from Admin Feed first
      const adminRes = await api.get("admin/feed");
      let allPosts = adminRes.data;

      // 2. If admin feed is empty or short, fetch from a public health news source as fallback
      if (allPosts.length < 3) {
        try {
          const newsRes = await axios.get("https://newsapi.org/v2/top-headlines?category=health&language=en&apiKey=c66289b4f74d47728f3f886f3f06484e");
          const newsItems = newsRes.data.articles.map((art, idx) => ({
            _id: `news-${idx}`,
            title: art.title,
            content: art.description || art.content || "No description available.",
            author: art.author || "Global Health News",
            category: "Global",
            image: art.urlToImage,
            likes: Math.floor(Math.random() * 100),
            createdAt: art.publishedAt,
            isExternal: true
          }));
          allPosts = [...allPosts, ...newsItems];
        } catch (newsErr) {
          console.warn("External news fetch failed", newsErr);
        }
      }
      // Initialize likedPosts based on post.likedBy
      if (user) {
        const initialLikes = {};
        allPosts.forEach(post => {
          if (post.likedBy && post.likedBy.includes(user._id)) {
            initialLikes[post._id] = true;
          }
        });
        setLikedPosts(prev => ({...prev, ...initialLikes}));
      }

      setPosts(allPosts);
    } catch (err) {
      console.error("Failed to fetch feed", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (id) => {
    if (String(id).startsWith("news-")) {
      const isLiking = !likedPosts[id];
      setLikedPosts(prev => ({ ...prev, [id]: isLiking }));
      if (isLiking) awardPoints(1, "Reaction");
      return;
    }

    const isLiking = !likedPosts[id];
    setLikedPosts(prev => ({ ...prev, [id]: isLiking }));
    
    // Optimistic UI update
    setPosts(prev => prev.map(p => p._id === id ? { ...p, likes: isLiking ? p.likes + 1 : Math.max(0, p.likes - 1) } : p));
    if (isLiking) awardPoints(1, "Reaction");

    try {
      await api.post(`admin/feed/${id}/like`);
    } catch (err) {
      console.error("Failed to like post");
    }
  };

  const handleComment = async (id, commentId = null) => {
    const text = commentId ? (replyInputs[commentId] || "").trim() : (commentInputs[id] || "").trim();
    if (!text) return;
    
    if (String(id).startsWith("news-")) {
      awardPoints(1, "Comment");
      if (commentId) {
        setReplyInputs(prev => ({ ...prev, [commentId]: "" }));
        setReplyingTo(null);
      } else {
        setCommentInputs(prev => ({ ...prev, [id]: "" }));
      }
      toast("Comment posted! +1 point 🎉", "success");
      return;
    }

    try {
      const res = await api.post(`admin/feed/${id}/comment`, { text, commentId });
      setPosts(prev => prev.map(p => p._id === id ? { ...p, comments: res.data } : p));
      awardPoints(1, "Comment");
      if (commentId) {
        setReplyInputs(prev => ({ ...prev, [commentId]: "" }));
        setReplyingTo(null);
      } else {
        setCommentInputs(prev => ({ ...prev, [id]: "" }));
      }
    } catch (err) {
      console.error("Failed to post comment");
      alert(err.response?.data?.message || "Failed to post comment");
    }
  };

  const flagPost = async (postId) => {
    if (flaggedPosts.has(postId)) { toast("Already flagged", "info"); return; }
    try {
      await api.post(`admin/feed/${postId}/flag`);
      const updated = new Set(flaggedPosts).add(postId);
      setFlaggedPosts(updated);
      localStorage.setItem('uhc_flagged', JSON.stringify([...updated]));
      toast("🚩 Post flagged for review", "success");
    } catch { toast("Could not flag post", "error"); }
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>

      {/* ── Post Feed ── */}
      <div className="dash-feed-column" style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '640px', margin: '0 auto 40px auto' }}>
        {posts.filter(p => 
          p.title?.toLowerCase().includes(searchQuery?.toLowerCase() || "") ||
          p.content?.toLowerCase().includes(searchQuery?.toLowerCase() || "")
        ).map(post => (
          <div key={post._id} className="dash-post-card" style={{ cursor: 'default', borderRadius: '16px', border: '1px solid var(--border)', background: 'white', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            
            {/* Header: Author & Meta */}
            <div className="dash-post-header" style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '12px' }}>
              <div className="dash-post-avatar" style={{ width: 44, height: 44, borderRadius: '50%', background: "linear-gradient(135deg, var(--accent), #8b5cf6)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: 700, flexShrink: 0 }}>
                {post.author?.[0] || "A"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-heading)' }}>{post.author || "Global Health News"}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(post.createdAt).toLocaleDateString()} • <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{post.category || "Health"}</span>
                </div>
              </div>
            </div>
            
            {/* Body: Title & Content */}
            <div className="dash-post-content" style={{ padding: '0 20px 16px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8, color: 'var(--text-heading)', lineHeight: 1.3 }}>{post.title}</div>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-body)', lineHeight: 1.6 }}>
                {post.content?.length > 250 && !expandedPosts[post._id] ? (
                  <>
                    {post.content.slice(0, 250)}...
                    <span 
                      style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, marginLeft: 6 }} 
                      onClick={() => toggleExpand(post._id)}
                    >
                      Read more
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ whiteSpace: 'pre-wrap' }}>{post.content}</span>
                    {post.content?.length > 250 && (
                      <span 
                        style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, marginLeft: 6, display: 'block', marginTop: 4 }} 
                        onClick={() => toggleExpand(post._id)}
                      >
                        Show less
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Media */}
            {post.image ? (
              <img 
                src={post.isExternal ? post.image : getFileUrl(post.image)} 
                alt={post.title} 
                style={{ width: '100%', maxHeight: '450px', objectFit: 'cover', display: 'block', backgroundColor: 'var(--bg-input)' }}
                onError={e => { e.target.style.display = "none"; }} 
              />
            ) : (
              <div style={{ width: '100%', height: '180px', background: 'linear-gradient(135deg, var(--accent-pale), #e8f4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem' }}>
                {rnd(healthEmojis)}
              </div>
            )}

            {/* Action Buttons */}
            <div className="dash-post-actions-bar" style={{ padding: '12px 20px', display: 'flex', gap: '8px', borderTop: '1px solid var(--border)' }}>
              <button
                className={`dash-post-action-btn${likedPosts[post._id] ? " liked" : ""}`}
                onClick={() => toggleLike(post._id)}
                style={{ background: 'transparent', padding: '8px 16px', fontSize: '0.9rem', flex: 1, justifyContent: 'center', borderRadius: '8px' }}
              >
                {likedPosts[post._id] ? "❤️" : "🤍"} {post.likes} Likes
              </button>
              <button
                className="dash-post-action-btn"
                onClick={() => setSelectedArticle(post)}
                style={{ background: 'transparent', padding: '8px 16px', fontSize: '0.9rem', flex: 1, justifyContent: 'center', borderRadius: '8px' }}
              >
                💬 {post.comments?.length || 0} Comments
              </button>
              <button
                className={`dash-post-action-btn${bookmarkedPosts.has(String(post._id)) ? ' bookmarked' : ''}`}
                onClick={() => handleBookmarkPost(post)}
                title={bookmarkedPosts.has(String(post._id)) ? 'Remove bookmark' : 'Save post'}
                style={{ background: 'transparent', padding: '8px 12px', fontSize: '1rem', justifyContent: 'center', borderRadius: '8px', flexShrink: 0 }}
              >
                {bookmarkedPosts.has(String(post._id)) ? '🔖' : '🏷️'}
              </button>
              {/* Flag button — only on real posts */}
              {!post.isExternal && (
                <button
                  onClick={() => flagPost(post._id)}
                  title={flaggedPosts.has(post._id) ? 'Flagged for review' : 'Report this post'}
                  style={{ background:'transparent', border:'none', padding:'8px 10px', cursor:'pointer', color: flaggedPosts.has(post._id) ? '#ef4444' : 'var(--text-muted)', borderRadius:8, fontSize:'1rem', flexShrink:0 }}
                >🚩</button>
              )}
            </div>

            {/* Interactive Comments Section */}
            <div className="dash-post-comments-section" style={{ padding: '16px 20px', background: 'var(--bg-page)', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-pale)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                  {user?.name?.[0] || "U"}
                </div>
                <div style={{ display: 'flex', flex: 1, background: 'white', border: '1px solid var(--border)', borderRadius: '24px', padding: '4px 8px 4px 16px', transition: 'border-color 0.2s' }}>
                  <input 
                    type="text" 
                    placeholder="Write a comment..." 
                    value={commentInputs[post._id] || ""}
                    onChange={e => setCommentInputs(prev => ({ ...prev, [post._id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleComment(post._id)}
                    style={{ flex: 1, border: 'none', fontSize: '0.85rem', outline: 'none', background: 'transparent' }}
                  />
                  <button 
                    onClick={() => handleComment(post._id)}
                    style={{ background: 'var(--accent)', border: 'none', color: 'white', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', padding: '6px 14px', borderRadius: '20px', marginLeft: '8px' }}
                  >
                    Post
                  </button>
                </div>
              </div>
              
              {post.comments && post.comments.length > 0 && (
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {post.comments.slice(0, 3).map((c, i) => (
                    <div key={c._id || i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-heading)', flexShrink: 0 }}>
                          {c.name?.[0] || "A"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ background: 'white', padding: '10px 14px', borderRadius: '0 16px 16px 16px', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-heading)', marginBottom: 4 }}>{c.name}</div>
                            <div style={{ color: 'var(--text-body)', lineHeight: 1.5 }}>{c.text}</div>
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: 4, marginLeft: 8, cursor: 'pointer', display: 'inline-block' }} onClick={() => setReplyingTo(replyingTo === c._id ? null : c._id)}>
                            Reply
                          </div>
                        </div>
                      </div>

                      {/* Replies */}
                      {c.replies && c.replies.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 42, marginTop: 4 }}>
                          {c.replies.map((r, ri) => (
                            <div key={ri} style={{ display: 'flex', gap: 8 }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-heading)', flexShrink: 0 }}>
                                {r.name?.[0] || "A"}
                              </div>
                              <div style={{ background: 'var(--bg-input)', padding: '8px 12px', borderRadius: '0 12px 12px 12px', fontSize: '0.8rem', flex: 1 }}>
                                <div style={{ fontWeight: 700, color: 'var(--text-heading)', marginBottom: 2 }}>{r.name}</div>
                                <div style={{ color: 'var(--text-body)', lineHeight: 1.4 }}>{r.text}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Input */}
                      {replyingTo === c._id && (
                        <div style={{ display: 'flex', gap: 8, marginLeft: 42, marginTop: 4 }}>
                           <input 
                              type="text" 
                              placeholder="Write a reply..." 
                              value={replyInputs[c._id] || ""}
                              onChange={e => setReplyInputs(prev => ({ ...prev, [c._id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && handleComment(post._id, c._id)}
                              style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '20px', padding: '6px 12px', fontSize: '0.8rem', outline: 'none' }}
                              autoFocus
                            />
                            <button 
                              onClick={() => handleComment(post._id, c._id)}
                              style={{ background: 'var(--accent)', border: 'none', color: 'white', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', padding: '4px 10px', borderRadius: '16px' }}
                            >
                              Post
                            </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {post.comments.length > 3 && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 42, fontWeight: 500, transition: 'color 0.2s' }} onClick={() => setSelectedArticle(post)} onMouseOver={e => e.target.style.color = 'var(--accent)'} onMouseOut={e => e.target.style.color = 'var(--text-muted)'}>
                      View all {post.comments.length} comments
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {loading && <div className="dash-loading">Loading fresh updates...</div>}
      {!loading && posts.length === 0 && (
        <div className="dash-loading" style={{ opacity: 0.5 }}>No updates yet. Check back soon!</div>
      )}

      {/* ── Article Viewer Modal ── */}
      {selectedArticle && (
        <div className="modal-overlay" onClick={e => { if (e.target.classList.contains("modal-overlay")) setSelectedArticle(null); }}>
          <div className="article-modal-content" style={{ animation: 'slideUp 0.4s ease' }}>
            <button className="modal-close-x" onClick={() => setSelectedArticle(null)}>×</button>
            {selectedArticle.image && (
              <img 
                src={selectedArticle.isExternal ? selectedArticle.image : getFileUrl(selectedArticle.image)} 
                alt={selectedArticle.title} 
                className="article-modal-img" 
              />
            )}
            <div className="article-modal-body">
              <span className="dash-post-badge">🏥 Health Update</span>
              <h2 className="article-modal-title">{selectedArticle.title}</h2>
              <div className="article-modal-meta">
                <span>Published by {selectedArticle.author} • {new Date(selectedArticle.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="article-modal-text">
                <p style={{ whiteSpace: 'pre-wrap' }}>{selectedArticle.content}</p>
              </div>
              <div className="article-modal-footer">
                <button className="dash-action-btn secondary" onClick={() => setSelectedArticle(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
