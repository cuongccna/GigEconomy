"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Search,
  RefreshCw,
  DollarSign,
  FileText,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface WithdrawalUser {
  id: string;
  telegramId: string;
  username: string | null;
  balance: number;
}

interface WithdrawalData {
  id: string;
  amount: number;
  walletAddress: string;
  txHash: string;
  status: string;
  adminNotes: string | null;
  processedAt: string | null;
  createdAt: string;
  user: WithdrawalUser;
}

interface Stats {
  pending: { count: number; totalAmount: number };
  completed: { count: number; totalAmount: number };
  failed: { count: number; totalAmount: number };
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

// Confirmation Modal
function ConfirmModal({
  isOpen,
  withdrawal,
  action,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  isOpen: boolean;
  withdrawal: WithdrawalData | null;
  action: "APPROVE" | "REJECT";
  onClose: () => void;
  onConfirm: (note: string) => void;
  isSubmitting: boolean;
}) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isOpen) setNote("");
  }, [isOpen]);

  if (!isOpen || !withdrawal) return null;

  const isApprove = action === "APPROVE";

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
        className="w-full max-w-md bg-gray-900 rounded-2xl border border-gray-700 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          {isApprove ? (
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="text-green-400" size={24} />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="text-red-400" size={24} />
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-white">
              {isApprove ? "Approve Withdrawal" : "Reject Withdrawal"}
            </h3>
            <p className="text-gray-400 text-sm">
              @{withdrawal.user.username || "Unknown"}
            </p>
          </div>
        </div>

        {/* Withdrawal Info */}
        <div className="bg-gray-800 rounded-xl p-4 mb-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Amount:</span>
            <span className="text-white font-bold">
              {withdrawal.amount.toLocaleString()} $GIG
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Wallet:</span>
            <span className="text-white text-xs font-mono truncate max-w-[180px]">
              {withdrawal.walletAddress}
            </span>
          </div>
        </div>

        {/* Note Input */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">
            {isApprove ? "Note (optional)" : "Rejection Reason (required)"}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              isApprove
                ? "Optional note..."
                : "Enter reason for rejection..."
            }
            className="w-full bg-gray-800 border border-gray-600 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            rows={3}
            required={!isApprove}
          />
        </div>

        {/* Warning for Reject */}
        {!isApprove && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-yellow-400 shrink-0 mt-0.5" size={16} />
              <p className="text-yellow-200 text-sm">
                Rejecting will automatically refund{" "}
                <span className="font-bold">
                  {withdrawal.amount.toLocaleString()} $GIG
                </span>{" "}
                to the user&apos;s balance.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={isSubmitting || (!isApprove && !note.trim())}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
              isApprove
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : isApprove ? (
              <>
                <Check size={18} />
                Approve
              </>
            ) : (
              <>
                <X size={18} />
                Reject
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Withdrawal Card Component
function WithdrawalCard({
  withdrawal,
  onApprove,
  onReject,
  onCopyWallet,
  copiedId,
}: {
  withdrawal: WithdrawalData;
  onApprove: (w: WithdrawalData) => void;
  onReject: (w: WithdrawalData) => void;
  onCopyWallet: (w: WithdrawalData) => void;
  copiedId: string | null;
}) {
  const isPending = withdrawal.status === "PENDING";
  const isCompleted = withdrawal.status === "COMPLETED";

  const truncateAddress = (addr: string) => {
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  const truncateTxHash = (hash: string) => {
    if (hash.length <= 20) return hash;
    return `${hash.slice(0, 10)}...${hash.slice(-10)}`;
  };

  const getStatusBadge = () => {
    switch (withdrawal.status) {
      case "PENDING":
        return (
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium flex items-center gap-1">
            <Clock size={12} />
            Pending
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
            <CheckCircle size={12} />
            Completed
          </span>
        );
      case "FAILED":
        return (
          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium flex items-center gap-1">
            <XCircle size={12} />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gray-800 border rounded-xl p-4 ${
        isPending
          ? "border-yellow-500/30"
          : isCompleted
          ? "border-green-500/20"
          : "border-red-500/20"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
            {withdrawal.user.username?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-white font-medium">
              @{withdrawal.user.username || "Unknown"}
            </p>
            <p className="text-gray-400 text-xs">
              ID: {withdrawal.user.telegramId}
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Amount */}
      <div className="bg-gray-900 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Amount</span>
          <span className="text-xl font-bold text-neon-green">
            {withdrawal.amount.toLocaleString()} $GIG
          </span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="space-y-2 mb-3">
        {/* Wallet Address */}
        <div className="flex items-center justify-between bg-gray-900/50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <Wallet size={14} className="text-gray-400" />
            <span className="text-gray-400 text-xs">Wallet:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-mono">
              {truncateAddress(withdrawal.walletAddress)}
            </span>
            <button
              onClick={() => onCopyWallet(withdrawal)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Copy wallet address"
            >
              {copiedId === withdrawal.id ? (
                <Check size={14} className="text-green-400" />
              ) : (
                <Copy size={14} className="text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* TX Hash */}
        <div className="flex items-center justify-between bg-gray-900/50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-gray-400" />
            <span className="text-gray-400 text-xs">TX Proof:</span>
          </div>
          <a
            href={`https://tonviewer.com/transaction/${withdrawal.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs font-mono"
          >
            {truncateTxHash(withdrawal.txHash)}
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Date */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Requested:</span>
          <span className="text-gray-400">
            {new Date(withdrawal.createdAt).toLocaleString()}
          </span>
        </div>

        {/* Admin Notes (if any) */}
        {withdrawal.adminNotes && (
          <div className="mt-2 bg-gray-900/50 rounded-lg p-2">
            <p className="text-gray-400 text-xs">
              <span className="text-gray-500">Note:</span> {withdrawal.adminNotes}
            </p>
          </div>
        )}

        {/* Processed At */}
        {withdrawal.processedAt && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Processed:</span>
            <span className="text-gray-400">
              {new Date(withdrawal.processedAt).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Actions (only for pending) */}
      {isPending && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onApprove(withdrawal)}
            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle size={16} />
            Approve
          </button>
          <button
            onClick={() => onReject(withdrawal)}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <XCircle size={16} />
            Reject
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function AdminWithdrawalsPage() {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"PENDING" | "HISTORY">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalData | null>(null);
  const [modalAction, setModalAction] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchWithdrawals = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const status = activeTab === "PENDING" ? "PENDING" : "HISTORY";
      const response = await fetch(`/api/admin/withdrawals?status=${status}`, {
        headers: {
          "x-telegram-id": user.id.toString(),
        },
      });
      const data = await response.json();

      if (data.success) {
        setWithdrawals(data.withdrawals);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (user?.id) {
      fetchWithdrawals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  const handleCopyWallet = async (withdrawal: WithdrawalData) => {
    try {
      await navigator.clipboard.writeText(withdrawal.walletAddress);
      setCopiedId(withdrawal.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleApprove = (withdrawal: WithdrawalData) => {
    setSelectedWithdrawal(withdrawal);
    setModalAction("APPROVE");
    setIsModalOpen(true);
  };

  const handleReject = (withdrawal: WithdrawalData) => {
    setSelectedWithdrawal(withdrawal);
    setModalAction("REJECT");
    setIsModalOpen(true);
  };

  const handleConfirmAction = async (note: string) => {
    if (!selectedWithdrawal || !user?.id) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/withdrawals/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-id": user.id.toString(),
        },
        body: JSON.stringify({
          id: selectedWithdrawal.id,
          action: modalAction,
          adminNote: note,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Remove from list or update
        setWithdrawals((prev) =>
          prev.filter((w) => w.id !== selectedWithdrawal.id)
        );
        // Refresh stats
        fetchWithdrawals();
        setIsModalOpen(false);
      } else {
        alert(data.error || "Action failed");
      }
    } catch (error) {
      console.error("Action error:", error);
      alert("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter by search
  const filteredWithdrawals = withdrawals.filter((w) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      w.user.username?.toLowerCase().includes(query) ||
      w.user.telegramId.includes(query) ||
      w.walletAddress.toLowerCase().includes(query)
    );
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="text-purple-400" />
            Withdrawals
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Process user cash-out requests
          </p>
        </div>
        <button
          onClick={fetchWithdrawals}
          disabled={isLoading}
          className="p-2 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
        >
          <RefreshCw
            size={20}
            className={`text-gray-400 ${isLoading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={18} className="text-yellow-400" />
              <span className="text-yellow-400 text-sm font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.pending.count}</p>
            <p className="text-yellow-400 text-xs mt-1">
              {stats.pending.totalAmount.toLocaleString()} $GIG
            </p>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={18} className="text-green-400" />
              <span className="text-green-400 text-sm font-medium">Completed</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.completed.count}</p>
            <p className="text-green-400 text-xs mt-1">
              {stats.completed.totalAmount.toLocaleString()} $GIG
            </p>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle size={18} className="text-red-400" />
              <span className="text-red-400 text-sm font-medium">Failed</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.failed.count}</p>
            <p className="text-red-400 text-xs mt-1">
              {stats.failed.totalAmount.toLocaleString()} $GIG
            </p>
          </div>
        </div>
      )}

      {/* Total Pending Alert */}
      {stats && stats.pending.count > 0 && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="text-purple-400" size={24} />
              <div>
                <p className="text-purple-400 text-sm font-medium">
                  Total Pending Withdrawals
                </p>
                <p className="text-white text-xs">
                  Liquidity needed to process all pending requests
                </p>
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-400">
              {stats.pending.totalAmount.toLocaleString()} $GIG
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("PENDING")}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === "PENDING"
              ? "bg-yellow-500 text-black"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Pending Requests
          {stats && stats.pending.count > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-black/20 rounded-full text-xs">
              {stats.pending.count}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("HISTORY")}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === "HISTORY"
              ? "bg-gray-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          History
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          size={18}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by username, ID, or wallet..."
          className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Withdrawals List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-purple-400" size={40} />
        </div>
      ) : filteredWithdrawals.length === 0 ? (
        <div className="text-center py-20">
          <Wallet className="mx-auto text-gray-600 mb-4" size={48} />
          <p className="text-gray-400">
            {activeTab === "PENDING"
              ? "No pending withdrawal requests"
              : "No withdrawal history"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredWithdrawals.map((withdrawal) => (
              <WithdrawalCard
                key={withdrawal.id}
                withdrawal={withdrawal}
                onApprove={handleApprove}
                onReject={handleReject}
                onCopyWallet={handleCopyWallet}
                copiedId={copiedId}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <span className="text-gray-400 text-sm">
            Page {pagination.page} of {pagination.totalPages}
          </span>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={isModalOpen}
        withdrawal={selectedWithdrawal}
        action={modalAction}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmAction}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
