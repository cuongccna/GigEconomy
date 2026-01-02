"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Lock, Gift, Sparkles, Zap, Shield, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

interface DailyCheckInDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onBalanceUpdate?: (newBalance: number) => void;
}

interface CheckInStatus {
  canCheckIn: boolean;
  currentStreak: number;
  nextReward: number;
  nextFreeSpins: number;
  hasShield: boolean;
  shieldCount: number;
  streakWillReset: boolean;
  lastCheckIn: string | null;
}

// Base reward + streak multiplier (matches API)
const BASE_REWARD = 100;
const STREAK_MULTIPLIER = 50;

// Calculate reward for each day (1-7)
const calculateDayReward = (day: number): number => {
  return BASE_REWARD + (day * STREAK_MULTIPLIER);
};

// Generate reward array for days 1-7
const DAILY_REWARDS = Array.from({ length: 7 }, (_, i) => calculateDayReward(i + 1));

type DayStatus = "claimed" | "active" | "locked";

const getDayStatus = (day: number, currentStreak: number, hasClaimedToday: boolean): DayStatus => {
  // Day is 1-indexed (1-7)
  // currentStreak is the number of days already claimed (0-7)
  
  if (day <= currentStreak) {
    return "claimed";
  }
  
  if (day === currentStreak + 1 && !hasClaimedToday) {
    return "active";
  }
  
  return "locked";
};

interface DayBoxProps {
  day: number;
  reward: number;
  status: DayStatus;
  isJackpot?: boolean;
  isClaiming?: boolean;
}

function DayBox({ day, reward, status, isJackpot = false, isClaiming = false }: DayBoxProps) {
  return (
    <motion.div
      animate={
        isClaiming && status === "active"
          ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }
          : {}
      }
      transition={{ duration: 0.5 }}
      className={cn(
        "relative rounded-xl border-2 p-3 flex flex-col items-center justify-center transition-all duration-300",
        isJackpot ? "col-span-2" : "",
        status === "claimed" && "bg-neon-green/10 border-neon-green/30 opacity-60",
        status === "active" && "bg-neon-green/20 border-neon-green shadow-[0_0_20px_rgba(0,255,148,0.4)]",
        status === "locked" && "bg-white/5 border-white/10 opacity-50"
      )}
    >
      {/* Pulsing glow for active day */}
      {status === "active" && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-neon-green"
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.02, 1],
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Day label */}
      <span className="text-xs text-white/50 mb-1">Day {day}</span>

      {/* Icon/Status indicator */}
      <div className="mb-1">
        {status === "claimed" && (
          <div className="w-8 h-8 rounded-full bg-neon-green flex items-center justify-center">
            <Check size={16} className="text-bg-dark" strokeWidth={3} />
          </div>
        )}
        {status === "active" && (
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-8 h-8 rounded-full bg-neon-green/20 flex items-center justify-center"
          >
            {isJackpot ? (
              <Sparkles size={18} className="text-neon-green" />
            ) : (
              <Gift size={16} className="text-neon-green" />
            )}
          </motion.div>
        )}
        {status === "locked" && (
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Lock size={14} className="text-white/40" />
          </div>
        )}
      </div>

      {/* Reward amount */}
      <span
        className={cn(
          "font-bold text-sm",
          status === "claimed" && "text-neon-green/70",
          status === "active" && "text-neon-green",
          status === "locked" && "text-white/40"
        )}
      >
        +{reward.toLocaleString()}
      </span>

      {/* Jackpot badge with bonus spin */}
      {isJackpot && (
        <>
          <span className="absolute top-1 right-2 text-[10px] text-neon-purple font-bold uppercase tracking-wider">
            Jackpot
          </span>
          <div className="flex items-center gap-1 mt-1">
            <Trophy size={12} className="text-yellow-400" />
            <span className="text-[10px] text-yellow-400 font-medium">+1 Free Spin</span>
          </div>
        </>
      )}
    </motion.div>
  );
}

