import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Reward values for each streak day (1-7)
// Day 1: 100, Day 2: 150, Day 3: 200, Day 4: 250, Day 5: 300, Day 6: 350, Day 7: 400+bonus
const BASE_REWARD = 100;
const STREAK_MULTIPLIER = 50;
const MAX_STREAK_DAY = 7;
const DAY_7_BONUS_SPINS = 1; // 1 free spin on Day 7

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

// POST: Perform daily check-in
export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const { lastCheckIn, streak: currentStreak } = user;

    // Scenario A: Already checked in today
    if (lastCheckIn && isSameDay(lastCheckIn, now)) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Already checked in today",
          streak: currentStreak,
        },
        { status: 400 }
      );
    }

    let newStreak: number;
    let shieldUsed = false;
    const hasShield = user.userItems.length > 0 && user.userItems[0].quantity > 0;

    if (!lastCheckIn) {
      // First time check-in
      newStreak = 1;
    } else if (isConsecutiveDay(lastCheckIn, now)) {
      // Scenario B: Consecutive day - streak continues
      newStreak = currentStreak + 1;
    } else {
      // Scenario C: Missed more than 1 day
      if (hasShield) {
        // Use Streak Shield to protect streak
        const shieldItem = user.userItems[0];
        
        // Consume the shield
        await prisma.userItem.update({
          where: { id: shieldItem.id },
          data: { quantity: { decrement: 1 } },
        });
        
        // Keep the streak intact and increment
        newStreak = currentStreak + 1;
        shieldUsed = true;
      } else {
        // No shield - reset streak
        newStreak = 1;
      }
    }

    // Calculate reward based on new streak
    const reward = calculateReward(newStreak);

    // Update user with new streak, lastCheckIn, and balance
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { increment: reward.gig },
        lastCheckIn: now,
        streak: newStreak,
      },
    });

    // If Day 7, we could also add free spin bonus here
    // For now, the free spin value is communicated but balance is already handled by gig

    return NextResponse.json({
      success: true,
      reward: reward.gig,
      streak: newStreak,
      shieldUsed,
      freeSpins: reward.freeSpins,
      newBalance: updatedUser.balance,
      message: shieldUsed 
        ? `Shield used! Day ${Math.min(newStreak, MAX_STREAK_DAY)} claimed!`
        : `Day ${Math.min(newStreak, MAX_STREAK_DAY)} claimed!`,
    });
  } catch (error) {
    console.error("Daily check-in error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
