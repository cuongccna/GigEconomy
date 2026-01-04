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
    // Initialize Telegram WebApp
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Force full screen immediately
      tg.expand();
      
      // Set header color to blend with our dark background
      tg.setHeaderColor("#000000");
      tg.setBackgroundColor("#050505");
      
      // Enable closing confirmation if needed
      tg.enableClosingConfirmation();
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
