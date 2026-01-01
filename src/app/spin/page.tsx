"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, RotateCcw, Trophy, Skull, X, Sparkles, History, Play, CheckCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { BottomNav } from "@/components/ui";
import { useAdsgram } from "@/hooks/useAdsgram";
import { cn } from "@/lib/utils";

// Wheel segments configuration - isPremium adds special effects
const SEGMENTS = [
  { type: "MISS", label: "💀", amount: 0, color: "#1a1a2e", textColor: "#666", isPremium: false },
  { type: "SMALL", label: "200", amount: 200, color: "#2d1b4e", textColor: "#a78bfa", isPremium: false },
  { type: "MEDIUM", label: "500", amount: 500, color: "#1e3a5f", textColor: "#60a5fa", isPremium: false },
  { type: "BIG", label: "1K ⭐", amount: 1000, color: "#1a4d1a", textColor: "#00FF94", isPremium: true },
  { type: "JACKPOT", label: "10K 💎", amount: 10000, color: "#4a1d1d", textColor: "#fbbf24", isPremium: true },
];

const SPIN_COST = 500;
const SEGMENT_COUNT = 5;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT; // 72 degrees per segment

/**
 * Las Vegas Wheel Calculation - FIXED
 * 
 * SVG Wheel geometry:
 * - Segments drawn from startAngle = index * 72 - 90
 * - Segment 0 (MISS): center at -54° (306° in positive)
 * - Segment 1 (SMALL): center at 18°
 * - Segment 2 (MEDIUM): center at 90°
 * - Segment 3 (BIG): center at 162°
 * - Segment 4 (JACKPOT): center at 234°
 * 
 * Pointer is at TOP = 270° in CSS coordinate (or -90°)
 * 
 * To bring segment N to TOP:
 * initialCenter + rotation = 270 (mod 360)
 * rotation = 270 - initialCenter = 270 - (N*72 - 54) = 324 - N*72
 */
function calculateDegreeForSegment(segmentIndex: number, currentRotation: number): number {
  // Add jitter within segment (±25° from center, keeping within 72° segment)
  const jitter = (Math.random() - 0.5) * 50;
  
  // Base target modulo where segment N's center aligns with pointer (TOP = 270°)
  // Formula: 324 - N * 72
  const baseTarget = 324 - segmentIndex * SEGMENT_ANGLE + jitter;
  const targetModulo = ((baseTarget % 360) + 360) % 360;
  
  // Current wheel position (mod 360)
  const currentModulo = ((currentRotation % 360) + 360) % 360;
  
  // Calculate delta to reach target (always forward/clockwise)
  let delta = targetModulo - currentModulo;
  if (delta <= 0) delta += 360;
  
  // Add full spins for dramatic effect (5-7 spins)
  const fullSpins = 5 + Math.floor(Math.random() * 3);
  
  return fullSpins * 360 + delta;
}

interface SpinResult {
  result: string;
  resultIndex: number;
  rewardAmount: number;
  newBalance: number;
  netGain: number;
}

interface RecentSpin {
  id: string;
  rewardType: string;
  amount: number;
  createdAt: string;
}

