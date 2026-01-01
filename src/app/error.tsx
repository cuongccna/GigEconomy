"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg-dark flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-md w-full bg-white/5 backdrop-blur-xl border border-red-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
      >
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50">
          <AlertTriangle size={40} className="text-red-500" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-2">SYSTEM FAILURE</h2>
        <p className="text-red-400 font-mono text-sm mb-6">
          ERROR_CODE: {error.digest || "UNKNOWN_CRASH"}
        </p>

        {/* Error Message (Optional: Hide in production if sensitive) */}
        <div className="bg-black/30 rounded-xl p-4 mb-8 text-left overflow-hidden">
          <p className="text-white/70 text-sm font-mono break-words">
            {error.message || "An unexpected error occurred."}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full py-3 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
          >
            <RefreshCw size={18} />
            REBOOT SYSTEM
          </button>
          
          <Link 
            href="/"
            className="w-full py-3 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-medium transition-all flex items-center justify-center gap-2"
          >
            <Home size={18} />
            RETURN TO BASE
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
