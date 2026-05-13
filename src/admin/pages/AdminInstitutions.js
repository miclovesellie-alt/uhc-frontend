import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/api";
import {
  Building2, Search, CheckCircle, XCircle, Trash2,
  Clock, RefreshCw, MapPin, Users
} from "lucide-react";
import "../../admin_styles/AdminLibrary.css";

const STATUS_TABS = ["all", "pending", "approved", "rejected"];
const TYPE_LABELS = { school: "🎓 School", hospital: "🏥 Hospital", clinic: "🏨 Clinic", other: "🏢 Other" };

export default function AdminInstitutions() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("pending");
  const [search, setSearch]   = useState("");
  const [busy, setBusy]       = useState({});

  const fetchAll = useCallback(() => {
    setLoading(true);
    api.get("/institutions/admin/all")
      .then(r => setItems(r.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const setBusyFor = (id, val) => setBusy(p => ({ ...p, [id]: val }));

  const handleApprove = async (id) => {
    setBusyFor(id, "approving");
    try {
      await api.patch(`/institutions/admin/${id}/approve`);
      setItems(prev => prev.map(i => i._id === id ? { ...i, status: "approved" } : i));
    } catch (e) { alert(e.response?.data?.error || "Failed"); }
    finally { setBusyFor(id, null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this institution? This will also clear it from all users' profiles.")) return;
    setBusyFor(id, "deleting");
    try {
      await api.delete(`/institutions/admin/${id}`);
      setItems(prev => prev.filter(i => i._id !== id));
    } catch (e) { alert(e.response?.data?.error || "Failed"); }
    finally { setBusyFor(id, null); }
  };

  const q = search.toLowerCase().trim();
  const filtered = items.filter(i => {
    const matchTab = tab === "all" || i.status === tab;
    const matchSearch = !q || i.name.toLowerCase().includes(q) || (i.country || "").toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const pendingCount = items.filter(i => i.status === "pending").length;

  return (
    <div className="al-wrapper">
      {/* ── Header ── */}
      <div className="al-header">
        <div className="al-header-left">
          <Building2 size={22} color="#10b981" />
          <div>
            <h1 className="al-title">Institution Manager</h1>
            <p className="al-subtitle">Approve or remove schools and hospitals submitted by users</p>
          </div>
        </div>
        <button className="al-refresh-btn" onClick={fetchAll} title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="al-tabs">
        {STATUS_TABS.map(t => (
          <button
            key={t}
            className={`al-tab${tab === t ? " active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "pending" && pendingCount > 0 && (
              <span className="al-tab-badge">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="al-search-row">
        <div className="al-search-wrap">
          <Search size={14} />
          <input
            placeholder="Search by name or country…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="al-loading">Loading institutions…</div>
      ) : filtered.length === 0 ? (
        <div className="al-empty">
          <Building2 size={36} />
          <p>{tab === "pending" ? "No pending institutions to review." : "No institutions found."}</p>
        </div>
      ) : (
        <div className="al-table-wrap">
          <table className="al-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Location</th>
                <th>Members</th>
                <th>Status</th>
                <th>Added By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inst => (
                <tr key={inst._id}>
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--text-heading)" }}>{inst.name}</div>
                    {inst.city && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{inst.city}</div>}
                  </td>
                  <td>
                    <span className="al-type-badge">{TYPE_LABELS[inst.type] || inst.type}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      <MapPin size={12} /> {inst.country || "—"}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.82rem" }}>
                      <Users size={12} /> {inst.memberCount || 0}
                    </div>
                  </td>
                  <td>
                    <span className={`al-status-badge al-status-${inst.status}`}>
                      {inst.status === "pending"  && <Clock size={11} />}
                      {inst.status === "approved" && <CheckCircle size={11} />}
                      {inst.status === "rejected" && <XCircle size={11} />}
                      {inst.status}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {inst.addedBy?.name || <span style={{ fontStyle: "italic" }}>Admin-added</span>}
                    {inst.addedBy?.email && <div style={{ fontSize: "0.7rem" }}>{inst.addedBy.email}</div>}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {inst.status !== "approved" && (
                        <button
                          className="al-action-btn al-approve"
                          onClick={() => handleApprove(inst._id)}
                          disabled={!!busy[inst._id]}
                          title="Approve"
                        >
                          {busy[inst._id] === "approving" ? "…" : <><CheckCircle size={13} /> Approve</>}
                        </button>
                      )}
                      <button
                        className="al-action-btn al-delete"
                        onClick={() => handleDelete(inst._id)}
                        disabled={!!busy[inst._id]}
                        title="Remove"
                      >
                        {busy[inst._id] === "deleting" ? "…" : <><Trash2 size={13} /> Remove</>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
