"use client";

import { useEffect } from "react";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import "@/types/telegram";
import { TonProvider } from "@/components/TonProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

function TelegramWebAppInit() {
  useEffect(() => {
    const initTelegram = () => {
      if (typeof window === "undefined" || !window.Telegram?.WebApp) {
        return;
      }
      
      const tg = window.Telegram.WebApp;
      
      // Tell Telegram that app is ready
      tg.ready();
      
      // Set colors to blend with dark background
      try {
        tg.setHeaderColor("#000000");
        tg.setBackgroundColor("#050505");
      } catch {
        console.log("setHeaderColor not supported");
      }
      
      // Expand to full height
      tg.expand();
      
      // Try requestFullscreen for newer Telegram versions (v8.0+)
      if (tg.requestFullscreen) {
        try {
          tg.requestFullscreen();
        } catch {
          console.log("requestFullscreen not supported");
        }
      }
      
      // Listen for viewport changes and re-expand
      if (tg.onEvent) {
        tg.onEvent("viewportChanged", () => {
          if (!tg.isExpanded) {
            tg.expand();
          }
        });
      }
      
      // Update CSS variable for viewport height
      const updateViewportHeight = () => {
        const vh = tg.viewportHeight || window.innerHeight;
        document.documentElement.style.setProperty("--tg-viewport-height", `${vh}px`);
      };
      
      updateViewportHeight();
      
      // Re-expand after a short delay to ensure it takes effect
      setTimeout(() => {
        tg.expand();
        updateViewportHeight();
      }, 100);
      
      // Enable closing confirmation
      try {
        tg.enableClosingConfirmation();
      } catch {
        console.log("enableClosingConfirmation not supported");
      }
    };

    // Initialize immediately
    initTelegram();
    
    // Also try again after DOM is fully loaded
    if (document.readyState === "complete") {
      initTelegram();
    } else {
      window.addEventListener("load", initTelegram);
      return () => window.removeEventListener("load", initTelegram);
    }
  }, []);
  
  return null;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        {/* Telegram Web App SDK - must load before app */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <TelegramWebAppInit />
        {/* Adsgram SDK - Load with Block ID */}
        <Script
          src={`https://sad.adsgram.ai/js/sad.min.js?v=2.0.0`}
          strategy="beforeInteractive"
        />
        <AuthProvider>
          <TonProvider>
            <AuthGuard>{children}</AuthGuard>
          </TonProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
