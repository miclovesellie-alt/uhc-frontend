import React, { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Crown, Download, UserPlus } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import api from "../../api/api";
import { useToast } from "../../hooks/useToast";

export default function AdminPayments() {
  const { showToast, ToastEl } = useToast();

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    monthRevenue: 0,
    todayRevenue: 0,
    activeSubscribers: 0,
    pendingManualReviews: 0,
  });

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Grant Modal
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantPlanId, setGrantPlanId] = useState("monthly");
  const [grantDays, setGrantDays] = useState(30);
  const [grantLoading, setGrantLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("payment/admin/stats");
      if (res.data?.success) setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch payment stats:", err);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("payment/admin/transactions", {
        params: {
          page,
          limit: 20,
          status: statusFilter,
          plan: planFilter,
          search: search.trim() || undefined,
        },
      });
      if (res.data?.success) {
        setTransactions(res.data.transactions || []);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      showToast("Failed to load transactions", "error");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, planFilter, search, showToast]);

  useEffect(() => {
    fetchStats();
    fetchTransactions();
  }, [fetchStats, fetchTransactions]);

  const loadUsersForGrant = async () => {
    try {
      const res = await api.get("users");
      if (Array.isArray(res.data)) {
        setAllUsers(res.data);
        if (res.data.length > 0) setGrantUserId(res.data[0]._id);
      }
    } catch (err) {
      console.error("Failed to load users for grant:", err);
    }
  };

  const handleApproveTransaction = async (paymentId) => {
    if (!window.confirm("Approve this payment and activate user subscription?")) return;
    try {
      const res = await api.put(`payment/admin/transactions/${paymentId}/approve`);
      showToast(res.data?.message || "Payment approved!", "success");
      fetchStats();
      fetchTransactions();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to approve payment", "error");
    }
  };

  const handleGrantSubmit = async (e) => {
    e.preventDefault();
    if (!grantUserId) return;
    setGrantLoading(true);
    try {
      const res = await api.put(`payment/admin/user/${grantUserId}/grant-premium`, {
        planId: grantPlanId,
        durationDays: grantDays,
      });
      showToast(res.data?.message || "Premium granted!", "success");
      setShowGrantModal(false);
      fetchStats();
      fetchTransactions();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to grant premium", "error");
    } finally {
      setGrantLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ["Date", "Customer Name", "Customer Email", "Phone", "Plan", "Amount (GHS)", "Gateway", "Status", "Reference", "MoMo ID"];
    const rows = transactions.map(t => [
      `"${new Date(t.createdAt).toLocaleDateString()}"`,
      `"${t.user?.name || ""}"`,
      `"${t.customerEmail || t.user?.email || ""}"`,
      `"${t.customerPhone || t.user?.phone || ""}"`,
      `"${t.planTitle || t.plan}"`,
      t.amount,
      `"${t.gateway}"`,
      `"${t.status}"`,
      `"${t.reference}"`,
      `"${t.momoTransactionId || ""}"`,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uhc_revenue_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatWhatsApp = (phone, name, plan, momoId) => {
    if (!phone) return "";
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("2330") && clean.length === 13) clean = "233" + clean.slice(4);
    else if (clean.startsWith("0") && clean.length === 10) clean = "233" + clean.slice(1);
    else if (clean.length === 9) clean = "233" + clean;
    const msg = `Hello ${name || "Student"}, this is UHC Academy Admin regarding your ${plan || "Premium"} subscription payment${momoId ? ` (ID: ${momoId})` : ""}.`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="admin-page">
      {ToastEl}

      {/* Header */}
      <div className="admin-section-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--admin-text)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            💳 Revenue &amp; Subscription Management
          </h1>
          <p style={{ fontSize: ".84rem", color: "var(--admin-muted)", margin: "4px 0 0" }}>
            Track student payments, Paystack MoMo revenue, and active AI Premium subscribers.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="admin-btn primary sm"
            onClick={() => {
              setShowGrantModal(true);
              loadUsersForGrant();
            }}
          >
            <UserPlus size={14} /> Grant Premium
          </button>
          <button className="admin-btn secondary sm" onClick={exportCSV}>
            <Download size={14} /> Export CSV
          </button>
          <button className="admin-btn secondary sm" onClick={() => { fetchStats(); fetchTransactions(); }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div style={{ padding: "18px 20px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 16 }}>
          <div style={{ fontSize: ".72rem", color: "#10b981", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
            💰 Total Revenue (All Time)
          </div>
          <div style={{ fontSize: "1.65rem", fontWeight: 900, color: "var(--admin-text)" }}>
            GH₵ {stats.totalRevenue.toLocaleString()}
          </div>
          <div style={{ fontSize: ".75rem", color: "var(--admin-muted)", marginTop: 4 }}>
            {stats.totalTransactions} successful payments
          </div>
        </div>

        <div style={{ padding: "18px 20px", background: "rgba(79,70,229,0.08)", border: "1px solid rgba(79,70,229,0.25)", borderRadius: 16 }}>
          <div style={{ fontSize: ".72rem", color: "#6366f1", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
            📅 This Month's Revenue
          </div>
          <div style={{ fontSize: "1.65rem", fontWeight: 900, color: "var(--admin-text)" }}>
            GH₵ {stats.monthRevenue.toLocaleString()}
          </div>
          <div style={{ fontSize: ".75rem", color: "var(--admin-muted)", marginTop: 4 }}>
            Today: GH₵ {stats.todayRevenue.toLocaleString()}
          </div>
        </div>

        <div style={{ padding: "18px 20px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 16 }}>
          <div style={{ fontSize: ".72rem", color: "#f59e0b", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
            👑 Active AI Subscribers
          </div>
          <div style={{ fontSize: "1.65rem", fontWeight: 900, color: "var(--admin-text)" }}>
            {stats.activeSubscribers}
          </div>
          <div style={{ fontSize: ".75rem", color: "var(--admin-muted)", marginTop: 4 }}>
            Unlimited AI access active
          </div>
        </div>

        <div style={{ padding: "18px 20px", background: stats.pendingManualReviews > 0 ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${stats.pendingManualReviews > 0 ? "rgba(239,68,68,0.3)" : "var(--admin-border)"}`, borderRadius: 16 }}>
          <div style={{ fontSize: ".72rem", color: stats.pendingManualReviews > 0 ? "#ef4444" : "var(--admin-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
            ⏳ Pending Manual Reviews
          </div>
          <div style={{ fontSize: "1.65rem", fontWeight: 900, color: stats.pendingManualReviews > 0 ? "#ef4444" : "var(--admin-text)" }}>
            {stats.pendingManualReviews}
          </div>
          <div style={{ fontSize: ".75rem", color: "var(--admin-muted)", marginTop: 4 }}>
            Direct MoMo transfers awaiting review
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--admin-muted)" }} />
          <input
            className="admin-input"
            style={{ width: "100%", paddingLeft: 36, boxSizing: "border-box" }}
            placeholder="Search by student name, email, phone, reference..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="admin-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="all">All Statuses</option>
          <option value="success">✅ Successful / Active</option>
          <option value="pending">⏳ Pending Review</option>
          <option value="failed">❌ Failed</option>
        </select>
        <select className="admin-select" value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }}>
          <option value="all">All Plans</option>
          <option value="monthly">Pro Monthly (GH₵ 35)</option>
          <option value="semester">NMC Semester Pass (GH₵ 180)</option>
          <option value="annual">Annual Pass (GH₵ 290)</option>
        </select>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--admin-muted)" }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>⏳</div>
          Loading revenue records...
        </div>
      ) : transactions.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--admin-muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📭</div>
          No transaction records found
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Plan &amp; Duration</th>
                <th>Amount</th>
                <th>Gateway &amp; Method</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => {
                const isManualPending = tx.gateway === "manual_momo" && tx.status === "pending";
                const phone = tx.customerPhone || tx.user?.phone;
                return (
                  <tr key={tx._id} style={{ background: isManualPending ? "rgba(245,158,11,0.05)" : undefined }}>
                    <td style={{ color: "var(--admin-muted)", fontWeight: 600 }}>{(page - 1) * 20 + i + 1}</td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--admin-text)", fontSize: ".88rem" }}>
                          {tx.user?.name || "Student"}
                        </div>
                        <div style={{ fontSize: ".76rem", color: "var(--admin-muted)" }}>
                          {tx.customerEmail || tx.user?.email || "—"}
                        </div>
                        {phone && (
                          <div style={{ fontSize: ".72rem", color: "var(--admin-muted)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                            <span>📱 {phone}</span>
                            <a
                              href={formatWhatsApp(phone, tx.user?.name, tx.planTitle, tx.momoTransactionId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#25D366", textDecoration: "none", fontWeight: 700 }}
                              title="Chat on WhatsApp"
                            >
                              <FaWhatsapp size={12} style={{ verticalAlign: "middle" }} />
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className="admin-badge blue" style={{ fontWeight: 800 }}>
                          {tx.planTitle || tx.plan}
                        </span>
                        <div style={{ fontSize: ".72rem", color: "var(--admin-muted)", marginTop: 2 }}>
                          {tx.durationDays} Days Access
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 900, color: "var(--admin-text)", fontSize: ".92rem" }}>
                        GH₵ {tx.amount}
                      </div>
                      <div style={{ fontSize: ".7rem", color: "var(--admin-muted)" }}>
                        {tx.currency || "GHS"}
                      </div>
                    </td>
                    <td>
                      <div>
                        <span style={{ fontSize: ".78rem", fontWeight: 700, textTransform: "uppercase", color: tx.gateway === "paystack" ? "#6366f1" : "#10b981" }}>
                          {tx.gateway === "paystack" ? "⚡ Paystack MoMo/Card" : tx.gateway === "manual_momo" ? "📲 Direct MoMo" : "👑 Admin Grant"}
                        </span>
                        {tx.momoTransactionId && (
                          <div style={{ fontSize: ".72rem", color: "var(--admin-muted)", fontFamily: "monospace", marginTop: 2 }}>
                            Ref: {tx.momoTransactionId}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`admin-badge ${tx.status === "success" ? "green" : tx.status === "pending" ? "orange" : "red"}`}>
                        {tx.status === "success" ? "✅ Active" : tx.status === "pending" ? "⏳ Review" : "❌ Failed"}
                      </span>
                    </td>
                    <td style={{ fontSize: ".78rem", color: "var(--admin-muted)", whiteSpace: "nowrap" }}>
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {isManualPending && (
                          <button
                            className="admin-btn primary sm"
                            onClick={() => handleApproveTransaction(tx._id)}
                            style={{ background: "#16a34a", padding: "4px 9px", fontSize: ".74rem" }}
                            title="Approve MoMo Payment & Activate User"
                          >
                            ✓ Approve
                          </button>
                        )}
                        {phone && (
                          <a
                            href={formatWhatsApp(phone, tx.user?.name, tx.planTitle, tx.momoTransactionId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-btn sm"
                            style={{
                              background: "#25D366",
                              color: "white",
                              padding: "4px 8px",
                              borderRadius: 8,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              textDecoration: "none",
                              fontWeight: 700,
                              fontSize: ".74rem",
                            }}
                          >
                            <FaWhatsapp size={13} /> WhatsApp
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          <button className="admin-btn secondary sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            ← Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={`admin-btn sm ${p === page ? "primary" : "secondary"}`} onClick={() => setPage(p)}>
              {p}
            </button>
          ))}
          <button className="admin-btn secondary sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next →
          </button>
        </div>
      )}

      {/* ── Grant Premium Modal ── */}
      {showGrantModal && (
        <div className="admin-modal-overlay" onClick={() => setShowGrantModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--admin-text)", display: "flex", alignItems: "center", gap: 8 }}>
                <Crown size={20} color="#f59e0b" /> Grant / Extend Premium
              </div>
              <button className="admin-btn secondary sm" onClick={() => setShowGrantModal(false)}>✕</button>
            </div>

            <form onSubmit={handleGrantSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: ".75rem", color: "var(--admin-muted)", fontWeight: 700, display: "block", marginBottom: 4 }}>
                  SELECT STUDENT
                </label>
                <select
                  className="admin-select"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  value={grantUserId}
                  onChange={e => setGrantUserId(e.target.value)}
                  required
                >
                  {allUsers.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email}) {u.isPremium ? "👑 [Active]" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: ".75rem", color: "var(--admin-muted)", fontWeight: 700, display: "block", marginBottom: 4 }}>
                  SUBSCRIPTION PLAN
                </label>
                <select
                  className="admin-select"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  value={grantPlanId}
                  onChange={e => {
                    setGrantPlanId(e.target.value);
                    if (e.target.value === "monthly") setGrantDays(30);
                    if (e.target.value === "semester") setGrantDays(120);
                    if (e.target.value === "annual") setGrantDays(365);
                  }}
                >
                  <option value="monthly">Pro Monthly (30 Days)</option>
                  <option value="semester">NMC Semester Pass (120 Days)</option>
                  <option value="annual">Annual Pass (365 Days)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: ".75rem", color: "var(--admin-muted)", fontWeight: 700, display: "block", marginBottom: 4 }}>
                  DURATION IN DAYS
                </label>
                <input
                  type="number"
                  className="admin-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  value={grantDays}
                  onChange={e => setGrantDays(parseInt(e.target.value) || 30)}
                  min="1"
                  required
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="button" className="admin-btn secondary" style={{ flex: 1 }} onClick={() => setShowGrantModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn primary" style={{ flex: 1, background: "#16a34a" }} disabled={grantLoading}>
                  {grantLoading ? "Granting..." : "Grant Premium Access"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
