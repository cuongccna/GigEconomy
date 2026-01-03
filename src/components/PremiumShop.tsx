"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Star,
  Sparkles,
  Crown,
  Loader2,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface PackageContent {
  gig?: number;
  items?: { name: string; quantity: number }[];
  effects?: { type: string; duration?: number }[];
}

interface StarsPackage {
  id: string;
  title: string;
  description: string;
  price: number;
  content: PackageContent;
  icon: string;
  popular?: boolean;
  bestValue?: boolean;
}

interface PremiumShopProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PremiumShop({ isOpen, onClose }: PremiumShopProps) {
  const { user } = useAuth();
  const [packages, setPackages] = useState<StarsPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

  const fetchPackages = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/payment/create-invoice");
      const data = await response.json();
      if (data.success) {
        setPackages(data.packages);
      }
    } catch (err) {
      console.error("Failed to fetch packages:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (pkg: StarsPackage) => {
    if (!user?.id || purchasingId) return;

    setPurchasingId(pkg.id);
    setError(null);

    try {
      const response = await fetch("/api/payment/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-id": user.id.toString(),
        },
        body: JSON.stringify({ packageId: pkg.id }),
      });

      const data = await response.json();

      if (data.success && data.invoiceLink) {
        // Open invoice in Telegram
        if (window.Telegram?.WebApp?.openInvoice) {
          window.Telegram.WebApp.openInvoice(data.invoiceLink, (status) => {
            console.log("Invoice status:", status);
            if (status === "paid") {
              // Close modal and show success
              onClose();
              // Refresh balance
              window.location.reload();
            }
          });
        } else {
          // Fallback: open in new tab
          window.open(data.invoiceLink, "_blank");
        }
      } else {
        setError(data.error || "Failed to create invoice");
      }
    } catch (err) {
      console.error("Purchase error:", err);
      setError("Failed to process purchase");
    } finally {
      setPurchasingId(null);
    }
  };

  const formatContent = (content: PackageContent) => {
    const parts: string[] = [];
    if (content.gig) {
      parts.push(`${content.gig.toLocaleString()} $GIG`);
    }
    if (content.items) {
      content.items.forEach((item) => {
        parts.push(`${item.quantity}x ${item.name}`);
      });
    }
    if (content.effects) {
      content.effects.forEach((effect) => {
        if (effect.type === "DOUBLE_FARMING" && effect.duration) {
          parts.push(`2x Mining (${effect.duration / 24}d)`);
        }
      });
    }
    return parts;
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] bg-gradient-to-b from-gray-900 to-black rounded-t-3xl sm:rounded-2xl border border-yellow-500/30 overflow-hidden"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-yellow-600/20 via-yellow-500/10 to-yellow-600/20 p-6 border-b border-yellow-500/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-gray-800/50 rounded-full hover:bg-gray-700/50 transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
              <Crown className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Premium Shop</h2>
              <p className="text-yellow-400 text-sm flex items-center gap-1">
                <Star size={14} fill="currentColor" />
                Pay with Telegram Stars
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-yellow-400" size={40} />
            </div>
          ) : (
            <div className="grid gap-3">
              {packages.map((pkg) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative p-4 rounded-xl border transition-all ${
                    pkg.bestValue
                      ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50"
                      : pkg.popular
                      ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30"
                      : "bg-gray-800/50 border-gray-700/50"
                  }`}
                >
                  {/* Badges */}
                  {pkg.bestValue && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold rounded-full">
                      BEST VALUE
                    </div>
                  )}
                  {pkg.popular && !pkg.bestValue && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                      POPULAR
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-3xl">{pkg.icon}</div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold">{pkg.title}</h3>
                        <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">
                          {pkg.description}
                        </p>
                        
                        {/* Content preview */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {formatContent(pkg.content).map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-gray-900/50 border border-gray-700 rounded-full text-xs text-gray-300"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Buy Button */}
                    <button
                      onClick={() => handlePurchase(pkg)}
                      disabled={purchasingId === pkg.id}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all ${
                        pkg.bestValue
                          ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:shadow-lg hover:shadow-yellow-500/30"
                          : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/30"
                      } disabled:opacity-50`}
                    >
                      {purchasingId === pkg.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <Star size={14} fill="currentColor" />
                          {pkg.price}
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Footer Info */}
          <div className="mt-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <div className="flex items-start gap-3">
              <Sparkles className="text-yellow-400 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-white text-sm font-medium">About Telegram Stars</p>
                <p className="text-gray-400 text-xs mt-1">
                  Stars are Telegram&apos;s digital currency. Purchase them directly in Telegram.
                  All purchases are instant and secure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
