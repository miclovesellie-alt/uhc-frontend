import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/api";
import { Plus, Trash2, ToggleLeft, ToggleRight, Send, Users, Mail, Layers } from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────
const TYPE_COLORS = { info:"#4255ff", warning:"#d97706", success:"#16a34a", danger:"#dc2626" };
const TYPE_BG     = { info:"rgba(66,85,255,0.08)", warning:"rgba(217,119,6,0.08)", success:"rgba(22,163,74,0.08)", danger:"rgba(220,38,38,0.08)" };

const AUDIENCE_OPTIONS = [
  { value:"all",      label:"All Users",      icon:"👥", desc:"Every registered user" },
  { value:"active",   label:"Active Users",   icon:"✅", desc:"Logged in last 7 days"  },
  { value:"inactive", label:"Inactive Users", icon:"💤", desc:"Not seen in 7+ days"    },
];

const SUBJECT_OPTIONS = [
  { value:"new_document",   label:"New Document Upload",  icon:"📄" },
  { value:"reminder_login", label:"Reminder to Login",    icon:"🔔" },
  { value:"custom",         label:"Custom Message",       icon:"✏️"  },
];

const DELIVERY_OPTIONS = [
  { value:"banner", label:"Banner Only",    icon:<Layers size={14}/>,   desc:"Shown on site" },
  { value:"email",  label:"Email Only",     icon:<Mail size={14}/>,     desc:"Sent to inbox" },
  { value:"both",   label:"Banner + Email", icon:<Send size={14}/>,     desc:"Full broadcast" },
];

const INITIAL_FORM = { title:"", message:"", type:"info", audience:"all", subject:"custom", deliveryMode:"banner" };

