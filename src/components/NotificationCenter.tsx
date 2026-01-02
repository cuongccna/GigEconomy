"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  X,
  Swords,
  Gift,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationData {
  attackerId?: string;
  attackerTelegramId?: string;
  attackerName?: string;
  amount?: number;
  result?: string;
  isRevenge?: boolean;
}

interface Notification {
  id: string;
  type: "ATTACK" | "SYSTEM" | "REWARD";
  message: string;
  data: NotificationData | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationCenterProps {
  className?: string;
}

export default function NotificationCenter({ className }: NotificationCenterProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [revengeLoading, setRevengeLoading] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) return;

      const response = await fetch("/api/user/notifications", {
        headers: { "x-telegram-id": telegramId.toString() },
      });
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  // Initial fetch + polling every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Mark all as read
  const markAllRead = async () => {
    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) return;

      await fetch("/api/user/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-id": telegramId.toString(),
        },
        body: JSON.stringify({ markAllRead: true }),
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  };

  // Execute revenge attack
  const handleRevenge = async (notification: Notification) => {
    if (!notification.data?.attackerId) return;

    setRevengeLoading(notification.id);

    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) return;

      const response = await fetch("/api/pvp/revenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-id": telegramId.toString(),
        },
        body: JSON.stringify({
          targetId: notification.data.attackerId,
          notificationId: notification.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Show result via alert or redirect to PvP page
        setIsOpen(false);
        router.push(`/pvp?result=${data.result}&amount=${data.amount}&message=${encodeURIComponent(data.message)}`);
      } else {
        // Show error - could use toast here
        alert(data.message);
      }
    } catch (error) {
      console.error("Revenge attack failed:", error);
      alert("Failed to execute revenge attack");
    } finally {
      setRevengeLoading(null);
    }
  };

  // Get icon based on notification type
  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "ATTACK":
        return <Swords size={18} className="text-red-400" />;
      case "REWARD":
        return <Gift size={18} className="text-neon-green" />;
      case "SYSTEM":
      default:
        return <AlertCircle size={18} className="text-blue-400" />;
    }
  };

  // Format relative time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className={cn(
          "relative p-2 rounded-full",
          "bg-white/5 hover:bg-white/10",
          "border border-white/10",
          "transition-all duration-200"
        )}
      >
        <Bell size={22} className="text-white" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification Drawer (Full Screen Overlay) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            
            {/* Drawer Panel */}
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "fixed left-4 right-4 top-4 max-h-[80vh]",
                "bg-gray-900/98 backdrop-blur-xl",
                "border border-white/10 rounded-2xl",
                "shadow-[0_0_60px_rgba(0,0,0,0.8)]",
                "overflow-hidden z-50"
              )}
            >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-bold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-neon-green hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full hover:bg-white/10"
                >
                  <X size={16} className="text-white/60" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[50vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={32} className="text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "p-4 hover:bg-white/5 transition-colors",
                        !notification.isRead && "bg-neon-purple/5"
                      )}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm",
                            notification.isRead ? "text-white/70" : "text-white"
                          )}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-white/40 mt-1">
                            {formatTime(notification.createdAt)}
                          </p>

                          {/* Revenge Button (for attack notifications) */}
                          {notification.type === "ATTACK" && 
                           notification.data?.attackerId && 
                           notification.data?.result === "WIN" && (
                            <button
                              onClick={() => handleRevenge(notification)}
                              disabled={revengeLoading === notification.id}
                              className={cn(
                                "mt-2 px-3 py-1.5 rounded-lg",
                                "bg-red-500/20 hover:bg-red-500/30",
                                "text-red-400 text-xs font-bold",
                                "flex items-center gap-1.5",
                                "transition-colors",
                                "disabled:opacity-50"
                              )}
                            >
                              {revengeLoading === notification.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Swords size={12} />
                              )}
                              REVENGE
                            </button>
                          )}
                        </div>

                        {/* Unread Dot */}
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-neon-purple flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-white/10 text-center">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/notifications");
                  }}
                  className="text-xs text-white/50 hover:text-white transition-colors"
                >
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
