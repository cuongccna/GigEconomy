"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, ExternalLink, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";
import { NeonCard } from "./NeonCard";
import { useAuth } from "@/hooks/useAuth";
import type { LucideIcon } from "lucide-react";

type TaskState = "idle" | "verifying" | "ready" | "claiming" | "completed";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    reward: number;
    link: string;
    icon: LucideIcon;
    isCompleted: boolean;
  };
  index: number;
  onClaim: (taskId: string, newBalance: number) => void;
}

const VERIFY_DURATION = 10; // seconds

export function TaskCard({ task, index, onClaim }: TaskCardProps) {
  const { user } = useAuth();
  const [state, setState] = useState<TaskState>(task.isCompleted ? "completed" : "idle");
  const [countdown, setCountdown] = useState(VERIFY_DURATION);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (state === "verifying") {
      setCountdown(VERIFY_DURATION);
      
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            setState("ready");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [state]);

  // Handle START click
  const handleStart = useCallback(() => {
    if (task.link) {
      window.open(task.link, "_blank");
    }
    setState("verifying");
    setError(null);
  }, [task.link]);

  // Handle CLAIM click
  const handleClaim = useCallback(async () => {
    if (!user?.id) return;
    
    setState("claiming");
    setError(null);

    try {
      const response = await fetch("/api/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-id": user.id.toString(),
        },
        body: JSON.stringify({ taskId: task.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to claim reward");
      }

      // Fire confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#00FF94", "#7000FF", "#ffffff"],
      });

      setState("completed");
      onClaim(task.id, data.newBalance);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim");
      setState("ready"); // Allow retry
    }
  }, [user?.id, task.id, onClaim]);

  const TaskIcon = task.icon;
  const isHighlighted = index === 0 && state === "idle";

  // Render button based on state
  const renderButton = () => {
    switch (state) {
      case "idle":
        return (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              handleStart();
            }}
            className="px-4 py-2 bg-gradient-to-r from-neon-purple to-neon-purple/80 text-white text-sm font-bold rounded-lg hover:from-neon-purple/90 hover:to-neon-purple/70 transition-all flex items-center gap-1.5"
          >
            <ExternalLink size={14} />
            START
          </motion.button>
        );

      case "verifying":
        return (
          <div className="px-4 py-2 bg-yellow-500/20 text-yellow-400 text-sm font-bold rounded-lg border border-yellow-500/30 flex items-center gap-2 min-w-[100px] justify-center">
            <Loader2 size={14} className="animate-spin" />
            <span className="font-mono">{countdown}s</span>
          </div>
        );

      case "ready":
        return (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              handleClaim();
            }}
            className="px-4 py-2 bg-neon-green text-black text-sm font-bold rounded-lg shadow-[0_0_20px_rgba(0,255,148,0.4)] hover:shadow-[0_0_30px_rgba(0,255,148,0.6)] transition-all animate-pulse flex items-center gap-1.5"
          >
            🎁 CLAIM
          </motion.button>
        );

      case "claiming":
        return (
          <div className="px-4 py-2 bg-neon-green/20 text-neon-green text-sm font-bold rounded-lg flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Claiming...
          </div>
        );

      case "completed":
        return (
          <div className="px-4 py-2 text-neon-green text-sm font-bold flex items-center gap-1.5">
            <CheckCircle2 size={16} />
            DONE
          </div>
        );
    }
  };

  return (
    <NeonCard
      variant={isHighlighted ? "glow" : "default"}
      className={`flex items-center gap-4 ${
        state === "completed" ? "opacity-60" : ""
      } ${isHighlighted ? "border-neon-green/30" : ""}`}
    >
      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
          state === "completed"
            ? "bg-neon-green/10"
            : isHighlighted
            ? "bg-neon-green/20 pulse-glow"
            : "bg-white/5"
        }`}
      >
        {state === "completed" ? (
          <span className="text-2xl">✅</span>
        ) : (
          <TaskIcon
            className={`w-6 h-6 ${
              isHighlighted ? "text-neon-green" : "text-neon-purple"
            }`}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3
          className={`font-bold truncate ${
            state === "completed"
              ? "text-white/50 line-through"
              : isHighlighted
              ? "text-neon-green"
              : "text-white"
          }`}
        >
          {task.title}
        </h3>
        <div className="flex items-center gap-2">
          <p className="text-sm text-white/40 truncate flex-1">
            {state === "verifying" 
              ? "Verifying completion..." 
              : state === "ready"
              ? "Ready to claim!"
              : task.link
            }
          </p>
          {error && (
            <span className="text-xs text-red-400">{error}</span>
          )}
        </div>
      </div>

      {/* Reward & Button */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <p
          className={`font-bold text-sm ${
            state === "completed"
              ? "text-white/40"
              : isHighlighted
              ? "text-neon-green"
              : "text-white"
          }`}
        >
          +{task.reward.toLocaleString()} PTS
        </p>
        {renderButton()}
      </div>
    </NeonCard>
  );
}
