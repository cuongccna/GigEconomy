"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  X,
  Send,
  Youtube,
  Twitter,
  MessageCircle,
  Link as LinkIcon,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  link: string | null;
  icon: string;
  type: string;
  isActive: boolean;
  createdAt: string;
}

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  telegram: <Send size={18} className="text-blue-400" />,
  twitter: <Twitter size={18} className="text-sky-400" />,
  youtube: <Youtube size={18} className="text-red-500" />,
  other: <LinkIcon size={18} className="text-gray-400" />,
};

// Toggle Switch Component
function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        checked ? "bg-green-500" : "bg-gray-600"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
          checked ? "left-7" : "left-1"
        }`}
      />
    </button>
  );
}

// Create Task Modal
function CreateTaskModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    reward: "",
    link: "",
    icon: "telegram",
    type: "social",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setFormData({
          title: "",
          description: "",
          reward: "",
          link: "",
          icon: "telegram",
          type: "social",
        });
        onCreated();
        onClose();
      } else {
        setError(data.error || "Failed to create task");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-white">CREATE NEW MISSION</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                <span className="text-sm text-red-400">{error}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Follow us on Twitter"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Follow our official Twitter account for updates"
                required
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500 resize-none"
              />
            </div>

            {/* Reward & Link Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Reward ($GIG) *
                </label>
                <input
                  type="number"
                  value={formData.reward}
                  onChange={(e) => setFormData({ ...formData, reward: e.target.value })}
                  placeholder="100"
                  required
                  min="1"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Link (URL)
                </label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="https://twitter.com/..."
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Icon & Type Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Icon
                </label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-red-500"
                >
                  <option value="telegram">📱 Telegram</option>
                  <option value="twitter">🐦 Twitter</option>
                  <option value="youtube">📺 YouTube</option>
                  <option value="other">🔗 Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-red-500"
                >
                  <option value="social">Social</option>
                  <option value="partner">Partner</option>
                  <option value="daily">Daily</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl hover:from-red-500 hover:to-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Create Mission
                </>
              )}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({
  isOpen,
  taskTitle,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  isOpen: boolean;
  taskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-700 p-6"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Delete Mission?</h3>
          <p className="text-sm text-gray-400">
            Are you sure you want to delete &quot;{taskTitle}&quot;? This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-3 bg-gray-800 text-white font-medium rounded-xl hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-500 transition-colors flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Task Row Component
function TaskRow({
  task,
  onToggle,
  onDelete,
  isToggling,
}: {
  task: Task;
  onToggle: (taskId: string, isActive: boolean) => void;
  onDelete: (task: Task) => void;
  isToggling: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors"
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center flex-shrink-0">
        {iconMap[task.icon] || iconMap.other}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-white truncate">{task.title}</h3>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <span className="text-neon-green font-medium">+{task.reward} $GIG</span>
          <span className="capitalize">{task.type}</span>
        </div>
      </div>

      {/* Status Badge */}
      <div
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          task.isActive
            ? "bg-green-500/10 text-green-400 border border-green-500/30"
            : "bg-gray-600/30 text-gray-400 border border-gray-600"
        }`}
      >
        {task.isActive ? "Active" : "Inactive"}
      </div>

      {/* Toggle */}
      <ToggleSwitch
        checked={task.isActive}
        onChange={(checked) => onToggle(task.id, checked)}
        disabled={isToggling}
      />

      {/* Delete */}
      <button
        onClick={() => onDelete(task)}
        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 size={18} />
      </button>
    </motion.div>
  );
}

// Main Page Component
export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; task: Task | null }>({
    isOpen: false,
    task: null,
  });
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/admin/tasks");
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Toggle task active status
  const handleToggle = async (taskId: string, isActive: boolean) => {
    setTogglingTaskId(taskId);
    try {
      const response = await fetch("/api/admin/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, isActive }),
      });

      const data = await response.json();
      if (data.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, isActive } : t))
        );
      }
    } catch (error) {
      console.error("Failed to toggle task:", error);
    } finally {
      setTogglingTaskId(null);
    }
  };

  // Delete task
  const handleDelete = async () => {
    if (!deleteModal.task) return;
    setIsDeleting(true);

    try {
      const response = await fetch("/api/admin/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: deleteModal.task.id }),
      });

      const data = await response.json();
      if (data.success) {
        setTasks((prev) => prev.filter((t) => t.id !== deleteModal.task?.id));
        setDeleteModal({ isOpen: false, task: null });
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Stats
  const activeTasks = tasks.filter((t) => t.isActive).length;
  const inactiveTasks = tasks.length - activeTasks;

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">MISSION CONTROL</h1>
          <p className="text-gray-400">Manage tasks and missions for users</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white font-medium rounded-xl hover:from-red-500 hover:to-red-400 transition-all"
        >
          <Plus size={20} />
          New Mission
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <p className="text-2xl font-bold text-white">{tasks.length}</p>
          <p className="text-sm text-gray-400">Total Missions</p>
        </div>
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <p className="text-2xl font-bold text-green-400">{activeTasks}</p>
          <p className="text-sm text-gray-400">Active</p>
        </div>
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <p className="text-2xl font-bold text-gray-400">{inactiveTasks}</p>
          <p className="text-sm text-gray-400">Inactive</p>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-red-500" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <MessageCircle size={48} className="mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400 mb-4">No missions created yet</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-500 transition-colors"
            >
              Create First Mission
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={handleToggle}
              onDelete={(t) => setDeleteModal({ isOpen: true, task: t })}
              isToggling={togglingTaskId === task.id}
            />
          ))
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={fetchTasks}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        taskTitle={deleteModal.task?.title || ""}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, task: null })}
        isDeleting={isDeleting}
      />
    </div>
  );
}
