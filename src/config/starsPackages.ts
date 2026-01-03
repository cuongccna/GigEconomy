/**
 * Telegram Stars Premium Packages
 * 
 * Currency: XTR (Telegram Stars)
 * 1 Star ≈ $0.02 USD
 */

export interface StarsPackage {
  id: string;
  title: string;
  description: string;
  price: number; // in Telegram Stars
  content: {
    gig?: number;           // $GIG tokens
    items?: { name: string; quantity: number }[];
    effects?: { type: string; duration?: number }[]; // duration in hours
  };
  icon: string;
  popular?: boolean;
  bestValue?: boolean;
}

export const STARS_PACKAGES: StarsPackage[] = [
  {
    id: "starter_pack",
    title: "🚀 Starter Kit",
    description: "Perfect for new agents! Get started with tokens and a spy drone.",
    price: 50, // 50 Stars ≈ $1
    content: {
      gig: 10000,
      items: [
        { name: "Nano Spy Drone", quantity: 1 },
      ],
    },
    icon: "🚀",
    popular: true,
  },
  {
    id: "heist_bundle",
    title: "⚔️ Heist Bundle",
    description: "Gear up for PvP! Shields, bombs, and tokens.",
    price: 100, // 100 Stars ≈ $2
    content: {
      gig: 25000,
      items: [
        { name: "Heist Shield", quantity: 2 },
        { name: "Logic Bomb", quantity: 1 },
      ],
    },
    icon: "⚔️",
  },
  {
    id: "vip_miner",
    title: "⛏️ VIP Mining Rig",
    description: "Double your farming rate for 7 days!",
    price: 150, // 150 Stars ≈ $3
    content: {
      gig: 15000,
      effects: [
        { type: "DOUBLE_FARMING", duration: 168 }, // 7 days = 168 hours
      ],
    },
    icon: "⛏️",
  },
  {
    id: "lucky_bundle",
    title: "🎰 Lucky Spinner",
    description: "Extra spins and better luck!",
    price: 75, // 75 Stars ≈ $1.5
    content: {
      gig: 5000,
      items: [
        { name: "Energy Drink", quantity: 5 },
        { name: "Lucky Charm", quantity: 2 },
      ],
    },
    icon: "🎰",
  },
  {
    id: "whale_pack",
    title: "🐋 Whale Pack",
    description: "For serious players! Massive tokens and full gear set.",
    price: 500, // 500 Stars ≈ $10
    content: {
      gig: 150000,
      items: [
        { name: "Heist Shield", quantity: 5 },
        { name: "Logic Bomb", quantity: 3 },
        { name: "Phantom Wallet", quantity: 2 },
        { name: "Nano Spy Drone", quantity: 2 },
        { name: "Energy Drink", quantity: 10 },
      ],
    },
    icon: "🐋",
    bestValue: true,
  },
  {
    id: "tokens_small",
    title: "💰 Token Boost",
    description: "Quick token injection!",
    price: 25, // 25 Stars ≈ $0.5
    content: {
      gig: 5000,
    },
    icon: "💰",
  },
  {
    id: "tokens_medium",
    title: "💎 Token Vault",
    description: "Serious tokens for serious players.",
    price: 200, // 200 Stars ≈ $4
    content: {
      gig: 60000,
    },
    icon: "💎",
  },
];

export function getPackageById(id: string): StarsPackage | undefined {
  return STARS_PACKAGES.find((pkg) => pkg.id === id);
}
