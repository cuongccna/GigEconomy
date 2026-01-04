"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Skull,
  Swords,
  Shield,
  Target,
  Zap,
  X,
  ChevronUp,
  Loader2,
  AlertTriangle,
} from "lucide-react";
/* eslint-disable @next/next/no-img-element */
import { BottomNav } from "@/components/ui";
import ScreenWrapper from "@/components/ScreenWrapper";
import { cn } from "@/lib/utils";

// Types
interface PvPPlayer {
  rank: number;
  id: string;
  telegramId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string;
  pvpWins: number;
  pvpTotalStolen: number;
  pvpTotalStolenFormatted: string;
  balance: number;
  balanceFormatted: string;
  hasShield: boolean;
  shieldCount: number;
  isCurrentUser: boolean;
}

// Default avatar fallback
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23374151' width='100' height='100'/%3E%3Ctext x='50' y='55' font-size='40' text-anchor='middle' fill='%239CA3AF'%3E💀%3C/text%3E%3C/svg%3E";

// Podium styles for top 3
const podiumStyles = {
  1: {
    size: "w-20 h-20",
    border: "border-4 border-red-500",
    glow: "shadow-[0_0_30px_rgba(239,68,68,0.6)]",
    bg: "bg-gradient-to-b from-red-500/30 to-transparent",
    icon: <Skull size={28} className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />,
    height: "h-28",
  },
  2: {
    size: "w-16 h-16",
    border: "border-3 border-orange-400",
    glow: "shadow-[0_0_20px_rgba(251,146,60,0.5)]",
    bg: "bg-gradient-to-b from-orange-400/20 to-transparent",
    icon: <Skull size={22} className="text-orange-400" />,
    height: "h-20",
  },
  3: {
    size: "w-16 h-16",
    border: "border-3 border-yellow-500",
    glow: "shadow-[0_0_20px_rgba(234,179,8,0.4)]",
    bg: "bg-gradient-to-b from-yellow-500/20 to-transparent",
    icon: <Skull size={22} className="text-yellow-500" />,
    height: "h-16",
  },
};

// Podium component for top 3
function PodiumUser({
  player,
  position,
  onSelect,
}: {
  player: PvPPlayer;
  position: 1 | 2 | 3;
  onSelect: () => void;
}) {
  const style = podiumStyles[position];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position === 1 ? 0.2 : position === 2 ? 0.1 : 0.3 }}
      onClick={onSelect}
      className={cn(
        "flex flex-col items-center cursor-pointer",
        position === 1 ? "order-2" : position === 2 ? "order-1" : "order-3"
      )}
    >
      {/* Skull Icon for #1 */}
      {position === 1 && (
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="mb-1"
        >
          {style.icon}
        </motion.div>
      )}

      {/* Avatar */}
      <div className={cn("relative", style.size)}>
        <div
          className={cn(
            "w-full h-full rounded-full overflow-hidden",
            style.border,
            style.glow,
            player.isCurrentUser && "ring-2 ring-red-400 ring-offset-2 ring-offset-black"
          )}
        >
          <img
            src={player.avatarUrl}
            alt={player.displayName}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
          />
        </div>
        {/* Rank Badge */}
        <div
          className={cn(
            "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
            position === 1
              ? "bg-red-500 text-white"
              : position === 2
              ? "bg-orange-400 text-black"
              : "bg-yellow-500 text-black"
          )}
        >
          {position}
        </div>
        {/* Shield indicator */}
        {player.hasShield && (
          <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
            <Shield size={10} className="text-white" />
          </div>
        )}
      </div>

      {/* Name */}
      <p
        className={cn(
          "mt-2 text-sm font-semibold truncate max-w-[80px] text-center",
          player.isCurrentUser ? "text-red-400" : "text-white"
        )}
      >
        {player.displayName}
      </p>

      {/* Wins */}
      <p className="text-xs text-red-400 font-bold">
        {player.pvpWins} kills
      </p>

      {/* Podium Base */}
      <div
        className={cn(
          "mt-2 w-20 rounded-t-lg flex items-end justify-center",
          style.height,
          style.bg
        )}
      >
        {position !== 1 && style.icon}
      </div>
    </motion.div>
  );
}

