import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Plus, Send, Upload, Flag, BookOpen, X } from "lucide-react";

const DOCK_ACTIONS = [
  { id: "add-q",      label: "Add Question",       icon: <Plus size={16}/>,    color: "#4255ff", bg: "rgba(66,85,255,0.12)",   path: "/admin/questions" },
  { id: "broadcast",  label: "Send Broadcast",      icon: <Send size={16}/>,    color: "#10b981", bg: "rgba(16,185,129,0.12)",  path: "/admin/notifications" },
  { id: "upload",     label: "Bulk Upload",         icon: <Upload size={16}/>,  color: "#d97706", bg: "rgba(217,119,6,0.12)",   path: "/admin/uploads" },
  { id: "reported",   label: "Reported Questions",  icon: <Flag size={16}/>,    color: "#ef4444", bg: "rgba(239,68,68,0.12)",   path: "/admin/questions?filter=reported" },
  { id: "library",    label: "Upload Book",         icon: <BookOpen size={16}/>,color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  path: "/admin/userlibrary" },
];

export default function AdminQuickDock() {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(null);
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        .quick-dock {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 800;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
        }
        .quick-dock-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          overflow: hidden;
          max-height: 0;
          opacity: 0;
          pointer-events: none;
          transition: max-height .35s cubic-bezier(.4,0,.2,1), opacity .25s ease;
        }
        .quick-dock-actions.open {
          max-height: 400px;
          opacity: 1;
          pointer-events: auto;
        }
        .dock-action-row {
          display: flex;
          align-items: center;
          gap: 8px;
          transform: translateX(24px);
          opacity: 0;
          transition: transform .3s cubic-bezier(.34,1.56,.64,1), opacity .25s ease;
        }
        .quick-dock-actions.open .dock-action-row {
          transform: translateX(0);
          opacity: 1;
        }
        .dock-action-label {
          background: rgba(15,23,42,0.88);
          color: white;
          font-size: .75rem;
          font-weight: 600;
          padding: 5px 11px;
          border-radius: 99px;
          white-space: nowrap;
          backdrop-filter: blur(6px);
          pointer-events: none;
          transition: opacity .15s;
        }
        .dock-action-btn {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.14);
          transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease;
        }
        .dock-action-btn:hover {
          transform: scale(1.15);
          box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        }
        .dock-trigger {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #4255ff 0%, #8b5cf6 100%);
          box-shadow: 0 6px 24px rgba(66,85,255,0.4);
          color: white;
          transition: transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease;
          position: relative;
          overflow: hidden;
        }
        .dock-trigger::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
        }
        .dock-trigger:hover {
          transform: scale(1.08);
          box-shadow: 0 10px 32px rgba(66,85,255,0.5);
        }
        .dock-trigger .dock-icon {
          transition: transform .3s cubic-bezier(.34,1.56,.64,1), opacity .2s;
        }
        .dock-trigger .dock-icon.rotated {
          transform: rotate(135deg);
        }
        @keyframes dockPulse {
          0%, 100% { box-shadow: 0 6px 24px rgba(66,85,255,0.4); }
          50%       { box-shadow: 0 6px 32px rgba(66,85,255,0.7); }
        }
        .dock-trigger.idle { animation: dockPulse 3s ease infinite; }
        @media (max-width: 480px) {
          .quick-dock { bottom: 16px; right: 16px; }
          .dock-trigger { width: 46px; height: 46px; border-radius: 14px; }
          .dock-action-btn { width: 38px; height: 38px; border-radius: 12px; }
        }
      `}</style>

      <div className="quick-dock">
        {/* Action items */}
        <div className={`quick-dock-actions${expanded ? " open" : ""}`}>
          {DOCK_ACTIONS.map((action, i) => (
            <div
              key={action.id}
              className="dock-action-row"
              style={{ transitionDelay: expanded ? `${i * 0.04}s` : `${(DOCK_ACTIONS.length - i) * 0.03}s` }}
              onMouseEnter={() => setHovered(action.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {hovered === action.id && (
                <div className="dock-action-label">{action.label}</div>
              )}
              <button
                className="dock-action-btn"
                style={{ background: action.bg, color: action.color }}
                title={action.label}
                onClick={() => { navigate(action.path); setExpanded(false); }}
              >
                {action.icon}
              </button>
            </div>
          ))}
        </div>

        {/* Trigger button */}
        <button
          className={`dock-trigger${!expanded ? " idle" : ""}`}
          onClick={() => setExpanded(v => !v)}
          title={expanded ? "Close quick actions" : "Quick actions (⚡)"}
        >
          {expanded
            ? <X size={22} className="dock-icon rotated"/>
            : <Zap size={22} className="dock-icon"/>
          }
        </button>
      </div>
    </>
  );
}
