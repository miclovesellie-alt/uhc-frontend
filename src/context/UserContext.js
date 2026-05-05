import React, { createContext, useState, useEffect } from "react";
import api from "../api/api";
import { io } from "socket.io-client";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  // Load user from localStorage for fast initial render
  const [user, setUserState] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
  });

  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  // adminTheme: seed from saved user object for instant render, DB is source of truth
  const [adminTheme, setAdminThemeState] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user"))?.adminTheme || "light"; } catch { return "light"; }
  });

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // User-side theme: applies to document.body
  useEffect(() => {
    document.body.className = theme === "dark" ? "dark-theme" : "";
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }

    api.get("user")
      .then((res) => {
        setUserState(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
        // Sync adminTheme from DB on load
        if (res.data.adminTheme) setAdminThemeState(res.data.adminTheme);
      })
      .catch((err) => {
        console.error("Failed to fetch user:", err.response || err);
        if (err.response?.status === 401) {
          setUserState(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      })
      .finally(() => setLoading(false));

    api.get("user/notifications")
      .then(res => {
        setNotifications(res.data);
        setUnreadCount(res.data.filter(n => !n.read).length);
      })
      .catch(() => {});
  }, []);

  const updateUser = (updatedUser) => {
    setUserState(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
    if (updatedUser?.adminTheme) setAdminThemeState(updatedUser.adminTheme);
  };

  // Persist adminTheme to DB when the admin toggles it
  const setAdminTheme = async (newTheme) => {
    setAdminThemeState(newTheme);
    try {
      await api.put("auth/admin-profile", { adminTheme: newTheme });
      // Mirror into cached user object
      const saved = localStorage.getItem("user");
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.adminTheme = newTheme;
        localStorage.setItem("user", JSON.stringify(parsed));
      }
    } catch (err) {
      console.error("Failed to save adminTheme:", err);
    }
  };

  useEffect(() => {
    if (!user || !user._id) return;
    const socketUrl = window.location.hostname === "localhost"
      ? "http://localhost:5000"
      : "https://uhc-backend.onrender.com";
    const socket = io(socketUrl);

    socket.on("connect", () => socket.emit("register_presence", user._id));

    socket.on("USER_NOTIFICATION", (notif) => {
      if (notif.broadcast || notif.recipientId === user._id) {
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const logout = () => {
    setUserState(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setNotifications([]);
    setUnreadCount(0);
  };

  const markNotificationsRead = async () => {
    try {
      await api.put("user/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark notifications read", err);
    }
  };

  return (
    <UserContext.Provider value={{
      user, setUser: updateUser, loading, logout,
      theme, setTheme,
      adminTheme, setAdminTheme,
      notifications, unreadCount, markNotificationsRead
    }}>
      {children}
    </UserContext.Provider>
  );
};
