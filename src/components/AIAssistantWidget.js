import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bot, Send, X, Zap, Sparkles, Crown, RefreshCw, ChevronRight } from "lucide-react";
import api from "../api/api";
import "./AIAssistantWidget.css";

const PROVIDER_ICONS = {
  "Google Gemini": "🔵",
  "Groq (Llama 3.1)": "⚡",
  "Claude (Haiku)": "🟣",
  "UHC Core Engine (Offline)": "🔘"
};

const WELCOME_MSG = {
  id: "welcome",
  sender: "bot",
  text: "👋 Hi! I'm your **UHC AI Study Tutor**.\n\nAsk me anything about your medical studies, quiz topics, anatomy, pharmacology, or health concepts — I'll explain it clearly!"
};

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen]             = useState(false);
  const [messages, setMessages]         = useState([WELCOME_MSG]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [credits, setCredits]           = useState(10);
  const [userPoints, setUserPoints]     = useState(0);
  const [activeProvider, setActiveProvider] = useState(null);

  // Modals
  const [showBuyModal, setShowBuyModal]   = useState(false);
  const [showSubModal, setShowSubModal]   = useState(false); // all providers exhausted
  const [purchasing, setPurchasing]       = useState(false);
  const [purchaseMsg, setPurchaseMsg]     = useState("");

  // Failover toast
  const [toast, setToast]               = useState(null); // { text, type }
  const toastTimer                      = useRef(null);
  const messagesEndRef                  = useRef(null);
  const inputRef                        = useRef(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const showToast = useCallback((text, type = "info", duration = 5000) => {
    clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await api.get("ai/credits");
      if (res.data?.success) {
        setCredits(res.data.credits);
        setUserPoints(res.data.points);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchCredits(); }, [fetchCredits]);
  useEffect(() => { if (isOpen) { fetchCredits(); setTimeout(() => inputRef.current?.focus(), 150); } }, [isOpen, fetchCredits]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    if (credits <= 0) { setShowBuyModal(true); return; }

    setMessages(prev => [...prev, { id: Date.now(), sender: "user", text: query }]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await api.post("ai/question", { question: query });

      if (res.data?.allProvidersExhausted) {
        setShowSubModal(true);
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: "bot",
          text: "🚫 All AI engines have reached their daily limit. Upgrade to UHC Premium for unlimited access!"
        }]);
        return;
      }

      if (res.data?.success) {
        const botText    = res.data.data?.response || res.data.explanation || "No response.";
        const provider   = res.data.provider;
        const failoverMsg = res.data.failoverMessage;

        if (provider) setActiveProvider(provider);
        if (failoverMsg) showToast(failoverMsg, "failover");

        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: "bot",
          text: botText,
          provider
        }]);

        if (res.data.remainingCredits !== undefined) setCredits(res.data.remainingCredits);
      }
    } catch (err) {
      const code = err.response?.data?.code;
      const msg  = err.response?.data?.message || "Something went wrong. Please try again.";

      if (code === "CREDITS_EXHAUSTED") {
        setShowBuyModal(true);
      } else {
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: "bot", text: `⚠️ ${msg}` }]);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Buy credits with points ─────────────────────────────────────────────────
  const handleBuyCredits = async () => {
    setPurchasing(true);
    setPurchaseMsg("");
    try {
      const res = await api.post("ai/buy-credits");
      if (res.data?.success) {
        setCredits(res.data.credits);
        setUserPoints(res.data.points);
        setPurchaseMsg("success");
        setTimeout(() => { setShowBuyModal(false); setPurchaseMsg(""); }, 1400);
      }
    } catch (err) {
      setPurchaseMsg(err.response?.data?.message || "Not enough points.");
    } finally {
      setPurchasing(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="ai-widget-container">

      {/* ── Failover Toast ── */}
      {toast && (
        <div className={`ai-failover-toast ai-toast-${toast.type}`}>
          <span className="ai-toast-icon">{toast.type === "failover" ? "🔄" : "ℹ️"}</span>
          <span>{toast.text}</span>
          <button className="ai-toast-close" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {/* ── Floating Toggle Button ── */}
      <button
        className={`ai-toggle-btn ${credits <= 0 ? "depleted" : ""}`}
        onClick={() => setIsOpen(o => !o)}
        title="UHC AI Study Assistant"
      >
        {isOpen ? <X size={22} /> : <Bot size={24} />}
        <span className={`ai-badge ${credits <= 0 ? "zero" : credits <= 3 ? "low" : ""}`}>
          {credits}
        </span>
      </button>

      {/* ── Chat Drawer ── */}
      {isOpen && (
        <div className="ai-chat-drawer">

          {/* Header */}
          <div className="ai-header">
            <div className="ai-header-left">
              <div className="ai-header-title">
                <Sparkles size={16} color="#a5b4fc" />
                <span>UHC AI Tutor</span>
              </div>
              {activeProvider && (
                <div className="ai-provider-pill">
                  <span>{PROVIDER_ICONS[activeProvider] || "🤖"}</span>
                  <span>{activeProvider}</span>
                </div>
              )}
            </div>

            <div className="ai-header-right">
              <button
                className={`ai-credits-tag ${credits <= 3 ? "low" : ""}`}
                onClick={() => setShowBuyModal(true)}
                title="Buy more AI credits"
              >
                <Zap size={12} fill="#fbbf24" color="#fbbf24" />
                <span>{credits} Credits</span>
              </button>
              <button className="ai-close-btn" onClick={() => setIsOpen(false)}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-messages-list">
            {messages.map(m => (
              <div key={m.id} className={`ai-msg ${m.sender}`}>
                {m.sender === "bot" && m.provider && (
                  <div className="ai-msg-provider-tag">
                    {PROVIDER_ICONS[m.provider] || "🤖"} {m.provider}
                  </div>
                )}
                <div className="ai-msg-text">{m.text}</div>
              </div>
            ))}

            {loading && (
              <div className="ai-msg bot ai-thinking">
                <div className="ai-thinking-dots">
                  <span /><span /><span />
                </div>
                <span>Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 1 && (
            <div className="ai-quick-prompts">
              {[
                ["💡", "Study Tips",      "Give me 3 quick study tips for medical exams."],
                ["🏥", "UHC Concepts",   "Explain the key principles of Universal Health Coverage."],
                ["🧠", "Memory Tricks",  "How do I remember tricky anatomy terms?"],
                ["💊", "Pharmacology",   "Explain how beta blockers work in simple terms."]
              ].map(([icon, label, prompt]) => (
                <button key={label} className="ai-prompt-chip" onClick={() => handleSend(prompt)}>
                  {icon} {label}
                </button>
              ))}
            </div>
          )}

          {/* Credits Low Warning */}
          {credits > 0 && credits <= 3 && (
            <div className="ai-credit-warning">
              ⚡ Only <strong>{credits}</strong> credit{credits !== 1 ? "s" : ""} left today.{" "}
              <button onClick={() => setShowBuyModal(true)}>Top up</button>
            </div>
          )}

          {/* Input */}
          <form className="ai-input-area" onSubmit={e => { e.preventDefault(); handleSend(); }}>
            <input
              ref={inputRef}
              type="text"
              placeholder={credits <= 0 ? "Credits exhausted — buy more below" : "Ask anything about your studies..."}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading || credits <= 0}
            />
            <button type="submit" className="ai-send-btn" disabled={loading || !input.trim() || credits <= 0}>
              {loading ? <RefreshCw size={16} className="ai-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      )}

      {/* ── Buy Credits Modal ── */}
      {showBuyModal && (
        <div className="ai-modal-overlay" onClick={e => e.target === e.currentTarget && setShowBuyModal(false)}>
          <div className="ai-modal-card">
            <button className="ai-modal-x" onClick={() => setShowBuyModal(false)}><X size={18} /></button>
            <div className="ai-modal-icon zap"><Zap size={28} /></div>
            <h2 className="ai-modal-title">Top Up AI Credits</h2>
            <p className="ai-modal-desc">
              You have <strong>{credits} credits</strong> remaining today.<br />
              Spend <strong>50 UHC Points</strong> to unlock <strong>+10 AI Credits</strong> instantly.
            </p>
            <div className="ai-modal-balance">
              Your balance: <strong>{userPoints} Points</strong>
            </div>

            {purchaseMsg === "success" ? (
              <div className="ai-modal-status success">🎉 +10 Credits added! Keep studying!</div>
            ) : purchaseMsg ? (
              <div className="ai-modal-status error">⚠️ {purchaseMsg}</div>
            ) : null}

            <button
              className="ai-modal-btn"
              onClick={handleBuyCredits}
              disabled={purchasing || userPoints < 50}
            >
              {purchasing ? "Processing..." : userPoints < 50
                ? `Need ${50 - userPoints} more points`
                : "Redeem 50 Points → +10 Credits"}
            </button>

            <div className="ai-modal-divider">or</div>
            <button className="ai-modal-upgrade-btn" onClick={() => { setShowBuyModal(false); setShowSubModal(true); }}>
              <Crown size={15} /> Upgrade to Premium
            </button>
          </div>
        </div>
      )}

      {/* ── All Providers Exhausted / Subscription Wall ── */}
      {showSubModal && (
        <div className="ai-modal-overlay" onClick={e => e.target === e.currentTarget && setShowSubModal(false)}>
          <div className="ai-modal-card premium">
            <button className="ai-modal-x" onClick={() => setShowSubModal(false)}><X size={18} /></button>
            <div className="ai-modal-icon crown"><Crown size={30} /></div>
            <h2 className="ai-modal-title">All AI Engines Exhausted</h2>
            <p className="ai-modal-desc">
              You've used up today's free quota across <strong>Google Gemini</strong>, <strong>Groq (Llama 3.1)</strong>, and <strong>Claude AI</strong>.<br /><br />
              Upgrade to <strong>UHC Premium</strong> for unlimited daily access across all AI engines!
            </p>

            <div className="ai-sub-perks">
              {[
                "♾️ Unlimited AI study sessions daily",
                "⚡ Priority access across all 3 AI engines",
                "📚 AI-generated personalised quizzes",
                "🧠 Full quiz explanations on every question",
                "🏆 Early access to new UHC features"
              ].map(p => (
                <div key={p} className="ai-perk-item">
                  <ChevronRight size={14} /> {p}
                </div>
              ))}
            </div>

            <button className="ai-modal-btn premium-btn">
              <Crown size={15} /> Upgrade to Premium — Coming Soon
            </button>
            <p className="ai-sub-note">Free quota resets every 24 hours. Come back tomorrow for more free credits!</p>
          </div>
        </div>
      )}

    </div>
  );
}
