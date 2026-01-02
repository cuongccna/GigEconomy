"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Send, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Users, 
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  MessageSquare
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

interface BroadcastStats {
  total: number;
  active: number;
  banned: number;
}

interface BroadcastResult {
  total: number;
  sent: number;
  failed: number;
  blocked: number;
}

export default function BroadcastPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<BroadcastStats | null>(null);
  const [, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [message, setMessage] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Fetch stats on mount
  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const res = await fetch("/api/admin/broadcast", {
        headers: { "x-telegram-id": user.id.toString() }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSend = async () => {
    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }

    if (!user?.id) {
      setError("Not authenticated");
      return;
    }

    setError(null);
    setResult(null);
    setSending(true);

    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-id": user.id.toString()
        },
        body: JSON.stringify({
          message: message.trim(),
          buttonText: buttonText.trim() || undefined,
          buttonUrl: buttonUrl.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined
        })
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.broadcast);
        // Clear form on success
        setMessage("");
        setButtonText("");
        setButtonUrl("");
        setImageUrl("");
      } else {
        setError(data.error || "Failed to send broadcast");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Broadcast error:", err);
    } finally {
      setSending(false);
    }
  };

  // Message templates
  const templates = [
    {
      name: "🪂 New Airdrop",
      message: "🪂 <b>NEW AIRDROP ALERT!</b>\n\n📋 Complete tasks and earn free crypto!\n\n💰 Rewards waiting for you!\n\n⏰ Don't miss out - limited time only!",
      buttonText: "🚀 Claim Now",
      buttonUrl: ""
    },
    {
      name: "🎁 Daily Reminder",
      message: "🎁 <b>Daily Rewards Available!</b>\n\nDon't forget to:\n✅ Check in for daily bonus\n✅ Complete new missions\n✅ Invite friends for extra rewards\n\n💰 Your $GIG is waiting!",
      buttonText: "📱 Open App",
      buttonUrl: ""
    },
    {
      name: "🔥 Hot Task",
      message: "🔥 <b>HOT MISSION ALERT!</b>\n\n🎯 New high-reward task just dropped!\n\n💎 Don't miss this opportunity!\n\n⚡ Limited spots available!",
      buttonText: "⚡ Start Now",
      buttonUrl: ""
    }
  ];

  const applyTemplate = (template: typeof templates[0]) => {
    setMessage(template.message);
    setButtonText(template.buttonText);
    setButtonUrl(template.buttonUrl);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">📢 Broadcast</h1>
          <p className="text-gray-400 text-sm">Send messages to all users</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <Users size={20} className="text-blue-400 mb-2" />
          <p className="text-2xl font-bold">{stats?.total || 0}</p>
          <p className="text-gray-400 text-xs">Total Users</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <CheckCircle size={20} className="text-green-400 mb-2" />
          <p className="text-2xl font-bold">{stats?.active || 0}</p>
          <p className="text-gray-400 text-xs">Active</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <AlertCircle size={20} className="text-red-400 mb-2" />
          <p className="text-2xl font-bold">{stats?.banned || 0}</p>
          <p className="text-gray-400 text-xs">Blocked</p>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="mb-6">
        <p className="text-sm text-gray-400 mb-2">Quick Templates:</p>
        <div className="flex gap-2 flex-wrap">
          {templates.map((t, i) => (
            <button
              key={i}
              onClick={() => applyTemplate(t)}
              className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 transition"
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Message Form */}
      <div className="space-y-4">
        {/* Message */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            <MessageSquare size={14} className="inline mr-1" />
            Message (HTML supported)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message... (supports <b>bold</b>, <i>italic</i>, <code>code</code>)"
            rows={6}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            {message.length}/1000 characters
          </p>
        </div>

        {/* Button Text */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            <LinkIcon size={14} className="inline mr-1" />
            Button Label (optional)
          </label>
          <input
            type="text"
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
            placeholder="e.g., 🚀 Open App"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Button URL */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            <LinkIcon size={14} className="inline mr-1" />
            Button URL (optional, defaults to WebApp)
          </label>
          <input
            type="url"
            value={buttonUrl}
            onChange={(e) => setButtonUrl(e.target.value)}
            placeholder="https://t.me/YourBot/app"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            <ImageIcon size={14} className="inline mr-1" />
            Image URL (optional)
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Preview Toggle */}
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="text-cyan-400 text-sm hover:underline"
        >
          {showPreview ? "Hide Preview" : "Show Preview"}
        </button>

        {/* Preview */}
        {showPreview && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-2">Preview:</p>
            {imageUrl && (
              <img 
                src={imageUrl} 
                alt="Preview" 
                className="w-full h-40 object-cover rounded-lg mb-3"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
            <div 
              className="text-sm whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ 
                __html: message
                  .replace(/<b>/g, '<strong>')
                  .replace(/<\/b>/g, '</strong>')
                  .replace(/<i>/g, '<em>')
                  .replace(/<\/i>/g, '</em>')
              }}
            />
            {buttonText && (
              <div className="mt-3">
                <span className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                  {buttonText}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-xl p-3 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-900/50 border border-green-700 text-green-300 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={20} />
              <span className="font-semibold">Broadcast Sent!</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>✅ Sent: {result.sent}</div>
              <div>❌ Failed: {result.failed}</div>
              <div>🚫 Blocked: {result.blocked}</div>
              <div>📊 Total: {result.total}</div>
            </div>
          </motion.div>
        )}

        {/* Send Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition ${
            sending || !message.trim()
              ? "bg-gray-700 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90"
          }`}
        >
          {sending ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Sending to {stats?.active || 0} users...
            </>
          ) : (
            <>
              <Send size={20} />
              SEND TO ALL ({stats?.active || 0} users)
            </>
          )}
        </motion.button>

        {/* Warning */}
        <p className="text-xs text-gray-500 text-center">
          ⚠️ This will send to all active users. Use with caution.
        </p>
      </div>
    </div>
  );
}
