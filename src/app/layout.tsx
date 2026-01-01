import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { TonProvider } from "@/components/TonProvider";
import { AuthProvider } from "@/hooks/useAuth";

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

export const metadata: Metadata = {
  title: "GigX - Web3 Task Marketplace",
  description: "Earn crypto by completing simple tasks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
        {/* Adsgram SDK - Load with Block ID */}
        <Script
          src={`https://sad.adsgram.ai/js/sad.min.js?v=2.0.0`}
          strategy="beforeInteractive"
        />
        <AuthProvider>
          <TonProvider>{children}</TonProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