export default function SpinPage() {
  const [balance, setBalance] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [recentSpins, setRecentSpins] = useState<RecentSpin[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Ad watching state
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adToast, setAdToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  
  // Adsgram hook
  const { showAd, isReady: isAdReady } = useAdsgram({
    onReward: () => {
      console.log("Ad reward granted");
    },
    onError: (error) => {
      console.error("Ad error:", error);
    },
    onSkip: () => {
      console.log("Ad skipped");
    },
  });

  // Fetch initial data
  const fetchSpinInfo = useCallback(async () => {
    try {
      const response = await fetch("/api/spin");
      const data = await response.json();
      if (data.success) {
        setBalance(data.balance);
        setRecentSpins(data.recentSpins || []);
      }
    } catch (error) {
      console.error("Failed to fetch spin info:", error);
    }
  }, []);

  useEffect(() => {
    fetchSpinInfo();
  }, [fetchSpinInfo]);

  // Trigger haptic feedback
  const triggerHaptic = (style: "light" | "medium" | "heavy" = "heavy") => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  // Handle spin
  const handleSpin = async () => {
    if (isSpinning || balance < SPIN_COST) return;

    setIsSpinning(true);
    triggerHaptic("medium");

    try {
      const response = await fetch("/api/spin", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        setSpinResult(data);
        
        // Calculate degree based on segment index from server (Las Vegas style)
        // Use current rotation to calculate correct delta
        setRotation((prevRotation) => {
          const targetDegree = calculateDegreeForSegment(data.resultIndex, prevRotation);
          return prevRotation + targetDegree;
        });

        // Show result after animation
        setTimeout(() => {
          setIsSpinning(false);
          triggerHaptic("heavy");
          setBalance(data.newBalance);
          setShowResult(true);

          // Fire confetti for wins
          if (data.rewardAmount > 0) {
            confetti({
              particleCount: data.result === "JACKPOT" ? 200 : 100,
              spread: data.result === "JACKPOT" ? 120 : 70,
              origin: { y: 0.6 },
              colors: ["#00FF94", "#7000FF", "#fbbf24", "#ffffff"],
            });
          }
        }, 5000); // Match animation duration
      } else {
        setIsSpinning(false);
        alert(data.message);
      }
    } catch (error) {
      console.error("Spin failed:", error);
      setIsSpinning(false);
    }
  };

  const closeResult = () => {
    setShowResult(false);
    setSpinResult(null);
    fetchSpinInfo(); // Refresh history
  };

  // Handle watch ad for free spin
  const handleWatchAd = async () => {
    if (isWatchingAd || isSpinning) return;
    
    setIsWatchingAd(true);
    setAdToast(null);
    
    try {
      const result = await showAd();
      
      if (result.done) {
        // Call API to grant free spin (500 $GIG)
        const response = await fetch("/api/spin/free", { method: "POST" });
        const data = await response.json();
        
        if (data.success) {
          setBalance(data.newBalance);
          setAdToast({ type: "success", message: "🎉 Free Spin Received! +500 $GIG" });
          
          // Fire small confetti
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
            colors: ["#00FF94", "#60a5fa"],
          });
        } else {
          setAdToast({ type: "error", message: data.error || "Failed to grant reward" });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ad skipped, no reward";
      setAdToast({ type: "error", message });
    } finally {
      setIsWatchingAd(false);
      
      // Auto-hide toast after 3 seconds
      setTimeout(() => setAdToast(null), 3000);
    }
  };

  const canSpin = balance >= SPIN_COST && !isSpinning;

  return (
    <div className="min-h-screen dark-gradient cyber-grid px-4 pt-6 pb-28 flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className="text-2xl font-bold text-white mb-1">
          🎰 Cyber Roulette
        </h1>
        <p className="text-white/50 text-sm">Test your luck, Agent</p>
      </motion.div>

      {/* Balance Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center mb-4"
      >
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-3">
          <Zap size={20} className="text-neon-green" />
          <div>
            <p className="text-xs text-white/50">Your Balance</p>
            <p className="text-xl font-bold text-neon-green">
              {balance.toLocaleString()} <span className="text-sm text-white/50">$GIG</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Prize Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center gap-2 mb-6 flex-wrap"
      >
        {SEGMENTS.filter(s => s.isPremium).map((segment) => (
          <div
            key={segment.type}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1",
              segment.type === "BIG" && "bg-neon-green/20 text-neon-green border border-neon-green/30",
              segment.type === "JACKPOT" && "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse"
            )}
          >
            <span>{segment.type === "BIG" ? "⭐" : "💎"}</span>
            <span>{segment.type}: {segment.amount.toLocaleString()} $GIG</span>
          </div>
        ))}
      </motion.div>

      {/* The Wheel */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute inset-[-20px] rounded-full bg-gradient-to-r from-neon-purple via-neon-green to-neon-purple opacity-30 blur-xl animate-pulse" />
          
          {/* Wheel pointer */}
          <div className="absolute top-[-15px] left-1/2 -translate-x-1/2 z-20">
            <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-neon-green drop-shadow-[0_0_10px_#00FF94]" />
          </div>

          {/* Main wheel container */}
          <div className="relative w-72 h-72 md:w-80 md:h-80">
            {/* Spinning wheel - rotates CLOCKWISE (positive degrees) */}
            <motion.div
              className="w-full h-full rounded-full relative overflow-hidden border-4 border-neon-purple shadow-[0_0_30px_rgba(112,0,255,0.5)]"
              animate={{ rotate: rotation }}
              transition={{
                duration: 5,
                ease: [0.17, 0.67, 0.12, 0.99], // Realistic slot machine easing
              }}
              style={{ transformOrigin: "center center" }}
            >
              {/* SVG Wheel */}
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Define glow filters */}
                <defs>
                  <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <filter id="glow-gold" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {SEGMENTS.map((segment, index) => {
                  const segmentAngle = 360 / SEGMENTS.length;
                  const startAngle = index * segmentAngle - 90; // Start from top
                  const endAngle = startAngle + segmentAngle;
                  
                  // Calculate path for pie segment
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;
                  const x1 = 50 + 50 * Math.cos(startRad);
                  const y1 = 50 + 50 * Math.sin(startRad);
                  const x2 = 50 + 50 * Math.cos(endRad);
                  const y2 = 50 + 50 * Math.sin(endRad);
                  
                  const largeArc = segmentAngle > 180 ? 1 : 0;
                  
                  // Text position (center of segment)
                  const textAngle = startAngle + segmentAngle / 2;
                  const textRad = (textAngle * Math.PI) / 180;
                  const textX = 50 + 32 * Math.cos(textRad);
                  const textY = 50 + 32 * Math.sin(textRad);
                  
                  // Get filter for premium segments
                  const getFilter = () => {
                    if (segment.type === "JACKPOT") return "url(#glow-gold)";
                    if (segment.type === "BIG") return "url(#glow-green)";
                    return undefined;
                  };
                  
                  return (
                    <g key={segment.type}>
                      {/* Premium segment border highlight */}
                      {segment.isPremium && (
                        <path
                          d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill="none"
                          stroke={segment.type === "JACKPOT" ? "#fbbf24" : "#00FF94"}
                          strokeWidth="2"
                          filter={getFilter()}
                        />
                      )}
                      <path
                        d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={segment.color}
                        stroke={segment.isPremium ? (segment.type === "JACKPOT" ? "#fbbf24" : "#00FF94") : "#333"}
                        strokeWidth={segment.isPremium ? "1" : "0.5"}
                      />
                      <text
                        x={textX}
                        y={textY}
                        fill={segment.textColor}
                        fontSize={segment.isPremium ? "9" : "8"}
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                        filter={getFilter()}
                      >
                        {segment.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </motion.div>

            {/* Center hub - Reactor core */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-bg-dark border-4 border-neon-purple shadow-[0_0_20px_rgba(112,0,255,0.8),inset_0_0_20px_rgba(112,0,255,0.3)] flex items-center justify-center z-10">
              <motion.div
                animate={{
                  boxShadow: isSpinning
                    ? ["0 0 10px #7000FF", "0 0 30px #00FF94", "0 0 10px #7000FF"]
                    : "0 0 10px #7000FF",
                }}
                transition={{ duration: 0.5, repeat: isSpinning ? Infinity : 0 }}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-green flex items-center justify-center"
              >
                <Sparkles size={20} className="text-white" />
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Spin Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8"
      >
        <motion.button
          whileTap={canSpin ? { scale: 0.95 } : undefined}
          onClick={handleSpin}
          disabled={!canSpin}
          className={cn(
            "w-full py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300",
            canSpin
              ? "bg-gradient-to-r from-neon-purple to-neon-green text-white shadow-[0_0_30px_rgba(0,255,148,0.4)]"
              : "bg-white/10 text-white/40 cursor-not-allowed"
          )}
        >
          {isSpinning ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <RotateCcw size={24} />
              </motion.div>
              SPINNING...
            </>
          ) : (
            <>
              <Zap size={24} />
              SPIN NOW ({SPIN_COST} $GIG)
            </>
          )}
        </motion.button>

        {balance < SPIN_COST && !isSpinning && (
          <p className="text-center text-red-400 text-sm mt-2">
            Not enough balance. Need {SPIN_COST} $GIG to spin.
          </p>
        )}
      </motion.div>

      {/* History Button */}
      <button
        onClick={() => setShowHistory(true)}
        className="flex items-center justify-center gap-2 text-white/50 hover:text-white mt-4 transition-colors"
      >
        <History size={16} />
        <span className="text-sm">View Spin History</span>
      </button>

      {/* Watch Ad Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-4"
      >
        <motion.button
          whileTap={!isWatchingAd ? { scale: 0.95 } : undefined}
          onClick={handleWatchAd}
          disabled={isWatchingAd || isSpinning || !isAdReady}
          className={cn(
            "w-full py-3 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300",
            "bg-transparent border-2 border-blue-400 text-blue-400",
            "hover:bg-blue-400/10 hover:shadow-[0_0_20px_rgba(96,165,250,0.3)]",
            (isWatchingAd || !isAdReady) && "opacity-50 cursor-not-allowed"
          )}
        >
          {isWatchingAd ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <RotateCcw size={18} />
              </motion.div>
              Loading Ad...
            </>
          ) : (
            <>
              <Play size={18} fill="currentColor" />
              WATCH AD (+1 FREE SPIN)
            </>
          )}
        </motion.button>
        
        {!isAdReady && (
          <p className="text-center text-white/40 text-xs mt-2">
            Ads loading...
          </p>
        )}
      </motion.div>

      {/* Ad Toast Notification */}
      <AnimatePresence>
        {adToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-32 left-4 right-4 z-50 p-4 rounded-xl flex items-center gap-3",
              "backdrop-blur-sm border",
              adToast.type === "success" 
                ? "bg-neon-green/20 border-neon-green/50 text-neon-green" 
                : "bg-red-500/20 border-red-500/50 text-red-400"
            )}
          >
            {adToast.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <X size={20} />
            )}
            <span className="font-medium text-sm">{adToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && spinResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
            onClick={closeResult}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "bg-bg-dark border-2 rounded-2xl p-6 w-full max-w-sm text-center",
                spinResult.rewardAmount > 0 ? "border-neon-green" : "border-red-500"
              )}
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mb-4"
              >
                {spinResult.rewardAmount > 0 ? (
                  <div className="w-20 h-20 mx-auto rounded-full bg-neon-green/20 flex items-center justify-center">
                    <Trophy size={40} className="text-neon-green" />
                  </div>
                ) : (
                  <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
                    <Skull size={40} className="text-red-500" />
                  </div>
                )}
              </motion.div>

              {/* Title */}
              <h2
                className={cn(
                  "text-2xl font-bold mb-2",
                  spinResult.rewardAmount > 0 ? "text-neon-green" : "text-red-500"
                )}
              >
                {spinResult.rewardAmount > 0 ? (
                  spinResult.result === "JACKPOT" ? "🎉 JACKPOT! 🎉" : "YOU WON!"
                ) : (
                  "BAD LUCK AGENT"
                )}
              </h2>

              {/* Amount */}
              {spinResult.rewardAmount > 0 ? (
                <div className="mb-4">
                  <p className="text-4xl font-bold text-white">
                    +{spinResult.rewardAmount.toLocaleString()}
                  </p>
                  <p className="text-white/50">$GIG</p>
                  <p className="text-sm text-neon-green mt-2">
                    Net gain: {spinResult.netGain > 0 ? "+" : ""}{spinResult.netGain} $GIG
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-white/70">You lost {SPIN_COST} $GIG</p>
                  <p className="text-sm text-white/50 mt-2">Better luck next time!</p>
                </div>
              )}

              {/* New Balance */}
              <div className="bg-white/5 rounded-xl p-3 mb-4">
                <p className="text-xs text-white/50">New Balance</p>
                <p className="text-xl font-bold text-white">
                  {spinResult.newBalance.toLocaleString()} $GIG
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeResult}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-white font-medium"
                >
                  Close
                </button>
                {spinResult.newBalance >= SPIN_COST && (
                  <button
                    onClick={() => {
                      closeResult();
                      setTimeout(handleSpin, 300);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-neon-purple text-white font-medium"
                  >
                    Spin Again
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Drawer */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 bg-bg-dark border-t border-white/10 rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Spin History</h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 rounded-full bg-white/10"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>

              {recentSpins.length === 0 ? (
                <p className="text-center text-white/50 py-8">
                  No spins yet. Try your luck!
                </p>
              ) : (
                <div className="space-y-3">
                  {recentSpins.map((spin) => (
                    <div
                      key={spin.id}
                      className="flex items-center justify-between bg-white/5 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            spin.amount > 0 ? "bg-neon-green/20" : "bg-red-500/20"
                          )}
                        >
                          {spin.amount > 0 ? (
                            <Trophy size={18} className="text-neon-green" />
                          ) : (
                            <Skull size={18} className="text-red-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">{spin.rewardType}</p>
                          <p className="text-xs text-white/50">
                            {new Date(spin.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p
                        className={cn(
                          "font-bold",
                          spin.amount > 0 ? "text-neon-green" : "text-red-500"
                        )}
                      >
                        {spin.amount > 0 ? `+${spin.amount}` : `-${SPIN_COST}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav activeTab="spin" />
    </div>
  );
}
