"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { TelegramUser } from "@/types/telegram";
import "@/types/telegram";

interface AuthContextType {
  user: TelegramUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  startParam: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  startParam: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startParam, setStartParam] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if we're in Telegram WebApp environment
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
          const webApp = window.Telegram.WebApp;
          const initDataUnsafe = webApp.initDataUnsafe;
          
          // Get start_param (referral code)
          const startParamValue = initDataUnsafe?.start_param || null;
          setStartParam(startParamValue);
          
          // Get user data
          const telegramUser = initDataUnsafe?.user;
          
          if (telegramUser) {
            setUser(telegramUser);
            
            // Authenticate with backend
            await fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                telegramId: telegramUser.id,
                username: telegramUser.username || telegramUser.first_name,
                startParam: startParamValue,
              }),
            });
          }
          
          // Tell Telegram the app is ready
          webApp.ready();
          webApp.expand();
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        startParam,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
