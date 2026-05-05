import { useState, useCallback } from "react";

/**
 * Shared toast hook — eliminates duplicated toast state across all admin pages.
 * Usage:
 *   const { toast, showToast } = useToast();
 *   showToast("Saved!"); // success by default
 *   showToast("Error occurred", "error");
 */
export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success", duration = 3000) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  const ToastEl = toast ? (
    <div style={{
      position: "fixed", top: 70, right: 24, zIndex: 9999,
      padding: "12px 20px", borderRadius: 12, fontWeight: 600, fontSize: ".875rem",
      background: toast.type === "error" ? "#ef4444"
        : toast.type === "warning" ? "#f59e0b"
        : "#22c55e",
      color: "white",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      animation: "toastIn .2s ease",
      display: "flex", alignItems: "center", gap: 8, maxWidth: 340,
    }}>
      <span>{toast.type === "error" ? "❌" : toast.type === "warning" ? "⚠️" : "✅"}</span>
      {toast.msg}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  ) : null;

  return { toast, showToast, ToastEl };
}
