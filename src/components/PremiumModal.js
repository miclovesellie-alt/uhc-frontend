import React, { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Check, X, ArrowRight, CheckCircle2 } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import api from "../api/api";
import { UserContext } from "../context/UserContext";
import { useToast } from "./Toast";

const PLANS = [
  {
    id: "monthly",
    title: "Pro Monthly",
    badge: "Flexible",
    price: 35,
    duration: "30 Days",
    savings: null,
    features: [
      "♾️ Unlimited AI tutor questions daily",
      "⚡ Fast priority processing across all AI models",
      "🧠 Detailed question breakdowns with mnemonics",
      "🎯 Custom AI exam & quiz generation",
      "👑 'Premium Scholar' badge on profile"
    ]
  },
  {
    id: "semester",
    title: "NMC Semester Pass",
    badge: "🔥 Most Popular",
    price: 180,
    duration: "120 Days (4 Months)",
    savings: "Save GH₵ 30",
    popular: true,
    features: [
      "♾️ Unlimited AI access for the entire semester",
      "📚 Complete NMC licensure preparation suite",
      "⚡ Zero rate limits & highest priority queue",
      "🗂️ Unlimited Study Hub flashcard downloads",
      "💬 1-on-1 WhatsApp Admin & Tutor priority support"
    ]
  },
  {
    id: "annual",
    title: "Annual Mastery Pass",
    badge: "Best Value",
    price: 290,
    duration: "365 Days (Full Year)",
    savings: "Save GH₵ 130",
    features: [
      "♾️ Full 1-Year unlimited access to all AI features",
      "🩺 All future nursing & medical tools included",
      "🏆 VIP status on leaderboards and community",
      "🌟 Exclusive early access to past exam solutions"
    ]
  }
];

