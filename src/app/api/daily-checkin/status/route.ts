import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Reward values for each streak day (1-7)
const BASE_REWARD = 100;
const STREAK_MULTIPLIER = 50;
const MAX_STREAK_DAY = 7;
const DAY_7_BONUS_SPINS = 1;

// Calculate reward based on streak (capped at Day 7)
const calculateReward = (streak: number): { gig: number; freeSpins: number } => {
  const effectiveDay = Math.min(streak, MAX_STREAK_DAY);
  const gig = BASE_REWARD + (effectiveDay * STREAK_MULTIPLIER);
  const freeSpins = effectiveDay === MAX_STREAK_DAY ? DAY_7_BONUS_SPINS : 0;
  return { gig, freeSpins };
};

// Check if two dates are the same day (UTC)
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
};

// Check if date1 is exactly one day before date2 (UTC)
const isConsecutiveDay = (date1: Date, date2: Date): boolean => {
  const yesterday = new Date(date2);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return isSameDay(date1, yesterday);
};

// GET: Check current daily check-in status
export async function GET(request: NextRequest) {
  try {
    // Get user ID from header
    const telegramIdStr = request.headers.get("x-telegram-id");
    
    if (!telegramIdStr) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const telegramId = BigInt(telegramIdStr);
    const now = new Date();

    // Get current user with their streak shield inventory
    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        userItems: {
          include: { item: true },
          where: {
            item: { name: "Streak Shield" },
            quantity: { gt: 0 },
          },
        },
      },
    });

    if (!user) {
      // Return default state for non-existent user
      return NextResponse.json({
        success: true,
        canCheckIn: true,
        currentStreak: 0,
        nextReward: calculateReward(1).gig,
        hasShield: false,
        streakWillReset: false,
      });
    }

    const { lastCheckIn, streak: currentStreak } = user;
    const hasShield = user.userItems.length > 0 && user.userItems[0].quantity > 0;
    const shieldCount = hasShield ? user.userItems[0].quantity : 0;

    // Check if user can check in today
    const hasClaimedToday = lastCheckIn ? isSameDay(lastCheckIn, now) : false;
    const canCheckIn = !hasClaimedToday;

    // Determine if streak will reset (missed more than 1 day and no shield)
    let streakWillReset = false;
    let effectiveStreak = currentStreak;
    
    if (lastCheckIn && !hasClaimedToday) {
      const isConsecutive = isConsecutiveDay(lastCheckIn, now);
      if (!isConsecutive) {
        // User missed a day
        if (!hasShield) {
          streakWillReset = true;
          effectiveStreak = 0; // Will reset to 1 on next claim
        }
      }
    }

    // Calculate next reward
    const nextStreakDay = canCheckIn 
      ? (streakWillReset ? 1 : effectiveStreak + 1)
      : effectiveStreak + 1;
    const nextRewardInfo = calculateReward(nextStreakDay);

    return NextResponse.json({
      success: true,
      canCheckIn,
      currentStreak: effectiveStreak,
      nextReward: nextRewardInfo.gig,
      nextFreeSpins: nextRewardInfo.freeSpins,
      hasShield,
      shieldCount,
      streakWillReset,
      lastCheckIn: lastCheckIn?.toISOString() || null,
    });
  } catch (error) {
    console.error("Daily check-in status error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
