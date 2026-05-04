import React, { useState, useEffect } from "react";
import api from "../../api/api";
import { Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

const TYPE_COLORS = { info:"#4255ff", warning:"#d97706", success:"#16a34a", danger:"#dc2626" };
const TYPE_BG    = { info:"rgba(66,85,255,0.08)", warning:"rgba(217,119,6,0.08)", success:"rgba(22,163,74,0.08)", danger:"rgba(220,38,38,0.08)" };

export default function AdminAnnouncements() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ title:"", message:"", type:"info" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => { fetch(); }, []);
  const fetch = () => api.get("social/all").then(r=>setList(r.data)).catch(()=>{});

  const handleCreate = async () => {
    if (!form.title || !form.message) { showToast("Fill title and message","error"); return; }
    setSaving(true);
    try {
      const r = await api.post("social/", form);
      setList(p=>[r.data,...p]);
      setForm({ title:"", message:"", type:"info" });
      showToast("Announcement created!");
    } catch { showToast("Failed","error"); }
    setSaving(false);
  };

  const toggle = async (id) => {
    const r = await api.patch(`social/${id}/toggle`);
    setList(p=>p.map(a=>a._id===id?r.data:a));
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    await api.delete(`social/${id}`);
    setList(p=>p.filter(a=>a._id!==id));
    showToast("Deleted");
  };

  return (
    <div className="admin-page">
      {toast && <div style={{ position:"fixed",top:70,right:24,zIndex:9999,padding:"12px 20px",borderRadius:12,fontWeight:600,fontSize:".875rem",background:toast.type==="error"?"#ef4444":"#22c55e",color:"white",boxShadow:"0 8px 24px rgba(0,0,0,.3)" }}>{toast.msg}</div>}

      <div className="admin-section-header" style={{marginBottom:24}}>
        <h1 style={{fontSize:"1.4rem",fontWeight:800,margin:0}}>📢 Announcements</h1>
        <p style={{color:"var(--admin-muted)",fontSize:".82rem",margin:"4px 0 0"}}>Post site-wide banners visible to all students</p>
      </div>

      {/* Create form */}
      <div className="admin-card" style={{padding:"20px 20px",marginBottom:24,borderRadius:16}}>
        <h3 style={{margin:"0 0 14px",fontSize:"1rem",fontWeight:700}}>New Announcement</h3>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <input className="admin-input" placeholder="Title (e.g. Exam Week Notice)" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} style={{width:"100%",boxSizing:"border-box"}} />
          <textarea className="admin-input" placeholder="Message..." value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} style={{width:"100%",boxSizing:"border-box",minHeight:80,resize:"vertical"}} />
          <div style={{display:"flex",gap:10}}>
            <select className="admin-select" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
              <option value="info">ℹ️ Info</option>
              <option value="success">✅ Success</option>
              <option value="warning">⚠️ Warning</option>
              <option value="danger">🚨 Danger</option>
            </select>
            <button className="admin-btn primary" onClick={handleCreate} disabled={saving}>
              <Plus size={14}/> {saving?"Saving…":"Post Announcement"}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {list.length===0 && <div style={{textAlign:"center",padding:40,color:"var(--admin-muted)"}}>No announcements yet.</div>}
        {list.map(a=>(
          <div key={a._id} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"14px 18px",borderRadius:14,background:TYPE_BG[a.type]||"var(--admin-card)",border:`1px solid ${TYPE_COLORS[a.type]||"#4255ff"}25`,opacity:a.active?1:0.55}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:".9rem",color:TYPE_COLORS[a.type]}}>{a.title}</div>
              <div style={{fontSize:".8rem",color:"var(--admin-text)",marginTop:3,lineHeight:1.4}}>{a.message}</div>
              <div style={{fontSize:".7rem",color:"var(--admin-muted)",marginTop:6}}>
                {new Date(a.createdAt).toLocaleDateString()} · {a.active?"Live":"Hidden"} · by {a.createdBy?.name||"Admin"}
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button className="admin-btn secondary sm" onClick={()=>toggle(a._id)} title={a.active?"Hide":"Show"}>
                {a.active?<ToggleRight size={15} color="#16a34a"/>:<ToggleLeft size={15}/>}
              </button>
              <button className="admin-btn danger sm" onClick={()=>remove(a._id)}><Trash2 size={13}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
