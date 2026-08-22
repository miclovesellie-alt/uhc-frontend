import React, { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, UserCheck, ArrowRight, Globe, BookOpen, AlertTriangle, CheckCircle2 } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { UserContext } from "../context/UserContext";
import api from "../api/api";
import { useToast } from "./Toast";

export const COUNTRY_CODES = [
  { code: "+233", label: "Ghana (+233)", flag: "🇬🇭", country: "Ghana", digits: 9 },
  { code: "+234", label: "Nigeria (+234)", flag: "🇳🇬", country: "Nigeria", digits: 10 },
  { code: "+1",   label: "USA / Canada (+1)", flag: "🇺🇸", country: "United States", digits: 10 },
  { code: "+44",  label: "United Kingdom (+44)", flag: "🇬🇧", country: "United Kingdom", digits: 10 },
  { code: "+254", label: "Kenya (+254)", flag: "🇰🇪", country: "Kenya", digits: 9 },
  { code: "+231", label: "Liberia (+231)", flag: "🇱🇷", country: "Liberia", digits: 8 },
  { code: "+232", label: "Sierra Leone (+232)", flag: "🇸🇱", country: "Sierra Leone", digits: 8 },
  { code: "+27",  label: "South Africa (+27)", flag: "🇿🇦", country: "South Africa", digits: 9 },
  { code: "+260", label: "Zambia (+260)", flag: "🇿🇲", country: "Zambia", digits: 9 },
  { code: "+256", label: "Uganda (+256)", flag: "🇺🇬", country: "Uganda", digits: 9 },
  { code: "+265", label: "Malawi (+265)", flag: "🇲🇼", country: "Malawi", digits: 9 },
  { code: "+91",  label: "India (+91)", flag: "🇮🇳", country: "India", digits: 10 },
];

export const COUNTRY_CODE_MAP = {
  "+233": "Ghana",
  "+234": "Nigeria",
  "+1": "United States",
  "+44": "United Kingdom",
  "+254": "Kenya",
  "+231": "Liberia",
  "+232": "Sierra Leone",
  "+27": "South Africa",
  "+260": "Zambia",
  "+256": "Uganda",
  "+265": "Malawi",
  "+91": "India",
};

export const COUNTRY_TO_CODE_MAP = {
  "Ghana": "+233",
  "Nigeria": "+234",
  "United States": "+1",
  "Canada": "+1",
  "United Kingdom": "+44",
  "Kenya": "+254",
  "Liberia": "+231",
  "Sierra Leone": "+232",
  "South Africa": "+27",
  "Uganda": "+256",
  "Zambia": "+260",
  "Malawi": "+265",
  "India": "+91",
};

export const CATEGORIES = [
  "Nursing Student (General/BSc)",
  "Midwifery Student",
  "Public Health Nursing",
  "Community Health Nursing",
  "NMC Licensure Candidate",
  "Health Worker / Practitioner",
  "Nurse Educator / Tutor",
  "Other Medical / Healthcare",
];

export const COUNTRIES = [
  "Ghana", "Nigeria", "United States", "United Kingdom", "Kenya",
  "Liberia", "Sierra Leone", "South Africa", "Uganda", "Zambia",
  "Malawi", "India", "Canada", "Other"
];

/**
 * Checks if a stored user phone number is invalid or improperly formatted.
 */
export function isPhoneInvalid(phone) {
  if (!phone || typeof phone !== "string") return true;
  const p = phone.trim();
  if (!p || p === "null" || p === "undefined" || p === "+233" || p === "+234" || p === "+1") return true;

  // Ghana specific check:
  if (p.startsWith("+233")) {
    const after = p.slice(4).replace(/\D/g, "");
    if (after.startsWith("0")) return true; // Cannot begin with 0
    if (after.length !== 9) return true;    // Must be exactly 9 digits
    return false;
  }

  // Local Ghana without country code (e.g. 0598173019 or 598173019)
  if (/^0\d{9}$/.test(p) || /^\d{9}$/.test(p)) {
    return true; // Needs proper +233 prefix and 9 digits
  }

  // Generic international check (digits only)
  const digits = p.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return true;

  return false;
}

