import React, { useContext, useState } from "react";
import { useNavigate, useLocation, Outlet, NavLink } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { io } from "socket.io-client";
import axios from "axios";
import "../admin_styles/AdminLayout.css";
import {
  LayoutDashboard, Users, HelpCircle, Upload, Bell, Settings, LogOut,
  Menu, X, FileText, Shield, Library, Mail, Layout, Trash2, Megaphone,
  Clock, ChevronLeft, ChevronRight
} from "lucide-react";

const baseNavItems = [
  { icon: <LayoutDashboard size={17}/>, label:"Dashboard",     path:"/admin"              },
  { icon: <Users size={17}/>,           label:"Users",          path:"/admin/users"        },
  { icon: <HelpCircle size={17}/>,      label:"Questions",      path:"/admin/questions"    },
  { icon: <Library size={17}/>,         label:"Library",        path:"/admin/userlibrary"  },
  { icon: <Layout size={17}/>,          label:"Feed Manager",   path:"/admin/feed"         },
  { icon: <Upload size={17}/>,          label:"Bulk Upload",    path:"/admin/uploads"      },
  { icon: <Clock size={17}/>,           label:"Pending Review", path:"/admin/pending"      },
  { icon: <FileText size={17}/>,        label:"Activity Logs",  path:"/admin/logs"         },
  { icon: <Bell size={17}/>,            label:"Notifications",  path:"/admin/notifications"},
  { icon: <Megaphone size={17}/>,       label:"Announcements",  path:"/admin/announcements"},
  { icon: <Trash2 size={17}/>,          label:"Recycle Bin",    path:"/admin/recycle-bin"  },
  { icon: <Mail size={17}/>,            label:"Messages",       path:"/admin/messages"     },
  { icon: <Settings size={17}/>,        label:"Settings",       path:"/admin/settings"     },
];

