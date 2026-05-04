import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/api";
import { CheckCircle, XCircle, BookOpen, FileText, RefreshCw, Eye, CheckSquare } from "lucide-react";
import { getFileUrl } from "../../utils/config";

export default function AdminPending() {
  const [data, setData]       = useState({ books: [], posts: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("books");
  const [toast, setToast]     = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selected, setSelected] = useState(new Set()); // bulk selection

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get("submissions/pending"); setData(r.data); setSelected(new Set()); }
    catch { showToast("Failed to load pending items","error"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (type, id) => {
    try {
      await api.patch(`submissions/${type}/${id}/approve`);
      showToast(`${type === "book" ? "Book" : "Post"} approved and published!`);
      load();
    } catch { showToast("Approval failed","error"); }
  };

  const reject = async () => {
    if (!rejectModal) return;
    try {
      await api.patch(`submissions/${rejectModal.type}/${rejectModal.id}/reject`, { reason: rejectReason || "Does not meet guidelines" });
      showToast("Rejected and feedback sent to submitter.");
      setRejectModal(null); setRejectReason("");
      load();
    } catch { showToast("Rejection failed","error"); }
  };

  // ── Bulk actions ──────────────────────────────────────────────
  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectAll = () => {
    const items = tab === "books" ? data.books : data.posts;
    setSelected(prev => prev.size === items.length ? new Set() : new Set(items.map(i => i._id)));
  };

  const bulkApprove = async () => {
    const type = tab === "books" ? "book" : "feed";
    await Promise.all([...selected].map(id => api.patch(`submissions/${type}/${id}/approve`).catch(()=>{})));
    showToast(`Approved ${selected.size} item(s)!`);
    load();
  };

  const bulkReject = async () => {
    const type = tab === "books" ? "book" : "feed";
    await Promise.all([...selected].map(id =>
      api.patch(`submissions/${type}/${id}/reject`, { reason: "Bulk rejected — does not meet guidelines" }).catch(()=>{})
    ));
    showToast(`Rejected ${selected.size} item(s).`);
    load();
  };

  const googleDocsPreview = (fileUrl) =>
    `https://docs.google.com/viewer?url=${encodeURIComponent(getFileUrl(fileUrl))}&embedded=false`;

  const totalPending = data.books.length + data.posts.length;
  const currentItems = tab === "books" ? data.books : data.posts;

  return (
    <div className="admin-page">
      {toast && (
        <div style={{ position:"fixed",top:70,right:24,zIndex:9999,padding:"12px 20px",borderRadius:12,fontWeight:600,fontSize:".875rem",background:toast.type==="error"?"#ef4444":"#22c55e",color:"white",boxShadow:"0 8px 24px rgba(0,0,0,.3)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="admin-section-header" style={{ marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:"1.4rem",fontWeight:800,margin:0 }}>
            ⏳ Pending Review
            {totalPending > 0 && <span style={{ marginLeft:10,fontSize:".8rem",fontWeight:700,background:"#ef4444",color:"white",padding:"2px 10px",borderRadius:20 }}>{totalPending}</span>}
          </h1>
          <p style={{ color:"var(--admin-muted)",fontSize:".82rem",margin:"4px 0 0" }}>Review and approve user-submitted books and posts</p>
        </div>
        <button className="admin-btn secondary sm" onClick={load} disabled={loading}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",gap:8,marginBottom:16 }}>
        {[["books","📚 Books",data.books.length],["posts","📰 Posts",data.posts.length]].map(([t,l,c])=>(
          <button key={t} onClick={()=>{ setTab(t); setSelected(new Set()); }} className={tab===t?"admin-btn primary sm":"admin-btn secondary sm"}>
            {l} {c>0&&<span style={{ marginLeft:6,background:tab===t?"rgba(255,255,255,.3)":"rgba(66,85,255,.15)",borderRadius:20,padding:"1px 8px",fontSize:".72rem",fontWeight:700 }}>{c}</span>}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {currentItems.length > 0 && (
        <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,background:"rgba(66,85,255,.05)",border:"1px solid rgba(66,85,255,.15)",marginBottom:16 }}>
          <button onClick={selectAll} style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",fontWeight:600,fontSize:".82rem",color:"var(--admin-text)" }}>
            <CheckSquare size={15} color={selected.size===currentItems.length?"#4255ff":"#94a3b8"}/>
            {selected.size===currentItems.length ? "Deselect All" : "Select All"}
          </button>
          {selected.size > 0 && (
            <>
              <span style={{ fontSize:".78rem",color:"var(--admin-muted)" }}>{selected.size} selected</span>
              <button className="admin-btn primary sm" onClick={bulkApprove}><CheckCircle size={12}/> Approve All</button>
              <button className="admin-btn danger sm" onClick={bulkReject}><XCircle size={12}/> Reject All</button>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:"center",padding:60,color:"var(--admin-muted)" }}>⏳ Loading…</div>
      ) : currentItems.length === 0 ? (
        <div style={{ textAlign:"center",padding:60,color:"var(--admin-muted)" }}>
          <div style={{ fontSize:"2.5rem",marginBottom:8 }}>✅</div>
          <p>No pending {tab}. You're all caught up!</p>
        </div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {currentItems.map(item => (
            <div key={item._id} className="admin-card"
              style={{ padding:"16px 18px",borderRadius:14,display:"flex",gap:14,alignItems:"flex-start",
                outline: selected.has(item._id) ? "2px solid #4255ff" : "none",
                background: selected.has(item._id) ? "rgba(66,85,255,.04)" : undefined }}>
              {/* Checkbox */}
              <input type="checkbox" checked={selected.has(item._id)} onChange={()=>toggleSelect(item._id)}
                style={{ marginTop:4,width:16,height:16,cursor:"pointer",accentColor:"#4255ff" }}/>
              <div style={{ width:44,height:44,borderRadius:12,background:tab==="books"?"rgba(66,85,255,.1)":"rgba(22,163,74,.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                {tab==="books" ? <BookOpen size={20} color="#4255ff"/> : <FileText size={20} color="#16a34a"/>}
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:700,fontSize:".95rem" }}>{item.title}</div>
                <div style={{ fontSize:".78rem",color:"var(--admin-muted)",marginTop:3 }}>
                  By {item.submittedBy?.name||"Unknown"} {item.submittedBy?.email ? `(${item.submittedBy.email})` : ""} · {item.course || item.category} · {new Date(item.createdAt).toLocaleDateString()}
                </div>
                {(item.description || item.content) && (
                  <div style={{ fontSize:".82rem",color:"var(--admin-text)",marginTop:5,lineHeight:1.5,maxHeight:72,overflow:"hidden" }}>
                    {item.description || item.content}
                  </div>
                )}
                {/* Post image preview */}
                {item.image && (
                  <img src={item.image} alt="preview" style={{ marginTop:8,borderRadius:8,maxHeight:100,maxWidth:"100%",objectFit:"cover" }}/>
                )}
                <div style={{ marginTop:10,display:"flex",gap:8,flexWrap:"wrap" }}>
                  {tab === "books" && (
                    <a href={googleDocsPreview(item.fileUrl)} target="_blank" rel="noreferrer"
                      className="admin-btn secondary sm" style={{ textDecoration:"none",display:"flex",alignItems:"center",gap:4 }}>
                      <Eye size={12}/> Preview
                    </a>
                  )}
                  <button className="admin-btn primary sm" onClick={()=>approve(tab==="books"?"book":"feed", item._id)}>
                    <CheckCircle size={13}/> Approve
                  </button>
                  <button className="admin-btn danger sm" onClick={()=>{ setRejectModal({type:tab==="books"?"book":"feed",id:item._id}); setRejectReason(""); }}>
                    <XCircle size={13}/> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="admin-modal-overlay" onClick={()=>setRejectModal(null)}>
          <div className="admin-modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:380 }}>
            <h3 style={{ margin:"0 0 12px" }}>❌ Reject Submission</h3>
            <p style={{ fontSize:".85rem",color:"var(--admin-muted)",marginBottom:12 }}>Provide a reason — the user will see this as feedback.</p>
            <textarea className="admin-input" style={{ width:"100%",boxSizing:"border-box",minHeight:80,resize:"vertical",marginBottom:14 }}
              placeholder="e.g. Content doesn't meet quality standards…"
              value={rejectReason} onChange={e=>setRejectReason(e.target.value)} />
            <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
              <button className="admin-btn secondary" onClick={()=>setRejectModal(null)}>Cancel</button>
              <button className="admin-btn danger" onClick={reject}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
