import React, { useState, useEffect, useRef } from "react";
import { Bot, Send, X, Zap, Sparkles } from "lucide-react";
import api from "../api/api";
import "./AIAssistantWidget.css";

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      text: "Hello! I am your UHC AI Study Assistant. Ask me any question about your medical studies, courses, or health topics!"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(10);
  const [userPoints, setUserPoints] = useState(0);
  const [activeProvider, setActiveProvider] = useState("Multi-AI Failover Active");
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const messagesEndRef = useRef(null);

  // Fetch AI credits status
  const fetchCredits = async () => {
    try {
      const res = await api.get("ai/credits");
      if (res.data && res.data.success) {
        setCredits(res.data.credits);
        setUserPoints(res.data.points);
      }
    } catch (err) {
      // ignore unauth errors silently
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCredits();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    if (credits <= 0) {
      setShowBuyModal(true);
      return;
    }

    const userMsg = { id: Date.now(), sender: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await api.post("ai/question", { question: query });
      if (res.data && res.data.success) {
        const botResponse = res.data.data.response;
        if (res.data.provider) {
          setActiveProvider(res.data.provider);
        }
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, sender: "bot", text: botResponse }
        ]);
        if (res.data.remainingCredits !== undefined) {
          setCredits(res.data.remainingCredits);
        }
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        "Sorry, I couldn't process your request right now.";
      
      if (err.response?.data?.code === "CREDITS_EXHAUSTED") {
        setShowBuyModal(true);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, sender: "bot", text: `⚠️ ${errMsg}` }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBuyCredits = async () => {
    setPurchasing(true);
    setStatusMsg("");
    try {
      const res = await api.post("ai/buy-credits");
      if (res.data && res.data.success) {
        setCredits(res.data.credits);
        setUserPoints(res.data.points);
        setStatusMsg("🎉 +10 AI Credits added successfully!");
        setTimeout(() => {
          setShowBuyModal(false);
          setStatusMsg("");
        }, 1200);
      }
    } catch (err) {
      setStatusMsg(
        err.response?.data?.message || "Failed to purchase credits. Please earn more UHC points!"
      );
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="ai-widget-container">
      {/* Floating Toggle Button */}
      <button
        className="ai-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="UHC AI Study Assistant"
      >
        {isOpen ? <X size={26} /> : <Bot size={28} />}
        {credits > 0 ? (
          <span className="ai-badge">{credits}</span>
        ) : (
          <span className="ai-badge" style={{ background: "#f59e0b" }}>0</span>
        )}
      </button>

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="ai-chat-drawer">
          {/* Header */}
          <div className="ai-header">
            <div>
              <div className="ai-header-title">
                <Sparkles size={18} color="#a5b4fc" />
                <span>UHC AI Tutor</span>
              </div>
              <div className="ai-header-sub">⚡ Engine: {activeProvider}</div>
            </div>

            <div
              className="ai-credits-tag"
              onClick={() => setShowBuyModal(true)}
              title="Click to get more credits"
            >
              <Zap size={13} fill="#fbbf24" color="#fbbf24" />
              <span>{credits} Left</span>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-messages-list">
            {messages.map((m) => (
              <div key={m.id} className={`ai-msg ${m.sender}`}>
                {m.text}
              </div>
            ))}

            {loading && (
              <div className="ai-msg bot" style={{ fontStyle: "italic", opacity: 0.8 }}>
                AI is thinking... 💭
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="ai-quick-prompts">
            <button
              className="ai-prompt-chip"
              onClick={() => handleSend("Give me a quick 3-step study tip for medical exams.")}
            >
              💡 Study Tips
            </button>
            <button
              className="ai-prompt-chip"
              onClick={() => handleSend("Explain key principles of universal health coverage.")}
            >
              🏥 UHC Principles
            </button>
            <button
              className="ai-prompt-chip"
              onClick={() => handleSend("How can I remember tricky anatomy terms?")}
            >
              🧠 Anatomy Mnemonic
            </button>
          </div>

          {/* Input Area */}
          <form
            className="ai-input-area"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              placeholder={credits > 0 ? "Ask AI anything..." : "Credits exhausted. Buy more!"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="ai-send-btn"
              disabled={loading || !input.trim()}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Buy Credits Token Modal */}
      {showBuyModal && (
        <div className="ai-modal-overlay">
          <div className="ai-modal-card">
            <div className="ai-modal-icon">
              <Zap size={32} />
            </div>

            <div className="ai-modal-title">Get More AI Credits</div>
            <div className="ai-modal-desc">
              You have <strong>{credits} AI Credits</strong> remaining today.<br />
              Spend <strong>50 UHC Points</strong> to unlock <strong>+10 AI Credits</strong> instantly!
              <br /><br />
              Your Balance: <strong>{userPoints} Points</strong>
            </div>

            {statusMsg && (
              <div
                style={{
                  fontSize: "0.85rem",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  marginBottom: "14px",
                  background: statusMsg.includes("🎉") ? "#dcfce7" : "#fee2e2",
                  color: statusMsg.includes("🎉") ? "#15803d" : "#b91c1c"
                }}
              >
                {statusMsg}
              </div>
            )}

            <button
              className="ai-modal-btn"
              onClick={handleBuyCredits}
              disabled={purchasing || userPoints < 50}
            >
              {purchasing ? "Processing..." : userPoints < 50 ? "Insufficient Points (Need 50)" : "Redeem +10 Credits for 50 Points"}
            </button>

            <button
              className="ai-modal-cancel"
              onClick={() => setShowBuyModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
