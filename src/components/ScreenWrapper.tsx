"use client";

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
  return (
    <div className="fixed inset-0 flex flex-col bg-game-gradient">
      {/* Cyberpunk Grid Background */}
      {showGrid && (
        <div className="absolute inset-0 cyber-grid z-0" />
      )}

      {/* Background Overlay for depth */}
      {showOverlay && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-0" />
      )}

      {/* Main Content Area with Safe Areas */}
      <main
        className={cn(
          "relative z-10 flex-1",
          "scroll-container no-scrollbar",
          "safe-top-padding safe-bottom-padding",
          "px-4",
          className
        )}
      >
        {children}
      </main>
    </div>
  );
}
