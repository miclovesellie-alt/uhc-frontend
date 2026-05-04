import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f2f8 0%, #e8eaf6 100%)',
      fontFamily: "'Inter', sans-serif",
      padding: '24px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background blobs */}
      <div style={{
        position: 'absolute', top: -100, left: -100,
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(66,85,255,0.12) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: -100, right: -100,
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none'
      }} />

      {/* Animated UHC logo */}
      <div style={{ fontSize: '4rem', fontWeight: 900, letterSpacing: '-2px', marginBottom: 8, lineHeight: 1 }}>
        <span style={{ color: '#4255ff', display: 'inline-block', animation: 'bounce404 1.2s ease infinite' }}>U</span>
        <span style={{ color: '#8b5cf6', display: 'inline-block', animation: 'bounce404 1.2s ease 0.15s infinite' }}>H</span>
        <span style={{ color: '#ec4899', display: 'inline-block', animation: 'bounce404 1.2s ease 0.3s infinite' }}>C</span>
      </div>

      {/* Giant 404 */}
      <div style={{
        fontSize: 'clamp(6rem, 20vw, 10rem)',
        fontWeight: 900,
        lineHeight: 1,
        background: 'linear-gradient(135deg, #4255ff, #8b5cf6, #ec4899)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: 8,
        userSelect: 'none',
      }}>
        404
      </div>

      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#282e3e', marginBottom: 12 }}>
        Page Not Found
      </div>
      <p style={{
        fontSize: '1rem', color: '#586380', lineHeight: 1.6,
        maxWidth: 400, marginBottom: 36
      }}>
        The page you're looking for doesn't exist or has been moved. Let's get you back on track.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '12px 28px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #4255ff, #8b5cf6)',
            color: 'white', fontWeight: 700, fontSize: '0.95rem',
            cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: '0 4px 16px rgba(66,85,255,0.3)',
            fontFamily: "'Inter', sans-serif",
          }}
          onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 24px rgba(66,85,255,0.4)'; }}
          onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 16px rgba(66,85,255,0.3)'; }}
        >
          🏠 Go to Dashboard
        </button>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '12px 28px', borderRadius: 12,
            border: '2px solid #edeff4', background: 'white',
            color: '#282e3e', fontWeight: 700, fontSize: '0.95rem',
            cursor: 'pointer', transition: 'all 0.2s',
            fontFamily: "'Inter', sans-serif",
          }}
          onMouseEnter={e => { e.target.style.background = '#f0f2f8'; }}
          onMouseLeave={e => { e.target.style.background = 'white'; }}
        >
          ← Go Back
        </button>
      </div>

      <style>{`
        @keyframes bounce404 {
          0%, 100% { transform: translateY(0); }
          40%       { transform: translateY(-12px); }
          60%       { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
