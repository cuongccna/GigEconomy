"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  Trophy,
  Package,
  Settings,
  Zap,
  ChevronRight,
  Flame,
  Gift,
  Sparkles,
} from "lucide-react";
import { BottomNav, DailyCheckInDrawer } from "@/components/ui";
import { cn } from "@/lib/utils";

interface UserData {
  id: string;
  username: string | null;
  balance: number;
  telegramId: string;
}

interface CheckInStatus {
  canCheckIn: boolean;
  currentStreak: number;
  nextReward: number;
  hasShield: boolean;
  shieldCount?: number;
}

export default function HomePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus | null>(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) return;

      const response = await fetch(`/api/auth?telegramId=${telegramId}`);
      const data = await response.json();
      if (data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  }, []);

  // Fetch check-in status
  const fetchCheckInStatus = useCallback(async () => {
    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) return;

      const response = await fetch("/api/daily-checkin/status", {
        headers: { "x-telegram-id": telegramId.toString() },
      });
      const data = await response.json();
      if (data.success) {
        setCheckInStatus(data);
        // Auto-open if can check in
        if (data.canCheckIn) {
          setIsCheckInOpen(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch check-in status:", error);
    }
  }, []);

  // Fetch user rank from leaderboard
  const fetchUserRank = useCallback(async () => {
    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) return;

      const response = await fetch("/api/leaderboard", {
        headers: { "x-telegram-id": telegramId.toString() },
      });
      const data = await response.json();
      if (data.currentUserRank?.miners) {
        setUserRank(data.currentUserRank.miners);
      }
    } catch (error) {
      console.error("Failed to fetch user rank:", error);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
    fetchCheckInStatus();
    fetchUserRank();
  }, [fetchUserData, fetchCheckInStatus, fetchUserRank]);

  const handleBalanceUpdate = (newBalance: number) => {
    setUser((prev) => (prev ? { ...prev, balance: newBalance } : null));
    fetchCheckInStatus();
  };

  // Generate avatar URL with fallback
  const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23374151' width='100' height='100'/%3E%3Ctext x='50' y='55' font-size='40' text-anchor='middle' fill='%239CA3AF'%3E?%3C/text%3E%3C/svg%3E";
  const avatarUrl = avatarError || !user?.telegramId
    ? defaultAvatar
    : `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.telegramId}`;

  const quickActions = [
    {
      id: "shop",
      title: "Cyber Market",
      subtitle: "Power-ups & Items",
      icon: <ShoppingBag size={32} className="text-neon-purple" />,
      href: "/shop",
      gradient: "from-purple-900/40 to-purple-950/40",
      borderColor: "border-purple-500/30",
      glowColor: "hover:shadow-[0_0_30px_rgba(128,0,255,0.3)]",
    },
    {
      id: "leaderboard",
      title: "Hall of Fame",
      subtitle: "Top Agents",
      icon: <Trophy size={32} className="text-yellow-400" />,
      href: "/leaderboard",
      gradient: "from-yellow-900/40 to-yellow-950/40",
      borderColor: "border-yellow-500/30",
      glowColor: "hover:shadow-[0_0_30px_rgba(255,200,0,0.3)]",
    },
    {
      id: "inventory",
      title: "Inventory",
      subtitle: "Your Items",
      icon: <Package size={32} className="text-blue-400" />,
      href: "/inventory",
      gradient: "from-blue-900/40 to-blue-950/40",
      borderColor: "border-blue-500/30",
      glowColor: "hover:shadow-[0_0_30px_rgba(0,100,255,0.3)]",
    },
    {
      id: "profile",
      title: "Settings",
      subtitle: "Profile & More",
      icon: <Settings size={32} className="text-white/70" />,
      href: "/profile",
      gradient: "from-gray-800/40 to-gray-900/40",
      borderColor: "border-white/20",
      glowColor: "hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]",
    },
  ];

  return (
    <div className="min-h-screen dark-gradient cyber-grid px-4 pt-6 pb-28">
      {/* Header - Avatar & Balance */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        {/* User Info */}
        <Link href="/profile" className="flex items-center gap-3">
          <div className="relative">
            <Image
              src={avatarUrl}
              alt="Avatar"
              width={48}
              height={48}
              className="w-12 h-12 rounded-full border-2 border-neon-green/50"
              unoptimized
              onError={() => setAvatarError(true)}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-neon-green/30"
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div>
            <p className="text-white/50 text-xs">Welcome back,</p>
            <p className="text-white font-bold">
              {user?.username || `Agent-${user?.telegramId?.slice(-4) || "????"}`}
            </p>
          </div>
        </Link>

        {/* Balance */}
        <div className="text-right">
          <p className="text-white/50 text-xs">Balance</p>
          <p className="text-2xl font-bold text-neon-green neon-glow">
            {(user?.balance || 0).toLocaleString()}
            <span className="text-sm text-neon-purple ml-1">$GIG</span>
          </p>
        </div>
      </motion.div>

      {/* Daily Check-in Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onClick={() => setIsCheckInOpen(true)}
        className={cn(
          "mb-6 p-4 rounded-2xl cursor-pointer",
          "bg-gradient-to-r from-neon-green/10 to-neon-purple/10",
          "border border-neon-green/30",
          "shadow-[0_0_20px_rgba(0,255,148,0.1)]",
          "hover:shadow-[0_0_30px_rgba(0,255,148,0.2)]",
          "transition-all duration-300"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-neon-green/20 flex items-center justify-center">
              {checkInStatus?.canCheckIn ? (
                <Gift size={24} className="text-neon-green" />
              ) : (
                <Flame size={24} className="text-orange-400" />
              )}
            </div>
            <div>
              <p className="text-white font-bold">Daily Check-in</p>
              <p className="text-white/50 text-sm">
                {checkInStatus?.canCheckIn
                  ? `Claim +${checkInStatus.nextReward} $GIG`
                  : `🔥 ${checkInStatus?.currentStreak || 0} Day Streak`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {checkInStatus?.canCheckIn && (
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="px-3 py-1 rounded-full bg-neon-green text-bg-dark text-xs font-bold"
              >
                CLAIM
              </motion.span>
            )}
            <ChevronRight size={20} className="text-white/40" />
          </div>
        </div>
      </motion.div>

      {/* Quick Actions Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <h2 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
          <Zap size={16} className="text-neon-purple" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Link
                href={action.href}
                className={cn(
                  "block p-4 rounded-2xl",
                  "bg-gradient-to-br",
                  action.gradient,
                  "border",
                  action.borderColor,
                  "backdrop-blur-xl",
                  "transition-all duration-300",
                  action.glowColor
                )}
              >
                <div className="mb-3">{action.icon}</div>
                <p className="text-white font-bold text-sm">{action.title}</p>
                <p className="text-white/40 text-xs">{action.subtitle}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Hot Airdrop Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <h2 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-yellow-400" />
          Featured
        </h2>
        <Link
          href="/earn"
          className={cn(
            "block p-5 rounded-2xl",
            "bg-gradient-to-r from-orange-900/30 via-red-900/30 to-pink-900/30",
            "border border-orange-500/30",
            "hover:shadow-[0_0_30px_rgba(255,100,0,0.2)]",
            "transition-all duration-300"
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase">
                  Hot
                </span>
                <span className="text-white/50 text-xs">Limited Time</span>
              </div>
              <p className="text-white font-bold text-lg mb-1">
                Complete Tasks & Earn
              </p>
              <p className="text-white/50 text-sm">
                New missions available! Earn up to 5,000 $GIG
              </p>
            </div>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
              <Flame size={32} className="text-orange-400" />
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-3 gap-3 mb-6"
      >
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
          <p className="text-2xl font-bold text-neon-green">
            {checkInStatus?.currentStreak || 0}
          </p>
          <p className="text-white/40 text-xs">Day Streak</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
          <p className="text-2xl font-bold text-neon-purple">
            {checkInStatus?.shieldCount || 0}
          </p>
          <p className="text-white/40 text-xs">Shields</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
          <p className="text-2xl font-bold text-yellow-400">
            {userRank ? `#${userRank}` : "-"}
          </p>
          <p className="text-white/40 text-xs">Rank</p>
        </div>
      </motion.div>

      {/* Daily Check-in Drawer */}
      <DailyCheckInDrawer
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onBalanceUpdate={handleBalanceUpdate}
      />

      {/* Bottom Navigation */}
      <BottomNav activeTab="home" />
    </div>
  );
}
