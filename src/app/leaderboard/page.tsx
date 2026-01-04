"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Crown,
  Medal,
  Users,
  Zap,
  ChevronUp,
} from "lucide-react";

/* eslint-disable @next/next/no-img-element */
import { BottomNav } from "@/components/ui";
import ScreenWrapper from "@/components/ScreenWrapper";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

// Default avatar fallback
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23374151' width='100' height='100'/%3E%3Ctext x='50' y='55' font-size='40' text-anchor='middle' fill='%239CA3AF'%3E?%3C/text%3E%3C/svg%3E";

// Types
interface LeaderboardUser {
  rank: number;
  id: string;
  username: string;
  displayName: string;
  balance?: number;
  balanceFormatted?: string;
  referralCount?: number;
  avatarUrl: string;
  isCurrentUser: boolean;
}

interface CurrentUserRank {
  miners: number;
  referrers: number | null;
}

interface CurrentUser {
  id: string;
  username: string | null;
  displayName: string;
  balance: number;
  balanceFormatted: string;
  referralCount: number;
  avatarUrl: string;
}

type TabType = "miners" | "referrers";

// Podium medal styles
const podiumStyles = {
  1: {
    size: "w-20 h-20",
    border: "border-4 border-yellow-400",
    glow: "shadow-[0_0_30px_rgba(250,204,21,0.6)]",
    bg: "bg-gradient-to-b from-yellow-400/20 to-transparent",
    crown: true,
    medal: <Crown className="text-yellow-400" size={24} />,
    height: "h-28",
  },
  2: {
    size: "w-16 h-16",
    border: "border-3 border-gray-300",
    glow: "shadow-[0_0_20px_rgba(192,192,192,0.4)]",
    bg: "bg-gradient-to-b from-gray-300/20 to-transparent",
    crown: false,
    medal: <Medal className="text-gray-300" size={20} />,
    height: "h-20",
  },
  3: {
    size: "w-16 h-16",
    border: "border-3 border-amber-600",
    glow: "shadow-[0_0_20px_rgba(180,83,9,0.4)]",
    bg: "bg-gradient-to-b from-amber-600/20 to-transparent",
    crown: false,
    medal: <Medal className="text-amber-600" size={20} />,
    height: "h-16",
  },
};

// Podium User Component
function PodiumUser({
  user,
  position,
  type,
}: {
  user: LeaderboardUser;
  position: 1 | 2 | 3;
  type: TabType;
}) {
  const style = podiumStyles[position];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position === 1 ? 0.2 : position === 2 ? 0.1 : 0.3 }}
      className={cn(
        "flex flex-col items-center",
        position === 1 ? "order-2" : position === 2 ? "order-1" : "order-3"
      )}
    >
      {/* Crown for #1 */}
      {style.crown && (
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="mb-1"
        >
          <Crown size={28} className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
        </motion.div>
      )}

      {/* Avatar */}
      <div className={cn("relative", style.size)}>
        <div
          className={cn(
            "w-full h-full rounded-full overflow-hidden",
            style.border,
            style.glow,
            user.isCurrentUser && "ring-2 ring-neon-green ring-offset-2 ring-offset-black"
          )}
        >
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
          />
        </div>
        {/* Rank Badge */}
        <div
          className={cn(
            "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
            position === 1
              ? "bg-yellow-400 text-black"
              : position === 2
              ? "bg-gray-300 text-black"
              : "bg-amber-600 text-white"
          )}
        >
          {position}
        </div>
      </div>

      {/* Name */}
      <p
        className={cn(
          "mt-2 text-sm font-semibold truncate max-w-[80px] text-center",
          user.isCurrentUser ? "text-neon-green" : "text-white"
        )}
      >
        {user.displayName}
      </p>

      {/* Score */}
      <p className="text-xs text-white/60">
        {type === "miners" ? user.balanceFormatted : `${user.referralCount} refs`}
      </p>

      {/* Podium Base */}
      <div
        className={cn(
          "mt-2 w-20 rounded-t-lg flex items-end justify-center",
          style.height,
          style.bg
        )}
      >
        {style.medal}
      </div>
    </motion.div>
  );
}

