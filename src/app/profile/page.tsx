"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Settings, 
  Shield, 
  Trophy, 
  Users, 
  Flame,
  Globe,
  HelpCircle,
  Wallet,
  ChevronRight,
  Coins
} from "lucide-react";
import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { NeonCard, BottomNav, LanguageDrawer } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import "@/types/telegram";

// Rank titles based on level
const RANK_TITLES: Record<number, string> = {
  1: "Novice Hunter",
  2: "Street Runner",
  3: "Data Miner",
  4: "Cyber Agent",
  5: "Elite Operator",
  6: "Shadow Master",
  7: "Digital Overlord",
  8: "Neon Legend",
  9: "Grid Phantom",
  10: "Cyber God",
};

const getRankTitle = (level: number): string => {
  return RANK_TITLES[Math.min(level, 10)] || "Novice Hunter";
};

const calculateLevel = (totalEarned: number): { level: number; xp: number; xpNeeded: number; progress: number } => {
  const xpPerLevel = 1000;
  const level = Math.floor(totalEarned / xpPerLevel) + 1;
  const xp = totalEarned % xpPerLevel;
  const xpNeeded = xpPerLevel;
  const progress = (xp / xpNeeded) * 100;
  return { level, xp, xpNeeded, progress };
};

interface ProfileStats {
  totalEarned: number;
  tasksDone: number;
  referrals: number;
  streak: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const [stats, setStats] = useState<ProfileStats>({
    totalEarned: 0,
    tasksDone: 0,
    referrals: 0,
    streak: 7, // Mock streak
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLangDrawerOpen, setIsLangDrawerOpen] = useState(false);
  const [language, setLanguage] = useState<"en" | "vi">("en");

  // Fetch user stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;

      try {
        // Fetch balance and tasks info
        const [tasksRes, friendsRes] = await Promise.all([
          fetch("/api/tasks", {
            headers: {
              "x-telegram-id": user.id.toString(),
            },
          }),
          fetch("/api/friends", {
            headers: {
              "x-telegram-id": user.id.toString(),
            },
          }),
        ]);
        
        const tasksData = await tasksRes.json();
        const friendsData = await friendsRes.json();

        const completedTasks = tasksData.tasks?.filter((t: { isCompleted: boolean }) => t.isCompleted)?.length || 0;

        setStats({
          totalEarned: tasksData.userBalance || 0,
          tasksDone: completedTasks,
          referrals: friendsData.referralCount || 0,
          streak: 7, // Mock for now
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  const { level, xp, xpNeeded, progress } = calculateLevel(stats.totalEarned);
  const username = user?.username || user?.first_name || "Agent";
  const photoUrl = user?.photo_url;

  const handleDisconnectWallet = () => {
    tonConnectUI.disconnect();
  };

  const handleConnectWallet = () => {
    tonConnectUI.openModal();
  };

  const handleOpenLanguage = () => {
    setIsLangDrawerOpen(true);
  };

  const handleOpenSupport = () => {
    window.open("https://t.me/GigXSupport", "_blank");
  };

  const handleFriends = () => {
    router.push("/friends");
  };

  const settingsItems = [
    { icon: <Users size={20} />, label: "Friends", action: handleFriends },
    { icon: <Globe size={20} />, label: "Language", action: handleOpenLanguage },
    { icon: <HelpCircle size={20} />, label: "Support", action: handleOpenSupport },
    ...(wallet
      ? [{ icon: <Wallet size={20} />, label: "Disconnect Wallet", action: handleDisconnectWallet, variant: "danger" as const }]
      : [{ icon: <Wallet size={20} />, label: "Connect Wallet", action: handleConnectWallet, variant: "primary" as const }]
    ),
  ];

  return (
    <div className="min-h-screen dark-gradient cyber-grid px-4 pt-8 pb-28">
      {/* Avatar Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="flex flex-col items-center mb-8"
      >
        {/* Avatar with rotating neon border */}
        <div className="relative mb-4">
          {/* Rotating neon ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-1 rounded-full"
            style={{
              background: "conic-gradient(from 0deg, #00FF94, #7000FF, #00FF94)",
              padding: "3px",
            }}
          >
            <div className="w-full h-full rounded-full bg-bg-dark" />
          </motion.div>
          
          {/* Glow effect */}
          <div className="absolute -inset-2 rounded-full bg-neon-green/20 blur-xl" />
          
          {/* Avatar image */}
          <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-bg-dark bg-gradient-to-br from-neon-green/20 to-neon-purple/20 flex items-center justify-center">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-neon-green">
                {username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Username with glitch effect */}
        <motion.h1
          className="text-2xl font-bold text-white mb-1 relative"
          animate={{
            textShadow: [
              "0 0 10px rgba(0,255,148,0.5)",
              "2px 0 10px rgba(112,0,255,0.5), -2px 0 10px rgba(0,255,148,0.5)",
              "0 0 10px rgba(0,255,148,0.5)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          @{username}
        </motion.h1>

        {/* Rank Title */}
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-neon-purple" />
          <span className="text-neon-purple text-sm font-medium">
            Level {level}: {getRankTitle(level)}
          </span>
        </div>
      </motion.div>

      {/* Level Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-white/50 text-xs uppercase tracking-wider">Experience</span>
          <span className="text-neon-green text-sm font-mono">
            XP: {xp.toLocaleString()}/{xpNeeded.toLocaleString()}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
          {/* Glow effect */}
          <div 
            className="absolute inset-y-0 left-0 bg-neon-green/30 blur-sm rounded-full"
            style={{ width: `${progress}%` }}
          />
          {/* Progress fill */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-neon-green to-neon-purple rounded-full"
          />
          {/* Shimmer effect */}
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
        </div>
        
        {/* Next level indicator */}
        <p className="text-white/30 text-xs mt-2 text-center">
          {(xpNeeded - xp).toLocaleString()} XP to Level {level + 1}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-3 mb-8"
      >
        <motion.div variants={itemVariants}>
          <NeonCard className="text-center">
            <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center mx-auto mb-2">
              <Coins size={20} className="text-neon-green" />
            </div>
            <p className="text-xl font-bold text-neon-green">
              {isLoading ? "-" : stats.totalEarned.toLocaleString()}
            </p>
            <p className="text-xs text-white/50">Total Earned</p>
          </NeonCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <NeonCard className="text-center">
            <div className="w-10 h-10 rounded-full bg-neon-purple/20 flex items-center justify-center mx-auto mb-2">
              <Trophy size={20} className="text-neon-purple" />
            </div>
            <p className="text-xl font-bold text-white">
              {isLoading ? "-" : stats.tasksDone}
            </p>
            <p className="text-xs text-white/50">Tasks Done</p>
          </NeonCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <NeonCard className="text-center">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
              <Users size={20} className="text-blue-400" />
            </div>
            <p className="text-xl font-bold text-white">
              {isLoading ? "-" : stats.referrals}
            </p>
            <p className="text-xs text-white/50">Referrals</p>
          </NeonCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <NeonCard className="text-center">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-2">
              <Flame size={20} className="text-orange-400" />
            </div>
            <p className="text-xl font-bold text-white">
              {isLoading ? "-" : stats.streak}
              <span className="text-sm text-white/50 ml-1">days</span>
            </p>
            <p className="text-xs text-white/50">Streak</p>
          </NeonCard>
        </motion.div>
      </motion.div>

      {/* Settings Menu */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Settings size={18} className="text-white/50" />
          <h2 className="text-lg font-bold text-white">Settings</h2>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          {settingsItems.map((item) => (
            <motion.button
              key={item.label}
              variants={itemVariants}
              whileTap={{ scale: 0.98 }}
              onClick={item.action}
              className={`w-full flex items-center justify-between p-4 rounded-xl backdrop-blur-sm border transition-all duration-300 ${
                item.variant === "danger"
                  ? "bg-red-500/10 border-red-500/20 hover:bg-red-500/20"
                  : item.variant === "primary"
                  ? "bg-neon-green/10 border-neon-green/20 hover:bg-neon-green/20"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={
                  item.variant === "danger" 
                    ? "text-red-400" 
                    : item.variant === "primary"
                    ? "text-neon-green"
                    : "text-white/60"
                }>
                  {item.icon}
                </span>
                <span className={
                  item.variant === "danger"
                    ? "text-red-400 font-medium"
                    : item.variant === "primary"
                    ? "text-neon-green font-medium"
                    : "text-white font-medium"
                }>
                  {item.label}
                </span>
              </div>
              <ChevronRight size={18} className="text-white/30" />
            </motion.button>
          ))}
        </motion.div>
      </motion.div>

      {/* Version info */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center text-white/20 text-xs mt-8"
      >
        GigX v1.0.0 • Powered by <span onClick={() => router.push("/admin")} className="cursor-pointer hover:text-white/40 transition-colors">TON</span>
      </motion.p>

      {/* Language Drawer */}
      <LanguageDrawer
        isOpen={isLangDrawerOpen}
        onClose={() => setIsLangDrawerOpen(false)}
        currentLang={language}
        onSelectLang={setLanguage}
      />

      {/* Bottom Navigation */}
      <BottomNav activeTab="profile" />
    </div>
  );
}
