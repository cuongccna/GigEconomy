"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CyberButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  className?: string;
}

export function CyberButton({
  children,
  className,
  ...props
}: CyberButtonProps) {
  return (
    <motion.button
      animate={{ scale: [1, 1.05, 1] }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "bg-neon-green text-black font-bold px-6 py-3 rounded-lg",
        "hover:shadow-[0_0_20px_rgba(0,255,148,0.6)]",
        "transition-shadow duration-300",
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