export default function PremiumModal({ isOpen, onClose, onPaymentSuccess }) {
  const { user } = useContext(UserContext);
  const toast = useToast();

  const [selectedPlan, setSelectedPlan] = useState("semester");
  const [method, setSelectedMethod] = useState("paystack"); // 'paystack' | 'manual'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Manual MoMo form
  const [momoTxId, setMomoTxId] = useState("");
  const [senderPhone, setSenderPhone] = useState(user?.phone || "");
  const [manualSubmitted, setManualSubmitted] = useState(false);

  if (!isOpen) return null;

  const currentPlan = PLANS.find(p => p.id === selectedPlan) || PLANS[1];

  const handlePaystackPay = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("payment/initialize", {
        planId: selectedPlan,
        callbackUrl: window.location.href
      });

      if (res.data?.authorizationUrl) {
        // Redirect to Paystack's secure checkout page
        window.location.href = res.data.authorizationUrl;
      } else {
        setError("Could not initialize Paystack checkout. Please try manual MoMo.");
      }
    } catch (err) {
      console.error("Paystack init error:", err);
      setError(err.response?.data?.message || "Failed to initialize payment. Please try manual MoMo.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualMoMoSubmit = async (e) => {
    e.preventDefault();
    if (!momoTxId.trim()) {
      setError("Please enter your Mobile Money transaction ID / SMS reference.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.post("payment/manual-momo", {
        planId: selectedPlan,
        momoTransactionId: momoTxId.trim(),
        senderPhone: senderPhone.trim()
      });
      setManualSubmitted(true);
      toast("🎉 Payment submitted! Admin will confirm and activate your account shortly.", "success");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit manual payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999999,
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          overflowY: "auto",
        }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 24 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          style={{
            background: "#ffffff",
            borderRadius: 24,
            width: "100%",
            maxWidth: 620,
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.2)",
            overflow: "hidden",
            position: "relative",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)",
            padding: "24px 28px",
            color: "#ffffff",
            position: "relative",
            flexShrink: 0,
          }}>
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                right: 18,
                top: 18,
                background: "rgba(255, 255, 255, 0.15)",
                border: "none",
                color: "#ffffff",
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
            >
              <X size={18} />
            </button>

            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(245, 158, 11, 0.2)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              color: "#fbbf24",
              padding: "4px 10px",
              borderRadius: 99,
              fontSize: "0.74rem",
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}>
              <Crown size={14} /> UHC Academy Premium
            </div>

            <h2 style={{ margin: "0 0 4px", fontSize: "1.45rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
              Unlock Unlimited AI &amp; Exam Mastery
            </h2>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "#cbd5e1", lineHeight: 1.45 }}>
              Pass your semester and NMC licensure exams with 24/7 AI-guided breakdowns, past question solutions &amp; custom quizzes.
            </p>
          </div>

          {/* Scrollable Content */}
          <div style={{ padding: "20px 28px", overflowY: "auto", flex: 1 }}>

            {/* Plan Selector Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
              {PLANS.map(p => {
                const isSel = selectedPlan === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    style={{
                      border: isSel ? "2px solid #4f46e5" : "1.5px solid #e2e8f0",
                      background: isSel ? "rgba(79, 70, 229, 0.04)" : "#ffffff",
                      borderRadius: 16,
                      padding: "14px 12px",
                      cursor: "pointer",
                      position: "relative",
                      transition: "all 0.18s ease",
                      textAlign: "center",
                    }}
                  >
                    {p.badge && (
                      <span style={{
                        position: "absolute",
                        top: -9,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: p.popular ? "#4f46e5" : "#0f172a",
                        color: "#ffffff",
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: 99,
                        whiteSpace: "nowrap",
                      }}>
                        {p.badge}
                      </span>
                    )}
                    <div style={{ fontWeight: 800, fontSize: "0.88rem", color: isSel ? "#4f46e5" : "#1e293b", marginTop: 4 }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0f172a", margin: "4px 0" }}>
                      GH₵ {p.price}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
                      {p.duration}
                    </div>
                    {p.savings && (
                      <div style={{ fontSize: "0.68rem", color: "#16a34a", fontWeight: 800, marginTop: 4 }}>
                        {p.savings}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Perks of Selected Plan */}
            <div style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: "14px 16px",
              marginBottom: 20,
            }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Included with {currentPlan.title}:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {currentPlan.features.map((feat, i) => (
                  <div key={i} style={{ fontSize: "0.82rem", color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                    <Check size={14} color="#16a34a" style={{ flexShrink: 0 }} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method Switcher */}
            <div style={{
              display: "flex",
              gap: 8,
              background: "#f1f5f9",
              padding: 4,
              borderRadius: 12,
              marginBottom: 16,
            }}>
              <button
                type="button"
                onClick={() => setSelectedMethod("paystack")}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: 9,
                  border: "none",
                  background: method === "paystack" ? "#ffffff" : "transparent",
                  color: method === "paystack" ? "#0f172a" : "#64748b",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  boxShadow: method === "paystack" ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                ⚡ Instant MoMo &amp; Card
              </button>
              <button
                type="button"
                onClick={() => setSelectedMethod("manual")}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: 9,
                  border: "none",
                  background: method === "manual" ? "#ffffff" : "transparent",
                  color: method === "manual" ? "#0f172a" : "#64748b",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  boxShadow: method === "manual" ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                📲 Direct MoMo Transfer
              </button>
            </div>

            {error && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "10px 14px",
                borderRadius: 10,
                fontSize: "0.8rem",
                fontWeight: 600,
                marginBottom: 14,
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* METHOD 1: Paystack (Automatic) */}
            {method === "paystack" && (
              <div>
                <button
                  onClick={handlePaystackPay}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    borderRadius: 14,
                    border: "none",
                    background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                    color: "#ffffff",
                    fontSize: "0.98rem",
                    fontWeight: 900,
                    cursor: loading ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 16px rgba(79, 70, 229, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.transform = "translateY(-1px)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  {loading ? "Redirecting to Payment..." : (
                    <>
                      Pay GH₵ {currentPlan.price} via Mobile Money / Card <ArrowRight size={18} />
                    </>
                  )}
                </button>
                <div style={{ fontSize: "0.72rem", color: "#64748b", textAlign: "center", marginTop: 8 }}>
                  🔒 Secured by Paystack · Supports MTN MoMo, Telecel Cash, AirtelTigo, Visa &amp; Mastercard.
                </div>
              </div>
            )}

            {/* METHOD 2: Manual MoMo (Direct to Admin) */}
            {method === "manual" && (
              <div>
                {manualSubmitted ? (
                  <div style={{
                    background: "#f0fdf4",
                    border: "1.5px solid #bbf7d0",
                    borderRadius: 14,
                    padding: "18px 20px",
                    textAlign: "center",
                  }}>
                    <CheckCircle2 size={36} color="#16a34a" style={{ margin: "0 auto 8px" }} />
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "#166534" }}>
                      Transaction Submitted for Verification!
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "#15803d", margin: "6px 0 14px" }}>
                      An admin will verify your reference and activate your <strong>{currentPlan.title}</strong> shortly.
                    </p>
                    <a
                      href={`https://wa.me/233598173019?text=${encodeURIComponent(`Hello Admin, I have sent GH₵ ${currentPlan.price} for ${currentPlan.title} via Mobile Money. Transaction ID: ${momoTxId}. My Name: ${user?.name || ""}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#25D366",
                        color: "#ffffff",
                        padding: "10px 18px",
                        borderRadius: 10,
                        fontWeight: 800,
                        fontSize: "0.82rem",
                        textDecoration: "none",
                      }}
                    >
                      <FaWhatsapp size={16} /> Notify Admin on WhatsApp ➔
                    </a>
                  </div>
                ) : (
                  <form onSubmit={handleManualMoMoSubmit}>
                    <div style={{
                      background: "rgba(37, 211, 102, 0.08)",
                      border: "1px solid rgba(37, 211, 102, 0.25)",
                      borderRadius: 12,
                      padding: "12px 16px",
                      marginBottom: 14,
                      fontSize: "0.8rem",
                      color: "#166534",
                      lineHeight: 1.45,
                    }}>
                      <strong>Direct Mobile Money Instructions:</strong><br />
                      1. Send <strong>GH₵ {currentPlan.price}</strong> to <strong>059 817 3019</strong> (MTN Mobile Money).<br />
                      2. Account Name: <strong>Universal Health Campus / Admin</strong><br />
                      3. Enter the transaction ID from your MoMo SMS below:
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                        MoMo Transaction ID / Reference <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 24891028472 or SMS Ref"
                        value={momoTxId}
                        onChange={e => setMomoTxId(e.target.value)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: "1.5px solid #cbd5e1",
                          fontSize: "0.88rem",
                          fontWeight: 600,
                          outline: "none",
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                        Your Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 0598173019"
                        value={senderPhone}
                        onChange={e => setSenderPhone(e.target.value)}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: "1.5px solid #cbd5e1",
                          fontSize: "0.88rem",
                          fontWeight: 600,
                          outline: "none",
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !momoTxId.trim()}
                      style={{
                        width: "100%",
                        padding: "12px 18px",
                        borderRadius: 12,
                        border: "none",
                        background: (!loading && momoTxId.trim()) ? "#16a34a" : "#94a3b8",
                        color: "#ffffff",
                        fontWeight: 800,
                        fontSize: "0.92rem",
                        cursor: (!loading && momoTxId.trim()) ? "pointer" : "not-allowed",
                      }}
                    >
                      {loading ? "Submitting..." : "Submit Transaction for Verification ➔"}
                    </button>
                  </form>
                )}
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
