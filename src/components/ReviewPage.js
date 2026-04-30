import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Check, X, Trophy } from "lucide-react";
import api from "../api/api";
import "../styles/review.css";

export default function ReviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If no state (accessed directly), go home
    if (!location.state) {
      navigate("/");
      return;
    }

    const { questions: qs, userAnswers: ua, timeLeft: tl } = location.state;
    setQuestions(qs || []);
    setUserAnswers(ua || []);
    setTimeLeft(tl || 0);
    setLoading(false);
    
    // Scroll to top on load
    window.scrollTo(0, 0);
  }, [location.state, navigate]);

  const getCorrectIndex = (q) => {
    if (!q || !q.options) return -1;
    return q.options.findIndex(opt => opt === q.answer);
  };

  const handleReport = async (q) => {
    const reason = window.prompt("Reason for reporting this question?");
    if (!reason) return;

    try {
      await api.post("reports", {
        questionId: q._id,
        reason: reason,
        questionText: q.question
      });
      alert("Report submitted successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to submit report.");
    }
  };

  if (loading) return null;

  const score = questions.reduce((acc, q, qIdx) => {
    return q.answer === userAnswers[qIdx] ? acc + 1 : acc;
  }, 0);

  const accuracy = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const timeSpent = 45 * questions.length - timeLeft; // Assuming 45s per question
  const formattedTime = `${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s`;

  return (
    <div className="review-page-container">
      <div className="review-max-width">
        
        {/* Header Summary */}
        <header className="review-header">
          <div style={{ marginBottom: 20, display: 'inline-flex', background: 'rgba(74, 222, 128, 0.1)', padding: '12px', borderRadius: '50%' }}>
            <Trophy size={40} color="#4ade80" />
          </div>
          <h1>Quiz Results</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Review your performance and master the concepts</p>

          <div className="score-display">
            <div className="stat-box">
              <span className="stat-value">{score}/{questions.length}</span>
              <span className="stat-label">Final Score</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{accuracy}%</span>
              <span className="stat-label">Accuracy</span>
            </div>
            <div className="stat-box">
              <span className="stat-value">{formattedTime}</span>
              <span className="stat-label">Time Spent</span>
            </div>
          </div>
        </header>

        {/* Question List */}
        <div className="review-list">
          {questions.map((q, qIdx) => {
            const correctIdx = getCorrectIndex(q);
            const userIdx = userAnswers[qIdx];
            const isCorrect = userIdx === correctIdx;

            return (
              <div key={qIdx} className="review-q-card">
                <div className="review-q-header">
                  <div style={{ display: 'flex', gap: 15, flex: 1 }}>
                    <span className="q-number">Q{qIdx + 1}</span>
                    <span className="review-q-text">{q.question}</span>
                  </div>
                  <button className="report-btn" onClick={() => handleReport(q)}>
                    <AlertTriangle size={14} /> Report
                  </button>
                </div>

                <div className="review-opts-grid">
                  {q.options.map((opt, oIdx) => {
                    const isSelected = userIdx === oIdx;
                    const isCorrectOpt = correctIdx === oIdx;
                    
                    let statusClass = "";
                    if (isCorrectOpt) statusClass = "is-correct";
                    else if (isSelected && !isCorrect) statusClass = "selected-wrong";

                    return (
                      <div key={oIdx} className={`review-opt-item ${statusClass}`}>
                        <div className="opt-indicator">
                          {isCorrectOpt && <Check size={12} />}
                          {isSelected && !isCorrect && <X size={12} />}
                        </div>
                        <div className="opt-content">{opt}</div>
                      </div>
                    );
                  })}
                </div>

                {!isCorrect && (
                  <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '10px', borderLeft: '4px solid #10b981', fontSize: '0.9rem' }}>
                    <strong style={{ color: '#10b981', display: 'block', marginBottom: 4 }}>Correct Explanation:</strong>
                    <p style={{ margin: 0, color: '#94a3b8' }}>The correct answer is {q.answer}. Review the core principles of this nursing category to improve.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="review-actions">
          <button className="action-btn primary-btn" onClick={() => navigate("/quiz")}>
            Take Quiz
          </button>
        </div>

      </div>
    </div>
  );
}