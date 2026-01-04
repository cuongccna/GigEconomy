"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Twitter,
  Send,
  Coins,
  Globe,
  Users,
  Zap,
  Wallet,
  Gift,
  Star,
  LucideIcon,
  Loader2,
  CalendarCheck,
  Search,
  Filter,
  X,
} from "lucide-react";
import { BottomNav, DailyCheckInDrawer, FarmingCard, TaskCard } from "@/components/ui";
import ScreenWrapper from "@/components/ScreenWrapper";
import type { Task, ApiTask, TasksResponse } from "@/types/task";

// Icon mapping from string to LucideIcon
const iconMap: Record<string, LucideIcon> = {
  Twitter,
  Send,
  Coins,
  Globe,
  Users,
  Zap,
  Wallet,
  Gift,
  Star,
};

const getIcon = (iconName: string): LucideIcon => {
  return iconMap[iconName] || Gift;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Daily check-in state
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [hasClaimedToday, setHasClaimedToday] = useState(false);
  const [streak, setStreak] = useState(0);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [availableTypes, setAvailableTypes] = useState<{ type: string; count: number }[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Pagination state
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // User rank state
  const [userRank, setUserRank] = useState<number | null>(null);

  // Fetch check-in status and auto-open if can check in
  const fetchCheckInStatus = useCallback(async () => {
    try {
      // Get user ID from Telegram WebApp
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      
      if (!telegramId) {
        return;
      }

      const response = await fetch("/api/daily-checkin/status", {
        headers: {
          "x-telegram-id": telegramId.toString(),
        },
      });
      const data = await response.json();
      if (data.success) {
        setHasClaimedToday(!data.canCheckIn);
        setStreak(data.currentStreak);
        // Auto-open modal if user can check in
        if (data.canCheckIn) {
          setIsCheckInOpen(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch check-in status:", error);
    }
  }, []);

  // Fetch user rank from leaderboard
  const fetchUserRank = useCallback(async () => {
    try {
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) return;

      const response = await fetch("/api/leaderboard", {
        headers: {
          "x-telegram-id": telegramId.toString(),
        },
      });
      const data = await response.json();
      if (data.currentUserRank?.miners) {
        setUserRank(data.currentUserRank.miners);
      }
    } catch (error) {
      console.error("Failed to fetch user rank:", error);
    }
  }, []);

  // Fetch tasks from API
  const fetchTasks = useCallback(async (reset = true, cursor?: string) => {
    try {
      // Get user ID from Telegram WebApp
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      
      if (!telegramId) {
        console.warn("No Telegram ID found, skipping fetch");
        setIsLoading(false);
        return;
      }

      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      // Build query params
      const params = new URLSearchParams();
      if (selectedType !== "all") params.set("type", selectedType);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      if (cursor) params.set("cursor", cursor);
      params.set("limit", "20");

      const response = await fetch(`/api/tasks?${params.toString()}`, {
        headers: {
          "x-telegram-id": telegramId.toString(),
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const data: TasksResponse = await response.json();

      // Map API tasks to UI tasks with resolved icons
      const mappedTasks: Task[] = (data.tasks || []).map((apiTask: ApiTask) => ({
        id: apiTask.id,
        title: apiTask.title,
        reward: apiTask.reward,
        link: apiTask.link,
        icon: getIcon(apiTask.icon),
        iconName: apiTask.icon,
        isCompleted: apiTask.isCompleted,
        type: apiTask.type,
      }));

      if (reset) {
        setTasks(mappedTasks);
      } else {
        setTasks((prev) => [...prev, ...mappedTasks]);
      }
      
      setUserBalance(data.userBalance || 0);
      setHasMore(data.pagination?.hasMore || false);
      setNextCursor(data.pagination?.nextCursor || null);
      
      // Update available filter types
      if (data.filters?.types) {
        setAvailableTypes(data.filters.types);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      if (reset) {
        setTasks([]);
        setUserBalance(0);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [selectedType, searchQuery, selectedStatus]);

  // Load more tasks
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && nextCursor) {
      fetchTasks(false, nextCursor);
    }
  }, [isLoadingMore, hasMore, nextCursor, fetchTasks]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      fetchTasks(true);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedType, selectedStatus, fetchTasks]);

  useEffect(() => {
    fetchCheckInStatus();
    fetchUserRank();
  }, [fetchCheckInStatus, fetchUserRank]);

  // Handle balance update from check-in drawer
  const handleBalanceUpdate = (newBalance: number) => {
    setUserBalance(newBalance);
    setHasClaimedToday(true);
    // Refetch status to update streak display
    fetchCheckInStatus();
  };

  const handleTaskClaimed = (taskId: string, newBalance: number) => {
    // Optimistic UI update
    setUserBalance(newBalance);
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, isCompleted: true } : task
      )
    );
  };

  const activeTasks = tasks.filter((t) => !t.isCompleted);
  const completedCount = tasks.filter((t) => t.isCompleted).length;

  return (
    <ScreenWrapper>
      {/* Daily Gift Button - Fixed Position */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsCheckInOpen(true)}
        className="fixed top-4 right-4 z-30 p-3 rounded-full bg-neon-purple/20 border border-neon-purple/30 backdrop-blur-sm safe-top-padding"
      >
        <CalendarCheck size={24} className="text-neon-purple" />
        {/* Notification dot */}
        {!hasClaimedToday && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-bg-dark"
          >
            <motion.div
              className="absolute inset-0 bg-red-500 rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        )}
      </motion.button>

      {/* Header / Balance Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center mb-10"
      >
        <p className="text-white/50 text-xs uppercase tracking-[0.3em] mb-3">
          Total Balance
        </p>
        <div className="relative inline-block">
          <h1 className="text-6xl md:text-7xl font-bold text-neon-green neon-glow">
            {userBalance.toLocaleString()}
          </h1>
          <span className="absolute -right-16 top-1/2 -translate-y-1/2 text-xl font-bold text-neon-purple">
            $GIG
          </span>
        </div>
        <p className="text-white/30 text-sm mt-3">≈ ${(userBalance / 100).toFixed(2)} USD</p>
      </motion.div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex justify-center gap-8 mb-10"
      >
        <div className="text-center">
          <p className="text-2xl font-bold text-neon-green">{completedCount}</p>
          <p className="text-xs text-white/40">Tasks Done</p>
        </div>
        <div className="w-px bg-white/10" />
        <div className="text-center">
          <p className="text-2xl font-bold text-neon-purple">{streak}</p>
          <p className="text-xs text-white/40">Day Streak</p>
        </div>
        <div className="w-px bg-white/10" />
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            {userRank ? `#${userRank}` : "-"}
          </p>
          <p className="text-xs text-white/40">Rank</p>
        </div>
      </motion.div>

      {/* Farming Card */}
      <FarmingCard onBalanceUpdate={setUserBalance} />

      {/* Search & Filter Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="mb-4"
      >
        {/* Search Bar */}
        <div className="relative mb-3">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search missions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-neon-green/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Filter Toggle & Quick Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors shrink-0 ${
              isFilterOpen || selectedType !== "all" || selectedStatus !== "all"
                ? "bg-neon-green/20 border-neon-green/50 text-neon-green"
                : "bg-white/5 border-white/10 text-white/60"
            }`}
          >
            <Filter size={16} />
            <span className="text-sm">Filters</span>
          </button>
          
          {/* Quick Type Filters */}
          <button
            onClick={() => setSelectedType("all")}
            className={`px-3 py-2 rounded-lg text-sm transition-colors shrink-0 ${
              selectedType === "all"
                ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/50"
                : "bg-white/5 text-white/60 border border-white/10"
            }`}
          >
            All
          </button>
          {availableTypes.slice(0, 4).map((t) => (
            <button
              key={t.type}
              onClick={() => setSelectedType(t.type)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors shrink-0 capitalize ${
                selectedType === t.type
                  ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/50"
                  : "bg-white/5 text-white/60 border border-white/10"
              }`}
            >
              {t.type} ({t.count})
            </button>
          ))}
        </div>

        {/* Expanded Filter Panel */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-xs text-white/40 mb-2">Status</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "all", label: "All" },
                    { value: "pending", label: "Pending" },
                    { value: "completed", label: "Completed" },
                  ].map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSelectedStatus(s.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        selectedStatus === s.value
                          ? "bg-neon-green/20 text-neon-green border border-neon-green/50"
                          : "bg-white/5 text-white/60 border border-white/10"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                
                {/* Clear Filters */}
                {(selectedType !== "all" || selectedStatus !== "all" || searchQuery) && (
                  <button
                    onClick={() => {
                      setSelectedType("all");
                      setSelectedStatus("all");
                      setSearchQuery("");
                    }}
                    className="mt-3 text-sm text-red-400 hover:text-red-300"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Tasks Section Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex items-center justify-between mb-6"
      >
        <h2 className="text-lg font-bold text-white">
          🎯 Available Missions
        </h2>
        <span className="text-xs text-neon-green bg-neon-green/10 px-3 py-1 rounded-full">
          {activeTasks.length} Active
        </span>
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-neon-green animate-spin mb-4" />
          <p className="text-white/50">Loading missions...</p>
        </div>
      )}

      {/* Task List */}
      {!isLoading && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-4"
        >
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/40">No missions found</p>
              {(searchQuery || selectedType !== "all" || selectedStatus !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedType("all");
                    setSelectedStatus("all");
                  }}
                  className="mt-2 text-neon-green text-sm"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            tasks.map((task, index) => (
              <motion.div key={task.id} variants={itemVariants}>
                <TaskCard
                  task={task}
                  index={index}
                  onClaim={handleTaskClaimed}
                />
              </motion.div>
            ))
          )}
          
          {/* Infinite Scroll Trigger */}
          <div ref={observerRef} className="h-4" />
          
          {/* Loading More Indicator */}
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 text-neon-green animate-spin" />
            </div>
          )}
          
          {/* End of List */}
          {!hasMore && tasks.length > 0 && (
            <p className="text-center text-white/30 text-sm py-4">
              No more missions
            </p>
          )}
        </motion.div>
      )}

      {/* Daily Check-in Drawer */}
      <DailyCheckInDrawer
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onBalanceUpdate={handleBalanceUpdate}
      />

      {/* Bottom Navigation */}
      <BottomNav activeTab="earn" />
    </ScreenWrapper>
  );
}
