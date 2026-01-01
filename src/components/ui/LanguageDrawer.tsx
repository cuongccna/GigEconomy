"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

type Language = "en" | "vi";

interface LanguageOption {
  code: Language;
  label: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
];

interface LanguageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  onSelectLang: (lang: Language) => void;
}

export function LanguageDrawer({
  isOpen,
  onClose,
  currentLang,
  onSelectLang,
}: LanguageDrawerProps) {
  const handleSelectLanguage = (lang: Language) => {
    onSelectLang(lang);
    // Wait for visual feedback before closing
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "bg-bg-dark/95 backdrop-blur-xl",
              "rounded-t-3xl border-t border-white/10",
              "px-6 pt-6 pb-10",
              "max-h-[60vh]"
            )}
          >
            {/* Handle bar */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X size={20} className="text-white/60" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-neon-green/20 flex items-center justify-center">
                <Globe size={20} className="text-neon-green" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Select Language</h2>
                <p className="text-white/50 text-sm">Choose your preferred language</p>
              </div>
            </div>

            {/* Language Options */}
            <div className="space-y-3">
              {languages.map((lang) => {
                const isSelected = currentLang === lang.code;
                return (
                  <motion.button
                    key={lang.code}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300",
                      isSelected
                        ? "bg-neon-green/10 border-2 border-neon-green shadow-[0_0_15px_rgba(0,255,148,0.3)]"
                        : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{lang.flag}</span>
                      <span
                        className={cn(
                          "font-medium",
                          isSelected ? "text-neon-green" : "text-white"
                        )}
                      >
                        {lang.label}
                      </span>
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="w-6 h-6 rounded-full bg-neon-green flex items-center justify-center"
                      >
                        <Check size={14} className="text-bg-dark" strokeWidth={3} />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Note */}
            <p className="text-center text-white/30 text-xs mt-6">
              Language changes will apply immediately
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
