"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Users, Gift, Sparkles } from "lucide-react";
import { BottomNav } from "@/components/ui";
import "@/types/telegram";

interface Friend {
  id: string;
  username: string;
  telegramId: string;
  joinedAt: string;
  reward: number;
}

interface FriendsData {
  telegramId: string;
  referralCount: number;
  totalEarned: number;
  friends: Friend[];
}

// Bot username - replace with your actual bot username
const BOT_USERNAME = "GigXBot";

export default function FriendsPage() {
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<FriendsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await fetch("/api/friends");
        const result = await response.json();
        if (result.success) {
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch friends:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFriends();
  }, []);

  const referralLink = data?.telegramId 
    ? `https://t.me/${BOT_USERNAME}?start=ref_${data.telegramId}`
    : "";

  const handleCopyLink = () => {
    if (!referralLink) return;
    
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    
    // Trigger haptic feedback if available (Telegram WebApp)
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred("medium");
    }
    
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen dark-gradient cyber-grid px-4 pt-8 pb-28">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center mb-8"
      >
        <motion.div
          className="inline-flex items-center gap-2 mb-2"
          animate={{ 
            textShadow: [
              "0 0 20px rgba(0,255,148,0.5)",
              "0 0 40px rgba(0,255,148,0.8)",
              "0 0 20px rgba(0,255,148,0.5)"
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Users size={32} className="text-neon-green" />
          <h1 className="text-3xl font-bold text-neon-green neon-glow">
            INVITE SQUAD
          </h1>
        </motion.div>
        <p className="text-white/50 text-sm flex items-center justify-center gap-2">
          <Sparkles size={14} className="text-neon-purple" />
          Earn 10% from your buddies
          <Sparkles size={14} className="text-neon-purple" />
        </p>
      </motion.div>

      {/* Link Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-6"
      >
        <div className="bg-white/5 backdrop-blur-sm border border-neon-green/20 rounded-2xl p-4">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-2">
            Your Referral Link
          </p>
          <div className="bg-black/50 rounded-xl p-3 mb-4 overflow-hidden">
            <p className="text-white/80 text-sm font-mono truncate">
              {isLoading ? "Loading..." : referralLink || "No link available"}
            </p>
          </div>
          
          {/* Copy Button with Neon Glow */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCopyLink}
            disabled={!referralLink}
            className="relative w-full group"
          >
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-neon-green/30 rounded-xl blur-lg group-hover:bg-neon-green/50 transition-all duration-300" />
            
            {/* Button */}
            <div className="relative flex items-center justify-center gap-2 py-4 px-6 bg-neon-green text-bg-dark font-bold rounded-xl shadow-[0_0_20px_rgba(0,255,148,0.4)] group-hover:shadow-[0_0_30px_rgba(0,255,148,0.6)] transition-all duration-300">
              {copied ? (
                <>
                  <Check size={20} />
                  <span>COPIED!</span>
                </>
              ) : (
                <>
                  <Copy size={20} />
                  <span>COPY LINK</span>
                </>
              )}
            </div>
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex gap-4 mb-8"
      >
        <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center mx-auto mb-2">
            <Users size={20} className="text-neon-green" />
          </div>
          <p className="text-2xl font-bold text-white">
            {isLoading ? "-" : data?.referralCount || 0}
          </p>
          <p className="text-xs text-white/50">Friends</p>
        </div>
        
        <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-neon-purple/20 flex items-center justify-center mx-auto mb-2">
            <Gift size={20} className="text-neon-purple" />
          </div>
          <p className="text-2xl font-bold text-neon-green">
            {isLoading ? "-" : (data?.totalEarned || 0).toLocaleString()}
          </p>
          <p className="text-xs text-white/50">$GIG Earned</p>
        </div>
      </motion.div>

      {/* Friends List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Users size={18} className="text-neon-green" />
          Your Squad
        </h2>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-white/50 text-sm">Loading friends...</p>
          </div>
        ) : data?.friends && data.friends.length > 0 ? (
          <div className="space-y-3">
            {data.friends.map((friend, index) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex items-center gap-3"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-green/30 to-neon-purple/30 flex items-center justify-center text-white font-bold text-lg">
                  {friend.username.charAt(0).toUpperCase()}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {friend.username}
                  </p>
                  <p className="text-white/40 text-xs">
                    Joined {formatDate(friend.joinedAt)}
                  </p>
                </div>
                
                {/* Reward */}
                <div className="text-right">
                  <p className="text-neon-green font-bold">
                    +{friend.reward.toLocaleString()}
                  </p>
                  <p className="text-white/40 text-xs">$GIG</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-white/30" />
            </div>
            <p className="text-white/50 mb-2">No friends yet</p>
            <p className="text-white/30 text-sm">
              Share your link to start earning!
            </p>
          </div>
        )}
      </motion.div>

      {/* Bottom Navigation */}
      <BottomNav activeTab="friends" />
    </div>
  );
}
