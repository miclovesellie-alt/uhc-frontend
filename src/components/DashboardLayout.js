import React, { useContext, useState, useRef, useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import api from "../api/api";
import OnboardingTour from "./OnboardingTour";
import "../styles/dashboard.css";

import {
  Home, BookOpen, ClipboardList, User, LogOut,
  Search, BarChart2, ChevronRight, X, Bell, PenSquare, Trophy, Settings
} from "lucide-react";

function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, notifications, unreadCount, markNotificationsRead } = useContext(UserContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [showTour, setShowTour] = useState(!localStorage.getItem('uhc_tour_done'));
  const logoDropdownRef = useRef();

  const isActive = (path) => location.pathname === path;

  const userObj = user || null;

  const avatarColor = (name = "") => {
    const cols = ["#4255ff","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4"];
    return cols[(name.charCodeAt(0) || 0) % cols.length];
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const proceedLogout = () => {
    const userId = localStorage.getItem("userId");
    localStorage.removeItem(`activeQuiz_${userId}`);
    logout();
    navigate("/");
  };

  // Close logo dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (logoDropdownRef.current && !logoDropdownRef.current.contains(e.target)) {
        logoDropdownRef.current.classList.remove("active");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch sitewide announcement
  useEffect(() => {
    api.get('settings/globalAnnouncement')
      .then(res => { if (res.data?.value) setAnnouncement(res.data.value); })
      .catch(() => {});
  }, []);


  const navItems = [
    { icon: <Home         size={18}/>, label: "Home",       path: "/dashboard" },
    { icon: <BookOpen     size={18}/>, label: "Library",    path: "/library"   },
    { icon: <ClipboardList size={18}/>, label: "Quiz",      path: "/quiz"      },
    { icon: <PenSquare    size={18}/>, label: "Submit",     path: "/submit"    },
    { icon: <Trophy       size={18}/>, label: "Ranks",      path: "/leaderboard" },
    { icon: <BarChart2    size={18}/>, label: "Progress",   path: "/profile"   },
  ];

  return (
    <div className="dashboard-wrapper">

      {/* ===== TOP NAVBAR ===== */}
      <div className="dashboard-topbar">
        {/* Logout for mobile (replaces hamburger since bottom nav is used) */}
        <button
          className="topbar-hamburger"
          onClick={() => setShowLogoutModal(true)}
          title="Logout"
          style={{ color: '#ef4444' }}
        >
          <LogOut size={20} />
        </button>

        {/* Logo */}
        <div className="topbar-logo" onClick={() => navigate("/dashboard")}>
          <div className="logo-animated-text">
            <span className="logo-letter">U</span>
            <span className="logo-letter">H</span>
            <span className="logo-letter">C</span>
          </div>
        </div>

        {/* Search */}
        <div className="topbar-search">
          <Search size={16} className="topbar-search-icon" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#939bb4" }} />
          <input
            type="text"
            placeholder="Search topics, quizzes, resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
              }
            }}
          />
        </div>

        <div className="topbar-spacer" />

        {/* Right actions */}
        <div className="topbar-nav-group">
          {/* Notifications */}
          <button
            className="topbar-avatar-btn"
            style={{ position: "relative", width: 36, height: 36, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)" }}
            onClick={() => {
              setShowNotifications(true);
              if (unreadCount > 0) markNotificationsRead();
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: -2, right: -2, background: "#ef4444", color: "white", fontSize: "0.6rem", fontWeight: "bold", padding: "2px 6px", borderRadius: "10px", border: "2px solid var(--bg)" }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Settings icon — replaces letter avatar */}
          <button
            className="topbar-avatar-btn"
            onClick={() => navigate("/profile")}
            title="Settings & Profile"
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "var(--surface)",
              border: "1.5px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-muted)", cursor: "pointer", flexShrink: 0,
              transition: "all .2s",
            }}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* ===== DASHBOARD BODY ===== */}
      <div className="dashboard-body">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="sidebar-mobile-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ===== LEFT SIDEBAR ===== */}
        <aside className={`dashboard-sidebar${sidebarOpen ? " sidebar-open" : ""}`}>
          <span className="sidebar-section-label">Navigate</span>

          {navItems.map((item) => (
            <button
              key={item.path}
              className={`sidebar-nav-item ${isActive(item.path) ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}

          <div className="sidebar-divider" />
          <span className="sidebar-section-label">Account</span>

          <button className="sidebar-nav-item" onClick={() => navigate("/profile")}>
            <span className="nav-item-icon"><User size={18} /></span>
            Profile
          </button>

          <button className="sidebar-nav-item" onClick={handleLogout}>
            <span className="nav-item-icon"><LogOut size={18} /></span>
            Log out
          </button>

          {/* Profile mini card at bottom */}
          {userObj && (
            <div className="sidebar-profile-mini" onClick={() => navigate("/profile")}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: avatarColor(userObj.name || ""),
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: 800, fontSize: ".9rem",
                flexShrink: 0,
              }}>
                {(userObj.name || "U")[0].toUpperCase()}
              </div>
              <div className="sidebar-profile-mini-info">
                <div className="sidebar-profile-mini-name">{userObj.name || "User"}</div>
                <div className="sidebar-profile-mini-role">{userObj.category || "Member"}</div>
              </div>
              <ChevronRight size={14} style={{ color: "#939bb4", flexShrink: 0 }} />
            </div>
          )}
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="dashboard-content">
          {/* Announcement Banner */}
          {announcement && !announcementDismissed && (
            <div className="uhc-announcement">
              <span>📢&nbsp;&nbsp;{announcement}</span>
              <button className="uhc-announcement__close" onClick={() => setAnnouncementDismissed(true)}>✕</button>
            </div>
          )}
          <Outlet context={{ searchQuery }} />
        </main>
      </div>

        {/* Logout Confirmation Modal */}
        {showLogoutModal && (
          <div className="modal-overlay" onClick={() => setShowLogoutModal(false)} style={{ backdropFilter: "blur(4px)" }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
              maxWidth: 320, padding: '24px', borderRadius: '16px', 
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center',
              animation: 'fadeInUp 0.3s ease'
            }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <LogOut size={24} />
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>Sign Out</h2>
              <p style={{ color: '#64748b', marginBottom: 24, fontSize: '0.9rem', lineHeight: 1.4 }}>Are you sure you want to log out of your account?</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer' }} onClick={() => setShowLogoutModal(false)}>Cancel</button>
                <button style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#e11d48', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }} onClick={proceedLogout}>Logout</button>
              </div>
            </div>
          </div>
        )}

        {/* ===== NOTIFICATIONS SLIDE-OUT ===== */}
        {showNotifications && (
          <div className="modal-overlay" onClick={() => setShowNotifications(false)} style={{ justifyContent: "flex-end", alignItems: "stretch", padding: 0 }}>
            <div className="notifications-panel" onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, background: "var(--surface)", height: "100%", boxShadow: "-10px 0 40px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "var(--text-heading)" }}>Notifications</h2>
                <button onClick={() => setShowNotifications(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
                    <Bell size={40} style={{ opacity: 0.2, margin: "0 auto 16px" }} />
                    <p style={{ fontSize: "0.9rem" }}>You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n._id} style={{ padding: "16px", borderRadius: 12, background: n.read ? "transparent" : "var(--accent-pale)", marginBottom: 8, display: "flex", gap: 12, border: "1px solid var(--border)", cursor: "pointer", transition: "all 0.2s" }}
                      onClick={() => {
                        if (n.actionLink) {
                          navigate(n.actionLink);
                          setShowNotifications(false);
                        }
                      }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Bell size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: "0.9rem", color: "var(--text-heading)", lineHeight: 1.4 }}>{n.message}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 6 }}>{new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
          </div>
        )}

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="uhc-bottom-nav" aria-label="Main navigation">
        {navItems.slice(0, 4).map((item) => (
          <button
            key={item.path}
            className={`uhc-bottom-nav__item${isActive(item.path) ? " active" : ""}`}
            onClick={() => { navigate(item.path); setSidebarOpen(false); }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ===== ONBOARDING TOUR ===== */}
      {showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}
    </div>
  );
}

export default DashboardLayout;