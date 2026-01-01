"use client";

import { useCallback, useRef } from "react";
import type { AdController, AdRewardResult } from "@/types/telegram";

// Adsgram Block ID from environment variable
const ADSGRAM_BLOCK_ID = process.env.NEXT_PUBLIC_ADSGRAM_BLOCK_ID || "";

interface UseAdsgramOptions {
  blockId?: string;
  debug?: boolean;
  onReward?: (result: AdRewardResult) => void;
  onError?: (error: Error) => void;
  onSkip?: () => void;
}

interface UseAdsgramReturn {
  showAd: () => Promise<AdRewardResult>;
  isReady: boolean;
}

/**
 * Custom hook to manage Adsgram ads
 * 
 * Usage:
 * ```tsx
 * const { showAd, isReady } = useAdsgram({
 *   onReward: (result) => { console.log('User earned reward!', result); },
 *   onError: (error) => { console.error('Ad failed', error); },
 *   onSkip: () => { console.log('User skipped ad'); }
 * });
 * 
 * const handleWatchAd = async () => {
 *   try {
 *     const result = await showAd();
 *     if (result.done) {
 *       // Grant reward to user
 *     }
 *   } catch (error) {
 *     // Handle error or skip
 *   }
 * };
 * ```
 */
export function useAdsgram(options: UseAdsgramOptions = {}): UseAdsgramReturn {
  const {
    blockId = ADSGRAM_BLOCK_ID,
    debug = false,
    onReward,
    onError,
    onSkip,
  } = options;

  // Keep a reference to the ad controller
  const adControllerRef = useRef<AdController | null>(null);

  // Check if Adsgram is available
  const isReady = typeof window !== "undefined" && !!window.Adsgram;

  /**
   * Initialize or get the AdController
   */
  const getAdController = useCallback((): AdController | null => {
    if (typeof window === "undefined" || !window.Adsgram) {
      console.warn("Adsgram SDK not loaded");
      return null;
    }

    // Reuse existing controller or create new one
    if (!adControllerRef.current) {
      adControllerRef.current = window.Adsgram.init({
        blockId,
        debug,
      });
    }

    return adControllerRef.current;
  }, [blockId, debug]);

  /**
   * Show an ad and return a promise
   * - Resolves with AdRewardResult if user completes the ad
   * - Rejects if user skips or an error occurs
   */
  const showAd = useCallback((): Promise<AdRewardResult> => {
    return new Promise((resolve, reject) => {
      const controller = getAdController();

      if (!controller) {
        const error = new Error("Adsgram SDK not available");
        onError?.(error);
        reject(error);
        return;
      }

      controller
        .show()
        .then((result: AdRewardResult) => {
          if (result.done) {
            // User completed the ad - grant reward
            console.log("Ad completed successfully:", result);
            onReward?.(result);
            resolve(result);
          } else {
            // User skipped or didn't complete
            console.log("Ad not completed:", result);
            onSkip?.();
            reject(new Error(result.description || "Ad not completed"));
          }
        })
        .catch((error: Error) => {
          console.error("Ad error:", error);
          onError?.(error);
          reject(error);
        });
    });
  }, [getAdController, onReward, onError, onSkip]);

  return {
    showAd,
    isReady,
  };
}

/**
 * Utility to show ad and call reward API
 * @param telegramId - User's Telegram ID (reserved for future server-side validation)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function watchAdForReward(telegramId: string | number): Promise<{
  success: boolean;
  amount?: number;
  error?: string;
}> {
  try {
    if (typeof window === "undefined" || !window.Adsgram) {
      return { success: false, error: "Adsgram not available" };
    }

    const controller = window.Adsgram.init({
      blockId: ADSGRAM_BLOCK_ID,
      debug: false,
    });

    const result = await controller.show();

    if (!result.done) {
      return { success: false, error: "Ad not completed" };
    }

    // Call our backend to grant the reward
    // Note: In production, Adsgram calls your callback URL directly (server-to-server)
    // This is a client-side fallback/additional call
    const response = await fetch(`/api/spin/free`, { method: "POST" });
    const data = await response.json();

    if (data.success) {
      return { success: true, amount: data.reward || 500 };
    } else {
      return { success: false, error: data.error || "Failed to grant reward" };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export default useAdsgram;
