"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  ShoppingBag,
  Gift,
  Zap,
  UserPlus,
  Megaphone,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface DashboardStats {
  totalUsers: number;
  totalBalance: number;
  totalTasks: number;
  totalSpins: number;
  totalPurchases: number;
  newUsersToday: number;
  activeUsersToday: number;
  totalReferrals: number;
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  change,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-xl bg-gray-900 border border-gray-800"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
        {change && (
          <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
            {change}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;
      try {
        const response = await fetch("/api/admin/stats", {
          headers: {
            "x-telegram-id": user.id.toString()
          }
        });
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.id) {
      fetchStats();
    }
  }, [user]);

  // Default stats while loading
  const defaultStats: DashboardStats = {
    totalUsers: 0,
    totalBalance: 0,
    totalTasks: 0,
    totalSpins: 0,
    totalPurchases: 0,
    newUsersToday: 0,
    activeUsersToday: 0,
    totalReferrals: 0,
  };

  const displayStats = stats || defaultStats;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">
          Welcome back! Here&apos;s what&apos;s happening with GigX today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Users size={24} className="text-blue-400" />}
          label="Total Users"
          value={displayStats.totalUsers.toLocaleString()}
          change="+12%"
          color="bg-blue-500/10"
        />
        <StatCard
          icon={<DollarSign size={24} className="text-green-400" />}
          label="Total $GIG in Circulation"
          value={`${(displayStats.totalBalance / 1000).toFixed(1)}K`}
          color="bg-green-500/10"
        />
        <StatCard
          icon={<Activity size={24} className="text-purple-400" />}
          label="Total Spins"
          value={displayStats.totalSpins.toLocaleString()}
          color="bg-purple-500/10"
        />
        <StatCard
          icon={<ShoppingBag size={24} className="text-orange-400" />}
          label="Total Purchases"
          value={displayStats.totalPurchases.toLocaleString()}
          color="bg-orange-500/10"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<UserPlus size={24} className="text-cyan-400" />}
          label="New Users Today"
          value={displayStats.newUsersToday}
          color="bg-cyan-500/10"
        />
        <StatCard
          icon={<Zap size={24} className="text-yellow-400" />}
          label="Active Today"
          value={displayStats.activeUsersToday}
          color="bg-yellow-500/10"
        />
        <StatCard
          icon={<Gift size={24} className="text-pink-400" />}
          label="Total Tasks"
          value={displayStats.totalTasks}
          color="bg-pink-500/10"
        />
        <StatCard
          icon={<TrendingUp size={24} className="text-emerald-400" />}
          label="Total Referrals"
          value={displayStats.totalReferrals}
          color="bg-emerald-500/10"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction href="/admin/users" label="Manage Users" icon={<Users size={20} />} />
          <QuickAction href="/admin/tasks" label="Edit Tasks" icon={<Gift size={20} />} />
          <QuickAction href="/admin/shop" label="Shop Items" icon={<ShoppingBag size={20} />} />
          <QuickAction href="/admin/broadcast" label="Broadcast" icon={<Megaphone size={20} />} />
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="p-6 rounded-xl bg-gray-900 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        <div className="text-center py-8 text-gray-500">
          <Activity size={48} className="mx-auto mb-2 opacity-50" />
          <p>Activity feed coming soon...</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-red-500/50 hover:bg-gray-800 transition-all"
    >
      <div className="p-2 rounded-lg bg-red-500/10 text-red-400">{icon}</div>
      <span className="text-sm font-medium text-white">{label}</span>
    </a>
  );
}
