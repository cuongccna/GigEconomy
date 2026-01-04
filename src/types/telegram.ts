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
  // Properties
  isExpanded?: boolean;
  viewportHeight?: number;
  viewportStableHeight?: number;
  platform?: string;
  version?: string;
  // Methods
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
  isFullscreen?: boolean;
  onEvent?: (eventType: string, callback: () => void) => void;
  offEvent?: (eventType: string, callback: () => void) => void;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  openInvoice?: (url: string, callback?: (status: "paid" | "cancelled" | "failed" | "pending") => void) => void;
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
