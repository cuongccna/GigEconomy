"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import "./globals.css"; // Import globals to ensure Tailwind works if possible

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-zinc-900 border border-red-900/50 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-900/20 flex items-center justify-center border border-red-500/30">
            <AlertTriangle size={40} className="text-red-500" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">CRITICAL SYSTEM FAILURE</h2>
          <p className="text-red-400 font-mono text-sm mb-6">
            The application core has crashed.
          </p>

          <div className="bg-black/50 rounded-xl p-4 mb-8 text-left overflow-hidden border border-white/5">
            <p className="text-white/70 text-sm font-mono break-words">
              {error.message || "Unknown critical error."}
            </p>
          </div>

          <button
            onClick={() => reset()}
            className="w-full py-3 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            EMERGENCY RESTART
          </button>
        </div>
      </body>
    </html>
  );
}
