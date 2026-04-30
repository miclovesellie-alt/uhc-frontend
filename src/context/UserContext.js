import React, { createContext, useState, useEffect } from "react";
import api from "../api/api";
import { io } from "socket.io-client";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  // ✅ Load user from localStorage for persistence
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [adminTheme, setAdminTheme] = useState(localStorage.getItem("adminTheme") || "light");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // User-side theme: applies to document.body for user dashboard pages
  useEffect(() => {
    document.body.className = theme === "dark" ? "dark-theme" : "";
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Admin-side theme: stored separately, consumed only by AdminLayout component
  useEffect(() => {
    localStorage.setItem("adminTheme", adminTheme);
  }, [adminTheme]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    // ✅ Validate token in background without immediately logging out
    api
      .get("user")
      .then((res) => {
        setUser(res.data); // update with fresh data
        localStorage.setItem("user", JSON.stringify(res.data));
      })
      .catch((err) => {
        console.error("Failed to fetch user:", err.response || err);
        // Optional: only remove token if it's truly invalid
        if (err.response?.status === 401) {
          setUser(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      })
      .finally(() => setLoading(false));

    // Fetch notifications if logged in
    api.get("user/notifications")
      .then(res => {
        setNotifications(res.data);
        setUnreadCount(res.data.filter(n => !n.read).length);
      })
      .catch(err => console.error("Failed to fetch notifs:", err));
  }, []);

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  useEffect(() => {
    if (!user || !user._id) return;
    
    // Connect to socket and register presence
    const socketUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : 'https://uhc-backend.onrender.com';
    const socket = io(socketUrl);
    
    socket.on("connect", () => {
      socket.emit("register_presence", user._id);
    });

    socket.on("USER_NOTIFICATION", (notif) => {
      // Check if broadcast or targeted to me
      if (notif.broadcast || notif.recipientId === user._id) {
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const logout = () => {
    setUser(null);
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
      theme, setTheme, adminTheme, setAdminTheme,
      notifications, unreadCount, markNotificationsRead
    }}>
      {children}
    </UserContext.Provider>
  );
};