// Leaderboard Row Component
function LeaderboardRow({
  user,
  type,
}: {
  user: LeaderboardUser;
  type: TabType;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all",
        user.isCurrentUser
          ? "bg-neon-green/10 border border-neon-green/30"
          : "bg-white/5 hover:bg-white/10"
      )}
    >
      {/* Rank */}
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
          user.rank <= 10
            ? "bg-neon-purple/20 text-neon-purple"
            : "bg-white/10 text-white/60"
        )}
      >
        {user.rank}
      </div>

      {/* Avatar */}
      <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20">
        <img
          src={user.avatarUrl}
          alt={user.displayName}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
        />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium truncate",
            user.isCurrentUser ? "text-neon-green" : "text-white"
          )}
        >
          {user.displayName}
          {user.isCurrentUser && (
            <span className="ml-2 text-xs text-neon-green/70">(You)</span>
          )}
        </p>
      </div>

      {/* Score */}
      <div className="text-right">
        <p
          className={cn(
            "font-bold",
            user.isCurrentUser ? "text-neon-green" : "text-white"
          )}
        >
          {type === "miners" ? user.balanceFormatted : user.referralCount}
        </p>
        <p className="text-xs text-white/40">
          {type === "miners" ? "$GIG" : "refs"}
        </p>
      </div>
    </motion.div>
  );
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>("miners");
  const [topMiners, setTopMiners] = useState<LeaderboardUser[]>([]);
  const [topReferrers, setTopReferrers] = useState<LeaderboardUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<CurrentUserRank | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch("/api/leaderboard", {
        headers: {
          "x-telegram-id": user.id.toString(),
        },
      });
      const data = await response.json();

      if (data.topMiners) {
        setTopMiners(data.topMiners);
        setTopReferrers(data.topReferrers || []);
        setCurrentUserRank(data.currentUserRank);
        setCurrentUser(data.currentUser);
        setTotalUsers(data.totalUsers);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const currentList = activeTab === "miners" ? topMiners : topReferrers;
  const top3 = currentList.slice(0, 3);
  const rest = currentList.slice(3);
  const myRank = activeTab === "miners" ? currentUserRank?.miners : currentUserRank?.referrers;

  if (isLoading) {
    return (
      <div className="min-h-screen dark-gradient cyber-grid flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Trophy size={48} className="text-yellow-400" />
        </motion.div>
      </div>
    );
  }

  return (
    <ScreenWrapper>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy size={28} className="text-yellow-400" />
          <h1 className="text-2xl font-bold text-white cyber-text">
            LEADERBOARD
          </h1>
        </div>
        <p className="text-white/50 text-sm">
          {totalUsers.toLocaleString()} Agents competing
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative flex p-1 mb-6 rounded-xl bg-black/50 border border-white/10"
      >
        {/* Sliding Pill */}
        <motion.div
          layout
          className="absolute inset-y-1 w-[calc(50%-4px)] rounded-lg bg-neon-purple"
          animate={{
            x: activeTab === "miners" ? 4 : "calc(100% + 4px)",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />

        {/* Tab Buttons */}
        <button
          onClick={() => setActiveTab("miners")}
          className={cn(
            "relative flex-1 py-3 flex items-center justify-center gap-2 rounded-lg font-semibold text-sm transition-colors z-10",
            activeTab === "miners" ? "text-white" : "text-white/60"
          )}
        >
          <Zap size={16} />
          TOP MINERS
        </button>
        <button
          onClick={() => setActiveTab("referrers")}
          className={cn(
            "relative flex-1 py-3 flex items-center justify-center gap-2 rounded-lg font-semibold text-sm transition-colors z-10",
            activeTab === "referrers" ? "text-white" : "text-white/60"
          )}
        >
          <Users size={16} />
          TOP SQUAD
        </button>
      </motion.div>

      {/* Podium - Top 3 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex justify-center items-end gap-2 mb-8 min-h-[200px]"
        >
          {top3.length >= 3 ? (
            <>
              <PodiumUser user={top3[1]} position={2} type={activeTab} />
              <PodiumUser user={top3[0]} position={1} type={activeTab} />
              <PodiumUser user={top3[2]} position={3} type={activeTab} />
            </>
          ) : top3.length > 0 ? (
            top3.map((user, idx) => (
              <PodiumUser
                key={user.id}
                user={user}
                position={(idx + 1) as 1 | 2 | 3}
                type={activeTab}
              />
            ))
          ) : (
            <div className="text-center text-white/40 py-10">
              <Users size={48} className="mx-auto mb-2 opacity-50" />
              <p>No data yet</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Divider */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/20" />
        <span className="text-white/40 text-xs">RANK 4-50</span>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/20" />
      </div>

      {/* Leaderboard List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + "-list"}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-2"
        >
          {rest.length > 0 ? (
            rest.map((user) => (
              <LeaderboardRow key={user.id} user={user} type={activeTab} />
            ))
          ) : (
            <p className="text-center text-white/40 py-8">
              {activeTab === "referrers"
                ? "Invite friends to climb the ranks!"
                : "Start earning to join the leaderboard!"}
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* My Rank - Sticky Bar */}
      {currentUser && myRank && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-24 left-4 right-4 z-30 max-w-md mx-auto"
        >
          <div className="p-3 rounded-xl bg-gradient-to-r from-neon-green/20 to-neon-purple/20 border border-neon-green/30 backdrop-blur-xl flex items-center gap-3">
            {/* Rank */}
            <div className="flex items-center gap-1">
              <ChevronUp size={16} className="text-neon-green" />
              <span className="text-2xl font-bold text-neon-green">#{myRank}</span>
            </div>

            {/* Avatar */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-neon-green">
              <img
                src={currentUser.avatarUrl}
                alt="You"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">
                {currentUser.displayName}
              </p>
              <p className="text-xs text-white/60">Your Rank</p>
            </div>

            {/* Score */}
            <div className="text-right">
              <p className="font-bold text-neon-green">
                {activeTab === "miners"
                  ? currentUser.balanceFormatted
                  : currentUser.referralCount}
              </p>
              <p className="text-xs text-white/40">
                {activeTab === "miners" ? "$GIG" : "refs"}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <BottomNav activeTab="home" />
    </ScreenWrapper>
  );
}
