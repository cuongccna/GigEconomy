"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ScreenWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** Whether to show the cyberpunk grid overlay */
  showGrid?: boolean;
  /** Whether to show the dark gradient overlay */
  showOverlay?: boolean;
}

/**
 * ScreenWrapper - Global page wrapper for consistent safe area handling
 * 
 * Ensures all pages have proper padding for:
 * - Telegram native header (top)
 * - Device notch/safe area (top)
 * - Bottom navigation bar (bottom)
 * - Device home indicator (bottom)
 */
export default function ScreenWrapper({
  children,
  className,
  showGrid = true,
  showOverlay = true,
}: ScreenWrapperProps) {
  const [topPadding, setTopPadding] = useState(65); // Default safe value

  useEffect(() => {
    // Calculate proper top padding based on Telegram WebApp
    const calculatePadding = () => {
      if (typeof window !== "undefined" && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        // Minimal padding - just enough to avoid Telegram header overlap
        // iOS: 20px, Android: 16px (Telegram header is handled by expand())
        const platform = tg.platform || "unknown";
        const defaultPadding = platform === "ios" ? 65 : 60;
        
        setTopPadding(defaultPadding);
      }
    };

    calculatePadding();
    
    // Recalculate on resize
    window.addEventListener("resize", calculatePadding);
    return () => window.removeEventListener("resize", calculatePadding);
  }, []);

  return (
    <div 
      className="fixed inset-0 flex flex-col bg-game-gradient overflow-hidden"
    >
      {/* Cyberpunk Grid Background */}
      {showGrid && (
        <div className="absolute inset-0 cyber-grid z-0 pointer-events-none" />
      )}

      {/* Background Overlay for depth */}
      {showOverlay && (
        <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none" />
      )}

      {/* Main Content Area with Safe Areas */}
      <main
        className={cn(
          "relative z-10 flex-1",
          "overflow-y-auto overflow-x-hidden",
          "no-scrollbar",
          "px-4",
          className
        )}
        style={{
          paddingTop: `${topPadding}px`,
          paddingBottom: "100px", // For bottom nav
          WebkitOverflowScrolling: "touch",
        }}
      >
        {children}
      </main>
    </div>
  );
}
