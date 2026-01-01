import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Free spin reward amount
const FREE_SPIN_REWARD = 500;

/**
 * POST /api/spin/free
 * 
 * Grants a free spin (500 $GIG) to the user.
 * This is called after successfully watching an ad.
 * 
 * Security note: In production, this should be called from Adsgram's
 * server-to-server callback, not directly from the client.
 * For MVP, we allow client calls but should add rate limiting.
 */
export async function POST(request: NextRequest) {
  try {
    // Get user ID from header
    const telegramIdStr = request.headers.get("x-telegram-id");
    
    if (!telegramIdStr) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const telegramId = BigInt(telegramIdStr);

    // Get user
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true, balance: true, telegramId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Add free spin reward to balance
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { balance: { increment: FREE_SPIN_REWARD } },
      select: { balance: true },
    });

    // Log the free spin grant (optional - for tracking)
    console.log(`Free spin granted: ${FREE_SPIN_REWARD} $GIG to user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: "Free spin granted!",
      rewardAmount: FREE_SPIN_REWARD,
      newBalance: updatedUser.balance,
    });
  } catch (error) {
    console.error("Free spin error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
