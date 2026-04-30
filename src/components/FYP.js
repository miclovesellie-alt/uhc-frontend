import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import { getFileUrl } from "../utils/config";
import api from "../api/api";
import axios from "axios";
import "../styles/dashboard.css";

import fbLogo from "../assets/fb.webp";
import igLogo from "../assets/ig.webp";
import snapLogo from "../assets/snapchat.webp";
import tikLogo from "../assets/tik.webp";
import gmailLogo from "../assets/gmail.webp";

const healthEmojis = ["🫀","🧠","🩺","💊","🩻","🩹","🏥","🔬","🧬","💉"];
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }



export default function FYP({ refresh }) {
  const { user, setUser } = useContext(UserContext);
  const { searchQuery } = useOutletContext();
  const navigate = useNavigate();
  const logoDropdownRef = useRef();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [selectedArticle, setSelectedArticle] = useState(null);

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

  const handleComment = async (id) => {
    const text = (commentInputs[id] || "").trim();
    if (!text) return;
    
    if (String(id).startsWith("news-")) {
      awardPoints(1, "Comment");
      setCommentInputs(prev => ({ ...prev, [id]: "" }));
      alert("Comment posted! +1 point");
      return;
    }

    try {
      const res = await api.post(`admin/feed/${id}/comment`, { text });
      setPosts(prev => prev.map(p => p._id === id ? { ...p, comments: res.data } : p));
      awardPoints(1, "Comment");
      setCommentInputs(prev => ({ ...prev, [id]: "" }));
    } catch (err) {
      console.error("Failed to post comment");
      alert("Failed to post comment");
    }
  };

  const toggleLogoMenu = () => logoDropdownRef.current?.classList.toggle("active");

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* ── Welcome banner ── */}
      <div className="dash-welcome-banner">
        <div className="dash-welcome-text">
          <h2>Welcome back, {firstName} 👋</h2>
          <p>Continue your nursing education journey. You're making great progress!</p>
        </div>
        <div className="dash-welcome-actions">
          <button className="dash-action-btn secondary" onClick={() => navigate("/library")}>
            📚 Study Library
          </button>
          <button className="dash-action-btn primary" onClick={() => navigate("/quiz")}>
            🎯 Take a Quiz
          </button>
        </div>
      </div>



      {/* ── Feed header ── */}
      <div className="dash-section-header">
        <span className="dash-section-title">📰 Health Feed</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <button
              className="dash-action-btn secondary community-btn"
              style={{ padding: "6px 14px", fontSize: ".8rem" }}
              onClick={toggleLogoMenu}
            >
              🌐 Community
            </button>
            <div className="logo-dropdown" ref={logoDropdownRef}>
              {[
                { href: "https://www.facebook.com/share/17jdo77dP8/",    src: fbLogo,   label: "Facebook"  },
                { href: "https://www.instagram.com",                      src: igLogo,   label: "Instagram" },
                { href: "https://snapchat.com/t/xDlg1SmQ",               src: snapLogo, label: "Snapchat"  },
                { href: "https://www.tiktok.com/@psychedout____",         src: tikLogo,  label: "TikTok"    },
                { href: "mailto:unihealthplatform@gmail.com",             src: gmailLogo,label: "Email Us"  },
              ].map(({ href, src, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer">
                  <img src={src} alt={label} className="dropdown-icon" />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>
          {/* Create Post button removed from here as per user request */}
        </div>
      </div>

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
              <div style={{ fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.6 }}>
                {post.content?.length > 250 ? post.content.slice(0, 250) + "..." : post.content}
                {post.content?.length > 250 && (
                  <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, marginLeft: 6 }} onClick={() => setSelectedArticle(post)}>Read more</span>
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
                    <div key={i} style={{ display: 'flex', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-heading)', flexShrink: 0 }}>
                        {c.name?.[0] || "A"}
                      </div>
                      <div style={{ background: 'white', padding: '10px 14px', borderRadius: '0 16px 16px 16px', border: '1px solid var(--border)', fontSize: '0.85rem', flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-heading)', marginBottom: 4 }}>{c.name}</div>
                        <div style={{ color: 'var(--text-body)', lineHeight: 1.5 }}>{c.text}</div>
                      </div>
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
