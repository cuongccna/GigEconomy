"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Swords, 
  Shield, 
  Skull, 
  Zap, 
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw
} from "lucide-react";
import { BottomNav } from "@/components/ui";
import { cn } from "@/lib/utils";

interface TargetInfo {
  id: string;
  name: string;
  avatar: string;
  balanceRange: string;
  winChance: string;
}

type BattleResult = "WIN" | "LOSE" | "SHIELDED" | null;

interface BattleState {
  phase: "idle" | "scanning" | "target-found" | "hacking" | "result";
  target: TargetInfo | null;
  result: BattleResult;
  amount: number;
  message: string;
}

// Terminal typing animation text
const HACKING_SEQUENCE = [
  "Initializing connection...",
  "Routing through proxy servers...",
  "Bypassing firewall...",
  "Injecting payload...",
  "Accessing target wallet...",
  "Extracting funds...",
];

export default function PvPPage() {
  const [balance, setBalance] = useState(0);
  const [battleState, setBattleState] = useState<BattleState>({
    phase: "idle",
    target: null,
    result: null,
    amount: 0,
    message: "",
  });
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [noTargets, setNoTargets] = useState(false);

  // Fetch user balance
  const fetchBalance = useCallback(async () => {
    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) return;

      const response = await fetch("/api/auth", {
        headers: { "x-telegram-id": telegramId.toString() },
      });
      const data = await response.json();
      if (data.user) {
        setBalance(data.user.balance);
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Scan for target
  const scanForTarget = async () => {
    setBattleState({ ...battleState, phase: "scanning", target: null });
    setNoTargets(false);

    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) return;

      // Simulate scanning animation delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const response = await fetch("/api/pvp/search", {
        headers: { "x-telegram-id": telegramId.toString() },
      });
      const data = await response.json();

      if (data.success && data.target) {
        setBattleState({
          phase: "target-found",
          target: data.target,
          result: null,
          amount: 0,
          message: "",
        });
      } else if (data.noTargets) {
        setNoTargets(true);
        setBattleState({ ...battleState, phase: "idle" });
      }
    } catch (error) {
      console.error("Scan failed:", error);
      setBattleState({ ...battleState, phase: "idle" });
    }
  };

  // Execute attack
  const executeAttack = async () => {
    if (!battleState.target) return;

    setBattleState({ ...battleState, phase: "hacking" });
    setTerminalLines([]);

    // Animate terminal lines
    for (let i = 0; i < HACKING_SEQUENCE.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setTerminalLines((prev) => [...prev, HACKING_SEQUENCE[i]]);
    }

    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) return;

      const response = await fetch("/api/pvp/attack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-id": telegramId.toString(),
        },
        body: JSON.stringify({ targetId: battleState.target.id }),
      });
      const data = await response.json();

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (data.success) {
        setBattleState({
          ...battleState,
          phase: "result",
          result: data.result,
          amount: data.amount,
          message: data.message,
        });
        fetchBalance();
      } else if (data.cooldownRemaining) {
        setCooldownRemaining(data.cooldownRemaining);
        setBattleState({ ...battleState, phase: "idle", target: null });
      } else {
        setBattleState({
          ...battleState,
          phase: "result",
          result: "LOSE",
          amount: 0,
          message: data.message || "Attack failed!",
        });
      }
    } catch (error) {
      console.error("Attack failed:", error);
      setBattleState({ ...battleState, phase: "idle" });
    }
  };

  // Reset to idle state
  const resetBattle = () => {
    setBattleState({
      phase: "idle",
      target: null,
      result: null,
      amount: 0,
      message: "",
    });
    setTerminalLines([]);
  };

  // Format cooldown
  const formatCooldown = (ms: number) => {
    const minutes = Math.ceil(ms / (60 * 1000));
    return `${minutes} min`;
  };

  return (
    <div className="min-h-screen dark-gradient cyber-grid px-4 pt-8 pb-28">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Swords className="text-red-500" size={28} />
          <h1 className="text-3xl font-bold text-white tracking-wider">
            CYBER HEIST
          </h1>
          <Skull className="text-red-500" size={28} />
        </div>
        <p className="text-white/50 text-sm">Hack other players. Steal their $GIG.</p>
      </motion.div>

      {/* Balance Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center mb-8"
      >
        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Your Balance</p>
        <p className="text-4xl font-bold text-neon-green neon-glow">
          {balance.toLocaleString()} <span className="text-lg text-neon-purple">$GIG</span>
        </p>
      </motion.div>

      {/* Cooldown Warning */}
      <AnimatePresence>
        {cooldownRemaining && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center"
          >
            <AlertTriangle className="inline-block text-yellow-400 mb-2" size={24} />
            <p className="text-yellow-300 text-sm">
              Cooldown active! Wait {formatCooldown(cooldownRemaining)} before next attack.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Targets Warning */}
      <AnimatePresence>
        {noTargets && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center"
          >
            <Target className="inline-block text-blue-400 mb-2" size={24} />
            <p className="text-blue-300 text-sm">
              No targets available. Everyone is too poor to rob!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Arena Area */}
      <div className="relative min-h-[400px] flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {/* IDLE STATE - Scan Button */}
          {battleState.phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-center"
            >
              <motion.button
                onClick={scanForTarget}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative w-48 h-48 rounded-full",
                  "bg-gradient-to-br from-red-600/20 to-red-900/20",
                  "border-2 border-red-500/50",
                  "flex flex-col items-center justify-center gap-3",
                  "shadow-[0_0_40px_rgba(255,0,0,0.3)]",
                  "hover:shadow-[0_0_60px_rgba(255,0,0,0.5)]",
                  "transition-all duration-300"
                )}
              >
                <Target size={48} className="text-red-400" />
                <span className="text-white font-bold text-lg">SCAN</span>
                <span className="text-white/50 text-xs">Find Target</span>
                
                {/* Pulsing ring */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-red-500/50"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.button>
            </motion.div>
          )}

          {/* SCANNING STATE - Radar Animation */}
          {battleState.phase === "scanning" && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="relative w-64 h-64 mx-auto mb-4">
                {/* Radar circles */}
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border border-red-500/30"
                    style={{ scale: 0.3 + i * 0.25 }}
                  />
                ))}
                
                {/* Scanning line */}
                <motion.div
                  className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-red-500 to-transparent origin-left"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                
                {/* Center dot */}
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </div>
              <p className="text-red-400 font-mono text-lg animate-pulse">
                SCANNING FOR TARGETS...
              </p>
            </motion.div>
          )}

          {/* TARGET FOUND STATE */}
          {battleState.phase === "target-found" && battleState.target && (
            <motion.div
              key="target-found"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm"
            >
              {/* Target Card */}
              <motion.div
                className={cn(
                  "p-6 rounded-2xl",
                  "bg-gradient-to-br from-red-900/30 to-black/50",
                  "border border-red-500/30",
                  "shadow-[0_0_30px_rgba(255,0,0,0.2)]"
                )}
                animate={{
                  boxShadow: [
                    "0 0 30px rgba(255,0,0,0.2)",
                    "0 0 50px rgba(255,0,0,0.4)",
                    "0 0 30px rgba(255,0,0,0.2)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <p className="text-red-400 text-xs uppercase tracking-wider text-center mb-4">
                  ⚠️ TARGET ACQUIRED ⚠️
                </p>
                
                {/* Avatar */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <Image
                      src={battleState.target.avatar}
                      alt="Target"
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-full border-2 border-red-500/50"
                      unoptimized
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-red-500"
                      animate={{ scale: [1, 1.2], opacity: [1, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  </div>
                </div>

                {/* Target Info */}
                <div className="text-center mb-6">
                  <p className="text-white font-bold text-lg mb-1">
                    {battleState.target.name}
                  </p>
                  <p className="text-white/50 text-sm mb-3">
                    Estimated Loot: <span className="text-yellow-400 font-bold">{battleState.target.balanceRange}</span>
                  </p>
                  <p className="text-white/40 text-xs">
                    Win Chance: <span className="text-neon-green">{battleState.target.winChance}</span>
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <motion.button
                    onClick={resetBattle}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-white/60 font-medium flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={18} />
                    Rescan
                  </motion.button>
                  <motion.button
                    onClick={executeAttack}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl font-bold",
                      "bg-gradient-to-r from-red-600 to-red-500",
                      "text-white shadow-[0_0_20px_rgba(255,0,0,0.4)]",
                      "flex items-center justify-center gap-2"
                    )}
                  >
                    <Zap size={18} />
                    HACK
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* HACKING STATE - Terminal Animation */}
          {battleState.phase === "hacking" && (
            <motion.div
              key="hacking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm"
            >
              <div className={cn(
                "p-4 rounded-xl",
                "bg-black/80 border border-green-500/30",
                "font-mono text-sm"
              )}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-500/20">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-green-500/50 text-xs ml-2">terminal</span>
                </div>
                
                <div className="space-y-1 min-h-[200px]">
                  {terminalLines.map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-green-400"
                    >
                      <span className="text-green-600">$ </span>
                      {line}
                    </motion.div>
                  ))}
                  <motion.span
                    className="inline-block w-2 h-4 bg-green-500"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* RESULT STATE */}
          {battleState.phase === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-full max-w-sm text-center"
            >
              {/* WIN */}
              {battleState.result === "WIN" && (
                <motion.div
                  className={cn(
                    "p-8 rounded-2xl",
                    "bg-gradient-to-br from-green-900/50 to-green-950/50",
                    "border-2 border-green-500",
                    "shadow-[0_0_50px_rgba(0,255,0,0.3)]"
                  )}
                  initial={{ boxShadow: "0 0 0px rgba(0,255,0,0)" }}
                  animate={{ boxShadow: "0 0 100px rgba(0,255,0,0.5)" }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                  >
                    <CheckCircle2 size={64} className="text-green-400 mx-auto mb-4" />
                  </motion.div>
                  <h2 className="text-3xl font-bold text-green-400 mb-2">
                    ACCESS GRANTED
                  </h2>
                  <p className="text-white/70 mb-4">{battleState.message}</p>
                  <p className="text-4xl font-bold text-neon-green">
                    +{battleState.amount.toLocaleString()} $GIG
                  </p>
                </motion.div>
              )}

              {/* LOSE */}
              {battleState.result === "LOSE" && (
                <motion.div
                  className={cn(
                    "p-8 rounded-2xl",
                    "bg-gradient-to-br from-red-900/50 to-red-950/50",
                    "border-2 border-red-500",
                    "shadow-[0_0_50px_rgba(255,0,0,0.3)]"
                  )}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                    transition={{ type: "spring", delay: 0.2 }}
                  >
                    <XCircle size={64} className="text-red-400 mx-auto mb-4" />
                  </motion.div>
                  <h2 className="text-3xl font-bold text-red-400 mb-2">
                    ACCESS DENIED
                  </h2>
                  <p className="text-white/70 mb-4">{battleState.message}</p>
                  <p className="text-2xl font-bold text-red-400">
                    -{battleState.amount.toLocaleString()} $GIG
                  </p>
                </motion.div>
              )}

              {/* SHIELDED */}
              {battleState.result === "SHIELDED" && (
                <motion.div
                  className={cn(
                    "p-8 rounded-2xl",
                    "bg-gradient-to-br from-blue-900/50 to-blue-950/50",
                    "border-2 border-blue-500",
                    "shadow-[0_0_50px_rgba(0,100,255,0.3)]"
                  )}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                  >
                    <Shield size={64} className="text-blue-400 mx-auto mb-4" />
                  </motion.div>
                  <h2 className="text-3xl font-bold text-blue-400 mb-2">
                    SHIELD ACTIVE
                  </h2>
                  <p className="text-white/70 mb-4">{battleState.message}</p>
                  <p className="text-lg text-blue-300">
                    Target&apos;s shield blocked your attack!
                  </p>
                </motion.div>
              )}

              {/* Try Again Button */}
              <motion.button
                onClick={resetBattle}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "mt-6 w-full py-4 rounded-xl font-bold",
                  "bg-white/10 text-white",
                  "border border-white/20",
                  "flex items-center justify-center gap-2"
                )}
              >
                <RefreshCw size={20} />
                Hunt Again
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav activeTab="play" />
    </div>
  );
}
