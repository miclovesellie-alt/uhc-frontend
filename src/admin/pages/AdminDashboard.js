import React, { useEffect, useState, useRef, useContext } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import api from "../../api/api";
import { UserContext } from "../../context/UserContext";
import { RefreshCw, TrendingUp, Users, BookOpen, Zap, Activity, Library, Layers, UserPlus, Calendar, CalendarDays, LogIn, Key, Flag } from "lucide-react";

const COLORS = ["#4255ff","#16a34a","#d97706","#dc2626","#8b5cf6"];

/* ── Animated count-up ── */
function CountUp({ to, duration = 900 }) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    prev.current = to;
    if (from === to) { setVal(to); return; }
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [to, duration]);
  return <>{val.toLocaleString()}</>;
}

/* ── Book loader ── */
const BookLoader = () => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 20px",gap:16}}>
    <div style={{width:50,height:60,position:"relative"}}>
      <div style={{position:"absolute",left:0,top:0,width:10,height:60,background:"linear-gradient(180deg,#4255ff,#8b5cf6)",borderRadius:"3px 0 0 3px"}}/>
      {[0,1,2].map(i=>(
        <div key={i} style={{position:"absolute",left:10,top:3,width:36,height:54,background:["#c7d2fe","#a5b4fc","#818cf8"][i],borderRadius:"0 8px 8px 0",transformOrigin:"left center",animation:`flipPage 1.4s ease-in-out ${i*0.35}s infinite`}}/>
      ))}
    </div>
    <p style={{color:"#64748b",fontSize:".85rem",fontWeight:500}}>Loading live data…</p>
    <style>{`@keyframes flipPage{0%{transform:rotateY(0);}40%{transform:rotateY(-140deg);}60%{transform:rotateY(-140deg);}100%{transform:rotateY(0);}}`}</style>
  </div>
);

/* ── Live dot ── */
const LiveDot = () => (
  <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:".72rem",fontWeight:700,color:"#16a34a"}}>
    <span style={{width:7,height:7,borderRadius:"50%",background:"#16a34a",display:"inline-block",animation:"livePulse 1.2s ease infinite"}}/>
    LIVE
    <style>{`@keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}`}</style>
  </span>
);

