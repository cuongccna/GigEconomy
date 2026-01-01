"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { CyberButton } from "./CyberButton";

type TaskStatus = "idle" | "verifying" | "claimable" | "claimed";

interface Task {
  id: number;
  title: string;
  description: string;
  reward: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "featured";
}

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskDetailModal({ task, isOpen, onClose }: TaskDetailModalProps) {
  const [status, setStatus] = useState<TaskStatus>("idle");
  const [progress, setProgress] = useState(0);

  // Reset state when modal closes or task changes
  useEffect(() => {
    if (!isOpen) {
      setStatus("idle");
      setProgress(0);
    }
  }, [isOpen]);

  // Progress bar animation during verification
  useEffect(() => {
    if (status !== "verifying") return;

    const duration = 5000; // 5 seconds
    const interval = 50; // Update every 50ms
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setStatus("claimable");
          return 100;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [status]);

  const handleStartMission = () => {
    setStatus("verifying");
    setProgress(0);
  };

  const handleClaimReward = () => {
    // Trigger confetti explosion
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#00FF94", "#7000FF", "#FF003C", "#ffffff"],
    });

    // Second burst for more effect
    setTimeout(() => {
      confetti({
        particleCount: 100,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#00FF94", "#7000FF"],
      });
      confetti({
        particleCount: 100,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#00FF94", "#7000FF"],
      });
    }, 150);

    setStatus("claimed");
    
    setTimeout(() => {
      alert("🎉 Crypto Received!");
      onClose();
    }, 500);
  };

  if (!task) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "bg-bg-dark border-t border-white/10",
              "rounded-t-3xl p-6 pb-10",
              "max-h-[80vh] overflow-y-auto"
            )}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>

            {/* Task Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-neon-green/10 flex items-center justify-center">
                <task.icon className="w-10 h-10 text-neon-green" />
              </div>
            </div>

            {/* Task Info */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">{task.title}</h2>
              <p className="text-white/50">{task.description}</p>
            </div>

            {/* Reward Display */}
            <div className="bg-white/5 rounded-xl p-4 mb-6 text-center border border-neon-green/20">
              <p className="text-white/40 text-sm mb-1">Reward</p>
              <p className="text-3xl font-bold text-neon-green neon-glow">
                +{task.reward}
              </p>
            </div>

            {/* External Link Hint */}
            {status === "idle" && (
              <div className="flex items-center justify-center gap-2 text-white/40 text-sm mb-6">
                <ExternalLink className="w-4 h-4" />
                <span>Complete the task to earn rewards</span>
              </div>
            )}

            {/* Progress Bar (Verifying State) */}
            {status === "verifying" && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Verifying...</span>
                  <span className="text-neon-green">{Math.round(progress)}%</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-neon-purple to-neon-green"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-center">
              {status === "idle" && (
                <CyberButton onClick={handleStartMission} className="w-full max-w-xs">
                  🚀 Start Mission
                </CyberButton>
              )}

              {status === "verifying" && (
                <button
                  disabled
                  className={cn(
                    "w-full max-w-xs px-6 py-3 rounded-lg font-bold",
                    "bg-white/10 text-white/50 cursor-not-allowed"
                  )}
                >
                  ⏳ Verifying...
                </button>
              )}

              {status === "claimable" && (
                <motion.button
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClaimReward}
                  className={cn(
                    "w-full max-w-xs px-6 py-3 rounded-lg font-bold",
                    "bg-neon-green text-black",
                    "shadow-[0_0_30px_rgba(0,255,148,0.5)]",
                    "animate-pulse"
                  )}
                >
                  🎁 CLAIM REWARD
                </motion.button>
              )}

              {status === "claimed" && (
                <div className="text-neon-green font-bold text-xl">
                  ✅ Claimed!
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
