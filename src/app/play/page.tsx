"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Disc3,
  Swords,
  Sparkles,
  Zap,
  ChevronRight,
  Timer,
  Shield,
  Coins,
  Skull,
  Star,
} from "lucide-react";
import { BottomNav } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function PlayPage() {
  const [balance, setBalance] = useState(0);

  // Fetch user balance
  const fetchUserData = useCallback(async () => {
    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) return;

      const response = await fetch(`/api/auth?telegramId=${telegramId}`);
      const data = await response.json();
      if (data.user) {
        setBalance(data.user.balance);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const games = [
    {
      id: "spin",
      title: "Cyber Roulette",
      subtitle: "Test Your Luck",
      description: "Spin the wheel and win up to 10,000 $GIG! Each spin costs 500 $GIG.",
      icon: <Disc3 size={48} className="text-neon-purple" />,
      href: "/spin",
      gradient: "from-purple-900/50 via-purple-800/30 to-purple-950/50",
      borderColor: "border-purple-500/40",
      buttonColor: "bg-neon-purple",
      buttonText: "SPIN NOW",
      features: [
        { icon: <Coins size={14} />, text: "500 $GIG per spin" },
        { icon: <Star size={14} />, text: "Win up to 10,000 $GIG" },
        { icon: <Sparkles size={14} />, text: "Lucky Charm boosts odds" },
      ],
    },
    {
      id: "pvp",
      title: "Cyber Heist",
      subtitle: "Hack Other Agents",
      description: "Attack other players and steal their $GIG! Be careful - they might have shields.",
      icon: <Swords size={48} className="text-red-400" />,
      href: "/pvp",
      gradient: "from-red-900/50 via-red-800/30 to-red-950/50",
      borderColor: "border-red-500/40",
      buttonColor: "bg-red-500",
      buttonText: "FIND TARGET",
      features: [
        { icon: <Skull size={14} />, text: "Steal 5% of target's balance" },
        { icon: <Shield size={14} />, text: "Shields block attacks" },
        { icon: <Timer size={14} />, text: "1 hour cooldown" },
      ],
    },
  ];

  return (
    <div className="min-h-screen dark-gradient cyber-grid px-4 pt-8 pb-28">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Zap className="text-neon-green" size={28} />
          <h1 className="text-3xl font-bold text-white tracking-wider">
            GAME HUB
          </h1>
          <Zap className="text-neon-green" size={28} />
        </div>
        <p className="text-white/50 text-sm">Play games. Win $GIG. Dominate.</p>
      </motion.div>

      {/* Balance Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center mb-8"
      >
        <div className="inline-block px-6 py-3 rounded-2xl bg-black/50 border border-white/10">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Your Balance</p>
          <p className="text-3xl font-bold text-neon-green neon-glow">
            {balance.toLocaleString()} <span className="text-lg text-neon-purple">$GIG</span>
          </p>
        </div>
      </motion.div>

      {/* Game Cards */}
      <div className="space-y-4">
        {games.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.15 }}
          >
            <div
              className={cn(
                "p-5 rounded-2xl",
                "bg-gradient-to-br",
                game.gradient,
                "border",
                game.borderColor,
                "backdrop-blur-xl",
                "shadow-[0_0_30px_rgba(0,0,0,0.3)]"
              )}
            >
              {/* Header Row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{ rotate: game.id === "spin" ? 360 : 0 }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-16 h-16 rounded-2xl bg-black/30 flex items-center justify-center"
                  >
                    {game.icon}
                  </motion.div>
                  <div>
                    <h2 className="text-white font-bold text-xl">{game.title}</h2>
                    <p className="text-white/50 text-sm">{game.subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-white/60 text-sm mb-4">{game.description}</p>

              {/* Features */}
              <div className="flex flex-wrap gap-3 mb-5">
                {game.features.map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10"
                  >
                    <span className="text-white/60">{feature.icon}</span>
                    <span className="text-white/70 text-xs">{feature.text}</span>
                  </div>
                ))}
              </div>

              {/* Play Button */}
              <Link href={game.href}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "w-full py-4 rounded-xl font-bold text-lg",
                    game.buttonColor,
                    "text-white",
                    "flex items-center justify-center gap-2",
                    "shadow-lg",
                    game.id === "spin"
                      ? "shadow-purple-500/30"
                      : "shadow-red-500/30"
                  )}
                >
                  {game.buttonText}
                  <ChevronRight size={20} />
                </motion.button>
              </Link>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Coming Soon Teaser */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6"
      >
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 border-dashed">
          <div className="flex items-center justify-center gap-3 py-4">
            <Sparkles size={20} className="text-white/30" />
            <p className="text-white/30 text-sm font-medium">More games coming soon...</p>
            <Sparkles size={20} className="text-white/30" />
          </div>
        </div>
      </motion.div>

      {/* Bottom Navigation */}
      <BottomNav activeTab="play" />
    </div>
  );
}
