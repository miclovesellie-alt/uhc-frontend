import React, { useContext, useState } from "react";
import { useNavigate, useLocation, Outlet, NavLink } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { io } from "socket.io-client";
import "../admin_styles/AdminLayout.css";
import {
  LayoutDashboard, Users, HelpCircle, Upload,
  Bell, Settings, LogOut, Menu, X, FileText, Shield, Library, Mail, Layout, Trash2
} from "lucide-react";

const baseNavItems = [
  { icon: <LayoutDashboard size={17} />, label: "Dashboard",     path: "/admin"                },
  { icon: <Users          size={17} />, label: "Users",          path: "/admin/users"          },
  { icon: <HelpCircle     size={17} />, label: "Questions",      path: "/admin/questions"      },
  { icon: <Library        size={17} />, label: "Library",        path: "/admin/userlibrary"    },
  { icon: <Layout         size={17} />, label: "Feed Manager",   path: "/admin/feed"           },
  { icon: <Upload         size={17} />, label: "Bulk Upload",    path: "/admin/uploads"        },
  { icon: <FileText       size={17} />, label: "Activity Logs",  path: "/admin/logs"           },
  { icon: <Bell           size={17} />, label: "Notifications",  path: "/admin/notifications"  },
  { icon: <Trash2         size={17} />, label: "Recycle Bin",    path: "/admin/recycle-bin"    },
  { icon: <Mail           size={17} />, label: "Messages",       path: "/admin/messages"       },
  { icon: <Settings       size={17} />, label: "Settings",       path: "/admin/settings"       },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, adminTheme } = useContext(UserContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [liveNotif, setLiveNotif] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialize Socket.io
  React.useEffect(() => {
    const SOCKET_URL = window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : 'https://uhc-backend.onrender.com';
      
    const socket = io(SOCKET_URL);

    socket.on('ADMIN_NOTIFICATION', (data) => {
      console.log("⚡ Live Notif:", data);
      setLiveNotif(data);
      setUnreadCount(prev => prev + 1);
      
      // Auto-hide toast after 6 seconds
      setTimeout(() => setLiveNotif(prev => prev?._id === data._id ? null : prev), 6000);
    });

    return () => socket.disconnect();
  }, []);

  // Fetch initial unread count
  React.useEffect(() => {
    import("../../api/api").then(({ default: api }) => {
      api.get("admin/activity/notifications").then(res => {
        const userId = localStorage.getItem("userId");
        const unread = res.data.filter(n => !n.readBy?.includes(userId)).length;
        setUnreadCount(unread);
      }).catch(() => {});
    });
  }, [location.pathname]);

  // Set axios default header for admin requests
  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      import("axios").then(({ default: axios }) => {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      });
    }
  }, []);

  const navItems = [...baseNavItems];
  if (user?.role === "superadmin") {
    navItems.splice(2, 0, { icon: <Shield size={17} />, label: "Admins", path: "/admin/admins" });
  }

  const handleLogout = () => { logout(); navigate("/"); };
  const confirmLogout = () => setShowLogoutModal(true);
  const proceedLogout = () => { logout(); navigate("/"); };
  const isActive = (path) => path === "/admin"
    ? location.pathname === "/admin"
    : location.pathname.startsWith(path);

  const pageTitle = navItems.find(n => isActive(n.path))?.label || "Admin";

  return (
    <div className={`admin-wrapper ${adminTheme === "dark" ? "admin-dark" : ""}`}>

      {/* ===== SIDEBAR ===== */}
      <aside className={`admin-sidebar${sidebarOpen ? " sidebar-open" : ""}`}>
        <div className="admin-logo">
          <div className="logo-animated-text">
            <span className="logo-letter">U</span>
            <span className="logo-letter">H</span>
            <span className="logo-letter">C</span>
          </div>
          <div style={{ marginLeft: 8 }}>
            <h2 style={{ fontSize: '0.9rem' }}>Admin</h2>
            <span>Control Panel</span>
          </div>
        </div>

        <nav className="admin-nav">
          <div className="admin-nav-section">Main</div>
          {navItems.filter(item => 
            item.path !== "/admin/logs" && 
            item.path !== "/admin/notifications" && 
            item.path !== "/admin/settings" && 
            item.path !== "/admin/messages" &&
            item.path !== "/admin/recycle-bin"
          ).map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin"}
              className={() => isActive(item.path) ? "active" : ""}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          <div className="admin-nav-section" style={{ marginTop: 8 }}>Monitoring</div>
          {navItems.filter(item => item.path === "/admin/logs" || item.path === "/admin/notifications" || item.path === "/admin/messages" || item.path === "/admin/recycle-bin").map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={() => isActive(item.path) ? "active" : ""}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          <div className="admin-nav-section" style={{ marginTop: 8 }}>System</div>
          {navItems.filter(item => item.path === "/admin/settings").map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={() => isActive(item.path) ? "active" : ""}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Profile + logout */}
        <div className="admin-nav-logout">
          <div
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, marginBottom: 6 }}
          >
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--admin-accent-pale)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".85rem", fontWeight: 700, color: "var(--admin-accent)", flexShrink: 0 }}>
              {user?.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--admin-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name || "Admin"}</div>
              <div style={{ fontSize: ".7rem", color: "var(--admin-muted)" }}>Administrator</div>
            </div>
          </div>
          <button className="admin-btn danger" style={{ width: "100%", justifyContent: "center" }} onClick={confirmLogout}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 150 }}
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ===== CONTENT ===== */}
      <div className="admin-content">

        {/* Topbar */}
        <div className="admin-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="admin-hamburger"
              style={{ alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, border: "1px solid var(--admin-border)", background: "transparent", color: "var(--admin-text)", cursor: "pointer" }}
              onClick={() => setSidebarOpen(o => !o)}
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span className="admin-topbar-title">{pageTitle}</span>
          </div>
          <div className="admin-topbar-actions">
            <span style={{ fontSize: ".78rem", color: "var(--admin-muted)" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
            <div 
              style={{ position: 'relative', cursor: 'pointer', marginLeft: 12 }}
              onClick={() => navigate('/admin/notifications')}
            >
              <Bell size={19} color="var(--admin-text)" />
              {unreadCount > 0 && (
                <span style={{ 
                  position: 'absolute', top: -5, right: -5, 
                  background: '#ef4444', color: 'white', 
                  fontSize: '0.65rem', fontWeight: 700, 
                  width: 16, height: 16, borderRadius: '50%', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--admin-card)'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Toast Notification */}
        {liveNotif && (
          <div className="live-toast-container">
            <div className={`live-toast ${liveNotif.type}`}>
              <div className="live-toast-icon">
                {liveNotif.type === 'SUCCESS' ? '✅' : liveNotif.type === 'DANGER' ? '🚫' : '🔔'}
              </div>
              <div className="live-toast-content">
                <div className="live-toast-title">{liveNotif.senderName || 'System Update'}</div>
                <div className="live-toast-msg">{liveNotif.message}</div>
              </div>
              <button className="live-toast-close" onClick={() => setLiveNotif(null)}>
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Page content */}
        <Outlet />
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--admin-accent-pale)', color: 'var(--admin-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <LogOut size={30} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 10 }}>Sign Out?</h2>
            <p style={{ color: 'var(--admin-muted)', marginBottom: 30 }}>Are you sure you want to log out of the admin panel?</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="admin-btn secondary" style={{ flex: 1 }} onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button className="admin-btn primary" style={{ flex: 1, background: '#ef4444' }} onClick={proceedLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}