import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Minimum balance required to be a target
const MIN_TARGET_BALANCE = 1000;

// GET: Find a random target for PvP attack
export async function GET(request: NextRequest) {
  try {
    const telegramIdStr = request.headers.get("x-telegram-id");
    
    if (!telegramIdStr) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const telegramId = BigInt(telegramIdStr);

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Find potential targets:
    // - Not the current user
    // - Has balance > MIN_TARGET_BALANCE
    // - Not banned
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

    // Generate masked balance range for mystery
    const balanceRange = getBalanceRange(target.balance);

    // Generate avatar placeholder (could be enhanced with actual avatars)
    const avatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${target.telegramId}`;

    return NextResponse.json({
      success: true,
      target: {
        id: target.id,
        name: target.username || `Agent-${target.telegramId.toString().slice(-4)}`,
        avatar: avatarUrl,
        balanceRange, // Masked balance
        winChance: "50%", // Base win chance
      },
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