export default function CompleteProfileModal() {
  const { user, updateUser } = useContext(UserContext);
  const toast = useToast();

  const token = localStorage.getItem("token");
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  })();

  const activeUser = user || storedUser;

  // Compute initial prefix and number from existing user data if any
  const getInitialPhoneState = () => {
    const raw = activeUser?.phone ? String(activeUser.phone).trim() : "";
    let prefix = "+233";
    let num = "";

    if (raw.startsWith("+233")) {
      prefix = "+233";
      num = raw.slice(4).replace(/\D/g, "");
      if (num.startsWith("0")) num = num.slice(1);
    } else if (raw.startsWith("+234")) {
      prefix = "+234";
      num = raw.slice(4).replace(/\D/g, "");
      if (num.startsWith("0")) num = num.slice(1);
    } else if (raw.startsWith("+1")) {
      prefix = "+1";
      num = raw.slice(2).replace(/\D/g, "");
    } else if (raw.startsWith("+44")) {
      prefix = "+44";
      num = raw.slice(3).replace(/\D/g, "");
      if (num.startsWith("0")) num = num.slice(1);
    } else if (raw.startsWith("0") && raw.length === 10) {
      // Local Ghana 0598173019
      prefix = "+233";
      num = raw.slice(1);
    } else if (/^\d{9}$/.test(raw)) {
      // 9 digits without prefix
      prefix = "+233";
      num = raw;
    } else if (raw) {
      num = raw.replace(/\D/g, "");
    }

    // Limit Ghana to 9 digits
    if (prefix === "+233" && num.length > 9) {
      num = num.slice(0, 9);
    }

    return { prefix, num };
  };

  const initial = getInitialPhoneState();
  const [phonePrefix, setPhonePrefix] = useState(initial.prefix);
  const [phoneNumber, setPhoneNumber] = useState(initial.num);
  const [category, setCategory] = useState(activeUser?.category || "Nursing Student (General/BSc)");
  const [country, setCountry] = useState(activeUser?.country || COUNTRY_CODE_MAP[initial.prefix] || "Ghana");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-sync country when prefix changes
  const handlePrefixChange = (newPrefix) => {
    setPhonePrefix(newPrefix);
    if (COUNTRY_CODE_MAP[newPrefix]) {
      setCountry(COUNTRY_CODE_MAP[newPrefix]);
    }
    // If switching to +233, strip leading zero and truncate to 9 digits
    if (newPrefix === "+233") {
      let clean = phoneNumber.replace(/\D/g, "");
      if (clean.startsWith("0")) clean = clean.slice(1);
      if (clean.length > 9) clean = clean.slice(0, 9);
      setPhoneNumber(clean);
    }
  };

  // Auto-sync prefix when country changes
  const handleCountryChange = (newCountry) => {
    setCountry(newCountry);
    if (COUNTRY_TO_CODE_MAP[newCountry]) {
      const newPrefix = COUNTRY_TO_CODE_MAP[newCountry];
      setPhonePrefix(newPrefix);
      if (newPrefix === "+233") {
        let clean = phoneNumber.replace(/\D/g, "");
        if (clean.startsWith("0")) clean = clean.slice(1);
        if (clean.length > 9) clean = clean.slice(0, 9);
        setPhoneNumber(clean);
      }
    }
  };

  // Handle phone input formatting
  const handlePhoneInputChange = (e) => {
    let val = e.target.value;
    let clean = val.replace(/\D/g, "");

    // For Ghana (+233), automatically strip leading zero and cap at 9 digits
    if (phonePrefix === "+233") {
      if (clean.startsWith("0")) {
        clean = clean.slice(1);
      }
      if (clean.length > 9) {
        clean = clean.slice(0, 9);
      }
    }

    setPhoneNumber(clean);
    setError("");
  };

  // Only show if user is logged in (has token or user) AND phone is invalid / missing / wrong format
  const needsPhone = Boolean(
    token &&
    activeUser &&
    isPhoneInvalid(activeUser.phone)
  );

  if (!needsPhone) return null;

  const isGhana = phonePrefix === "+233";
  const cleanNum = phoneNumber.trim().replace(/\D/g, "");
  const isGhanaValid = isGhana && cleanNum.length === 9 && !cleanNum.startsWith("0");
  const isGenericValid = !isGhana && cleanNum.length >= 7 && cleanNum.length <= 15;
  const isFormValid = isGhana ? isGhanaValid : isGenericValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!cleanNum) {
      setError("Please enter your mobile / WhatsApp telephone number.");
      return;
    }

    if (isGhana) {
      if (cleanNum.startsWith("0")) {
        setError("For Ghana (+233), the number cannot begin with 0. Please enter the 9 digits (e.g. 598173019).");
        return;
      }
      if (cleanNum.length !== 9) {
        setError(`Ghana (+233) numbers must be exactly 9 digits long. You currently have ${cleanNum.length} digit${cleanNum.length === 1 ? '' : 's'}.`);
        return;
      }
    } else if (cleanNum.length < 7 || cleanNum.length > 15) {
      setError("Please enter a valid phone number (7 to 15 digits).");
      return;
    }

    const fullPhone = `${phonePrefix}${cleanNum}`;
    setLoading(true);

    try {
      const res = await api.put("user", {
        name: activeUser?.name,
        phone: fullPhone,
        category: category || activeUser?.category || "Nursing Student (General/BSc)",
        country: country || activeUser?.country || "Ghana",
      });

      if (updateUser) {
        updateUser(res.data);
      } else {
        localStorage.setItem("user", JSON.stringify(res.data));
        window.location.reload();
      }
      toast("🎉 Phone format updated successfully! Welcome to UHC Academy.", "success");
    } catch (err) {
      console.error("Profile complete error:", err);
      setError(err.response?.data?.message || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isCorrection = Boolean(activeUser?.phone && activeUser.phone.trim() !== "");

  return (
    <AnimatePresence>
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
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
            background: isCorrection
              ? "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)"
              : "linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)",
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
              {isCorrection ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />}
              {isCorrection ? "Action Required · Fix Phone Format" : "Final Step · Account Setup"}
            </div>
            <h2 style={{ margin: "0 0 6px", fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              {isCorrection ? "Update Your Phone Number Format" : "Finish Setting Up Your Profile"}
            </h2>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "rgba(255, 255, 255, 0.95)", lineHeight: 1.5 }}>
              Hello <strong>{activeUser?.name || "there"}</strong>!{" "}
              {isCorrection
                ? "Your phone number format needs a quick update. For Ghana (+233), please enter your 9-digit number without the leading 0."
                : "Please enter your WhatsApp / mobile telephone number to continue using UHC Academy."}
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

            {/* Country of Residence */}
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
                <Globe size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                Country of Residence <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={country}
                onChange={e => handleCountryChange(e.target.value)}
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

            {/* Mobile Number Field */}
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
                Mobile / WhatsApp Number <span style={{ color: "#ef4444" }}>*</span>
              </label>
              
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={phonePrefix}
                  onChange={e => handlePrefixChange(e.target.value)}
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
                    placeholder={isGhana ? "e.g. 598173019 (9 digits)" : "e.g. 8012345678"}
                    value={phoneNumber}
                    onChange={handlePhoneInputChange}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 14px 11px 38px",
                      borderRadius: 12,
                      border: `1.5px solid ${isFormValid ? "#10b981" : error ? "#ef4444" : "#cbd5e1"}`,
                      fontSize: "0.92rem",
                      fontWeight: 600,
                      color: "#0f172a",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
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

              {/* Real-time Ghana Validation Helper */}
              <div style={{ marginTop: 6, fontSize: "0.75rem" }}>
                {isGhana ? (
                  isGhanaValid ? (
                    <span style={{ color: "#16a34a", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={13} /> Valid Ghana number: +233 {cleanNum.slice(0, 2)} {cleanNum.slice(2, 5)} {cleanNum.slice(5)}
                    </span>
                  ) : (
                    <span style={{ color: "#64748b", fontWeight: 500 }}>
                      🇬🇭 For Ghana (+233), enter <strong>9 digits</strong> without leading 0.{" "}
                      {cleanNum.length > 0 && (
                        <strong style={{ color: "#d97706" }}>({cleanNum.length}/9 digits entered)</strong>
                      )}
                    </span>
                  )
                ) : (
                  <span style={{ color: "#64748b" }}>
                    Enter mobile number without leading zero.
                  </span>
                )}
              </div>
            </div>

            {/* Study Category */}
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
                Your number is kept private &amp; confidential for account security, NMC updates, and WhatsApp support.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              style={{
                width: "100%",
                padding: "13px 20px",
                borderRadius: 14,
                border: "none",
                background: (!loading && isFormValid)
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : "#94a3b8",
                color: "#ffffff",
                fontSize: "0.95rem",
                fontWeight: 800,
                cursor: (!loading && isFormValid) ? "pointer" : "not-allowed",
                boxShadow: (!loading && isFormValid)
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
                  Confirm &amp; Continue to Dashboard <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