/* ── Signup range labels ── */
const RANGES = [
  { label: "Today",   days: 1  },
  { label: "7 Days",  days: 7  },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { presence } = useOutletContext() || {};
  const { adminTheme } = useContext(UserContext);
  const isDark = adminTheme === "dark";
  const tooltipStyle = { background: isDark ? "#1e293b" : "#fff", border: "1px solid #e2e8f0", borderRadius: 10, color: isDark ? "#f1f5f9" : "#0f172a" };

  const [stats, setStats]             = useState({ totalUsers:0,totalQuestions:0,totalCourses:0,activeUsers:0,liveUsers:0,totalBooks:0,totalStudyHub:0 });
  const [signupTrend, setSignupTrend] = useState([]);
  const [signupTotal, setSignupTotal] = useState(0);
  const [signupRange, setSignupRange] = useState(7);
  const [signupLoading, setSignupLoading] = useState(false);
  const [recentUsers, setRecentUsers] = useState([]);
  const [adminLogs, setAdminLogs]     = useState([]);
  const [chartType, setChartType]     = useState("bar");
  const [loading, setLoading]         = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [todaySummary, setTodaySummary] = useState(null);

  /* ── Fetch main stats ── */
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, logsRes] = await Promise.allSettled([
        api.get("admin/stats"),
        api.get("users"),
        api.get("admin/activity/logs"),
      ]);
      if (statsRes.status === "fulfilled" && statsRes.value.data) {
        const d = statsRes.value.data;
        setStats({ totalUsers:d.totalUsers||0, totalQuestions:d.totalQuestions||0, totalCourses:d.totalCourses||0, activeUsers:d.activeUsers||0, liveUsers:d.liveUsers||0, totalBooks:d.totalBooks||0, totalStudyHub:d.totalStudyHub||0 });
      }
      if (usersRes.status === "fulfilled") {
        setRecentUsers([...(Array.isArray(usersRes.value.data) ? usersRes.value.data : [])].slice(0, 6));
      }
      if (logsRes.status === "fulfilled") {
        setAdminLogs(Array.isArray(logsRes.value.data) ? logsRes.value.data.slice(0,8) : []);
      }
      // Fetch today at-a-glance summary
      try {
        const todayRes = await api.get("admin/daily-summary");
        setTodaySummary(todayRes.data);
      } catch { /* non-critical */ }
      setLastRefresh(new Date());
    } finally { setLoading(false); }
  };

  /* ── Fetch signup trend for a given range ── */
  const fetchSignups = async (days) => {
    setSignupLoading(true);
    try {
      const res = await api.get(`admin/stats/signups?days=${days}`);
      const data = res.data;
      // Support both old array format and new { trend, total } format
      if (Array.isArray(data)) {
        setSignupTrend(data);
        setSignupTotal(data.reduce((s, d) => s + d.signups, 0));
      } else {
        setSignupTrend(data.trend || []);
        setSignupTotal(data.total || 0);
      }
    } catch { setSignupTrend([]); setSignupTotal(0); }
    finally { setSignupLoading(false); }
  };

  useEffect(() => {
    fetchAll();
    fetchSignups(signupRange);
    const iv = setInterval(fetchAll, 15000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRangeChange = (days) => {
    setSignupRange(days);
    fetchSignups(days);
  };

  /* ── KPI cards ── */
  const kpi = [
    { label:"Online Now",      value:presence?.onlineIds?.length||0,  icon:<Zap size={18}/>,      color:"green",  trend:"Live right now",      path:"/admin/users" },
    { label:"Total Users",     value:stats.totalUsers,                 icon:<Users size={18}/>,    color:"blue",   trend:"All time",            path:"/admin/users" },
    { label:"Total Questions", value:stats.totalQuestions,             icon:<BookOpen size={18}/>, color:"purple", trend:"In question bank",    path:"/admin/questions" },
    { label:"Active (24h)",    value:stats.activeUsers,                icon:<Activity size={18}/>, color:"orange", trend:"Logged in today",     path:"/admin/users" },
    { label:"Library Books",   value:stats.totalBooks,                 icon:<Library size={18}/>,  color:"blue",   trend:"Total books",         path:"/admin/userlibrary" },
    { label:"Study Hub Items", value:stats.totalStudyHub,              icon:<Layers size={18}/>,   color:"green",  trend:"Cards + Notes + Links",path:"/admin/userlibrary" },
  ];

  /* ── Bar chart data ── */
  const chartData = [
    { name:"Users",      value:stats.totalUsers },
    { name:"Questions",  value:stats.totalQuestions },
    { name:"Courses",    value:stats.totalCourses },
    { name:"Online Now", value:presence?.onlineIds?.length || 0 },
  ];

  const avatarColor = (name="") => {
    const cols=["#4255ff","#8b5cf6","#ec4899","#f59e0b","#10b981","#06b6d4"];
    return cols[(name.charCodeAt(0)||0)%cols.length];
  };

  const rangeLabel = RANGES.find(r => r.days === signupRange)?.label || "7 Days";

  return (
    <div className="admin-page">
      {/* ── Header ── */}
      <div className="admin-section-header db-header-centered" style={{marginBottom:24}}>
        <div className="db-title-container">
          <h1 className="db-glow-title">📊 Dashboard Overview</h1>
          <p className="db-subtitle-glow">
            Last refreshed: {lastRefresh.toLocaleTimeString()} &nbsp;<LiveDot/>
          </p>
        </div>
        <button className="admin-btn secondary sm db-refresh-btn" onClick={() => { fetchAll(); fetchSignups(signupRange); }} disabled={loading}>
          <RefreshCw size={13} style={{animation:loading?"spin 1s linear infinite":"none"}}/> Refresh
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="admin-stats-grid">
        {kpi.map((k,i) => (
          <div className="admin-stat-card" key={i} onClick={() => k.path && navigate(k.path)} style={{cursor:k.path?"pointer":"default"}}>
            <div className={`admin-stat-icon ${k.color}`}>{k.icon}</div>
            <div className="admin-stat-value"><CountUp to={k.value}/></div>
            <div className="admin-stat-label">{k.label}</div>
            <div className="admin-stat-trend"><TrendingUp size={11}/> {k.trend}</div>
          </div>
        ))}
      </div>

      {/* ── Today at a Glance Widget ── */}
      <div onClick={() => navigate("/admin/daily-summary")}
        style={{
          background:"linear-gradient(135deg,rgba(66,85,255,.06),rgba(139,92,246,.06))",
          border:"1px solid rgba(66,85,255,.18)",
          borderRadius:16, padding:"16px 20px", marginBottom:24,
          cursor:"pointer", transition:"box-shadow .2s",
        }}
        onMouseEnter={e=>e.currentTarget.style.boxShadow="0 6px 24px rgba(66,85,255,.12)"}
        onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}
      >
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <CalendarDays size={18} color="#4255ff"/>
            <span style={{fontWeight:800,fontSize:".95rem",color:"var(--admin-text)"}}>Today at a Glance</span>
            <span style={{fontSize:".7rem",fontWeight:700,color:"#4255ff",background:"rgba(66,85,255,.1)",padding:"2px 8px",borderRadius:99}}>Live</span>
          </div>
          <span style={{fontSize:".75rem",color:"var(--admin-accent)",fontWeight:700}}>View Full Summary →</span>
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {[
            { icon:<Users size={14}/>,  label:"Signups",  val: todaySummary?.signups?.count ?? "—",         color:"#4255ff" },
            { icon:<LogIn size={14}/>,  label:"Logins",   val: todaySummary?.logins?.count ?? "—",          color:"#16a34a" },
            { icon:<Key size={14}/>,    label:"Resets",   val: todaySummary?.passwordResets?.count ?? "—",  color:"#d97706" },
            { icon:<Flag size={14}/>,   label:"Reported", val: todaySummary?.reportedQuestions?.count ?? "—",color:"#ef4444" },
          ].map((item,i) => (
            <div key={i} style={{
              background:"var(--admin-card,#fff)", borderRadius:12, padding:"10px 16px",
              display:"flex", alignItems:"center", gap:9, flex:"1", minWidth:110,
              border:"1px solid var(--admin-border,#e2e8f0)",
            }}>
              <span style={{color:item.color}}>{item.icon}</span>
              <div>
                <div style={{fontSize:"1.3rem",fontWeight:900,color:"var(--admin-text)",lineHeight:1}}>{item.val}</div>
                <div style={{fontSize:".68rem",color:"var(--admin-muted)",fontWeight:600}}>{item.label}</div>
              </div>
            </div>
          ))}
        </div>
        {todaySummary?.insights?.[0] && (
          <div style={{marginTop:10,fontSize:".75rem",color:"var(--admin-muted)",fontStyle:"italic",paddingLeft:2}}>
            💡 {todaySummary.insights[0].text}
          </div>
        )}
      </div>

      {/* ── Signup Trend with Range Selector ── */}
      <div style={{
        background:"var(--admin-card,#fff)", border:"1px solid var(--admin-border,#e2e8f0)",
        borderRadius:16, padding:"20px 24px", marginBottom:24,
        boxShadow:"0 2px 8px rgba(0,0,0,0.04)"
      }}>
        {/* Section header row */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <UserPlus size={18} color="#4255ff"/>
              <span style={{fontWeight:800,fontSize:"1rem",color:"var(--admin-text)"}}>User Signups</span>
            </div>
            <div style={{marginTop:4,display:"flex",alignItems:"baseline",gap:8}}>
              {signupLoading ? (
                <span style={{fontSize:"1.8rem",fontWeight:900,color:"#4255ff"}}>…</span>
              ) : (
                <span style={{fontSize:"2rem",fontWeight:900,color:"#4255ff",lineHeight:1}}>
                  <CountUp to={signupTotal}/>
                </span>
              )}
              <span style={{fontSize:".82rem",color:"var(--admin-muted)",fontWeight:600}}>
                new {signupTotal === 1 ? "signup" : "signups"} — {rangeLabel.toLowerCase()}
              </span>
            </div>
          </div>
          {/* Range selector pills */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {RANGES.map(r => (
              <button key={r.days} onClick={() => handleRangeChange(r.days)}
                style={{
                  padding:"5px 14px", borderRadius:99, border:"none", cursor:"pointer",
                  fontWeight:700, fontSize:".75rem",
                  background: signupRange === r.days ? "#4255ff" : "var(--admin-border,#e2e8f0)",
                  color: signupRange === r.days ? "#fff" : "var(--admin-muted,#64748b)",
                  transition:"all .15s",
                  display:"flex", alignItems:"center", gap:5,
                }}
              >
                <Calendar size={11}/> {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        {signupTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={signupTrend}>
              <defs>
                <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4255ff" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#4255ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke={isDark?"#334155":"#f1f5f9"} strokeDasharray="4 4"/>
              <XAxis dataKey="day" stroke="#94a3b8" tick={{fontSize:10}}
                tickFormatter={v => signupRange <= 7 ? v.split(",")[0] : v.split(",")[0]}
              />
              <YAxis stroke="#94a3b8" tick={{fontSize:10}} allowDecimals={false} width={28}/>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "Signups"]}/>
              <Area type="monotone" dataKey="signups" stroke="#4255ff" strokeWidth={2.5}
                fill="url(#signupGrad)" dot={{r:3,fill:"#4255ff"}} activeDot={{r:5}}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{textAlign:"center",padding:"32px 0",color:"var(--admin-muted)",fontSize:".85rem"}}>
            {signupLoading ? "Loading…" : "No signup data for this period"}
          </div>
        )}
      </div>

      {/* ── Charts row ── */}
      <div className="admin-section-header">
        <span className="admin-section-title">📊 Platform Analytics</span>
        <select className="admin-select" value={chartType} onChange={e=>setChartType(e.target.value)}>
          <option value="bar">Bar Chart</option>
          <option value="pie">Pie Chart</option>
        </select>
      </div>

      <div className="admin-charts-grid" style={{marginBottom:28}}>
        <div className="admin-chart-card">
          <h3>Platform Statistics</h3>
          <p style={{fontSize:".75rem",color:"var(--admin-muted)",marginBottom:12,marginTop:-8}}>
            Showing: Users · Questions · Courses · Online Now
          </p>
          <ResponsiveContainer width="100%" height={220}>
            {chartType==="pie" ? (
              <PieChart>
                <Pie data={chartData.filter(d=>d.value>0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={e=>e.name}>
                  {chartData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle}/>
              </PieChart>
            ) : (
              <BarChart data={chartData} barSize={36}>
                <CartesianGrid stroke={isDark?"#334155":"#f1f5f9"} strokeDasharray="4 4"/>
                <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize:11}}/>
                <YAxis stroke="#94a3b8" tick={{fontSize:11}} width={40}/>
                <Tooltip contentStyle={tooltipStyle}/>
                <Bar dataKey="value" radius={[8,8,0,0]}>
                  {chartData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Admin Activity Feed */}
        <div className="admin-chart-card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:15}}>
            <h3 style={{margin:0}}>🛡️ Admin Activity</h3>
            <span style={{fontSize:".7rem",color:"var(--admin-muted)"}}>Latest actions</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:280,overflowY:"auto",paddingRight:4}}>
            {adminLogs.length===0 ? (
              <div style={{textAlign:"center",padding:24,color:"var(--admin-muted)",fontSize:".85rem"}}>No recent activity</div>
            ) : adminLogs.map((log,idx) => (
              <div key={log._id||idx} style={{
                display:"flex",gap:10,padding:"10px 12px",
                background:"rgba(66,85,255,0.03)",
                borderRadius:10,border:"1px solid var(--admin-border)",
                transition:"background .15s"
              }}>
                <div style={{width:30,height:30,borderRadius:"50%",background:avatarColor(log.admin?.name),display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,fontSize:".72rem",flexShrink:0}}>
                  {(log.admin?.name||"A")[0].toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:".81rem",lineHeight:1.4}}>
                    <strong style={{color:"var(--admin-text)"}}>{log.admin?.name||"Admin"}</strong>{" "}{log.message}
                  </div>
                  <div style={{fontSize:".68rem",color:"var(--admin-muted)",marginTop:3}}>
                    {new Date(log.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} · {log.action?.replace(/_/g," ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Users ── */}
      <div className="admin-section-header">
        <span className="admin-section-title">👥 Recent Users <LiveDot/></span>
        <button className="admin-btn secondary sm" onClick={()=>navigate("/admin/users")}>View All</button>
      </div>
      {loading && recentUsers.length===0 ? <BookLoader/> : (
        <div className="admin-table-wrap" style={{marginBottom:28}}>
          <table className="admin-table">
            <thead><tr><th>#</th><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Country</th></tr></thead>
            <tbody>
              {recentUsers.map((u,i) => (
                <tr key={u._id} style={{cursor:"pointer"}} onClick={()=>navigate("/admin/users")}>
                  <td style={{color:"var(--admin-muted)",fontWeight:600}}>{i+1}</td>
                  <td><div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:30,height:30,borderRadius:"50%",background:avatarColor(u.name),display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:800,fontSize:".8rem"}}>{(u.name||"?")[0].toUpperCase()}</div>
                    <span style={{fontWeight:600,fontSize:".875rem"}}>{u.name}</span>
                  </div></td>
                  <td style={{color:"var(--admin-muted)",fontSize:".82rem"}}>{u.email}</td>
                  <td><span className={`admin-badge ${u.role==="admin"?"orange":u.role==="superadmin"?"red":"blue"}`}>{u.role||"user"}</span></td>
                  <td><span className={`admin-badge ${presence?.onlineIds?.includes(u._id)?"green":u.status==="banned"?"red":"gray"}`}>{presence?.onlineIds?.includes(u._id)?"Active":u.status==="banned"?"Banned":"Offline"}</span></td>
                  <td style={{color:"var(--admin-muted)",fontSize:".82rem"}}>{u.country||"—"}</td>
                </tr>
              ))}
              {recentUsers.length===0 && <tr><td colSpan={6} style={{textAlign:"center",color:"var(--admin-muted)",padding:32}}>No users yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="admin-section-header" style={{marginBottom:16}}>
        <span className="admin-section-title">⚡ Quick Actions</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:32}}>
        {[
          {label:"Add Question",   emoji:"➕",color:"#4255ff",bg:"rgba(66,85,255,0.08)",   path:"/admin/questions"},
          {label:"Bulk Upload",    emoji:"📤",color:"#16a34a",bg:"rgba(22,163,74,0.08)",   path:"/admin/uploads"},
          {label:"View Reported",  emoji:"🚩",color:"#dc2626",bg:"rgba(220,38,38,0.08)",   path:"/admin/questions?filter=reported"},
          {label:"Manage Library", emoji:"📚",color:"#8b5cf6",bg:"rgba(139,92,246,0.08)",  path:"/admin/userlibrary"},
          {label:"Send Notif",     emoji:"🔔",color:"#d97706",bg:"rgba(217,119,6,0.08)",   path:"/admin/notifications"},
          {label:"View Logs",      emoji:"📋",color:"#06b6d4",bg:"rgba(6,182,212,0.08)",   path:"/admin/logs"},
        ].map(action => (
          <div key={action.label} onClick={()=>navigate(action.path)}
            style={{padding:"16px 14px",borderRadius:14,cursor:"pointer",background:action.bg,border:`1px solid ${action.color}25`,display:"flex",flexDirection:"column",alignItems:"flex-start",gap:8,transition:"transform .15s,box-shadow .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 6px 20px ${action.color}20`;}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}
          >
            <span style={{fontSize:"1.5rem"}}>{action.emoji}</span>
            <span style={{fontSize:".82rem",fontWeight:700,color:action.color}}>{action.label}</span>
          </div>
        ))}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}