"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Lock, Gift, Sparkles, Zap } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

interface DailyCheckInDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentStreak: number;
  hasClaimedToday: boolean;
  onClaim: () => void;
}

// Reward values for each day
const DAILY_REWARDS = [100, 200, 300, 500, 750, 1000, 5000];

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

      {/* Jackpot badge */}
      {isJackpot && (
        <span className="absolute top-1 right-2 text-[10px] text-neon-purple font-bold uppercase tracking-wider">
          Jackpot
        </span>
      )}
    </motion.div>
  );
}

export function DailyCheckInDrawer({
  isOpen,
  onClose,
  currentStreak,
  hasClaimedToday,
  onClaim,
}: DailyCheckInDrawerProps) {
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaim = async () => {
    if (hasClaimedToday || isClaiming) return;

    setIsClaiming(true);

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

    // Wait for animation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Call the claim callback
    onClaim();

    setIsClaiming(false);
  };

  // Calculate next reward (current streak + 1, capped at 7)
  const nextDay = Math.min(currentStreak + 1, 7);
  const nextReward = DAILY_REWARDS[nextDay - 1] || 0;

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
                const status = getDayStatus(day, currentStreak, hasClaimedToday);
                return (
                  <DayBox
                    key={day}
                    day={day}
                    reward={reward}
                    status={status}
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
