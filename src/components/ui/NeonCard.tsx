"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NeonCardProps {
  children: React.ReactNode;
  variant?: "default" | "glow";
  className?: string;
  onClick?: () => void;
}

export function NeonCard({
  children,
  variant = "default",
  className,
  onClick,
}: NeonCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      className={cn(
        "rounded-lg border border-white/10 bg-white/5 backdrop-blur-md p-4",
        variant === "glow" && "shadow-[0_0_15px_rgba(0,255,148,0.4)]",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
