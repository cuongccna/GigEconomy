// Telegram WebApp type declarations

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface TelegramWebApp {
  initDataUnsafe?: {
    start_param?: string;
    user?: TelegramUser;
  };
  ready: () => void;
  expand: () => void;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
}

// Adsgram AdController type declarations
export interface AdRewardResult {
  done: boolean;
  description?: string;
  state: "load" | "render" | "playing" | "destroy";
  error: boolean;
}

export interface AdControllerOptions {
  blockId: string;
  debug?: boolean;
}

export interface AdController {
  show: () => Promise<AdRewardResult>;
  destroy: () => void;
}

export type AdControllerFactory = (options: AdControllerOptions) => AdController;

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
    Adsgram?: {
      init: AdControllerFactory;
    };
  }
}

export {};
