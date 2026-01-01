"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Gift,
  Ban,
  Shield,
  ShieldOff,
  Loader2,
  AlertTriangle,
  Check,
  User as UserIcon,
  Crown,
  Zap,
  Users,
  Calendar,
  Coins,
  X,
} from "lucide-react";

interface UserData {
  id: string;
  telegramId: string;
  username: string | null;
  balance: number;
  role: string;
  isBanned: boolean;
  referralCount: number;
  streak: number;
  createdAt: string;
  _count: {
    userTasks: number;
    spinHistory: number;
    userItems: number;
  };
}

// Gift Balance Modal
function GiftModal({
  isOpen,
  user,
  onClose,
  onGift,
  isSubmitting,
}: {
  isOpen: boolean;
  user: UserData | null;
  onClose: () => void;
  onGift: (amount: number) => void;
  isSubmitting: boolean;
}) {
  const [amount, setAmount] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(amount);
    if (num > 0) {
      onGift(num);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-700 p-6"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <Gift size={32} className="text-green-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Gift Balance</h3>
          <p className="text-sm text-gray-400">
            Send $GIG to {user.username || `TG:${user.telegramId}`}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Amount ($GIG)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="1"
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-center text-2xl font-bold placeholder:text-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2 mb-6">
            {[100, 500, 1000, 5000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val.toString())}
                className="flex-1 py-2 bg-gray-800 text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                {val}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-gray-800 text-white font-medium rounded-xl hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount || parseInt(amount) <= 0}
              className="flex-1 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Gift size={18} />
              )}
              Send
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// Ban Confirmation Modal
function BanModal({
  isOpen,
  user,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  isOpen: boolean;
  user: UserData | null;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}) {
  if (!isOpen || !user) return null;

  const isBanned = user.isBanned;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-700 p-6"
      >
        <div className="text-center mb-6">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isBanned ? "bg-green-500/10" : "bg-red-500/10"
            }`}
          >
            {isBanned ? (
              <ShieldOff size={32} className="text-green-500" />
            ) : (
              <Ban size={32} className="text-red-500" />
            )}
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            {isBanned ? "Unban User?" : "Ban User?"}
          </h3>
          <p className="text-sm text-gray-400">
            {isBanned
              ? `Restore access for ${user.username || `TG:${user.telegramId}`}?`
              : `Block ${user.username || `TG:${user.telegramId}`} from using the app?`}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-gray-800 text-white font-medium rounded-xl hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`flex-1 py-3 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
              isBanned
                ? "bg-green-600 hover:bg-green-500"
                : "bg-red-600 hover:bg-red-500"
            }`}
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isBanned ? (
              <ShieldOff size={18} />
            ) : (
              <Ban size={18} />
            )}
            {isBanned ? "Unban" : "Ban"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// User Card Component
function UserCard({
  user,
  onGift,
  onBan,
}: {
  user: UserData;
  onGift: () => void;
  onBan: () => void;
}) {
  const avatarUrl = `https://api.dicebear.com/7.x/cyber/svg?seed=${user.telegramId}`;
  const joinDate = new Date(user.createdAt).toLocaleDateString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 bg-gray-800/50 rounded-2xl border transition-all ${
        user.isBanned
          ? "border-red-500/50 bg-red-500/5"
          : user.role === "ADMIN"
          ? "border-yellow-500/30"
          : "border-gray-700/50"
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        {/* Avatar */}
        <div className="relative">
          <img
            src={avatarUrl}
            alt="Avatar"
            className={`w-16 h-16 rounded-xl ${user.isBanned ? "opacity-50 grayscale" : ""}`}
          />
          {user.role === "ADMIN" && (
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
              <Crown size={12} className="text-black" />
            </div>
          )}
          {user.isBanned && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
              <Ban size={12} className="text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white truncate">
              {user.username || "No Username"}
            </h3>
            {user.role === "ADMIN" && (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
                ADMIN
              </span>
            )}
            {user.isBanned && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
                BANNED
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">TG: {user.telegramId}</p>
          <p className="text-xs text-gray-500">ID: {user.id}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3 bg-gray-900/50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Coins size={14} className="text-neon-green" />
            <span className="text-xs text-gray-400">Balance</span>
          </div>
          <p className="text-lg font-bold text-neon-green">{user.balance.toLocaleString()} $GIG</p>
        </div>
        <div className="p-3 bg-gray-900/50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-purple-400" />
            <span className="text-xs text-gray-400">Referrals</span>
          </div>
          <p className="text-lg font-bold text-white">{user.referralCount}</p>
        </div>
        <div className="p-3 bg-gray-900/50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-yellow-400" />
            <span className="text-xs text-gray-400">Streak</span>
          </div>
          <p className="text-lg font-bold text-white">{user.streak} days</p>
        </div>
        <div className="p-3 bg-gray-900/50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className="text-blue-400" />
            <span className="text-xs text-gray-400">Joined</span>
          </div>
          <p className="text-sm font-medium text-white">{joinDate}</p>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="flex items-center gap-4 mb-6 text-sm text-gray-400">
        <span>{user._count.userTasks} tasks</span>
        <span>•</span>
        <span>{user._count.spinHistory} spins</span>
        <span>•</span>
        <span>{user._count.userItems} items</span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onGift}
          className="flex-1 py-3 bg-green-600/20 text-green-400 font-medium rounded-xl hover:bg-green-600/30 transition-colors flex items-center justify-center gap-2 border border-green-600/30"
        >
          <Gift size={18} />
          Gift Balance
        </button>
        <button
          onClick={onBan}
          disabled={user.role === "ADMIN"}
          className={`flex-1 py-3 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 border disabled:opacity-50 disabled:cursor-not-allowed ${
            user.isBanned
              ? "bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30"
              : "bg-red-600/20 text-red-400 border-red-600/30 hover:bg-red-600/30"
          }`}
        >
          {user.isBanned ? (
            <>
              <ShieldOff size={18} />
              Unban
            </>
          ) : (
            <>
              <Ban size={18} />
              Ban User
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// Main Page Component
export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Modal states
  const [giftModal, setGiftModal] = useState<{ isOpen: boolean; user: UserData | null }>({
    isOpen: false,
    user: null,
  });
  const [banModal, setBanModal] = useState<{ isOpen: boolean; user: UserData | null }>({
    isOpen: false,
    user: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" } | null>(null);

  // Get current admin ID from localStorage
  const getAdminId = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("userId") || "";
    }
    return "";
  };

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  // Show toast
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Handle gift action
  const handleGift = async (amount: number) => {
    if (!giftModal.user) return;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "gift",
          userId: giftModal.user.id,
          amount,
          adminId: getAdminId(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local user data
        setUsers((prev) =>
          prev.map((u) =>
            u.id === giftModal.user?.id
              ? { ...u, balance: u.balance + amount }
              : u
          )
        );
        showToast(data.message, "success");
        setGiftModal({ isOpen: false, user: null });
      } else {
        showToast(data.error || "Failed to gift balance", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle ban/unban action
  const handleBanToggle = async () => {
    if (!banModal.user) return;
    setIsSubmitting(true);

    const action = banModal.user.isBanned ? "unban" : "ban";

    try {
      const response = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userId: banModal.user.id,
          adminId: getAdminId(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local user data
        setUsers((prev) =>
          prev.map((u) =>
            u.id === banModal.user?.id
              ? { ...u, isBanned: !u.isBanned }
              : u
          )
        );
        showToast(data.message, "success");
        setBanModal({ isOpen: false, user: null });
      } else {
        showToast(data.error || "Failed to update ban status", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl flex items-center gap-2 ${
              toast.type === "success"
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <Check size={18} />
            ) : (
              <AlertTriangle size={18} />
            )}
            {toast.message}
            <button onClick={() => setToast(null)} className="ml-2">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">USER MANAGEMENT</h1>
        <p className="text-gray-400">Search and manage user accounts</p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Telegram ID or Username..."
            className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 rounded-2xl text-white text-lg placeholder:text-gray-500 focus:outline-none focus:border-red-500 transition-colors"
          />
          {isSearching && (
            <Loader2
              size={20}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 animate-spin"
            />
          )}
        </div>
      </div>

      {/* Results */}
      {!hasSearched ? (
        <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-gray-700/50">
          <UserIcon size={64} className="mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">Search for Users</h3>
          <p className="text-sm text-gray-500">
            Enter a Telegram ID or username to find users
          </p>
        </div>
      ) : isSearching ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-red-500" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-gray-700/50">
          <Shield size={64} className="mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No Users Found</h3>
          <p className="text-sm text-gray-500">
            Try a different search term
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onGift={() => setGiftModal({ isOpen: true, user })}
              onBan={() => setBanModal({ isOpen: true, user })}
            />
          ))}
        </div>
      )}

      {/* Gift Modal */}
      <GiftModal
        isOpen={giftModal.isOpen}
        user={giftModal.user}
        onClose={() => setGiftModal({ isOpen: false, user: null })}
        onGift={handleGift}
        isSubmitting={isSubmitting}
      />

      {/* Ban Modal */}
      <BanModal
        isOpen={banModal.isOpen}
        user={banModal.user}
        onClose={() => setBanModal({ isOpen: false, user: null })}
        onConfirm={handleBanToggle}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
