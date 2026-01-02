"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Wallet, Gamepad2, Users, Pickaxe } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = "home" | "earn" | "play" | "friends" | "wallet";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
}

function NavItemLink({ icon, label, href, isActive }: NavItemProps) {
  return (
    <Link href={href} className="flex-1">
      <motion.div
        whileTap={{ scale: 0.9 }}
        className={cn(
          "flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all duration-300",
          isActive
            ? "text-neon-green drop-shadow-[0_0_8px_rgba(0,255,148,0.8)]"
            : "text-white/60 hover:text-white/80"
        )}
      >
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
      </motion.div>
    </Link>
  );
}

interface BottomNavProps {
  activeTab?: NavItem;
}

export function BottomNav({ activeTab = "home" }: BottomNavProps) {
  const navItems: { id: NavItem; icon: React.ReactNode; label: string; href: string }[] = [
    { id: "home", icon: <Home size={18} />, label: "Home", href: "/" },
    { id: "earn", icon: <Pickaxe size={18} />, label: "Earn", href: "/earn" },
    { id: "play", icon: <Gamepad2 size={18} />, label: "Play", href: "/play" },
    { id: "friends", icon: <Users size={18} />, label: "Friends", href: "/friends" },
    { id: "wallet", icon: <Wallet size={18} />, label: "Wallet", href: "/wallet" },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "fixed bottom-4 left-4 right-4 z-40",
        "flex items-center justify-around",
        "py-3 rounded-2xl",
        "backdrop-blur-xl bg-black/70 border border-white/10",
        "shadow-[0_0_30px_rgba(0,0,0,0.5)]",
        "max-w-md mx-auto"
      )}
    >
      {navItems.map((item) => (
        <NavItemLink
          key={item.id}
          icon={item.icon}
          label={item.label}
          href={item.href}
          isActive={activeTab === item.id}
        />
      ))}
    </motion.nav>
  );
}