// ── Badge helpers ─────────────────────────────────────────────────────────────
const AudienceBadge = ({ v }) => {
  const opt = AUDIENCE_OPTIONS.find(o => o.value === v) || AUDIENCE_OPTIONS[0];
  return <span style={{fontSize:".68rem",fontWeight:700,padding:"2px 8px",borderRadius:99,background:"rgba(66,85,255,.1)",color:"#4255ff"}}>{opt.icon} {opt.label}</span>;
};
const SubjectBadge = ({ v }) => {
  const opt = SUBJECT_OPTIONS.find(o => o.value === v) || SUBJECT_OPTIONS[2];
  return <span style={{fontSize:".68rem",fontWeight:700,padding:"2px 8px",borderRadius:99,background:"rgba(139,92,246,.1)",color:"#8b5cf6"}}>{opt.icon} {opt.label}</span>;
};
const DeliveryBadge = ({ v }) => {
  const colors = { banner:"#0ea5e9", email:"#16a34a", both:"#d97706" };
  const labels = { banner:"🖼 Banner", email:"📧 Email", both:"📧+🖼 Both" };
  return <span style={{fontSize:".68rem",fontWeight:700,padding:"2px 8px",borderRadius:99,background:`${colors[v]||"#0ea5e9"}18`,color:colors[v]||"#0ea5e9"}}>{labels[v]||v}</span>;
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminAnnouncements({ openWithDefaults, onModalClose }) {
  const [list,    setList]    = useState([]);
  const [form,    setForm]    = useState(INITIAL_FORM);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState(null);
  const [preview, setPreview] = useState(null);    // { count, loading }
  const [previewTimer, setPreviewTimer] = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null), 3500); };

  // Load announcement history
  const loadList = useCallback(() => api.get("social/all").then(r => setList(r.data)).catch(()=>{}), []);
  useEffect(() => { loadList(); }, [loadList]);

  // Allow parent (dashboard modal) to pre-fill form
  useEffect(() => {
    if (openWithDefaults) setForm(f => ({ ...f, ...openWithDefaults }));
  }, [openWithDefaults]);

  // ── Fetch recipient preview count ──────────────────────────────────────────
  const fetchPreview = useCallback((audience) => {
    setPreview({ count: null, loading: true });
    api.get(`social/audience-count?audience=${audience}`)
      .then(r => setPreview({ count: r.data.count, loading: false }))
      .catch(() => setPreview({ count: "—", loading: false }));
  }, []);

  // Debounce audience changes
  useEffect(() => {
    if (previewTimer) clearTimeout(previewTimer);
    const t = setTimeout(() => fetchPreview(form.audience), 300);
    setPreviewTimer(t);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.audience]);

  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!form.title.trim()) { showToast("Please enter a title", "error"); return; }
    if (!form.message.trim()) { showToast("Please enter a message", "error"); return; }
    setSaving(true);
    try {
      const r = await api.post("social/", form);
      setList(p => [r.data, ...p]);
      showToast(
        r.data.emailQueued
          ? `✅ Announcement sent! Emails queued for ${r.data.recipientCount} users.`
          : `✅ Announcement posted as banner!`
      );
      setForm(INITIAL_FORM);
      if (onModalClose) onModalClose();
    } catch (err) {
      showToast(err?.response?.data?.error || "Failed to send announcement", "error");
    }
    setSaving(false);
  };

  // ── Toggle / Delete ────────────────────────────────────────────────────────
  const toggle = async (id) => {
    const r = await api.patch(`social/${id}/toggle`);
    setList(p => p.map(a => a._id === id ? r.data : a));
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    await api.delete(`social/${id}`);
    setList(p => p.filter(a => a._id !== id));
    showToast("Deleted");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const showTypeSelector = ["banner","both"].includes(form.deliveryMode);

  return (
    <div className="admin-page" style={{position:"relative"}}>
      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",top:70,right:24,zIndex:9999,padding:"12px 20px",borderRadius:12,fontWeight:600,fontSize:".875rem",background:toast.type==="error"?"#ef4444":"#22c55e",color:"white",boxShadow:"0 8px 24px rgba(0,0,0,.3)",maxWidth:380,lineHeight:1.4}}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="admin-section-header" style={{marginBottom:24}}>
        <div>
          <h1 style={{fontSize:"1.4rem",fontWeight:800,margin:0}}>📢 Announcement Center</h1>
          <p style={{color:"var(--admin-muted)",fontSize:".82rem",margin:"4px 0 0"}}>
            Manually broadcast messages to your users via banner, email, or both
          </p>
        </div>
      </div>

      {/* ── Compose Panel ── */}
      <div className="admin-card" style={{padding:"24px 24px 20px",marginBottom:28,borderRadius:18,border:"1px solid rgba(66,85,255,.15)",background:"linear-gradient(135deg,rgba(66,85,255,.03),rgba(139,92,246,.03))"}}>
        <h3 style={{margin:"0 0 18px",fontSize:"1rem",fontWeight:800,display:"flex",alignItems:"center",gap:8}}>
          <Send size={16} color="#4255ff"/> Compose Announcement
        </h3>

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Title */}
          <div>
            <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:"var(--admin-muted)",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px"}}>Title</label>
            <input className="admin-input" placeholder="e.g. New Study Materials Added!" value={form.title}
              onChange={e=>setField("title",e.target.value)} style={{width:"100%",boxSizing:"border-box"}} />
          </div>

          {/* Message */}
          <div>
            <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:"var(--admin-muted)",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px"}}>Message</label>
            <textarea className="admin-input" placeholder="Write your announcement message here…" value={form.message}
              onChange={e=>setField("message",e.target.value)}
              style={{width:"100%",boxSizing:"border-box",minHeight:96,resize:"vertical"}} />
          </div>

          {/* Audience */}
          <div>
            <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:"var(--admin-muted)",marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>
              Target Audience {preview && (
                <span style={{fontWeight:600,color:"#4255ff",textTransform:"none",letterSpacing:0}}>
                  — {preview.loading ? "counting…" : `${preview.count?.toLocaleString()} users`}
                </span>
              )}
            </label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {AUDIENCE_OPTIONS.map(o => (
                <button key={o.value} type="button"
                  onClick={() => setField("audience", o.value)}
                  style={{
                    padding:"8px 16px", borderRadius:99, border:`2px solid ${form.audience===o.value?"#4255ff":"var(--admin-border,#e2e8f0)"}`,
                    background: form.audience===o.value?"rgba(66,85,255,.1)":"transparent",
                    color: form.audience===o.value?"#4255ff":"var(--admin-muted)",
                    fontWeight:700, fontSize:".8rem", cursor:"pointer", transition:"all .15s",
                    display:"flex", alignItems:"center", gap:5,
                  }}>
                  {o.icon} {o.label}
                  <span style={{fontSize:".68rem",fontWeight:500,opacity:.75}}>({o.desc})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:"var(--admin-muted)",marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>Subject</label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {SUBJECT_OPTIONS.map(o => (
                <button key={o.value} type="button"
                  onClick={() => setField("subject", o.value)}
                  style={{
                    padding:"8px 16px", borderRadius:99, border:`2px solid ${form.subject===o.value?"#8b5cf6":"var(--admin-border,#e2e8f0)"}`,
                    background: form.subject===o.value?"rgba(139,92,246,.1)":"transparent",
                    color: form.subject===o.value?"#8b5cf6":"var(--admin-muted)",
                    fontWeight:700, fontSize:".8rem", cursor:"pointer", transition:"all .15s",
                    display:"flex", alignItems:"center", gap:5,
                  }}>
                  {o.icon} {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Mode */}
          <div>
            <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:"var(--admin-muted)",marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>Delivery Mode</label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {DELIVERY_OPTIONS.map(o => {
                const active = form.deliveryMode === o.value;
                const col = { banner:"#0ea5e9", email:"#16a34a", both:"#d97706" }[o.value];
                return (
                  <button key={o.value} type="button" onClick={() => setField("deliveryMode", o.value)}
                    style={{
                      padding:"8px 16px", borderRadius:12, border:`2px solid ${active?col:"var(--admin-border,#e2e8f0)"}`,
                      background: active?`${col}14`:"transparent",
                      color: active?col:"var(--admin-muted)",
                      fontWeight:700, fontSize:".8rem", cursor:"pointer", transition:"all .15s",
                      display:"flex", flexDirection:"column", alignItems:"flex-start", gap:2, minWidth:110,
                    }}>
                    <span style={{display:"flex",alignItems:"center",gap:5}}>{o.icon} {o.label}</span>
                    <span style={{fontSize:".65rem",fontWeight:500,opacity:.75}}>{o.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banner Type (only when banner is included) */}
          {showTypeSelector && (
            <div>
              <label style={{display:"block",fontSize:".75rem",fontWeight:700,color:"var(--admin-muted)",marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>Banner Style</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {[{v:"info",l:"ℹ️ Info"},{v:"success",l:"✅ Success"},{v:"warning",l:"⚠️ Warning"},{v:"danger",l:"🚨 Danger"}].map(o=>(
                  <button key={o.v} type="button" onClick={()=>setField("type",o.v)}
                    style={{
                      padding:"6px 14px",borderRadius:99,border:`2px solid ${form.type===o.v?TYPE_COLORS[o.v]:"var(--admin-border,#e2e8f0)"}`,
                      background:form.type===o.v?TYPE_BG[o.v]:"transparent",
                      color:form.type===o.v?TYPE_COLORS[o.v]:"var(--admin-muted)",
                      fontWeight:700,fontSize:".78rem",cursor:"pointer",transition:"all .15s",
                    }}>{o.l}</button>
                ))}
              </div>
            </div>
          )}

          {/* Send Button */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:4,flexWrap:"wrap",gap:12}}>
            <div style={{fontSize:".78rem",color:"var(--admin-muted)",display:"flex",alignItems:"center",gap:6}}>
              <Users size={13}/>
              {preview?.loading ? "Counting recipients…" : preview?.count != null
                ? `Approx. ${preview.count.toLocaleString()} recipient${preview.count!==1?"s":""} matched`
                : "Select audience to see count"}
            </div>
            <button className="admin-btn primary" onClick={handleSend} disabled={saving}
              style={{display:"flex",alignItems:"center",gap:8,padding:"10px 22px",fontWeight:800,fontSize:".9rem"}}>
              <Send size={15}/> {saving ? "Sending…" : "Send Announcement"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Announcement History ── */}
      <div className="admin-section-header" style={{marginBottom:14}}>
        <span className="admin-section-title">📋 Announcement History</span>
        <span style={{fontSize:".75rem",color:"var(--admin-muted)"}}>{list.length} total</span>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {list.length === 0 && (
          <div style={{textAlign:"center",padding:40,color:"var(--admin-muted)",fontSize:".85rem"}}>
            No announcements yet. Use the compose panel above to send your first one.
          </div>
        )}
        {list.map(a => (
          <div key={a._id} style={{
            display:"flex", alignItems:"flex-start", gap:14, padding:"14px 18px",
            borderRadius:14, background:TYPE_BG[a.type]||"var(--admin-card)",
            border:`1px solid ${TYPE_COLORS[a.type]||"#4255ff"}25`,
            opacity: a.active || a.deliveryMode==="email" ? 1 : 0.6,
            transition:"box-shadow .15s",
          }}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:".9rem",color:TYPE_COLORS[a.type]}}>{a.title}</div>
              <div style={{fontSize:".8rem",color:"var(--admin-text)",marginTop:3,lineHeight:1.4}}>{a.message}</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:8}}>
                <AudienceBadge v={a.audience||"all"}/>
                <SubjectBadge  v={a.subject||"custom"}/>
                <DeliveryBadge v={a.deliveryMode||"banner"}/>
                {a.recipientCount > 0 && (
                  <span style={{fontSize:".68rem",fontWeight:700,padding:"2px 8px",borderRadius:99,background:"rgba(15,23,42,.06)",color:"var(--admin-muted)"}}>
                    👥 {a.recipientCount?.toLocaleString()} recipients
                  </span>
                )}
                {a.emailSent && (
                  <span style={{fontSize:".68rem",fontWeight:700,padding:"2px 8px",borderRadius:99,background:"rgba(22,163,74,.1)",color:"#16a34a"}}>
                    ✉️ Email Sent
                  </span>
                )}
              </div>
              <div style={{fontSize:".7rem",color:"var(--admin-muted)",marginTop:6}}>
                {new Date(a.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
                {" · "}
                {a.deliveryMode !== "email" ? (a.active ? "Banner Live" : "Banner Hidden") : "Email Only"}
                {" · by "}
                {a.createdBy?.name || "Admin"}
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              {a.deliveryMode !== "email" && (
                <button className="admin-btn secondary sm" onClick={() => toggle(a._id)} title={a.active?"Hide banner":"Show banner"}>
                  {a.active ? <ToggleRight size={15} color="#16a34a"/> : <ToggleLeft size={15}/>}
                </button>
              )}
              <button className="admin-btn danger sm" onClick={() => remove(a._id)}><Trash2 size={13}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