// Leaderboard Row Component
function LeaderboardRow({
  player,
  onSelect,
}: {
  player: PvPPlayer;
  onSelect: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer",
        player.isCurrentUser
          ? "bg-red-500/10 border border-red-500/30"
          : "bg-white/5 hover:bg-red-500/10"
      )}
    >
      {/* Rank */}
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
          player.rank <= 10
            ? "bg-red-500/20 text-red-400"
            : "bg-white/10 text-white/60"
        )}
      >
        {player.rank}
      </div>

      {/* Avatar */}
      <div className="relative w-10 h-10 rounded-full overflow-hidden border border-red-500/30">
        <img
          src={player.avatarUrl}
          alt={player.displayName}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
        />
        {player.hasShield && (
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
            <Shield size={8} className="text-white" />
          </div>
        )}
      </div>

      {/* Name & Kills */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium truncate",
            player.isCurrentUser ? "text-red-400" : "text-white"
          )}
        >
          {player.displayName}
          {player.isCurrentUser && (
            <span className="ml-2 text-xs text-red-400/70">(You)</span>
          )}
        </p>
        <p className="text-xs text-white/40">
          {player.pvpWins} wins
        </p>
      </div>

      {/* Total Stolen */}
      <div className="text-right">
        <p className="font-bold text-red-400">
          {player.pvpTotalStolenFormatted}
        </p>
        <p className="text-xs text-white/40">stolen</p>
      </div>
    </motion.div>
  );
}

