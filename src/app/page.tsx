"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { NeonCard, BottomNav, TaskDrawer, DailyCheckInDrawer, FarmingCard } from "@/components/ui";
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Daily check-in state
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [hasClaimedToday, setHasClaimedToday] = useState(false);

  // Fetch check-in status
  const fetchCheckInStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/checkin");
      const data = await response.json();
      if (data.success) {
        setStreak(data.streak);
        setHasClaimedToday(data.hasClaimedToday);
      }
    } catch (error) {
      console.error("Failed to fetch check-in status:", error);
    }
  }, []);

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/tasks");
      const data: TasksResponse = await response.json();

      // Map API tasks to UI tasks with resolved icons
      const mappedTasks: Task[] = data.tasks.map((apiTask: ApiTask) => ({
        id: apiTask.id,
        title: apiTask.title,
        reward: apiTask.reward,
        link: apiTask.link,
        icon: getIcon(apiTask.icon),
        iconName: apiTask.icon,
        isCompleted: apiTask.isCompleted,
      }));

      setTasks(mappedTasks);
      setUserBalance(data.userBalance);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchCheckInStatus();
  }, [fetchTasks, fetchCheckInStatus]);

  // Handle daily check-in claim
  const handleCheckInClaim = async () => {
    try {
      const response = await fetch("/api/checkin", { method: "POST" });
      const data = await response.json();
      
      if (data.success) {
        setUserBalance(data.newBalance);
        setStreak(data.streak);
        setHasClaimedToday(true);
      }
    } catch (error) {
      console.error("Failed to claim check-in:", error);
    }
  };

  const handleTaskClick = (task: Task) => {
    if (task.isCompleted) return; // Don't open drawer for completed tasks
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedTask(null);
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
    <div className="min-h-screen dark-gradient cyber-grid px-4 pt-8 pb-28">
      {/* Daily Gift Button - Fixed Position */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsCheckInOpen(true)}
        className="fixed top-4 right-4 z-30 p-3 rounded-full bg-neon-purple/20 border border-neon-purple/30 backdrop-blur-sm"
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
          <p className="text-2xl font-bold text-white">#142</p>
          <p className="text-xs text-white/40">Rank</p>
        </div>
      </motion.div>

      {/* Farming Card */}
      <FarmingCard onBalanceUpdate={setUserBalance} />

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
          {tasks.map((task, index) => (
            <motion.div key={task.id} variants={itemVariants}>
              <NeonCard
                variant={index === 0 && !task.isCompleted ? "glow" : "default"}
                className={`flex items-center gap-4 ${
                  task.isCompleted
                    ? "opacity-60 cursor-default"
                    : "cursor-pointer"
                } ${index === 0 && !task.isCompleted ? "border-neon-green/30" : ""}`}
                onClick={() => handleTaskClick(task)}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    task.isCompleted
                      ? "bg-neon-green/10"
                      : index === 0
                      ? "bg-neon-green/20 pulse-glow"
                      : "bg-white/5"
                  }`}
                >
                  {task.isCompleted ? (
                    <span className="text-2xl">✅</span>
                  ) : (
                    <task.icon
                      className={`w-6 h-6 ${
                        index === 0 ? "text-neon-green" : "text-neon-purple"
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-bold truncate ${
                      task.isCompleted
                        ? "text-white/50 line-through"
                        : index === 0
                        ? "text-neon-green"
                        : "text-white"
                    }`}
                  >
                    {task.title}
                  </h3>
                  <p className="text-sm text-white/40 truncate">
                    {task.isCompleted ? "Completed" : task.link}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {task.isCompleted ? (
                    <p className="text-neon-green font-bold">DONE</p>
                  ) : (
                    <p
                      className={`font-bold ${
                        index === 0 ? "text-neon-green text-lg" : "text-white"
                      }`}
                    >
                      +{task.reward.toLocaleString()} PTS
                    </p>
                  )}
                </div>
              </NeonCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Task Drawer */}
      <TaskDrawer
        task={selectedTask}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onClaim={handleTaskClaimed}
      />

      {/* Daily Check-in Drawer */}
      <DailyCheckInDrawer
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        currentStreak={streak}
        hasClaimedToday={hasClaimedToday}
        onClaim={handleCheckInClaim}
      />

      {/* Bottom Navigation */}
      <BottomNav activeTab="earn" />
    </div>
  );
}
