"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Lock, AlertTriangle, Loader2 } from "lucide-react";

interface AdminUser {
  id: string;
  username: string | null;
  role: string;
  balance: number;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const response = await fetch("/api/admin/check");
        const data = await response.json();
        
        setIsAdmin(data.isAdmin);
        setAdminUser(data.user);
      } catch (error) {
        console.error("Admin check failed:", error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 size={48} className="text-red-500" />
        </motion.div>
      </div>
    );
  }

  // Access Denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          {/* Lock Icon */}
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="mb-6"
          >
            <div className="inline-flex p-6 rounded-full bg-red-500/10 border-2 border-red-500/30">
              <Lock size={64} className="text-red-500" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-red-500 mb-4"
          >
            ACCESS DENIED
          </motion.h1>

          {/* Subtitle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-2 text-red-400/70 mb-6"
          >
            <AlertTriangle size={20} />
            <span>RESTRICTED AREA</span>
            <AlertTriangle size={20} />
          </motion.div>

          {/* Message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-400 max-w-md mx-auto mb-8"
          >
            This area is restricted to administrators only. 
            If you believe you should have access, please contact the system administrator.
          </motion.p>

          {/* Back Button */}
          <motion.a
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-800 text-white hover:bg-gray-700 transition-colors"
          >
            ← Return to App
          </motion.a>

          {/* Security Notice */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-xs text-gray-600"
          >
            🔒 This access attempt has been logged
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // Admin Access Granted
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-red-900/90 to-red-800/90 backdrop-blur-xl border-b border-red-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
                <Shield size={24} className="text-red-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  GIGX ADMIN
                </h1>
                <p className="text-xs text-red-300/70">Control Panel</p>
              </div>
            </div>

            {/* Admin Info */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {adminUser?.username || "Admin"}
                </p>
                <p className="text-xs text-red-300/70">
                  Role: {adminUser?.role}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <span className="text-red-400 font-bold">
                  {adminUser?.username?.[0]?.toUpperCase() || "A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Navigation */}
      <nav className="sticky top-[65px] z-40 bg-gray-900/90 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-1 py-2 overflow-x-auto">
            <AdminNavLink href="/admin" label="Dashboard" />
            <AdminNavLink href="/admin/users" label="Users" />
            <AdminNavLink href="/admin/tasks" label="Tasks" />
            <AdminNavLink href="/admin/shop" label="Shop" />
            <AdminNavLink href="/admin/analytics" label="Analytics" />
            <AdminNavLink href="/admin/settings" label="Settings" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

function AdminNavLink({ href, label }: { href: string; label: string }) {
  // In a real app, you'd use usePathname to determine if active
  return (
    <a
      href={href}
      className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors whitespace-nowrap"
    >
      {label}
    </a>
  );
}
