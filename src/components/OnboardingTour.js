import React, { useState } from 'react';

const STEPS = [
  {
    icon: '👋',
    title: 'Welcome to UHC!',
    desc: 'Your all-in-one health education platform. Let us give you a quick tour of the key features.',
    highlight: null,
  },
  {
    icon: '🏠',
    title: 'Your Home Feed',
    desc: 'This is the Health Feed — read the latest medical updates, like posts, and engage with your community.',
    highlight: null,
  },
  {
    icon: '📚',
    title: 'Study Hub',
    desc: 'Access flashcards, quick notes, and curated resources organised by course. Flip cards to test yourself!',
    highlight: null,
  },
  {
    icon: '🎯',
    title: 'Quiz Arena',
    desc: 'Test your knowledge with timed quizzes. Choose a course, pick a question count, and compete for the top leaderboard spot.',
    highlight: null,
  },
  {
    icon: '🔥',
    title: 'Streaks & Points',
    desc: 'Log in daily to keep your streak alive and earn points for every quiz, comment, and reaction. Climb the leaderboard!',
    highlight: null,
  },
  {
    icon: '🚀',
    title: "You're all set!",
    desc: "That's the tour! Explore the platform, study hard, and enjoy the journey. Good luck! 🎉",
    highlight: null,
  },
];

export default function OnboardingTour({ onComplete }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  const finish = () => {
    localStorage.setItem('uhc_tour_done', '1');
    setVisible(false);
    if (onComplete) onComplete();
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else finish();
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99998,
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        background: 'white',
        borderRadius: 24,
        padding: '36px 32px',
        maxWidth: 440,
        width: '100%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
        position: 'relative',
        textAlign: 'center',
        animation: 'tourIn 0.35s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 28 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i === step ? '#4255ff' : '#edeff4',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {/* Icon */}
        <div style={{
          fontSize: '3.5rem', marginBottom: 16, lineHeight: 1,
          animation: 'tourBounce 0.5s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {current.icon}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '1.5rem', fontWeight: 800, color: '#282e3e',
          margin: '0 0 12px',
        }}>
          {current.title}
        </h2>

        {/* Desc */}
        <p style={{
          fontSize: '0.95rem', color: '#586380', lineHeight: 1.65,
          margin: '0 0 32px',
        }}>
          {current.desc}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={finish}
            style={{
              padding: '10px 20px', borderRadius: 10,
              border: '1.5px solid #edeff4', background: 'white',
              color: '#586380', fontWeight: 600, fontSize: '0.88rem',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Skip Tour
          </button>
          <button
            onClick={next}
            style={{
              padding: '10px 28px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #4255ff, #8b5cf6)',
              color: 'white', fontWeight: 700, fontSize: '0.88rem',
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 12px rgba(66,85,255,0.35)',
            }}
          >
            {isLast ? "Let's Go! 🚀" : 'Next →'}
          </button>
        </div>

        {/* Step counter */}
        <div style={{ marginTop: 20, fontSize: '0.75rem', color: '#939bb4' }}>
          Step {step + 1} of {STEPS.length}
        </div>
      </div>

      <style>{`
        @keyframes tourIn {
          from { opacity: 0; transform: scale(0.92) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes tourBounce {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
