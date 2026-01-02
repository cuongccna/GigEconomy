import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Minimum balance required to be a target
const MIN_TARGET_BALANCE = 1000;

// Item names for PvP items
const PHANTOM_WALLET = "Phantom Wallet";
const NANO_SPY_DRONE = "Nano-Spy Drone";

// GET: Find a random target for PvP attack
export async function GET(request: NextRequest) {
  try {
    const telegramIdStr = request.headers.get("x-telegram-id");
    const useDrone = request.nextUrl.searchParams.get("useDrone") === "true";
    
    if (!telegramIdStr) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const telegramId = BigInt(telegramIdStr);

    // Get current user with their inventory
    const currentUser = await prisma.user.findUnique({
      where: { telegramId },
      select: { 
        id: true,
        userItems: {
          include: { item: true },
          where: {
            quantity: { gt: 0 },
          },
        },
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Check if attacker has Nano-Spy Drone (if requested)
    let hasDrone = false;
    let droneUserItem = null;
    if (useDrone) {
      droneUserItem = currentUser.userItems.find(
        (ui) => ui.item.name === NANO_SPY_DRONE && ui.quantity > 0
      );
      if (!droneUserItem) {
        return NextResponse.json({
          success: false,
          message: "You don't have a Nano-Spy Drone!",
        }, { status: 400 });
      }
      hasDrone = true;
    }

    // Find potential targets with their inventory (to check for Phantom Wallet)
    const potentialTargets = await prisma.user.findMany({
      where: {
        id: { not: currentUser.id },
        balance: { gte: MIN_TARGET_BALANCE },
        isBanned: false,
      },
      select: {
        id: true,
        username: true,
        telegramId: true,
        balance: true,
        userItems: {
          include: { item: true },
          where: {
            quantity: { gt: 0 },
          },
        },
      },
      take: 50, // Limit pool size for performance
    });

    if (potentialTargets.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No targets available. Everyone is too poor!",
        noTargets: true,
      });
    }

    // Pick a random target
    const randomIndex = Math.floor(Math.random() * potentialTargets.length);
    const target = potentialTargets[randomIndex];

    // Check if target has Phantom Wallet
    const hasPhantomWallet = target.userItems.some(
      (ui) => ui.item.name === PHANTOM_WALLET && ui.quantity > 0
    );

    // Determine displayed balance
    let displayedBalance = target.balance;
    let balanceRange = getBalanceRange(target.balance);
    let droneUsed = false;

    if (hasPhantomWallet && !hasDrone) {
      // Phantom Wallet active: show fake low balance
      displayedBalance = Math.floor(Math.random() * 91) + 10; // 10-100
      balanceRange = "10 - 100"; // Fake range
    } else if (hasPhantomWallet && hasDrone) {
      // Drone sees through Phantom Wallet: show real balance
      // Consume the drone
      await prisma.userItem.update({
        where: { id: droneUserItem!.id },
        data: { quantity: { decrement: 1 } },
      });
      droneUsed = true;
      // displayedBalance stays as real balance
    }

    // Generate avatar
    const avatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${target.telegramId}`;

    return NextResponse.json({
      success: true,
      target: {
        id: target.id,
        name: target.username || `Agent-${target.telegramId.toString().slice(-4)}`,
        avatar: avatarUrl,
        balanceRange,
        displayedBalance,
        winChance: "50%",
        hasPhantomWallet: hasPhantomWallet && !hasDrone, // Only reveal if not using drone
      },
      droneUsed,
      message: droneUsed 
        ? "🛸 Drone deployed! Phantom Wallet bypassed - showing real balance." 
        : undefined,
    });
  } catch (error) {
    console.error("PvP search error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper to mask balance into a range
function getBalanceRange(balance: number): string {
  if (balance < 5000) return "1K - 5K";
  if (balance < 10000) return "5K - 10K";
  if (balance < 25000) return "10K - 25K";
  if (balance < 50000) return "25K - 50K";
  if (balance < 100000) return "50K - 100K";
  return "100K+";
}