// Scout Modal Component
function ScoutModal({
  player,
  onClose,
  onAttack,
  isAttacking,
}: {
  player: PvPPlayer;
  onClose: () => void;
  onAttack: () => void;
  isAttacking: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-gray-900 to-black border border-red-500/30 p-6"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X size={20} className="text-white" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Target className="text-red-500" size={24} />
            <h3 className="text-xl font-bold text-white">TARGET INTEL</h3>
          </div>
          <p className="text-white/50 text-sm">Scouting report</p>
        </div>

        {/* Player Card */}
        <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="relative w-16 h-16">
            <img
              src={player.avatarUrl}
              alt={player.displayName}
              className="w-full h-full rounded-full object-cover border-2 border-red-500/50"
              onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
            />
            {player.hasShield && (
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <Shield size={12} className="text-white" />
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-bold text-lg">{player.displayName}</p>
            <p className="text-red-400 text-sm">Rank #{player.rank}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-white/5 text-center">
            <p className="text-2xl font-bold text-red-400">{player.pvpWins}</p>
            <p className="text-white/40 text-xs">Heist Wins</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 text-center">
            <p className="text-2xl font-bold text-orange-400">{player.pvpTotalStolenFormatted}</p>
            <p className="text-white/40 text-xs">Total Stolen</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 text-center">
            <p className="text-2xl font-bold text-neon-green">{player.balanceFormatted}</p>
            <p className="text-white/40 text-xs">Est. Balance</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 text-center">
            <div className="flex items-center justify-center gap-1">
              {player.hasShield ? (
                <>
                  <Shield size={18} className="text-blue-400" />
                  <span className="text-2xl font-bold text-blue-400">{player.shieldCount}</span>
                </>
              ) : (
                <span className="text-2xl font-bold text-red-500">✗</span>
              )}
            </div>
            <p className="text-white/40 text-xs">Defense</p>
          </div>
        </div>

        {/* Warning if shielded */}
        {player.hasShield && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 mb-4">
            <AlertTriangle size={18} className="text-blue-400" />
            <p className="text-blue-400 text-sm">Target has {player.shieldCount} shield(s) active!</p>
          </div>
        )}

        {/* Attack Button */}
        {!player.isCurrentUser && (
          <button
            onClick={onAttack}
            disabled={isAttacking}
            className={cn(
              "w-full py-4 rounded-xl font-bold text-lg",
              "bg-gradient-to-r from-red-600 to-red-500",
              "text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]",
              "hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]",
              "transition-all duration-300",
              "flex items-center justify-center gap-2",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isAttacking ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <Swords size={20} />
                ATTACK NOW
              </>
            )}
          </button>
        )}

        {player.isCurrentUser && (
          <div className="text-center text-white/40 text-sm">
            This is you. Keep dominating!
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function PvPLeaderboardPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<PvPPlayer[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<PvPPlayer | null>(null);
  const [isAttacking, setIsAttacking] = useState(false);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      
      const response = await fetch("/api/pvp/leaderboard", {
        headers: telegramId ? { "x-telegram-id": telegramId.toString() } : {},
      });
      const data = await response.json();

      if (data.success) {
        setPlayers(data.topPlayers);
        setCurrentUserRank(data.currentUserRank);
        setTotalPlayers(data.totalPvPPlayers);
      }
    } catch (error) {
      console.error("Failed to fetch PvP leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Handle attack
  const handleAttack = async () => {
    if (!selectedPlayer) return;
    
    setIsAttacking(true);
    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) {
        alert("Please open in Telegram");
        return;
      }

      const response = await fetch("/api/pvp/attack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-id": telegramId.toString(),
        },
        body: JSON.stringify({ targetId: selectedPlayer.id }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSelectedPlayer(null);
        router.push(`/pvp?result=${data.result}&amount=${data.amount}&message=${encodeURIComponent(data.message)}`);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Attack failed:", error);
      alert("Attack failed");
    } finally {
      setIsAttacking(false);
    }
  };

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-red-950/20 to-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Skull size={48} className="text-red-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <ScreenWrapper showGrid={false}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Skull className="text-red-500" size={32} />
          <h1 className="text-2xl font-bold text-white tracking-wider">
            MOST WANTED
          </h1>
          <Skull className="text-red-500" size={32} />
        </div>
        <p className="text-red-400/70 text-sm">{totalPlayers} dangerous agents</p>
      </motion.div>

      {/* Podium for Top 3 */}
      {top3.length >= 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center items-end gap-4 mb-8"
        >
          <PodiumUser
            player={top3[1]}
            position={2}
            onSelect={() => setSelectedPlayer(top3[1])}
          />
          <PodiumUser
            player={top3[0]}
            position={1}
            onSelect={() => setSelectedPlayer(top3[0])}
          />
          <PodiumUser
            player={top3[2]}
            position={3}
            onSelect={() => setSelectedPlayer(top3[2])}
          />
        </motion.div>
      )}

      {/* Leaderboard Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-red-500" />
          <span className="text-white/60 text-sm font-medium">RANK 4-20</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-white/40">
          <span>NAME</span>
          <span>STOLEN</span>
        </div>
      </motion.div>

      {/* Leaderboard List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-2 mb-8"
      >
        {rest.map((player) => (
          <LeaderboardRow
            key={player.id}
            player={player}
            onSelect={() => setSelectedPlayer(player)}
          />
        ))}
        
        {rest.length === 0 && top3.length < 3 && (
          <div className="text-center py-8">
            <Skull size={48} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No heist data yet</p>
            <p className="text-white/30 text-sm">Be the first to dominate!</p>
          </div>
        )}
      </motion.div>

      {/* Current User Rank Card (if not in top 20) */}
      {currentUserRank && currentUserRank > 20 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-4 right-4 p-4 rounded-2xl bg-gradient-to-r from-red-900/50 to-red-950/50 border border-red-500/30 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChevronUp size={20} className="text-red-400" />
              <div>
                <p className="text-white font-bold">Your Rank</p>
                <p className="text-white/50 text-sm">Keep hunting!</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-400">#{currentUserRank}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Scout Modal */}
      <AnimatePresence>
        {selectedPlayer && (
          <ScoutModal
            player={selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
            onAttack={handleAttack}
            isAttacking={isAttacking}
          />
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNav activeTab="play" />
    </ScreenWrapper>
  );
}