const MAIN = ["/admin","/admin/users","/admin/admins","/admin/questions","/admin/userlibrary","/admin/feed","/admin/uploads","/admin/pending"];
const MONITORING = ["/admin/logs","/admin/notifications","/admin/messages","/admin/recycle-bin","/admin/announcements"];
const SYSTEM = ["/admin/settings"];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, adminTheme } = useContext(UserContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [liveNotif, setLiveNotif] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [presence, setPresence] = useState({ onlineIds:[], recentIds:[] });

  React.useEffect(() => {
    const URL = window.location.hostname === "localhost"
      ? "http://localhost:5000" : "https://uhc-backend.onrender.com";
    const socket = io(URL);
    socket.on("ADMIN_NOTIFICATION", d => {
      setLiveNotif(d);
      setUnreadCount(p => p + 1);
      setTimeout(() => setLiveNotif(p => p?._id === d._id ? null : p), 6000);
    });
    socket.on("PRESENCE_UPDATE", d => setPresence(d));
    return () => socket.disconnect();
  }, []);

  React.useEffect(() => {
    import("../../api/api").then(({ default: api }) => {
      const userId = localStorage.getItem("userId");
      api.get("admin/activity/notifications").then(res => {
        setUnreadCount(Array.isArray(res.data) ? res.data.filter(n => !n.readBy?.includes(userId)).length : 0);
      }).catch(() => {});
      api.get("admin/presence").then(res => { if (res.data) setPresence(res.data); }).catch(() => {});
      api.get("library/pending").then(res => {
        setPendingCount(Array.isArray(res.data) ? res.data.length : 0);
      }).catch(() => {});
    });
  }, [location.pathname]);

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }, []);

  const navItems = [...baseNavItems];
  if (user?.role === "superadmin") navItems.splice(2,0,{ icon:<Shield size={17}/>, label:"Admins", path:"/admin/admins" });

  const isActive = p => p === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(p);
  const pageTitle = navItems.find(n => isActive(n.path))?.label || "Admin";

  const NavGroup = ({ paths, label }) => (
    <>
      {!collapsed && <div className="admin-nav-section" style={{marginTop:8}}>{label}</div>}
      {navItems.filter(i => paths.includes(i.path)).map(item => (
        <NavLink key={item.path} to={item.path} end={item.path==="/admin"}
          className={() => isActive(item.path) ? "active" : ""}
          onClick={() => setSidebarOpen(false)}
          title={collapsed ? item.label : undefined}
        >
          {item.icon}
          {!collapsed && <span style={{flex:1}}>{item.label}</span>}
          {item.path==="/admin/pending" && pendingCount>0 && !collapsed && (
            <span style={{background:"#ef4444",color:"white",fontSize:".65rem",fontWeight:700,padding:"1px 6px",borderRadius:10}}>{pendingCount}</span>
          )}
          {item.path==="/admin/notifications" && unreadCount>0 && !collapsed && (
            <span style={{background:"#ef4444",color:"white",fontSize:".65rem",fontWeight:700,padding:"1px 6px",borderRadius:10}}>{unreadCount}</span>
          )}
        </NavLink>
      ))}
    </>
  );

  return (
    <div className={`admin-wrapper ${adminTheme==="dark"?"admin-dark":""}`}>
      <aside className={`admin-sidebar${sidebarOpen?" sidebar-open":""}${collapsed?" sidebar-collapsed":""}`}>
        <div className="admin-logo">
          <div className="logo-animated-text">
            <span className="logo-letter">U</span><span className="logo-letter">H</span><span className="logo-letter">C</span>
          </div>
          {!collapsed && <div style={{marginLeft:8}}><h2 style={{fontSize:".9rem"}}>Admin</h2><span>Control Panel</span></div>}
          <button className="sidebar-collapse-btn" onClick={() => setCollapsed(c=>!c)} title={collapsed?"Expand":"Collapse"}>
            {collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
          </button>
        </div>
        <nav className="admin-nav">
          {!collapsed && <div className="admin-nav-section">Main</div>}
          {navItems.filter(i=>MAIN.includes(i.path)).map(item=>(
            <NavLink key={item.path} to={item.path} end={item.path==="/admin"}
              className={()=>isActive(item.path)?"active":""}
              onClick={()=>setSidebarOpen(false)}
              title={collapsed?item.label:undefined}
            >
              {item.icon}
              {!collapsed && <span style={{flex:1}}>{item.label}</span>}
              {item.path==="/admin/pending" && pendingCount>0 && !collapsed && (
                <span style={{background:"#ef4444",color:"white",fontSize:".65rem",fontWeight:700,padding:"1px 6px",borderRadius:10}}>{pendingCount}</span>
              )}
            </NavLink>
          ))}
          {!collapsed && <div className="admin-nav-section" style={{marginTop:8}}>Monitoring</div>}
          {navItems.filter(i=>MONITORING.includes(i.path)).map(item=>(
            <NavLink key={item.path} to={item.path}
              className={()=>isActive(item.path)?"active":""}
              onClick={()=>setSidebarOpen(false)}
              title={collapsed?item.label:undefined}
            >
              {item.icon}
              {!collapsed && <span style={{flex:1}}>{item.label}</span>}
              {item.label==="Notifications" && unreadCount>0 && !collapsed && (
                <span style={{background:"#ef4444",color:"white",fontSize:".65rem",fontWeight:700,padding:"1px 6px",borderRadius:10}}>{unreadCount}</span>
              )}
            </NavLink>
          ))}
          {!collapsed && <div className="admin-nav-section" style={{marginTop:8}}>System</div>}
          {navItems.filter(i=>SYSTEM.includes(i.path)).map(item=>(
            <NavLink key={item.path} to={item.path}
              className={()=>isActive(item.path)?"active":""}
              onClick={()=>setSidebarOpen(false)}
              title={collapsed?item.label:undefined}
            >
              {item.icon}
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>

        {/* Clickable profile card */}
        <div className="admin-nav-logout">
          <div className="admin-profile-card-clickable" onClick={()=>navigate("/admin/settings")}
            style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,marginBottom:6,cursor:"pointer"}}
          >
            <div style={{width:32,height:32,borderRadius:"50%",background:"var(--admin-accent-pale)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".85rem",fontWeight:700,color:"var(--admin-accent)",flexShrink:0}}>
              {user?.name?.[0]?.toUpperCase()||"A"}
            </div>
            {!collapsed && (
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:".82rem",fontWeight:600,color:"var(--admin-text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name||"Admin"}</div>
                <div style={{fontSize:".7rem",color:"var(--admin-muted)"}}>{user?.role==="superadmin"?"⭐ Superadmin":"Administrator"}</div>
              </div>
            )}
          </div>
          <button className="admin-btn danger" style={{width:"100%",justifyContent:"center"}} onClick={()=>setShowLogout(true)} title="Sign Out">
            <LogOut size={15}/>{!collapsed && " Sign Out"}
          </button>
        </div>
      </aside>

      {sidebarOpen && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:150}} onClick={()=>setSidebarOpen(false)}/>}

      <div className="admin-content">
        <div className="admin-topbar">
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button className="admin-hamburger"
              style={{alignItems:"center",justifyContent:"center",width:34,height:34,borderRadius:8,border:"1px solid var(--admin-border)",background:"transparent",color:"var(--admin-text)",cursor:"pointer"}}
              onClick={()=>setSidebarOpen(o=>!o)}
            >
              {sidebarOpen ? <X size={18}/> : <Menu size={18}/>}
            </button>
            <span className="admin-topbar-title">{pageTitle}</span>
          </div>
          <div className="admin-topbar-actions">
            <span style={{fontSize:".78rem",color:"var(--admin-muted)"}}>
              {new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
            </span>
            <div style={{position:"relative",cursor:"pointer",marginLeft:12}} onClick={()=>navigate("/admin/notifications")}>
              <Bell size={19} color="var(--admin-text)"/>
              {unreadCount>0 && (
                <span style={{position:"absolute",top:-6,right:-8,background:"#ef4444",color:"white",fontSize:".65rem",fontWeight:700,padding:"0 5px",minWidth:18,height:18,borderRadius:"9px",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid var(--admin-card)"}}>
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {liveNotif && (
          <div className="live-toast-container">
            <div className={`live-toast ${liveNotif.type}`}>
              <div className="live-toast-icon">{liveNotif.type==="SUCCESS"?"✅":liveNotif.type==="DANGER"?"🚫":"🔔"}</div>
              <div className="live-toast-content"
                style={{cursor:liveNotif.message?.includes("Question Reported")?"pointer":"default"}}
                onClick={()=>{ if(liveNotif.message?.includes("Question Reported")){navigate("/admin/questions?filter=reported");setLiveNotif(null);}}}
              >
                <div className="live-toast-title">{liveNotif.senderName||"System Update"}</div>
                <div className="live-toast-msg">{liveNotif.message}</div>
              </div>
              <button className="live-toast-close" onClick={()=>setLiveNotif(null)}><X size={14}/></button>
            </div>
          </div>
        )}

        <Outlet context={{ setUnreadCount, presence }}/>
      </div>

      {showLogout && (
        <div className="modal-overlay" onClick={()=>setShowLogout(false)}>
          <div className="modal-content" onClick={e=>e.stopPropagation()} style={{maxWidth:320,textAlign:"center",padding:"32px 24px",borderRadius:"24px"}}>
            <div style={{width:56,height:56,borderRadius:"18px",background:"var(--admin-accent-pale)",color:"var(--admin-accent)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",transform:"rotate(-5deg)"}}>
              <LogOut size={26} style={{transform:"rotate(5deg)"}}/>
            </div>
            <h2 style={{fontSize:"1.25rem",fontWeight:800,marginBottom:8,color:"var(--admin-text)"}}>Ready to leave?</h2>
            <p style={{color:"var(--admin-muted)",fontSize:".88rem",marginBottom:28,lineHeight:1.4}}>Are you sure you want to log out?</p>
            <div style={{display:"flex",gap:10}}>
              <button className="admin-btn secondary" style={{flex:1}} onClick={()=>setShowLogout(false)}>Cancel</button>
              <button className="admin-btn primary" style={{flex:1,background:"#ef4444",border:"none"}} onClick={()=>{logout();navigate("/");}}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .sidebar-collapsed{width:64px!important}
        .sidebar-collapsed .admin-logo{justify-content:center;padding:0 8px}
        .sidebar-collapsed .admin-nav a{justify-content:center;padding:10px 0}
        .sidebar-collapse-btn{margin-left:auto;background:none;border:none;cursor:pointer;color:var(--admin-muted);padding:4px;border-radius:6px;display:flex;align-items:center}
        .sidebar-collapse-btn:hover{background:var(--admin-accent-pale);color:var(--admin-accent)}
        .admin-profile-card-clickable:hover{background:var(--admin-accent-pale)!important}
      `}</style>
    </div>
  );
}