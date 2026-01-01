"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Scan, CheckCircle2, ExternalLink, Zap, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { CyberButton } from "./CyberButton";

type TaskStatus = "idle" | "checking" | "completed" | "claiming";

interface Task {
  id: string;
  title: string;
  reward: number;
  link: string;
  icon: React.ComponentType<{ className?: string }>;
  iconName?: string;
  isCompleted?: boolean;
}

interface TaskDrawerProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onClaim?: (taskId: string, newBalance: number) => void;
}

export function TaskDrawer({ task, isOpen, onClose, onClaim }: TaskDrawerProps) {
  const [status, setStatus] = useState<TaskStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [scanLine, setScanLine] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      // Delay reset to allow close animation
      const timer = setTimeout(() => {
        setStatus("idle");
        setProgress(0);
        setScanLine(0);
        setError(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Progress bar + scan animation during checking
  useEffect(() => {
    if (status !== "checking") return;

    const duration = 5000;
    const interval = 50;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setStatus("completed");
          return 100;
        }
        return prev + increment;
      });
      setScanLine((prev) => (prev + 2) % 100);
    }, interval);

    return () => clearInterval(timer);
  }, [status]);

  const handleStartMission = () => {
    // Open external link (simulated)
    if (task?.link) {
      window.open(task.link, "_blank");
    } else {
      // Simulate opening a link for demo
      window.open("https://twitter.com", "_blank");
    }
    setStatus("checking");
    setProgress(0);
  };

  const handleClaimReward = async () => {
    if (!task) return;
    
    setStatus("claiming");
    setError(null);

    try {
      // Call API to claim reward
      const response = await fetch("/api/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId: task.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to claim reward");
      }

      // Fire confetti celebration
      const duration = 2000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#00FF94", "#7000FF", "#FF003C"],
        });
        confetti({
          particleCount: 3,
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
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#00FF94", "#7000FF", "#ffffff"],
      });

      // Notify parent of successful claim
      if (onClaim) {
        onClaim(task.id, data.newBalance);
      }

      // Close after celebration
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim reward");
      setStatus("completed"); // Allow retry
    }
  };

  if (!task) return null;

  const TaskIcon = task.icon;

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
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "rounded-t-3xl overflow-hidden",
              "border-t border-neon-green/20",
              "max-h-[85vh]"
            )}
          >
            {/* Glassmorphism Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] to-[#050505] backdrop-blur-xl" />
            
            {/* Scan Line Effect (during checking) */}
            {status === "checking" && (
              <motion.div
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-neon-green to-transparent opacity-50"
                style={{ top: `${scanLine}%` }}
              />
            )}

            {/* Content */}
            <div className="relative p-6 pb-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-neon-green" />
                  <span className="text-xs uppercase tracking-[0.2em] text-neon-green font-bold">
                    Mission Control
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Mission Icon & Title */}
              <div className="flex items-start gap-4 mb-6">
                <div
                  className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0",
                    "bg-gradient-to-br from-neon-green/20 to-neon-purple/20",
                    "border border-white/10"
                  )}
                >
                  <TaskIcon className="w-8 h-8 text-neon-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-white mb-1 leading-tight">
                    {task.title}
                  </h2>
                  <p className="text-sm text-white/50">{task.link}</p>
                </div>
              </div>

              {/* Reward Card */}
              <div
                className={cn(
                  "rounded-2xl p-5 mb-6",
                  "bg-gradient-to-r from-neon-green/10 to-neon-purple/10",
                  "border border-white/10"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
                      Mission Reward
                    </p>
                    <p className="text-3xl font-bold text-neon-green neon-glow">
                      +{task.reward.toLocaleString()} PTS
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-neon-green/20 flex items-center justify-center">
                    <span className="text-2xl">💎</span>
                  </div>
                </div>
              </div>

              {/* Status-specific Content */}
              {status === "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Instructions */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
                    <ExternalLink className="w-5 h-5 text-neon-purple shrink-0" />
                    <p className="text-sm text-white/60">
                      Complete the action in the opened window, then return here to claim
                    </p>
                  </div>

                  <CyberButton
                    onClick={handleStartMission}
                    className="w-full text-lg py-4"
                  >
                    🚀 START MISSION
                  </CyberButton>
                </motion.div>
              )}

              {status === "checking" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {/* Scanning Status */}
                  <div className="flex items-center justify-center gap-3 py-4">
                    <Scan className="w-6 h-6 text-neon-green animate-pulse" />
                    <span className="text-neon-green font-bold uppercase tracking-wider">
                      Scanning Blockchain...
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative">
                    <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10">
                      <motion.div
                        className="h-full bg-gradient-to-r from-neon-purple via-neon-green to-neon-green"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-white/40">Verifying transaction</span>
                      <span className="text-neon-green font-mono">{Math.round(progress)}%</span>
                    </div>
                  </div>

                  {/* Disabled Button */}
                  <button
                    disabled
                    className={cn(
                      "w-full py-4 rounded-lg font-bold text-lg",
                      "bg-white/5 text-white/30 cursor-not-allowed",
                      "border border-white/10"
                    )}
                  >
                    ⏳ VERIFYING...
                  </button>
                </motion.div>
              )}

              {status === "completed" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  {/* Success Status */}
                  <div className="flex items-center justify-center gap-3 py-4">
                    <CheckCircle2 className="w-6 h-6 text-neon-green" />
                    <span className="text-neon-green font-bold uppercase tracking-wider">
                      Mission Complete!
                    </span>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                      {error}
                    </div>
                  )}

                  {/* Claim Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClaimReward}
                    className={cn(
                      "w-full py-4 rounded-lg font-bold text-lg text-black",
                      "bg-neon-green",
                      "shadow-[0_0_30px_rgba(0,255,148,0.5)]",
                      "border-2 border-neon-green",
                      "animate-pulse"
                    )}
                  >
                    🎁 CLAIM REWARD
                  </motion.button>
                </motion.div>
              )}

              {status === "claiming" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-8"
                >
                  <Loader2 className="w-10 h-10 text-neon-green animate-spin mb-4" />
                  <p className="text-white/60">Claiming reward...</p>
                </motion.div>
              )}

              {/* Bottom Safe Area Spacer */}
              <div className="h-4" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
