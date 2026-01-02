import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Shop Items Seed Data
 * 
 * Item Types:
 * - consumable: One-time use, quantity decreases
 * - permanent: Permanent upgrade, applied once
 * 
 * Effects (JSON format):
 * - { type: "streak_shield", duration: 1 } - Protect streak for 1 miss
 * - { type: "free_spin", amount: 1 } - Grant 1 free spin (500 $GIG)
 * - { type: "farming_boost", multiplier: 1.2 } - 20% farming speed boost
 */

const shopItems = [
  {
    name: "Streak Shield",
    description: "Protect your daily streak if you miss a day. Never lose your progress again!",
    price: 5000,
    image: "/items/streak-shield.png",
    type: "consumable",
    effect: JSON.stringify({
      type: "streak_shield",
      duration: 1,
      description: "Protects streak for 1 missed day"
    }),
  },
  {
    name: "Energy Drink",
    description: "Get +1 Free Spin immediately! Feel the rush of instant rewards.",
    price: 2000,
    image: "/items/energy-drink.png",
    type: "consumable",
    effect: JSON.stringify({
      type: "free_spin",
      amount: 1,
      gigValue: 500,
      description: "Grants 500 $GIG (1 free spin)"
    }),
  },
  {
    name: "Mining Rig Lv2",
    description: "Upgrade your farming setup! Boost farming speed by 20% permanently.",
    price: 50000,
    image: "/items/mining-rig.png",
    type: "permanent",
    effect: JSON.stringify({
      type: "farming_boost",
      multiplier: 1.2,
      description: "Permanently increases farming rate by 20%"
    }),
  },
  {
    name: "Lucky Charm",
    description: "Increase your spin luck! Better odds for big rewards.",
    price: 10000,
    image: "/items/lucky-charm.png",
    type: "permanent",
    effect: JSON.stringify({
      type: "spin_luck",
      bonusChance: 0.05,
      description: "+5% chance for better spin rewards"
    }),
  },
  {
    name: "Referral Booster",
    description: "Double referral rewards for the next 24 hours!",
    price: 8000,
    image: "/items/referral-booster.png",
    type: "consumable",
    effect: JSON.stringify({
      type: "referral_boost",
      multiplier: 2,
      duration: 86400, // 24 hours in seconds
      description: "2x referral rewards for 24 hours"
    }),
  },
  // ===== PVP ITEMS =====
  {
    name: "Logic Bomb",
    description: "A deadly defensive trap. If someone hacks you, this bomb explodes! The attacker fails and loses 2,000 $GIG directly to you. The ultimate revenge.",
    price: 5000,
    image: "/items/logic-bomb.png",
    type: "consumable",
    effect: JSON.stringify({
      type: "logic_bomb",
      penalty: 2000,
      description: "Counter-attack: Attacker loses 2000 $GIG to you"
    }),
  },
  {
    name: "Phantom Wallet",
    description: "Hide your true balance from enemy scans. Attackers will see a fake low balance, making you a less attractive target.",
    price: 8000,
    image: "/items/phantom-wallet.png",
    type: "consumable",
    effect: JSON.stringify({
      type: "phantom_wallet",
      fakeBalanceMax: 100,
      description: "Displays fake balance (10-100) to attackers"
    }),
  },
  {
    name: "Nano-Spy Drone",
    description: "Reveal the truth! Deploy during target scan to bypass Phantom Wallets and see the real balance. One-time use.",
    price: 3000,
    image: "/items/nano-spy-drone.png",
    type: "consumable",
    effect: JSON.stringify({
      type: "nano_spy_drone",
      bypassPhantom: true,
      description: "See through Phantom Wallets during scan"
    }),
  },
];

async function seedShop() {
  console.log("🛍️  Seeding shop items...\n");

  for (const item of shopItems) {
    const existing = await prisma.item.findUnique({
      where: { name: item.name },
    });

    if (existing) {
      // Update existing item
      await prisma.item.update({
        where: { name: item.name },
        data: item,
      });
      console.log(`✅ Updated: ${item.name} - ${item.price} $GIG`);
    } else {
      // Create new item
      await prisma.item.create({
        data: item,
      });
      console.log(`🆕 Created: ${item.name} - ${item.price} $GIG`);
    }
  }

  console.log("\n🎉 Shop seeding complete!");
  console.log(`   Total items: ${shopItems.length}`);
}

// Run seed
seedShop()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
