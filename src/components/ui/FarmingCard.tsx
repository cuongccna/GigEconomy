"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Cpu, Zap, Battery, BatteryCharging, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

type FarmingState = "idle" | "farming" | "ready";

interface FarmingCardProps {
  onBalanceUpdate?: (newBalance: number) => void;
}

// Max farming duration: 8 hours
const MAX_FARMING_MS = 8 * 60 * 60 * 1000;
const POINTS_PER_MINUTE = 0.5;

export function FarmingCard({ onBalanceUpdate }: FarmingCardProps) {
  const [state, setState] = useState<FarmingState>("idle");
  const [farmingStartedAt, setFarmingStartedAt] = useState<Date | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [currentEarnings, setCurrentEarnings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);

  // Fetch initial farming status
  const fetchFarmingStatus = useCallback(async () => {
    try {
      // Get user ID from Telegram WebApp
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      
      if (!telegramId) {
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/farming", {
        headers: {
          "x-telegram-id": telegramId.toString(),
        },
      });
      const data = await response.json();
      
      if (data.success) {
        if (data.isFarming) {
          setFarmingStartedAt(new Date(data.farmingStartedAt));
          if (data.isFull) {
            setState("ready");
          } else {
            setState("farming");
          }
        } else {
          setState("idle");
          setFarmingStartedAt(null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch farming status:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFarmingStatus();
  }, [fetchFarmingStatus]);

  // Update elapsed time every second while farming
  useEffect(() => {
    if (state !== "farming" || !farmingStartedAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      let elapsed = now.getTime() - farmingStartedAt.getTime();
      
      if (elapsed >= MAX_FARMING_MS) {
        elapsed = MAX_FARMING_MS;
        setState("ready");
        clearInterval(interval);
      }
      
      setElapsedMs(elapsed);
      const minutes = elapsed / (1000 * 60);
      setCurrentEarnings(Math.floor(minutes * POINTS_PER_MINUTE * 100) / 100);
    }, 1000);

    return () => clearInterval(interval);
  }, [state, farmingStartedAt]);

  const handleStart = async () => {
    setIsActioning(true);
    try {
      // Get user ID from Telegram WebApp
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      
      if (!telegramId) {
        return;
      }

      const response = await fetch("/api/farming", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-id": telegramId.toString(),
        },
        body: JSON.stringify({ action: "start" }),
      });
      
      const data = await response.json();
      if (data.success) {
        setFarmingStartedAt(new Date(data.farmingStartedAt));
        setState("farming");
        setElapsedMs(0);
        setCurrentEarnings(0);
      }
    } catch (error) {
      console.error("Failed to start farming:", error);
    } finally {
      setIsActioning(false);
    }
  };

  const handleClaim = async () => {
    setIsActioning(true);
    try {
      // Get user ID from Telegram WebApp
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      
      if (!telegramId) {
        return;
      }

      const response = await fetch("/api/farming", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-id": telegramId.toString(),
        },
        body: JSON.stringify({ action: "claim" }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Fire confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#00FF94", "#7000FF", "#ffffff"],
        });
        
        // Update parent balance
        if (onBalanceUpdate) {
          onBalanceUpdate(data.newBalance);
        }
        
        // Reset state
        setState("idle");
        setFarmingStartedAt(null);
        setElapsedMs(0);
        setCurrentEarnings(0);
      }
    } catch (error) {
      console.error("Failed to claim farming:", error);
    } finally {
      setIsActioning(false);
    }
  };

  // Calculate progress percentage
  const progress = Math.min((elapsedMs / MAX_FARMING_MS) * 100, 100);
  
  // Format time remaining
  const formatTimeRemaining = () => {
    const remainingMs = MAX_FARMING_MS - elapsedMs;
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Max earnings
  const maxEarnings = Math.floor((MAX_FARMING_MS / (1000 * 60)) * POINTS_PER_MINUTE);

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-center py-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Cpu size={32} className="text-neon-purple" />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="mb-6"
    >
      <div className={cn(
        "relative overflow-hidden rounded-2xl border p-5",
        "bg-gradient-to-br from-neon-purple/10 to-bg-dark",
        state === "ready" 
          ? "border-neon-green shadow-[0_0_30px_rgba(0,255,148,0.3)]" 
          : "border-neon-purple/30"
      )}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(112,0,255,0.1) 10px, rgba(112,0,255,0.1) 11px)`,
          }} />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={state === "farming" ? { 
                boxShadow: ["0 0 10px #7000FF", "0 0 20px #7000FF", "0 0 10px #7000FF"]
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center"
            >
              {state === "farming" ? (
                <BatteryCharging size={24} className="text-neon-purple" />
              ) : state === "ready" ? (
                <Sparkles size={24} className="text-neon-green" />
              ) : (
                <Battery size={24} className="text-neon-purple" />
              )}
            </motion.div>
            <div>
              <h3 className="font-bold text-white">Crypto Farm</h3>
              <p className="text-xs text-white/50">
                {state === "idle" && "Start mining to earn $GIG"}
                {state === "farming" && "Mining in progress..."}
                {state === "ready" && "Ready to harvest!"}
              </p>
            </div>
          </div>
          
          {/* Rate badge */}
          <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
            <Zap size={12} className="text-neon-green" />
            <span className="text-xs text-white/70">{POINTS_PER_MINUTE}/min</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative mb-4">
          <div className="h-8 bg-black/50 rounded-lg overflow-hidden border border-white/10">
            {/* Neon liquid fill */}
            <motion.div
              className="h-full relative"
              style={{ width: `${progress}%` }}
              animate={{
                background: state === "ready" 
                  ? ["linear-gradient(90deg, #00FF94, #00cc77)", "linear-gradient(90deg, #00cc77, #00FF94)"]
                  : ["linear-gradient(90deg, #7000FF, #9000FF)", "linear-gradient(90deg, #9000FF, #7000FF)"]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {/* Bubbles/particles effect */}
              {state === "farming" && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-white/60 rounded-full"
                      style={{ left: `${20 * i + 10}%` }}
                      animate={{
                        y: [0, -20, 0],
                        opacity: [0.3, 1, 0.3],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.3,
                      }}
                    />
                  ))}
                </>
              )}
              
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
            
            {/* Progress text overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-mono font-bold text-white drop-shadow-lg">
                {state === "idle" && "0%"}
                {state !== "idle" && `${progress.toFixed(1)}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-xs text-white/50">Current Earnings</p>
            <p className="text-lg font-bold text-neon-green">
              +{currentEarnings.toFixed(2)} <span className="text-sm text-white/50">$GIG</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/50">
              {state === "farming" ? "Time Left" : "Max Earnings"}
            </p>
            <p className={cn(
              "text-lg font-mono font-bold",
              state === "farming" ? "text-neon-purple" : "text-white/70"
            )}>
              {state === "farming" ? formatTimeRemaining() : `${maxEarnings} $GIG`}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <motion.button
          whileTap={!isActioning ? { scale: 0.95 } : undefined}
          onClick={() => {
            if (state === "idle") handleStart();
            else if (state === "ready") handleClaim();
          }}
          disabled={state === "farming" || isActioning}
          className={cn(
            "w-full py-4 px-6 rounded-xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2 relative z-10",
            state === "idle" && "bg-neon-purple text-white shadow-[0_0_20px_rgba(112,0,255,0.4)] hover:shadow-[0_0_30px_rgba(112,0,255,0.6)]",
            state === "farming" && "bg-white/10 text-white/40 cursor-not-allowed",
            state === "ready" && "bg-neon-green text-bg-dark shadow-[0_0_30px_rgba(0,255,148,0.5)]"
          )}
        >
          {isActioning ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Cpu size={20} />
            </motion.div>
          ) : (
            <>
              {state === "idle" && (
                <>
                  <Zap size={20} />
                  START MINING
                </>
              )}
              {state === "farming" && (
                <>
                  <BatteryCharging size={20} />
                  Mining...
                </>
              )}
              {state === "ready" && (
                <>
                  <Sparkles size={20} />
                  CLAIM {currentEarnings.toFixed(0)} $GIG
                </>
              )}
            </>
          )}
        </motion.button>

        {/* Pulsing border for ready state */}
        {state === "ready" && (
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-neon-green pointer-events-none"
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.01, 1],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  );
}
