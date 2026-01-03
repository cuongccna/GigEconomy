"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowDownToLine,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wallet,
  Send,
  Clock,
} from "lucide-react";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { cn } from "@/lib/utils";

// ===== CONFIGURATION =====
const ADMIN_WALLET_ADDRESS = "UQDCdvm0T9Pv-3rv6w9A_dLjftYVFRnwmKwJ4z1wjeXKd-Iy";
const WITHDRAWAL_FEE_NANO = "50000000"; // 0.05 TON in nanoTON
const WITHDRAWAL_FEE_TON = 0.05;
const MIN_WITHDRAWAL = 100000;
const MAX_WITHDRAWAL = 10000000;

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onSuccess?: (newBalance: number) => void;
}

type WithdrawStep = "input" | "confirm" | "processing" | "success" | "error";

export default function WithdrawModal({
  isOpen,
  onClose,
  balance,
  onSuccess,
}: WithdrawModalProps) {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  
  const [step, setStep] = useState<WithdrawStep>("input");
  const [amount, setAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("input");
      setAmount("");
      setError(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Validate amount
  const parsedAmount = parseFloat(amount) || 0;
  const isValidAmount =
    parsedAmount >= MIN_WITHDRAWAL &&
    parsedAmount <= MAX_WITHDRAWAL &&
    parsedAmount <= balance;

  const canSubmit = wallet && isValidAmount && !isProcessing;

  // Handle amount input
  const handleAmountChange = (value: string) => {
    // Only allow numbers
    const cleaned = value.replace(/[^0-9]/g, "");
    setAmount(cleaned);
    setError(null);
  };

  // Set max amount
  const handleSetMax = () => {
    const maxAmount = Math.min(balance, MAX_WITHDRAWAL);
    setAmount(maxAmount.toString());
  };

  // Handle confirm and pay
  const handleConfirmAndPay = async () => {
    if (!wallet || !canSubmit) return;

    setStep("confirm");
    setError(null);
  };

  // Handle send transaction
  const handleSendTransaction = async () => {
    if (!wallet || !canSubmit) return;

    setStep("processing");
    setIsProcessing(true);
    setError(null);

    try {
      // Prepare transaction
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 5 * 60, // 5 minutes from now
        messages: [
          {
            address: ADMIN_WALLET_ADDRESS,
            amount: WITHDRAWAL_FEE_NANO,
            payload: "", // Optional: could add comment like "Withdrawal fee"
          },
        ],
      };

      // Send transaction via TON Connect
      const result = await tonConnectUI.sendTransaction(transaction);

      // Get boc as proof of transaction
      const txHash = result.boc;

      // Call withdrawal API
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) {
        throw new Error("Please open this app in Telegram");
      }

      const response = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-id": telegramId.toString(),
        },
        body: JSON.stringify({
          amount: parsedAmount,
          walletAddress: wallet.account.address,
          txHash,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep("success");
        
        // Notify parent of new balance
        if (onSuccess && data.newBalance !== undefined) {
          onSuccess(data.newBalance);
        }
      } else {
        throw new Error(data.error || "Withdrawal failed");
      }
    } catch (err) {
      console.error("Withdrawal error:", err);
      setError(err instanceof Error ? err.message : "Transaction failed");
      setStep("error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle close with confirmation if in progress
  const handleClose = () => {
    if (isProcessing) return;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-t-3xl bg-gradient-to-b from-gray-900 to-black border-t border-neon-purple/30 p-6"
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-white" />
          </button>

          {/* === INPUT STEP === */}
          {step === "input" && (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-purple/20 flex items-center justify-center">
                  <ArrowDownToLine size={32} className="text-neon-purple" />
                </div>
                <h3 className="text-2xl font-bold text-white">Withdraw $GIG</h3>
                <p className="text-white/50 text-sm mt-1">
                  Convert your earnings to TON tokens
                </p>
              </div>

              {/* Balance Display */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-sm">Available Balance</span>
                  <span className="text-neon-green font-bold">
                    {balance.toLocaleString()} $GIG
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-white/50 text-sm mb-2">
                  Amount to Withdraw
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount ? parseInt(amount).toLocaleString() : ""}
                    onChange={(e) =>
                      handleAmountChange(e.target.value.replace(/,/g, ""))
                    }
                    placeholder="Enter amount"
                    className={cn(
                      "w-full p-4 pr-20 rounded-xl",
                      "bg-white/5 border-2",
                      "text-white text-xl font-bold",
                      "placeholder:text-white/30",
                      "focus:outline-none focus:ring-0",
                      "transition-colors",
                      isValidAmount
                        ? "border-neon-green/50 focus:border-neon-green"
                        : parsedAmount > 0
                        ? "border-red-500/50 focus:border-red-500"
                        : "border-white/10 focus:border-white/30"
                    )}
                  />
                  <button
                    onClick={handleSetMax}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-neon-purple/20 text-neon-purple text-sm font-bold hover:bg-neon-purple/30 transition-colors"
                  >
                    MAX
                  </button>
                </div>
                
                {/* Validation Messages */}
                <div className="mt-2 min-h-[20px]">
                  {parsedAmount > 0 && parsedAmount < MIN_WITHDRAWAL && (
                    <p className="text-red-400 text-sm">
                      Minimum: {MIN_WITHDRAWAL.toLocaleString()} $GIG
                    </p>
                  )}
                  {parsedAmount > MAX_WITHDRAWAL && (
                    <p className="text-red-400 text-sm">
                      Maximum: {MAX_WITHDRAWAL.toLocaleString()} $GIG
                    </p>
                  )}
                  {parsedAmount > balance && (
                    <p className="text-red-400 text-sm">Insufficient balance</p>
                  )}
                </div>
              </div>

              {/* Fee Info */}
              <div className="p-4 rounded-xl bg-neon-purple/10 border border-neon-purple/20 mb-6">
                <div className="flex items-center gap-3">
                  <Wallet size={20} className="text-neon-purple" />
                  <div>
                    <p className="text-white text-sm font-medium">
                      Gas Fee: {WITHDRAWAL_FEE_TON} TON
                    </p>
                    <p className="text-white/50 text-xs">
                      Paid via your connected TON wallet
                    </p>
                  </div>
                </div>
              </div>

              {/* Connect Wallet Warning */}
              {!wallet && (
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 mb-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle size={20} className="text-orange-400" />
                    <p className="text-orange-400 text-sm">
                      Please connect your TON wallet first
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleConfirmAndPay}
                disabled={!canSubmit}
                className={cn(
                  "w-full py-4 rounded-xl font-bold text-lg",
                  "flex items-center justify-center gap-2",
                  "transition-all duration-300",
                  canSubmit
                    ? "bg-gradient-to-r from-neon-purple to-neon-green text-white shadow-[0_0_20px_rgba(128,0,255,0.4)] hover:shadow-[0_0_30px_rgba(128,0,255,0.6)]"
                    : "bg-white/10 text-white/40 cursor-not-allowed"
                )}
              >
                <Send size={20} />
                CONFIRM & PAY FEE
              </button>
            </>
          )}

          {/* === CONFIRM STEP === */}
          {step === "confirm" && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-green/20 flex items-center justify-center">
                  <CheckCircle2 size={32} className="text-neon-green" />
                </div>
                <h3 className="text-2xl font-bold text-white">Confirm Withdrawal</h3>
              </div>

              {/* Summary */}
              <div className="space-y-3 mb-6">
                <div className="p-4 rounded-xl bg-white/5 flex justify-between items-center">
                  <span className="text-white/50">Amount</span>
                  <span className="text-white font-bold">
                    {parsedAmount.toLocaleString()} $GIG
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-white/5 flex justify-between items-center">
                  <span className="text-white/50">To Wallet</span>
                  <span className="text-white font-mono text-sm">
                    {wallet?.account?.address?.slice(0, 8)}...
                    {wallet?.account?.address?.slice(-6)}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-neon-purple/10 border border-neon-purple/20 flex justify-between items-center">
                  <span className="text-white/50">Gas Fee (TON)</span>
                  <span className="text-neon-purple font-bold">
                    {WITHDRAWAL_FEE_TON} TON
                  </span>
                </div>
              </div>

              {/* Warning */}
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 mb-6">
                <p className="text-orange-400 text-sm text-center">
                  ⚠️ A transaction will be sent from your wallet to pay the gas fee.
                  Please confirm in your TON wallet app.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("input")}
                  className="flex-1 py-4 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSendTransaction}
                  disabled={isProcessing}
                  className="flex-1 py-4 rounded-xl font-bold bg-gradient-to-r from-neon-purple to-neon-green text-white shadow-[0_0_20px_rgba(128,0,255,0.4)]"
                >
                  Send Transaction
                </button>
              </div>
            </>
          )}

          {/* === PROCESSING STEP === */}
          {step === "processing" && (
            <div className="text-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 mx-auto mb-6"
              >
                <Loader2 size={80} className="text-neon-purple" />
              </motion.div>
              <h3 className="text-xl font-bold text-white mb-2">
                Processing Transaction
              </h3>
              <p className="text-white/50 text-sm">
                Please confirm in your TON wallet...
              </p>
            </div>
          )}

          {/* === SUCCESS STEP === */}
          {step === "success" && (
            <div className="text-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-neon-green/20 flex items-center justify-center"
              >
                <CheckCircle2 size={48} className="text-neon-green" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Withdrawal Submitted!
              </h3>
              <p className="text-white/50 text-sm mb-6">
                Your tokens will arrive within 24 hours.
              </p>

              {/* Pending Info */}
              <div className="p-4 rounded-xl bg-neon-green/10 border border-neon-green/20 mb-6">
                <div className="flex items-center justify-center gap-2">
                  <Clock size={18} className="text-neon-green" />
                  <span className="text-neon-green font-medium">
                    Waiting for admin approval
                  </span>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-4 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/* === ERROR STEP === */}
          {step === "error" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle size={48} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Transaction Failed
              </h3>
              <p className="text-red-400 text-sm mb-6">{error}</p>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("input")}
                  className="flex-1 py-4 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-4 rounded-xl font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
