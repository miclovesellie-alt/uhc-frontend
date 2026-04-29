import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import api from "../api/api";
import "../styles/review.css";

function ReviewPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { questions, userAnswers, score } = location.state || {};

  if (!questions) {
    return (
      <div className="review-wrapper">
        <div className="review-card">
          <p>No quiz data found.</p>
        </div>
      </div>
    );
  }

  const total = questions.length;

  let answered = 0;
  let correct = 0;

  const getCorrectIndex = (q) => {
    const value =
      q.answer ??
      q.correct ??
      q.correctAnswer ??
      q.correct_answer ??
      q.correctIndex;

    return parseInt(value, 10);
  };

  questions.forEach((q, index) => {
    const answer = userAnswers[index];
    const correctAnswerIndex = getCorrectIndex(q);

    if (answer !== null && answer !== undefined) {
      answered++;

      if (answer === correctAnswerIndex) {
        correct++;
      }
    }
  });

  const wrong = answered - correct;
  const notAnswered = total - answered;

  const percentAnswered = Math.round((answered / total) * 100);
  const percentNotAnswered = Math.round((notAnswered / total) * 100);
  const percentCorrect = Math.round((correct / total) * 100);
  const percentWrong = Math.round((wrong / total) * 100);

  const handleAnotherQuiz = () => {
    navigate("/quiz");
  };

  const handleReport = async (q) => {
    const reason = window.prompt(`Reporting Question: "${q.question}"\n\nWhy is this question faulty?`);
    if (reason === null) return;
    if (!reason.trim()) { alert("Please provide a reason."); return; }

    try {
      await api.post("questions/report", {
        questionId: q._id || q.id,
        questionText: q.question,
        reason: reason
      });
      alert("Report sent. Thank you!");
    } catch (err) { alert("Failed to send report."); }
  };

  const optionLetters = ["A", "B", "C", "D", "E", "F"];

  return (
    <div className="review-wrapper">
      <div style={{ position: 'fixed', top: 5, right: 5, fontSize: '10px', color: '#ff0000', zIndex: 9999, background: 'white', padding: '2px 4px', borderRadius: '4px', border: '1px solid red' }}>v3.1-DEFINITIVE-FIX</div>
      <style>{`
        .review-option {
          display: flex !important;
          height: auto !important;
          white-space: normal !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
          padding: 12px 16px !important;
          align-items: start !important;
          gap: 12px !important;
        }
      `}</style>
      <div className="review-card">
        <div className="review-scroll">

          <div className="review-score">
            Your Score: {score} / {total}
          </div>

          {/* Legend */}
          <div className="review-legend">

            <div className="legend-item">
              <span className="legend-box answered"></span>
              Answered
            </div>

            <div className="legend-item">
              <span className="legend-box not-answered"></span>
              Not Answered
            </div>

            <div className="legend-item">
              <span className="legend-box correct"></span>
              Correct
            </div>

            <div className="legend-item">
              <span className="legend-box wrong"></span>
              Wrong
            </div>

          </div>

          {/* Circular Statistics */}
          <div className="review-stats-circles">

            <div className="stat-circle-card">
              <div
                className="stat-circle answered-circle"
                style={{ "--percent": percentAnswered }}
              >
                <span>{percentAnswered}%</span>
              </div>
              <div className="circle-label">Answered</div>
            </div>

            <div className="stat-circle-card">
              <div
                className="stat-circle notanswered-circle"
                style={{ "--percent": percentNotAnswered }}
              >
                <span>{percentNotAnswered}%</span>
              </div>
              <div className="circle-label">Not Answered</div>
            </div>

            <div className="stat-circle-card">
              <div
                className="stat-circle correct-circle"
                style={{ "--percent": percentCorrect }}
              >
                <span>{percentCorrect}%</span>
              </div>
              <div className="circle-label">Correct</div>
            </div>

            <div className="stat-circle-card">
              <div
                className="stat-circle wrong-circle"
                style={{ "--percent": percentWrong }}
              >
                <span>{percentWrong}%</span>
              </div>
              <div className="circle-label">Wrong</div>
            </div>

          </div>

          {/* Questions Review Title */}
          <h2 className="questions-review-title">Questions Review</h2>

          {/* Question Review */}
          <div className="review-questions">

            {questions.map((q, index) => {

              const userAnswer = userAnswers[index];
              const correctAnswerIndex = getCorrectIndex(q);

              const isCorrect = userAnswer === correctAnswerIndex;

              return (
                <div key={index} className="review-question-card">

                  <div className="review-question" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ flex: 1 }}>{index + 1}. {q.question}</span>
                    <button 
                      onClick={() => handleReport(q)}
                      style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: 8, padding: '4px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                    >
                      <AlertTriangle size={12} /> Report
                    </button>
                  </div>

                  <div className="review-options">
                    {q.options.map((option, i) => {

                      let optionClass = "review-option";

                      if (i === correctAnswerIndex) {
                        optionClass += " correct-option";
                      }

                      if (i === userAnswer && i !== correctAnswerIndex) {
                        optionClass += " wrong-option";
                      }

                        <div 
                          key={i} 
                          className={optionClass}
                          style={{ 
                            display: 'block', 
                            height: 'auto', 
                            whiteSpace: 'normal', 
                            wordBreak: 'break-word',
                            padding: '12px 10px',
                            marginBottom: '6px',
                            lineHeight: '1.4'
                          }}
                        >
                          {optionLetters[i]}. {option}
                        </div>
                    })}
                  </div>

                  <div className="review-answers">

                    {userAnswer === null || userAnswer === undefined ? (
                      <div className="not-answered-text">
                        Your Answer: Not Answered
                      </div>
                    ) : (
                      <div
                        className={
                          isCorrect
                            ? "user-answer correct-text"
                            : "user-answer wrong-text"
                        }
                      >
                        Your Answer: {optionLetters[userAnswer]}. {q.options[userAnswer]}
                      </div>
                    )}

                    <div className="correct-answer-text">
                      Correct Answer: {optionLetters[correctAnswerIndex]}. {q.options[correctAnswerIndex]}
                    </div>

                  </div>

                </div>
              );
            })}

          </div>

          <button
            className="review-new-quiz-button"
            onClick={handleAnotherQuiz}
          >
            Take Another Quiz
          </button>

        </div>
      </div>
    </div>
  );
}

export default ReviewPage;