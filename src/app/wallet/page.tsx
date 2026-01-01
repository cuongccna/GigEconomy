"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gem, Copy, Check, ArrowDownToLine } from "lucide-react";
import { useTonWallet, TonConnectButton } from "@tonconnect/ui-react";
import { BottomNav } from "@/components/ui";

export default function WalletPage() {
  const wallet = useTonWallet();
  const [copied, setCopied] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);

  // Fetch user balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await fetch("/api/tasks");
        const data = await response.json();
        setUserBalance(data.userBalance);
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      }
    };
    fetchBalance();
  }, []);

  // Format address to short version
  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const handleCopyAddress = () => {
    if (wallet?.account?.address) {
      navigator.clipboard.writeText(wallet.account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
        <h1 className="text-2xl font-bold text-white mb-2">Wallet</h1>
        <p className="text-white/50 text-sm">Connect & Withdraw your earnings</p>
      </motion.div>

      {/* 3D Gem Icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, rotateY: -180 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        transition={{ 
          duration: 0.8, 
          type: "spring",
          stiffness: 200,
          damping: 20
        }}
        className="flex justify-center mb-8"
      >
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-neon-purple/20 blur-3xl scale-150" />
          
          {/* Main gem container */}
          <motion.div
            animate={{ 
              rotateY: [0, 360],
              rotateZ: [-5, 5, -5]
            }}
            transition={{ 
              rotateY: { duration: 8, repeat: Infinity, ease: "linear" },
              rotateZ: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
            className="relative w-32 h-32 flex items-center justify-center"
            style={{ perspective: "1000px" }}
          >
            {/* Gem icon with 3D effect */}
            <div className="relative">
              <Gem 
                size={80} 
                className="text-neon-purple drop-shadow-[0_0_20px_rgba(112,0,255,0.8)]" 
                strokeWidth={1.5}
              />
              {/* Inner highlight */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Gem 
                  size={60} 
                  className="text-neon-green/30 blur-sm" 
                  strokeWidth={1}
                />
              </div>
            </div>
          </motion.div>
          
          {/* Sparkle effects */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full"
              style={{
                top: `${20 + Math.random() * 60}%`,
                left: `${20 + Math.random() * 60}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.4,
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Total Balance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-center mb-10"
      >
        <p className="text-white/50 text-xs uppercase tracking-[0.3em] mb-3">
          Total Balance
        </p>
        <div className="relative inline-block">
          <motion.h2 
            className="text-5xl md:text-6xl font-bold text-neon-green neon-glow"
            animate={{ 
              textShadow: [
                "0 0 20px rgba(0,255,148,0.5)",
                "0 0 40px rgba(0,255,148,0.8)",
                "0 0 20px rgba(0,255,148,0.5)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {userBalance.toLocaleString()}
          </motion.h2>
          <span className="absolute -right-16 top-1/2 -translate-y-1/2 text-xl font-bold text-neon-purple">
            $GIG
          </span>
        </div>
        <p className="text-white/30 text-sm mt-3">≈ ${(userBalance / 100).toFixed(2)} USD</p>
      </motion.div>

      {/* TON Connect Button with Neon Glow */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex justify-center mb-8"
      >
        <div className="relative group">
          {/* Neon glow effect */}
          <div className="absolute -inset-2 bg-neon-green/30 rounded-2xl blur-xl group-hover:bg-neon-green/50 transition-all duration-300" />
          
          {/* Button container with neon-green border */}
          <div className="relative bg-bg-dark border-2 border-neon-green rounded-xl p-3 shadow-[0_0_20px_rgba(0,255,148,0.4)] group-hover:shadow-[0_0_30px_rgba(0,255,148,0.6)] transition-shadow duration-300">
            <TonConnectButton />
          </div>
        </div>
      </motion.div>

      {/* Connected Wallet Info */}
      {wallet && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="bg-white/5 backdrop-blur-sm border border-neon-green/20 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center">
                  <Check size={20} className="text-neon-green" />
                </div>
                <div>
                  <p className="text-white/50 text-xs">Wallet Connected</p>
                  <p className="text-white font-mono text-sm">
                    {formatAddress(wallet.account?.address || "")}
                  </p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleCopyAddress}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                {copied ? (
                  <Check size={18} className="text-neon-green" />
                ) : (
                  <Copy size={18} className="text-white/60" />
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Withdraw Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="px-4"
      >
        <button
          disabled
          className="w-full py-4 px-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-3 cursor-not-allowed opacity-50"
        >
          <ArrowDownToLine size={20} className="text-white/40" />
          <span className="text-white/40 font-medium">Withdraw</span>
        </button>
        <p className="text-center text-white/30 text-xs mt-3">
          Min. Withdraw: <span className="text-neon-purple">50,000 $GIG</span>
        </p>
        <div className="mt-4 bg-neon-purple/10 border border-neon-purple/20 rounded-xl p-3">
          <p className="text-center text-white/50 text-xs">
            You need <span className="text-neon-green font-bold">{Math.max(0, 50000 - userBalance).toLocaleString()}</span> more $GIG to withdraw
          </p>
        </div>
      </motion.div>

      {/* Bottom Navigation */}
      <BottomNav activeTab="wallet" />
    </div>
  );
}
