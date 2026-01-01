"use client";

import { TonConnectUIProvider, THEME } from "@tonconnect/ui-react";

interface TonProviderProps {
  children: React.ReactNode;
}

export function TonProvider({ children }: TonProviderProps) {
  return (
    <TonConnectUIProvider 
      manifestUrl="https://dilink.io.vn/tonconnect-manifest.json"
      uiPreferences={{
        theme: THEME.DARK,
        colorsSet: {
          [THEME.DARK]: {
            connectButton: {
              background: "#00FF94",
            }
          }
        }
      }}
      actionsConfiguration={{
        twaReturnUrl: "https://t.me/GigXBot/app"
      }}
    >
      {children}
    </TonConnectUIProvider>
  );
}