export function DailyCheckInDrawer({
  isOpen,
  onClose,
  onBalanceUpdate,
}: DailyCheckInDrawerProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [status, setStatus] = useState<CheckInStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shieldUsedMessage, setShieldUsedMessage] = useState<string | null>(null);

  // Fetch status when drawer opens
  const fetchStatus = useCallback(async () => {
    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) return;

      const response = await fetch("/api/daily-checkin/status", {
        headers: { "x-telegram-id": telegramId.toString() },
      });
      const data = await response.json();
      
      if (data.success) {
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch check-in status:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setShieldUsedMessage(null);
      fetchStatus();
    }
  }, [isOpen, fetchStatus]);

  const handleClaim = async () => {
    if (!status?.canCheckIn || isClaiming) return;

    setIsClaiming(true);

    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) return;

      const response = await fetch("/api/daily-checkin", {
        method: "POST",
        headers: { "x-telegram-id": telegramId.toString() },
      });
      const data = await response.json();

      if (data.success) {
        // Fire confetti
        const duration = 2000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 4,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: ["#00FF94", "#7000FF", "#FF003C"],
          });
          confetti({
            particleCount: 4,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: ["#00FF94", "#7000FF", "#FF003C"],
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();

        // Big burst
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#00FF94", "#7000FF", "#ffffff"],
        });

        // Show shield message if used
        if (data.shieldUsed) {
          setShieldUsedMessage("🛡️ Streak Shield used! Your streak is protected!");
        }

        // Update balance
        if (onBalanceUpdate && data.newBalance !== undefined) {
          onBalanceUpdate(data.newBalance);
        }

        // Update local status
        setStatus((prev) => prev ? {
          ...prev,
          canCheckIn: false,
          currentStreak: data.streak,
          hasShield: data.shieldUsed ? (prev.shieldCount > 1) : prev.hasShield,
          shieldCount: data.shieldUsed ? prev.shieldCount - 1 : prev.shieldCount,
        } : null);

        // Wait for animation then close
        await new Promise((resolve) => setTimeout(resolve, 2000));
        onClose();
      }
    } catch (error) {
      console.error("Failed to claim check-in:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  const currentStreak = status?.currentStreak ?? 0;
  const hasClaimedToday = status ? !status.canCheckIn : false;
  const nextReward = status?.nextReward ?? DAILY_REWARDS[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "bg-bg-dark/95 backdrop-blur-xl",
              "rounded-t-3xl border-t border-white/10",
              "px-6 pt-6 pb-10",
              "max-h-[85vh] overflow-y-auto"
            )}
          >
            {/* Handle bar */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X size={20} className="text-white/60" />
            </button>

            {/* Loading State */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 rounded-full border-2 border-neon-green/30 border-t-neon-green"
                />
                <p className="text-white/50 mt-4 text-sm">Loading rewards...</p>
              </div>
            ) : (
              <>

            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neon-green/20 mb-4"
              >
                <Zap size={32} className="text-neon-green" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-1">
                DAILY SUPPLY DROP
              </h2>
              <p className="text-white/50 text-sm">
                Login 7 days in a row for huge rewards
              </p>
            </div>

            {/* Shield Indicator */}
            {status?.hasShield && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 mb-4 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30"
              >
                <Shield size={18} className="text-blue-400" />
                <span className="text-blue-300 text-sm font-medium">
                  Streak Protection Active ({status.shieldCount}x)
                </span>
              </motion.div>
            )}

            {/* Streak Reset Warning */}
            {status?.streakWillReset && !status?.hasShield && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30"
              >
                <span className="text-red-300 text-sm font-medium">
                  ⚠️ Streak will reset! Get a Shield from Shop to protect it.
                </span>
              </motion.div>
            )}

            {/* Shield Used Message */}
            {shieldUsedMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2 mb-4 px-4 py-3 rounded-lg bg-blue-500/20 border border-blue-500/40"
              >
                <span className="text-blue-200 text-sm font-medium">
                  {shieldUsedMessage}
                </span>
              </motion.div>
            )}

            {/* Streak indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-white/50 text-sm">Current Streak:</span>
              <span className="text-neon-green font-bold text-lg">
                {currentStreak} / 7 days
              </span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Days 1-6 */}
              {DAILY_REWARDS.slice(0, 6).map((reward, index) => {
                const day = index + 1;
                const dayStatus = getDayStatus(day, currentStreak, hasClaimedToday);
                return (
                  <DayBox
                    key={day}
                    day={day}
                    reward={reward}
                    status={dayStatus}
                    isClaiming={isClaiming}
                  />
                );
              })}
            </div>

            {/* Day 7 - Jackpot (Full Width) */}
            <div className="mb-8">
              <DayBox
                day={7}
                reward={DAILY_REWARDS[6]}
                status={getDayStatus(7, currentStreak, hasClaimedToday)}
                isJackpot
                isClaiming={isClaiming}
              />
            </div>

            {/* Action Button Container */}
            <div className="relative w-full">
              <motion.button
                whileTap={!hasClaimedToday ? { scale: 0.95 } : undefined}
                onClick={handleClaim}
                disabled={hasClaimedToday || isClaiming}
                className={cn(
                  "w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 relative z-10",
                  hasClaimedToday || isClaiming
                    ? "bg-white/10 text-white/40 cursor-not-allowed"
                    : "bg-neon-green text-bg-dark shadow-[0_0_30px_rgba(0,255,148,0.4)]"
                )}
              >
                {isClaiming ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles size={20} />
                    </motion.div>
                    Claiming...
                  </span>
                ) : hasClaimedToday ? (
                  "Come back tomorrow"
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Gift size={20} />
                    CLAIM +{nextReward.toLocaleString()} $GIG
                  </span>
                )}
              </motion.button>

              {/* Pulsing animation for claim button */}
              {!hasClaimedToday && !isClaiming && (
                <motion.div
                  className="absolute inset-0 rounded-2xl border-2 border-neon-green pointer-events-none z-20"
                  animate={{
                    opacity: [0, 0.5, 0],
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>

            {/* Next claim info */}
            {hasClaimedToday && (
              <p className="text-center text-white/30 text-xs mt-4">
                Your next reward: <span className="text-neon-green">+{DAILY_REWARDS[Math.min(currentStreak, 6)].toLocaleString()} $GIG</span>
              </p>
            )}
            </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
