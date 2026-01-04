"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Package,
  ShieldCheck,
  Zap,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
  Check,
  Bomb,
  Ghost,
  Radar,
  Flame,
  Users,
} from "lucide-react";
import { BottomNav } from "@/components/ui";
import ScreenWrapper from "@/components/ScreenWrapper";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  image: string;
  type: "consumable" | "permanent";
  effect: string;
  quantity: number;
  acquiredAt: string;
}

interface UseResult {
  success: boolean;
  message: string;
  effect?: {
    type: string;
    value?: number;
  };
  newBalance?: number;
}

// Default avatar for failed images
const DEFAULT_ITEM_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%231a1a2e' width='100' height='100'/%3E%3Ctext x='50' y='55' font-size='40' text-anchor='middle' fill='%239CA3AF'%3E📦%3C/text%3E%3C/svg%3E";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isUsing, setIsUsing] = useState(false);
  const [useResult, setUseResult] = useState<UseResult | null>(null);

  // Fetch inventory
  const fetchInventory = useCallback(async () => {
    try {
      setError(null);
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) {
        setError("Please open this app in Telegram");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/inventory", {
        headers: { "x-telegram-id": telegramId.toString() },
      });
      const data = await response.json();

      if (data.success) {
        setInventory(data.inventory);
        setBalance(data.balance);
      } else {
        setError(data.error || "Failed to load inventory");
      }
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
      setError("Failed to load inventory");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Use item
  const handleUseItem = async (item: InventoryItem) => {
    if (item.type === "permanent") {
      setUseResult({
        success: false,
        message: "This item is passive and always active!",
      });
      return;
    }

    setIsUsing(true);
    setUseResult(null);

    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) return;

      const response = await fetch("/api/inventory/use", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-id": telegramId.toString(),
        },
        body: JSON.stringify({ itemId: item.id }),
      });

      const data = await response.json();
      setUseResult({
        success: data.success,
        message: data.message || data.error,
        effect: data.effect,
        newBalance: data.newBalance,
      });

      if (data.success) {
        // Update balance if changed
        if (data.newBalance !== undefined) {
          setBalance(data.newBalance);
        }
        // Refresh inventory
        fetchInventory();
      }
    } catch (err) {
      console.error("Failed to use item:", err);
      setUseResult({
        success: false,
        message: "Failed to use item",
      });
    } finally {
      setIsUsing(false);
    }
  };

  // Get item icon based on type/effect
  const getItemIcon = (item: InventoryItem) => {
    try {
      const effect = JSON.parse(item.effect);
      switch (effect.type) {
        case "streak_shield":
        case "shield":
          return <ShieldCheck size={24} className="text-blue-400" />;
        case "luck_boost":
        case "spin_luck":
          return <Sparkles size={24} className="text-yellow-400" />;
        case "free_spin":
          return <Zap size={24} className="text-neon-purple" />;
        case "farming_boost":
          return <Flame size={24} className="text-orange-400" />;
        case "referral_boost":
          return <Users size={24} className="text-green-400" />;
        // PvP Items
        case "logic_bomb":
          return <Bomb size={24} className="text-red-400" />;
        case "phantom_wallet":
          return <Ghost size={24} className="text-purple-400" />;
        case "nano_spy_drone":
          return <Radar size={24} className="text-cyan-400" />;
        default:
          return <Package size={24} className="text-white/60" />;
      }
    } catch {
      return <Package size={24} className="text-white/60" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen dark-gradient cyber-grid flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Package size={48} className="text-neon-purple" />
        </motion.div>
      </div>
    );
  }

  return (
    <ScreenWrapper>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          <Package className="text-neon-purple" size={28} />
          <h1 className="text-3xl font-bold text-white tracking-wider">
            INVENTORY
          </h1>
        </div>
        <p className="text-white/50 text-sm">Your collected items</p>
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

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3"
        >
          <AlertCircle size={20} className="text-red-400" />
          <p className="text-red-400 flex-1">{error}</p>
          <button
            onClick={() => {
              setIsLoading(true);
              fetchInventory();
            }}
            className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
          >
            <RefreshCw size={16} className="text-red-400" />
          </button>
        </motion.div>
      )}

      {/* Empty State */}
      {!error && inventory.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
            <Package size={48} className="text-white/30" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Items Yet</h3>
          <p className="text-white/50 mb-6">Visit the shop to get power-ups!</p>
          <a
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-neon-purple text-white font-bold hover:bg-neon-purple/80 transition-colors"
          >
            <Sparkles size={18} />
            Visit Shop
          </a>
        </motion.div>
      )}

      {/* Inventory Grid */}
      {inventory.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 gap-3"
        >
          {inventory.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedItem(item)}
              className={cn(
                "p-4 rounded-2xl cursor-pointer",
                "bg-gradient-to-br from-white/5 to-white/[0.02]",
                "border border-white/10",
                "hover:border-neon-purple/50",
                "hover:shadow-[0_0_20px_rgba(128,0,255,0.2)]",
                "transition-all duration-300"
              )}
            >
              {/* Item Image */}
              <div className="relative w-16 h-16 mx-auto mb-3">
                <Image
                  src={item.image || DEFAULT_ITEM_IMAGE}
                  alt={item.name}
                  width={64}
                  height={64}
                  className="rounded-xl object-cover"
                  unoptimized
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_ITEM_IMAGE;
                  }}
                />
                {/* Quantity Badge */}
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-neon-purple text-white text-xs font-bold flex items-center justify-center">
                  {item.quantity}
                </div>
              </div>

              {/* Item Name */}
              <p className="text-white font-bold text-sm text-center truncate">
                {item.name}
              </p>

              {/* Item Type Badge */}
              <div className="flex justify-center mt-2">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    item.type === "permanent"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-neon-green/20 text-neon-green"
                  )}
                >
                  {item.type === "permanent" ? "Passive" : "Consumable"}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => {
              setSelectedItem(null);
              setUseResult(null);
            }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md max-h-[80vh] rounded-t-3xl bg-gradient-to-b from-gray-900 to-black border-t border-white/10 overflow-hidden flex flex-col"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setUseResult(null);
                }}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 pb-32">

              {/* Item Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative w-20 h-20">
                  <Image
                    src={selectedItem.image || DEFAULT_ITEM_IMAGE}
                    alt={selectedItem.name}
                    width={80}
                    height={80}
                    className="rounded-xl object-cover"
                    unoptimized
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_ITEM_IMAGE;
                    }}
                  />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-neon-purple text-white text-sm font-bold flex items-center justify-center">
                    {selectedItem.quantity}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedItem.name}
                  </h3>
                  <span
                    className={cn(
                      "inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase mt-1",
                      selectedItem.type === "permanent"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-neon-green/20 text-neon-green"
                    )}
                  >
                    {selectedItem.type === "permanent" ? "Passive" : "Consumable"}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-white/60 mb-6">{selectedItem.description}</p>

              {/* Effect Info */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
                <div className="flex items-center gap-3">
                  {getItemIcon(selectedItem)}
                  <div>
                    <p className="text-white/40 text-xs uppercase">Effect</p>
                    <p className="text-white font-medium">
                      {(() => {
                        try {
                          const effect = JSON.parse(selectedItem.effect);
                          switch (effect.type) {
                            case "streak_shield":
                              return "Protects your daily streak if you miss a day";
                            case "shield":
                              return "Protects against one PvP attack";
                            case "luck_boost":
                            case "spin_luck":
                              return `+${effect.bonusChance ? (effect.bonusChance * 100) : effect.value || 5}% luck on spins`;
                            case "free_spin":
                              return `Get ${effect.gigValue || 500} $GIG (one free spin value)`;
                            case "farming_boost":
                              return `${((effect.multiplier - 1) * 100).toFixed(0)}% farming speed boost`;
                            case "referral_boost":
                              return `${effect.multiplier}x referral rewards for 24 hours`;
                            // PvP Items
                            case "logic_bomb":
                              return `Counter-attack trap: Attacker loses ${effect.penalty || 2000} $GIG to you`;
                            case "phantom_wallet":
                              return "Hide your real balance from enemy scans";
                            case "nano_spy_drone":
                              return "See through Phantom Wallets during target scan";
                            default:
                              return effect.description || "Special effect active";
                          }
                        } catch {
                          return selectedItem.effect || "Unknown effect";
                        }
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Use Result */}
              {useResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-4 rounded-xl mb-6 flex items-center gap-3",
                    useResult.success
                      ? "bg-neon-green/10 border border-neon-green/30"
                      : "bg-red-500/10 border border-red-500/30"
                  )}
                >
                  {useResult.success ? (
                    <Check size={20} className="text-neon-green" />
                  ) : (
                    <AlertCircle size={20} className="text-red-400" />
                  )}
                  <p className={useResult.success ? "text-neon-green" : "text-red-400"}>
                    {useResult.message}
                  </p>
                </motion.div>
              )}
              </div>

              {/* Action Button - Fixed at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-6 pt-4 bg-gradient-to-t from-black via-black to-transparent">
                {selectedItem.type === "consumable" && selectedItem.quantity > 0 && (
                  <button
                    onClick={() => handleUseItem(selectedItem)}
                    disabled={isUsing}
                    className={cn(
                      "w-full py-4 rounded-xl font-bold text-lg",
                      "bg-gradient-to-r from-neon-purple to-neon-green",
                      "text-white shadow-[0_0_20px_rgba(128,0,255,0.4)]",
                      "hover:shadow-[0_0_30px_rgba(128,0,255,0.6)]",
                      "transition-all duration-300",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isUsing ? (
                      <Loader2 className="animate-spin mx-auto" size={24} />
                    ) : (
                      "USE ITEM"
                    )}
                  </button>
                )}

                {selectedItem.type === "permanent" && (
                  <div className="w-full py-4 rounded-xl bg-blue-500/20 text-blue-400 text-center font-bold">
                    ✨ Always Active
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNav activeTab="home" />
    </ScreenWrapper>
  );
}
