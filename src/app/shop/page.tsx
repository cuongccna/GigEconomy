"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Zap,
  Shield,
  Sparkles,
  Cpu,
  Users,
  X,
  Check,
  Loader2,
  Package,
  Play,
} from "lucide-react";
import { BottomNav } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import confetti from "canvas-confetti";

// Types
interface ItemEffect {
  type: string;
  description: string;
  [key: string]: unknown;
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  type: "consumable" | "permanent";
  effect: ItemEffect;
  owned: boolean;
  quantity: number;
  canBuy: boolean;
}

interface OwnedItem {
  itemId: string;
  name: string;
  quantity: number;
  acquiredAt: string;
  type?: string;
  effectType?: string;
}

// Icon mapping for items
const getItemIcon = (name: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    "Streak Shield": <Shield size={32} className="text-blue-400" />,
    "Energy Drink": <Zap size={32} className="text-yellow-400" />,
    "Mining Rig Lv2": <Cpu size={32} className="text-neon-green" />,
    "Lucky Charm": <Sparkles size={32} className="text-purple-400" />,
    "Referral Booster": <Users size={32} className="text-pink-400" />,
  };
  return iconMap[name] || <Package size={32} className="text-white/60" />;
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ShopPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [ownedItems, setOwnedItems] = useState<OwnedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isUsingItem, setIsUsingItem] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showInventory, setShowInventory] = useState(false);

  // Fetch shop data
  const fetchShop = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch("/api/shop", {
        headers: {
          "x-telegram-id": user.id.toString(),
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch shop");
      }

      const data = await response.json();
      
      if (data.items) {
        setItems(data.items);
        setBalance(data.userBalance || 0);
        setOwnedItems(data.ownedItems || []);
      } else {
        // Handle empty shop
        setItems([]);
        setBalance(data.userBalance || 0);
        setOwnedItems([]);
      }
    } catch (error) {
      console.error("Failed to fetch shop:", error);
      setItems([]);
      setBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  // Handle purchase
  const handlePurchase = async () => {
    if (!selectedItem || isPurchasing || !user?.id) return;

    setIsPurchasing(true);

    try {
      const response = await fetch("/api/shop/buy", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-telegram-id": user.id.toString(),
        },
        body: JSON.stringify({ itemId: selectedItem.id }),
      });

      const data = await response.json();

      if (data.success) {
        // Update balance
        setBalance(data.newBalance);

        // Play success effects
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#00FF94", "#7000FF", "#FFD700"],
        });

        // Haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred("success");
        }

        // Show toast
        setToast({ type: "success", message: `🛒 Purchased ${selectedItem.name}!` });

        // Refresh shop data
        fetchShop();

        // Close modal
        setSelectedItem(null);
      } else {
        setToast({ type: "error", message: data.error || "Purchase failed" });
      }
    } catch (error) {
      console.error("Purchase error:", error);
      setToast({ type: "error", message: "Failed to complete purchase" });
    } finally {
      setIsPurchasing(false);
    }
  };

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Handle use item
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleUseItem = async (itemId: string, itemName: string) => {
    if (isUsingItem || !user?.id) return;

    setIsUsingItem(itemId);

    try {
      const response = await fetch("/api/inventory/use", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-telegram-id": user.id.toString(),
        },
        body: JSON.stringify({ itemId }),
      });

      const data = await response.json();

      if (data.success) {
        // Different effects based on item type
        if (data.effect === "free_spin") {
          // Energy Drink - confetti + update balance
          confetti({
            particleCount: 100,
            spread: 90,
            origin: { y: 0.6 },
            colors: ["#FFD700", "#FFA500", "#FFFF00"],
          });
          if (data.newBalance) {
            setBalance(data.newBalance);
          }
        } else if (data.effect === "streak_shield") {
          // Shield - blue confetti
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#60A5FA", "#3B82F6", "#2563EB"],
          });
        }

        // Haptic feedback
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred("success");
        }

        // Show toast
        setToast({ type: "success", message: data.message });

        // Refresh shop data
        fetchShop();
      } else {
        setToast({ type: "error", message: data.error || "Failed to use item" });
      }
    } catch (error) {
      console.error("Use item error:", error);
      setToast({ type: "error", message: "Failed to use item" });
    } finally {
      setIsUsingItem(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen dark-gradient cyber-grid flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <ShoppingBag size={48} className="text-neon-green" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark-gradient cyber-grid px-4 pt-6 pb-32">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <ShoppingBag size={28} className="text-neon-purple" />
          <h1 className="text-2xl font-bold text-white cyber-text">
            CYBER MARKET
          </h1>
        </div>
        <p className="text-white/50 text-sm">Upgrade your gear, Agent.</p>
      </motion.div>

      {/* Balance - Sticky */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="sticky top-2 z-20 mb-6"
      >
        <div className="flex items-center justify-between p-4 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-neon-green" />
            <span className="text-white/70 text-sm">Your Balance</span>
          </div>
          <span className="text-xl font-bold text-neon-green">
            {balance.toLocaleString()} $GIG
          </span>
        </div>
      </motion.div>

      {/* Inventory Toggle */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => setShowInventory(!showInventory)}
        className="w-full mb-4 p-3 rounded-xl bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Package size={18} className="text-neon-purple" />
          <span className="text-white text-sm">My Inventory</span>
        </div>
        <span className="text-neon-purple text-sm">
          {ownedItems.length} items
        </span>
      </motion.button>

      {/* Inventory Panel */}
      <AnimatePresence>
        {showInventory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="p-4 rounded-xl bg-black/40 border border-white/10">
              {ownedItems.length === 0 ? (
                <p className="text-white/40 text-sm text-center">
                  No items yet. Start shopping!
                </p>
              ) : (
                <div className="space-y-3">
                  {ownedItems.map((ownedItem) => {
                    // Find full item details
                    const fullItem = items.find(i => i.id === ownedItem.itemId);
                    const isPermanent = fullItem?.type === "permanent";
                    const isUsing = isUsingItem === ownedItem.itemId;

                    return (
                      <div
                        key={ownedItem.itemId}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-black/50 flex items-center justify-center">
                            {getItemIcon(ownedItem.name)}
                          </div>
                          <div>
                            <span className="text-white text-sm font-medium block">
                              {ownedItem.name}
                            </span>
                            <span className="text-white/50 text-xs">
                              {isPermanent ? "Always Active" : `Qty: ${ownedItem.quantity}`}
                            </span>
                          </div>
                        </div>
                        
                        {/* Use Button - Only for consumables */}
                        {!isPermanent && ownedItem.quantity > 0 ? (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUseItem(ownedItem.itemId, ownedItem.name);
                            }}
                            disabled={isUsing}
                            className={cn(
                              "px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all",
                              isUsing
                                ? "bg-white/10 text-white/50"
                                : "bg-neon-green text-black hover:shadow-[0_0_15px_rgba(0,255,148,0.5)]"
                            )}
                          >
                            {isUsing ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Using...
                              </>
                            ) : (
                              <>
                                <Play size={14} fill="currentColor" />
                                USE
                              </>
                            )}
                          </motion.button>
                        ) : isPermanent ? (
                          <span className="px-3 py-1.5 rounded-lg bg-neon-purple/20 text-neon-purple text-xs font-medium border border-neon-purple/30">
                            ✓ ACTIVE
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-4"
      >
        {items.map((item) => {
          const canAfford = balance >= item.price;
          const isOwned = item.type === "permanent" && item.owned;

          return (
            <motion.div
              key={item.id}
              variants={itemVariants}
              whileTap={{ scale: 0.98 }}
              onClick={() => !isOwned && setSelectedItem(item)}
              className={cn(
                "relative p-4 rounded-xl cursor-pointer transition-all duration-300",
                "bg-black/50 backdrop-blur-xl border",
                isOwned
                  ? "border-neon-green/50 opacity-70"
                  : canAfford
                  ? "border-white/10 hover:border-neon-green/50 hover:shadow-[0_0_20px_rgba(0,255,148,0.2)]"
                  : "border-white/10 opacity-60"
              )}
            >
              {/* Owned Badge */}
              {isOwned && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-neon-green/20 border border-neon-green/50">
                  <span className="text-neon-green text-xs">OWNED</span>
                </div>
              )}

              {/* Item Type Badge */}
              <div className={cn(
                "absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs",
                item.type === "permanent"
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              )}>
                {item.type === "permanent" ? "PERM" : "USE"}
              </div>

              {/* Item Icon */}
              <div className="flex justify-center my-6">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {getItemIcon(item.name)}
                </motion.div>
              </div>

              {/* Item Info */}
              <div className="text-center">
                <h3 className="text-white font-semibold text-sm mb-1 truncate">
                  {item.name}
                </h3>
                <p className={cn(
                  "font-bold",
                  canAfford ? "text-neon-green" : "text-red-400"
                )}>
                  {item.price.toLocaleString()} $GIG
                </p>
              </div>

              {/* Quantity (for consumables) */}
              {item.type === "consumable" && item.quantity > 0 && (
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-white/10">
                  <span className="text-white text-xs">x{item.quantity}</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Purchase Confirmation Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm"
            onClick={() => !isPurchasing && setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm p-6 rounded-2xl bg-gradient-to-b from-gray-900 to-black border border-white/20"
            >
              {/* Close Button */}
              <button
                onClick={() => !isPurchasing && setSelectedItem(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20"
              >
                <X size={18} className="text-white/60" />
              </button>

              {/* Item Preview */}
              <div className="text-center mb-6">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-block p-4 rounded-full bg-neon-purple/20 mb-4"
                >
                  {getItemIcon(selectedItem.name)}
                </motion.div>
                <h2 className="text-xl font-bold text-white mb-2">
                  {selectedItem.name}
                </h2>
                <p className="text-white/60 text-sm mb-4">
                  {selectedItem.description}
                </p>
                <div className="inline-block px-4 py-2 rounded-full bg-black/50 border border-white/10">
                  <span className="text-white/50 text-sm mr-2">Price:</span>
                  <span className="text-neon-green font-bold">
                    {selectedItem.price.toLocaleString()} $GIG
                  </span>
                </div>
              </div>

              {/* Effect Description */}
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-6">
                <p className="text-white/70 text-sm text-center">
                  {selectedItem.effect.description}
                </p>
              </div>

              {/* Balance Check */}
              {balance < selectedItem.price ? (
                <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
                  <p className="text-red-400 text-sm">
                    Insufficient balance! Need {(selectedItem.price - balance).toLocaleString()} more $GIG
                  </p>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedItem(null)}
                  disabled={isPurchasing}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={balance >= selectedItem.price ? { scale: 0.95 } : undefined}
                  onClick={handlePurchase}
                  disabled={isPurchasing || balance < selectedItem.price}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                    balance >= selectedItem.price
                      ? "bg-neon-green text-black hover:shadow-[0_0_20px_rgba(0,255,148,0.5)]"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  )}
                >
                  {isPurchasing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      BUY NOW
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-32 left-4 right-4 z-50 p-4 rounded-xl flex items-center gap-3",
              "backdrop-blur-sm border",
              toast.type === "success"
                ? "bg-neon-green/20 border-neon-green/50 text-neon-green"
                : "bg-red-500/20 border-red-500/50 text-red-400"
            )}
          >
            {toast.type === "success" ? (
              <Check size={20} />
            ) : (
              <X size={20} />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav activeTab="shop" />
    </div>
  );
}
