"use client";

import { TonConnectUIProvider } from "@tonconnect/ui-react";

interface TonProviderProps {
  children: React.ReactNode;
}

export function TonProvider({ children }: TonProviderProps) {
  return (
    <TonConnectUIProvider manifestUrl="/tonconnect-manifest.json">
      {children}
    </TonConnectUIProvider>
  );
}
