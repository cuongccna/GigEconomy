"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Edit3,
  Package,
  Loader2,
  AlertTriangle,
  DollarSign,
  Zap,
  Battery,
  Sparkles,
  Check,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  type: string;
  effect: string;
  isActive: boolean;
  createdAt: string;
  _count?: { userItems: number };
}

// Icon mapping for items
const getItemIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("energy") || lower.includes("drink")) return <Battery size={24} className="text-yellow-400" />;
  if (lower.includes("mining") || lower.includes("rig")) return <Zap size={24} className="text-cyan-400" />;
  if (lower.includes("boost")) return <Sparkles size={24} className="text-purple-400" />;
  return <Package size={24} className="text-gray-400" />;
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

// Edit Item Modal
function EditItemModal({
  isOpen,
  item,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  item: Item | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    image: "",
    type: "consumable",
    effect: "",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Populate form when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        description: item.description,
        price: item.price.toString(),
        image: item.image,
        type: item.type,
        effect: item.effect,
        isActive: item.isActive,
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      if (!user?.id) throw new Error("Unauthorized");
      const response = await fetch("/api/admin/shop", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "x-telegram-id": user.id.toString()
        },
        body: JSON.stringify({
          itemId: item?.id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Item updated successfully!");
        setTimeout(() => {
          onSaved();
          onClose();
        }, 1000);
      } else {
        setError(data.error || "Failed to update item");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !item) return null;

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
          className="w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-900">
            <h2 className="text-lg font-bold text-white">EDIT ITEM</h2>
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

            {success && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
                <Check size={16} className="text-green-500" />
                <span className="text-sm text-green-400">{success}</span>
              </div>
            )}

            {/* Preview */}
            <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl">
              <div className="w-16 h-16 rounded-xl bg-gray-700 flex items-center justify-center overflow-hidden">
                {formData.image ? (
                  <img
                    src={formData.image}
                    alt={formData.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  getItemIcon(formData.name)
                )}
              </div>
              <div>
                <p className="font-bold text-white">{formData.name || "Item Name"}</p>
                <p className="text-sm text-neon-green">{formData.price || "0"} $GIG</p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500 resize-none"
              />
            </div>

            {/* Price & Type Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Price ($GIG)
                </label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    min="1"
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500"
                  />
                </div>
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
                  <option value="consumable">Consumable</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Image URL
              </label>
              <input
                type="text"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://example.com/image.png"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Effect */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Effect / Description
              </label>
              <input
                type="text"
                value={formData.effect}
                onChange={(e) => setFormData({ ...formData, effect: e.target.value })}
                placeholder="e.g., +1 Free Spin"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Availability Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
              <div>
                <p className="font-medium text-white">Available in Shop</p>
                <p className="text-sm text-gray-400">
                  {formData.isActive ? "Item is visible to users" : "Item is hidden from shop"}
                </p>
              </div>
              <ToggleSwitch
                checked={formData.isActive}
                onChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
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
                  Saving...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Create Item Modal
function CreateItemModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    image: "",
    type: "consumable",
    effect: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!user?.id) throw new Error("Unauthorized");
      const response = await fetch("/api/admin/shop", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-telegram-id": user.id.toString()
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setFormData({
          name: "",
          description: "",
          price: "",
          image: "",
          type: "consumable",
          effect: "",
        });
        onCreated();
        onClose();
      } else {
        setError(data.error || "Failed to create item");
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
            <h2 className="text-lg font-bold text-white">CREATE NEW ITEM</h2>
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

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Energy Drink"
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
                placeholder="Restores energy for mining"
                required
                rows={2}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500 resize-none"
              />
            </div>

            {/* Price & Type Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Price ($GIG) *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="100"
                  required
                  min="1"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-red-500"
                >
                  <option value="consumable">Consumable</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Image URL
              </label>
              <input
                type="text"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://example.com/image.png"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Effect */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Effect
              </label>
              <input
                type="text"
                value={formData.effect}
                onChange={(e) => setFormData({ ...formData, effect: e.target.value })}
                placeholder="e.g., +1 Free Spin, 2x Mining for 1 hour"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500"
              />
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
                  Create Item
                </>
              )}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Item Card Component
function ItemCard({
  item,
  onEdit,
}: {
  item: Item;
  onEdit: (item: Item) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative p-4 bg-gray-800/50 rounded-xl border transition-all cursor-pointer hover:border-red-500/50 ${
        item.isActive ? "border-gray-700/50" : "border-gray-700/30 opacity-60"
      }`}
      onClick={() => onEdit(item)}
    >
      {/* Status Badge */}
      <div
        className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-medium ${
          item.isActive
            ? "bg-green-500/10 text-green-400 border border-green-500/30"
            : "bg-gray-600/30 text-gray-400 border border-gray-600"
        }`}
      >
        {item.isActive ? "Active" : "Hidden"}
      </div>

      {/* Image */}
      <div className="w-full aspect-square rounded-xl bg-gray-700/50 flex items-center justify-center mb-3 overflow-hidden">
        {item.image && !item.image.includes("default") ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="flex items-center justify-center w-full h-full">${getItemIcon(item.name)}</div>`;
            }}
          />
        ) : (
          getItemIcon(item.name)
        )}
      </div>

      {/* Info */}
      <h3 className="font-bold text-white mb-1 truncate">{item.name}</h3>
      <div className="flex items-center justify-between">
        <span className="text-neon-green font-bold">{item.price} $GIG</span>
        <span className="text-xs text-gray-400 capitalize">{item.type}</span>
      </div>

      {/* Purchases Count */}
      {item._count && (
        <p className="text-xs text-gray-500 mt-2">
          {item._count.userItems} purchased
        </p>
      )}

      {/* Edit Icon */}
      <div className="absolute bottom-3 right-3 p-2 rounded-lg bg-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
        <Edit3 size={14} />
      </div>
    </motion.div>
  );
}

// Main Page Component
export default function AdminShopPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<{ isOpen: boolean; item: Item | null }>({
    isOpen: false,
    item: null,
  });

  // Fetch items
  const fetchItems = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch("/api/admin/shop", {
        headers: {
          "x-telegram-id": user.id.toString()
        }
      });
      const data = await response.json();
      if (data.success) {
        setItems(data.items);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchItems();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Stats
  const activeItems = items.filter((i) => i.isActive).length;
  const totalRevenue = items.reduce((acc, item) => {
    return acc + (item.price * (item._count?.userItems || 0));
  }, 0);

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">INVENTORY LOGISTICS</h1>
          <p className="text-gray-400">Manage shop items and pricing</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white font-medium rounded-xl hover:from-red-500 hover:to-red-400 transition-all"
        >
          <Plus size={20} />
          New Item
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <p className="text-2xl font-bold text-white">{items.length}</p>
          <p className="text-sm text-gray-400">Total Items</p>
        </div>
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <p className="text-2xl font-bold text-green-400">{activeItems}</p>
          <p className="text-sm text-gray-400">Active</p>
        </div>
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <p className="text-2xl font-bold text-neon-green">{totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-400">Total Revenue ($GIG)</p>
        </div>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-red-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <Package size={48} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400 mb-4">No items in shop yet</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-500 transition-colors"
          >
            Create First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={(i) => setEditModal({ isOpen: true, item: i })}
            />
          ))}
        </div>
      )}

      {/* Create Item Modal */}
      <CreateItemModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={fetchItems}
      />

      {/* Edit Item Modal */}
      <EditItemModal
        isOpen={editModal.isOpen}
        item={editModal.item}
        onClose={() => setEditModal({ isOpen: false, item: null })}
        onSaved={fetchItems}
      />
    </div>
  );
}
