import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import '../styles/toast.css';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);
    setTimeout(() => removeToast(id), duration);
    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="uhc-toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const ICONS = {
  success: <CheckCircle size={17} />,
  error:   <XCircle size={17} />,
  warning: <AlertTriangle size={17} />,
  info:    <Info size={17} />,
};

function ToastItem({ toast, onClose }) {
  return (
    <div className={`uhc-toast uhc-toast--${toast.type}${toast.exiting ? ' uhc-toast--exit' : ''}`} role="alert">
      <span className="uhc-toast__icon">{ICONS[toast.type] || ICONS.info}</span>
      <span className="uhc-toast__msg">{toast.message}</span>
      <button className="uhc-toast__close" onClick={onClose} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * useToast() — call this inside any component to show toasts.
 * Usage: const toast = useToast();
 *        toast('Saved!');
 *        toast('Error!', 'error');
 *        toast('Warning', 'warning');
 *        toast('Note', 'info');
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Safety fallback if used outside provider
    return (msg) => console.warn('[Toast]', msg);
  }
  return ctx;
}
