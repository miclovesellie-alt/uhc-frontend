import React, { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, UserCheck, ArrowRight, Globe, BookOpen } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { UserContext } from "../context/UserContext";
import api from "../api/api";
import { useToast } from "./Toast";

const COUNTRY_CODES = [
  { code: "+233", label: "Ghana (+233)", flag: "🇬🇭" },
  { code: "+234", label: "Nigeria (+234)", flag: "🇳🇬" },
  { code: "+1",   label: "USA / Canada (+1)", flag: "🇺🇸" },
  { code: "+44",  label: "United Kingdom (+44)", flag: "🇬🇧" },
  { code: "+254", label: "Kenya (+254)", flag: "🇰🇪" },
  { code: "+231", label: "Liberia (+231)", flag: "🇱🇷" },
  { code: "+232", label: "Sierra Leone (+232)", flag: "🇸🇱" },
  { code: "+27",  label: "South Africa (+27)", flag: "🇿🇦" },
  { code: "+260", label: "Zambia (+260)", flag: "🇿🇲" },
  { code: "+256", label: "Uganda (+256)", flag: "🇺🇬" },
  { code: "+265", label: "Malawi (+265)", flag: "🇲🇼" },
  { code: "+91",  label: "India (+91)", flag: "🇮🇳" },
];

const CATEGORIES = [
  "Nursing Student (General/BSc)",
  "Midwifery Student",
  "Public Health Nursing",
  "Community Health Nursing",
  "NMC Licensure Candidate",
  "Health Worker / Practitioner",
  "Nurse Educator / Tutor",
  "Other Medical / Healthcare",
];

const COUNTRIES = [
  "Ghana", "Nigeria", "United States", "United Kingdom", "Kenya",
  "Liberia", "Sierra Leone", "South Africa", "Uganda", "Zambia",
  "Malawi", "India", "Canada", "Other"
];

export default function CompleteProfileModal() {
  const { user, updateUser } = useContext(UserContext);
  const toast = useToast();

  const [phonePrefix, setPhonePrefix] = useState("+233");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [category, setCategory] = useState(user?.category || "Nursing Student (General/BSc)");
  const [country, setCountry] = useState(user?.country || "Ghana");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Only show if user is logged in AND doesn't have a valid phone number
  const needsPhone = user && (!user.phone || !user.phone.trim());

  if (!needsPhone) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanNum = phoneNumber.trim().replace(/\s+/g, "");
    if (!cleanNum || cleanNum.length < 6) {
      setError("Please enter a valid telephone / mobile number");
      return;
    }

    const fullPhone = `${phonePrefix}${cleanNum.startsWith("0") ? cleanNum.slice(1) : cleanNum}`;
    setLoading(true);

    try {
      const res = await api.put("user", {
        name: user.name,
        phone: fullPhone,
        category: category || user.category || "Nursing Student (General/BSc)",
        country: country || user.country || "Ghana",
      });

      if (updateUser) {
        updateUser(res.data);
      }
      toast("🎉 Profile setup complete! Welcome to UHC Academy.", "success");
    } catch (err) {
      console.error("Profile complete error:", err);
      setError(err.response?.data?.message || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "rgba(15, 23, 42, 0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 260 }}
          style={{
            background: "#ffffff",
            borderRadius: 24,
            width: "100%",
            maxWidth: 520,
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)",
            overflow: "hidden",
            position: "relative",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Top Banner Accent */}
          <div style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)",
            padding: "24px 28px 20px",
            color: "#ffffff",
            position: "relative",
          }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(4px)",
              padding: "4px 10px",
              borderRadius: 99,
              fontSize: "0.74rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}>
              <ShieldCheck size={14} /> Final Step · Account Setup
            </div>
            <h2 style={{ margin: "0 0 6px", fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              Finish Setting Up Your Profile
            </h2>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "rgba(255, 255, 255, 0.9)", lineHeight: 1.5 }}>
              Hello <strong>{user?.name || "there"}</strong>! Please provide your WhatsApp / mobile telephone number to unlock your quizzes and Study Hub.
            </p>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit} style={{ padding: "24px 28px" }}>
            {error && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "10px 14px",
                borderRadius: 10,
                fontSize: "0.82rem",
                fontWeight: 600,
                marginBottom: 16,
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Mobile Number Field */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#334155",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}>
                Mobile / WhatsApp Number <span style={{ color: "#ef4444" }}>*</span>
              </label>
              
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={phonePrefix}
                  onChange={e => setPhonePrefix(e.target.value)}
                  style={{
                    width: 140,
                    padding: "11px 10px",
                    borderRadius: 12,
                    border: "1.5px solid #cbd5e1",
                    background: "#f8fafc",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "#1e293b",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>

                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 59 817 3019"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 14px 11px 38px",
                      borderRadius: 12,
                      border: "1.5px solid #cbd5e1",
                      fontSize: "0.92rem",
                      fontWeight: 600,
                      color: "#0f172a",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={e => e.target.style.borderColor = "#10b981"}
                    onBlur={e => e.target.style.borderColor = "#cbd5e1"}
                  />
                  <FaWhatsapp
                    size={16}
                    color="#25D366"
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />
                </div>
              </div>
              <span style={{ fontSize: "0.72rem", color: "#64748b", display: "block", marginTop: 4 }}>
                Enter without leading zero if prefix is selected.
              </span>
            </div>

            {/* Study Category */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#334155",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}>
                <BookOpen size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                Field of Study / Profession <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "11px 14px",
                  borderRadius: 12,
                  border: "1.5px solid #cbd5e1",
                  background: "#f8fafc",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "#1e293b",
                  outline: "none",
                }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Country */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#334155",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}>
                <Globe size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                Country of Residence <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "11px 14px",
                  borderRadius: 12,
                  border: "1.5px solid #cbd5e1",
                  background: "#f8fafc",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "#1e293b",
                  outline: "none",
                }}
              >
                {COUNTRIES.map(cty => (
                  <option key={cty} value={cty}>{cty}</option>
                ))}
              </select>
            </div>

            {/* Privacy note */}
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 20,
              fontSize: "0.74rem",
              color: "#166534",
              lineHeight: 1.4,
            }}>
              <UserCheck size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                Your number is kept private &amp; confidential. It allows password recovery, NMC exam updates, and account verification.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !phoneNumber.trim()}
              style={{
                width: "100%",
                padding: "13px 20px",
                borderRadius: 14,
                border: "none",
                background: (!loading && phoneNumber.trim())
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : "#94a3b8",
                color: "#ffffff",
                fontSize: "0.95rem",
                fontWeight: 800,
                cursor: (!loading && phoneNumber.trim()) ? "pointer" : "not-allowed",
                boxShadow: (!loading && phoneNumber.trim())
                  ? "0 4px 15px rgba(16, 185, 129, 0.35)"
                  : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s ease",
              }}
            >
              {loading ? "Saving Profile..." : (
                <>
                  Save &amp; Continue to Dashboard <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
