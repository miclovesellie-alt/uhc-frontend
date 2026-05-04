import React, { useState, useEffect } from "react";
import api from "../../api/api";
import { CheckCircle, XCircle, BookOpen, FileText, RefreshCw, Eye } from "lucide-react";
import BASE_URL from "../../utils/config";
import { getFileUrl } from "../../utils/config";

export default function AdminPending() {
  const [data, setData]       = useState({ books: [], posts: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("books");
  const [toast, setToast]     = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // { type, id }
  const [rejectReason, setRejectReason] = useState("");

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("submissions/pending"); setData(r.data); }
    catch { showToast("Failed to load pending items","error"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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
      showToast("Rejected and notified submitter.");
      setRejectModal(null); setRejectReason("");
      load();
    } catch { showToast("Rejection failed","error"); }
  };

  const previewUrl = (fileUrl) =>
    `${BASE_URL}/api/submissions/proxy-pdf?url=${encodeURIComponent(getFileUrl(fileUrl))}`;

  const totalPending = data.books.length + data.posts.length;

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
      <div style={{ display:"flex",gap:8,marginBottom:20 }}>
        {[["books","📚 Books",data.books.length],["posts","📰 Posts",data.posts.length]].map(([t,l,c])=>(
          <button key={t} onClick={()=>setTab(t)} className={tab===t?"admin-btn primary sm":"admin-btn secondary sm"}>
            {l} {c>0&&<span style={{ marginLeft:6,background:tab===t?"rgba(255,255,255,.3)":"rgba(66,85,255,.15)",borderRadius:20,padding:"1px 8px",fontSize:".72rem",fontWeight:700 }}>{c}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center",padding:60,color:"var(--admin-muted)" }}>⏳ Loading…</div>
      ) : tab === "books" ? (
        data.books.length === 0 ? (
          <div style={{ textAlign:"center",padding:60,color:"var(--admin-muted)" }}>
            <div style={{ fontSize:"2.5rem",marginBottom:8 }}>✅</div>
            <p>No pending books. You're all caught up!</p>
          </div>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {data.books.map(book => (
              <div key={book._id} className="admin-card" style={{ padding:"16px 18px",borderRadius:14,display:"flex",gap:14,alignItems:"flex-start" }}>
                <div style={{ width:44,height:44,borderRadius:12,background:"rgba(66,85,255,.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  <BookOpen size={20} color="#4255ff"/>
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:700,fontSize:".95rem" }}>{book.title}</div>
                  <div style={{ fontSize:".78rem",color:"var(--admin-muted)",marginTop:3 }}>
                    By {book.submittedBy?.name||"Unknown"} ({book.submittedBy?.email||"—"}) · {book.course} · {new Date(book.createdAt).toLocaleDateString()}
                  </div>
                  {book.description && <div style={{ fontSize:".8rem",color:"var(--admin-text)",marginTop:4,lineHeight:1.4 }}>{book.description}</div>}
                  <div style={{ marginTop:8,display:"flex",gap:8,flexWrap:"wrap" }}>
                    <a href={previewUrl(book.fileUrl)} target="_blank" rel="noreferrer" className="admin-btn secondary sm" style={{ textDecoration:"none",display:"flex",alignItems:"center",gap:4 }}>
                      <Eye size={12}/> Preview PDF
                    </a>
                    <button className="admin-btn primary sm" onClick={()=>approve("book",book._id)}>
                      <CheckCircle size={13}/> Approve
                    </button>
                    <button className="admin-btn danger sm" onClick={()=>{ setRejectModal({type:"book",id:book._id}); setRejectReason(""); }}>
                      <XCircle size={13}/> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        data.posts.length === 0 ? (
          <div style={{ textAlign:"center",padding:60,color:"var(--admin-muted)" }}>
            <div style={{ fontSize:"2.5rem",marginBottom:8 }}>✅</div>
            <p>No pending posts!</p>
          </div>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {data.posts.map(post => (
              <div key={post._id} className="admin-card" style={{ padding:"16px 18px",borderRadius:14,display:"flex",gap:14,alignItems:"flex-start" }}>
                <div style={{ width:44,height:44,borderRadius:12,background:"rgba(22,163,74,.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  <FileText size={20} color="#16a34a"/>
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:700,fontSize:".95rem" }}>{post.title}</div>
                  <div style={{ fontSize:".78rem",color:"var(--admin-muted)",marginTop:3 }}>
                    By {post.submittedBy?.name||"Unknown"} · {post.category} · {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize:".82rem",color:"var(--admin-text)",marginTop:6,lineHeight:1.5,maxHeight:80,overflow:"hidden" }}>
                    {post.content}
                  </div>
                  <div style={{ marginTop:8,display:"flex",gap:8 }}>
                    <button className="admin-btn primary sm" onClick={()=>approve("feed",post._id)}>
                      <CheckCircle size={13}/> Approve & Publish
                    </button>
                    <button className="admin-btn danger sm" onClick={()=>{ setRejectModal({type:"feed",id:post._id}); setRejectReason(""); }}>
                      <XCircle size={13}/> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="admin-modal-overlay" onClick={()=>setRejectModal(null)}>
          <div className="admin-modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:380 }}>
            <h3 style={{ margin:"0 0 12px" }}>❌ Reject Submission</h3>
            <p style={{ fontSize:".85rem",color:"var(--admin-muted)",marginBottom:12 }}>Provide a reason (optional but helpful for the submitter).</p>
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
