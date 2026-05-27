import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { Menu, X, ArrowRight } from "lucide-react";
import Library from "./Library";
import "../styles/landingpage.css";

export default function PublicLibrary() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [siteContact, setSiteContact] = useState({
    email: "boafokyei3@gmail.com",
    phone: "",
    whatsapp: "+233598173019",
    facebook: "",
    instagram: "",
    tiktok: "",
    twitter: "",
    youtube: ""
  });
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactStatus, setContactStatus] = useState(null);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    api.get("settings/contactInfo").then(r => {
      if (r.data?.value && typeof r.data.value === "object")
        setSiteContact(prev => ({ ...prev, ...r.data.value }));
    }).catch(() => {});
  }, []);

  const handleContact = async (e) => {
    e.preventDefault();
    try {
      await api.post("/contact", contactForm);
      setContactStatus("success");
      setContactForm({ name: "", email: "", message: "" });
      setTimeout(() => setContactStatus(null), 5000);
    } catch {
      setContactStatus("error");
    }
  };

  return (
    <div className="landing-container">
      {/* ════════════════ NAVBAR ════════════════ */}
      <nav className={`landing-navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="landing-logo" onClick={() => { navigate("/"); setMobileOpen(false); }}>
          <span className="logo-text wave-text">
            {"UHC".split("").map((c, i) => <span key={i} style={{ "--i": i }}>{c}</span>)}
          </span>
        </div>
        <div className={`landing-nav-links ${mobileOpen ? "active" : ""}`}>
          <span className="nav-link" onClick={() => { navigate("/"); setMobileOpen(false); }}>Quizzes</span>
          <span className="nav-link" onClick={() => { navigate("/library"); setMobileOpen(false); }}>Study Hub</span>
          <span className="nav-link" onClick={() => { navigate("/"); setMobileOpen(false); }}>Leaderboard</span>
        </div>
        <div className="landing-nav-right">
          <span className="landing-login desktop-only" onClick={() => navigate("/auth")}>Log In</span>
          <button className="landing-signup desktop-only" onClick={() => navigate("/auth")}>Get Started Free</button>
          <button className="mobile-menu-btn" onClick={() => setMobileOpen(o => !o)}>
            {mobileOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </nav>

      {/* ════════════════ STUDY HUB CONTENT ════════════════ */}
      <main style={{ padding: "100px 8% 60px", flex: 1, position: "relative", zIndex: 1 }}>
        <Library />
      </main>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-contact">
            <h3>Contact Us</h3>
            {siteContact.email && <p>Email: <strong>{siteContact.email}</strong></p>}
            {siteContact.phone && <p>Phone: <strong>{siteContact.phone}</strong></p>}
            {siteContact.whatsapp && (
              <p>WhatsApp:{" "}
                <a
                  href={`https://wa.me/${siteContact.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#10b981", fontWeight: 700 }}
                >
                  {siteContact.whatsapp}
                </a>
              </p>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              {siteContact.facebook && <a href={siteContact.facebook} target="_blank" rel="noreferrer" style={{ textDecoration: "none", fontSize: ".8rem", padding: "5px 12px", borderRadius: 99, background: "rgba(255,255,255,.1)", color: "white", fontWeight: 600 }}>Facebook</a>}
              {siteContact.instagram && <a href={siteContact.instagram} target="_blank" rel="noreferrer" style={{ textDecoration: "none", fontSize: ".8rem", padding: "5px 12px", borderRadius: 99, background: "rgba(255,255,255,.1)", color: "white", fontWeight: 600 }}>Instagram</a>}
              {siteContact.tiktok && <a href={siteContact.tiktok} target="_blank" rel="noreferrer" style={{ textDecoration: "none", fontSize: ".8rem", padding: "5px 12px", borderRadius: 99, background: "rgba(255,255,255,.1)", color: "white", fontWeight: 600 }}>TikTok</a>}
              {siteContact.twitter && <a href={siteContact.twitter} target="_blank" rel="noreferrer" style={{ textDecoration: "none", fontSize: ".8rem", padding: "5px 12px", borderRadius: 99, background: "rgba(255,255,255,.1)", color: "white", fontWeight: 600 }}>Twitter/X</a>}
              {siteContact.youtube && <a href={siteContact.youtube} target="_blank" rel="noreferrer" style={{ textDecoration: "none", fontSize: ".8rem", padding: "5px 12px", borderRadius: 99, background: "rgba(255,255,255,.1)", color: "white", fontWeight: 600 }}>YouTube</a>}
            </div>
            {contactStatus === "success" && <div style={{ color: "#10b981", fontSize: ".83rem", marginBottom: 10, fontWeight: 600 }}>✓ Message sent!</div>}
            {contactStatus === "error" && <div style={{ color: "#ef4444", fontSize: ".83rem", marginBottom: 10, fontWeight: 600 }}>✕ Failed. Please try again.</div>}
            <form className="footer-contact-form" onSubmit={handleContact}>
              <div className="input-group">
                <input type="text" placeholder="Full Name" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} required />
                <input type="email" placeholder="Email Address" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} required />
              </div>
              <textarea placeholder="How can we help?" value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} required />
              <button type="submit" className="contact-submit-btn"><span>Send Message</span><ArrowRight size={16} /></button>
            </form>
          </div>
          <div className="footer-links">
            <h4>Platform</h4>
            <ul>
              <li><a href="/auth">Quiz Library</a></li>
              <li><a href="/library">Study Hub</a></li>
              <li><a href="/auth">Leaderboard</a></li>
              <li><a href="/auth">My Analytics</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Community</h4>
            <ul>
              <li><a href="https://wa.me/233598173019" target="_blank" rel="noreferrer">WhatsApp Us</a></li>
              <li><a href="mailto:boafokyei3@gmail.com">Email Us</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Universal Health Community. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
