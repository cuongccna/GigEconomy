import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Max farming duration: 8 hours in milliseconds
const MAX_FARMING_DURATION_MS = 8 * 60 * 60 * 1000;
const MAX_FARMING_DURATION_MINUTES = 8 * 60;

// Hardcoded test user ID for development
const TEST_USER_ID = "61c958da-e508-4184-933f-136f9b055f2b";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body; // "start" or "claim"
    
    // Get user ID from header
    const telegramIdStr = request.headers.get("x-telegram-id");
    
    if (!telegramIdStr) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const telegramId = BigInt(telegramIdStr);

    // Get user ID from DB
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true, farmingStartedAt: true, farmingRate: true, balance: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const userId = user.id;

    if (action === "start") {
      if (user.farmingStartedAt) {
        return NextResponse.json(
          { success: false, message: "Already farming" },
          { status: 400 }
        );
      }

      // Start farming
      await prisma.user.update({
        where: { id: userId },
        data: { farmingStartedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: "Farming started",
        farmingStartedAt: new Date().toISOString(),
      });
    }

    if (action === "claim") {
      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          farmingStartedAt: true,
          farmingRate: true,
          balance: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, message: "User not found" },
          { status: 404 }
        );
      }

      if (!user.farmingStartedAt) {
        return NextResponse.json(
          { success: false, message: "Not currently farming" },
          { status: 400 }
        );
      }

      const now = new Date();
      const startTime = new Date(user.farmingStartedAt);
      let elapsedMs = now.getTime() - startTime.getTime();

      // Cap at max farming duration
      if (elapsedMs > MAX_FARMING_DURATION_MS) {
        elapsedMs = MAX_FARMING_DURATION_MS;
      }

      // Convert to minutes
      const elapsedMinutes = elapsedMs / (1000 * 60);

      // Calculate reward
      const reward = Math.floor(elapsedMinutes * user.farmingRate);

      // Update user: add reward to balance, reset farming
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          balance: { increment: reward },
          farmingStartedAt: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Farming claimed",
        claimedAmount: reward,
        newBalance: updatedUser.balance,
        farmingDurationMinutes: Math.floor(elapsedMinutes),
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid action. Use 'start' or 'claim'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Farming error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check farming status
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

    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        farmingStartedAt: true,
        farmingRate: true,
        balance: true,
      },
    });

    if (!user) {
      // Return default state if user not found (not created yet)
      return NextResponse.json({
        success: true,
        isFarming: false,
        farmingStartedAt: null,
        farmingRate: 0.5,
        elapsedMinutes: 0,
        currentEarnings: 0,
        maxEarnings: 240,
        isFull: false,
        balance: 0,
      });
    }

    const isFarming = !!user.farmingStartedAt;
    let elapsedMinutes = 0;
    let currentEarnings = 0;
    let isFull = false;

    if (isFarming && user.farmingStartedAt) {
      const now = new Date();
      const startTime = new Date(user.farmingStartedAt);
      let elapsedMs = now.getTime() - startTime.getTime();

      // Check if capped
      if (elapsedMs >= MAX_FARMING_DURATION_MS) {
        elapsedMs = MAX_FARMING_DURATION_MS;
        isFull = true;
      }

      elapsedMinutes = elapsedMs / (1000 * 60);
      currentEarnings = Math.floor(elapsedMinutes * user.farmingRate);
    }

    // Max possible earnings (8 hours worth)
    const maxEarnings = Math.floor(MAX_FARMING_DURATION_MINUTES * user.farmingRate);

    return NextResponse.json({
      success: true,
      isFarming,
      farmingStartedAt: user.farmingStartedAt?.toISOString() || null,
      farmingRate: user.farmingRate,
      elapsedMinutes: Math.floor(elapsedMinutes),
      currentEarnings,
      maxEarnings,
      isFull,
      balance: user.balance,
    });
  } catch (error) {
    console.error("Farming status error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
