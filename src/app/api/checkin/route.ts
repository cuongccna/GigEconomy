import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Reward values for each streak day (1-7, then cycles)
const STREAK_REWARDS = [100, 200, 300, 500, 750, 1000, 5000];

// Get reward based on streak (1-indexed, cycles after 7)
const getRewardForStreak = (streak: number): number => {
  const index = ((streak - 1) % 7);
  return STREAK_REWARDS[index];
};

// Check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Check if date1 is exactly one day before date2
const isYesterday = (date1: Date, date2: Date): boolean => {
  const yesterday = new Date(date2);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date1, yesterday);
};

// Hardcoded test user ID for development
const TEST_USER_ID = "61c958da-e508-4184-933f-136f9b055f2b";

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

    // Get current user
    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const { lastCheckIn, streak: currentStreak } = user;

    // Scenario A: Already claimed today
    if (lastCheckIn && isSameDay(lastCheckIn, now)) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Already claimed today",
          hasClaimedToday: true,
          streak: currentStreak,
        },
        { status: 400 }
      );
    }

    let newStreak: number;

    if (!lastCheckIn) {
      // First time check-in
      newStreak = 1;
    } else if (isYesterday(lastCheckIn, now)) {
      // Scenario B: Streak continues (claimed yesterday)
      newStreak = currentStreak + 1;
    } else {
      // Scenario C: Streak broken (missed a day)
      newStreak = 1;
    }

    // Calculate reward based on streak
    const rewardAmount = getRewardForStreak(newStreak);

    // Update user atomically
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { increment: rewardAmount },
        lastCheckIn: now,
        streak: newStreak,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Day ${((newStreak - 1) % 7) + 1} claimed!`,
      newBalance: updatedUser.balance,
      streak: newStreak,
      rewardAmount,
      hasClaimedToday: true,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check current check-in status
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

    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        streak: true,
        lastCheckIn: true,
        balance: true,
      },
    });

    if (!user) {
      // Return default state if user not found
      return NextResponse.json({
        success: true,
        streak: 0,
        hasClaimedToday: false,
        lastCheckIn: null,
        balance: 0,
        nextReward: getRewardForStreak(1),
      });
    }

    const hasClaimedToday = user.lastCheckIn 
      ? isSameDay(user.lastCheckIn, now) 
      : false;

    // If streak is broken (last check-in was more than 1 day ago), show streak as 0
    let displayStreak = user.streak;
    if (user.lastCheckIn && !hasClaimedToday && !isYesterday(user.lastCheckIn, now)) {
      displayStreak = 0; // Streak will reset on next claim
    }

    return NextResponse.json({
      success: true,
      streak: displayStreak,
      hasClaimedToday,
      lastCheckIn: user.lastCheckIn?.toISOString() || null,
      balance: user.balance,
      nextReward: hasClaimedToday 
        ? getRewardForStreak(displayStreak + 1)
        : getRewardForStreak(displayStreak + 1),
    });
  } catch (error) {
    console.error("Check-in status error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
