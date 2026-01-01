import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Hardcoded test user ID for development
const TEST_USER_ID = "61c958da-e508-4184-933f-136f9b055f2b";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || TEST_USER_ID;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        telegramId: true,
        referralCount: true,
        referrals: {
          select: {
            id: true,
            username: true,
            telegramId: true,
            createdAt: true,
            balance: true,
          },
          orderBy: {
            createdAt: "desc",
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

    // Calculate total earnings from referrals (10% of their earnings)
    // For now, we'll use a simplified calculation based on the bonus given
    const REFERRAL_BONUS = 1000;
    const totalEarned = user.referralCount * REFERRAL_BONUS;

    // Format referrals for frontend
    const friends = user.referrals.map((referral: {
      id: string;
      username: string | null;
      telegramId: bigint;
      createdAt: Date;
      balance: number;
    }) => ({
      id: referral.id,
      username: referral.username || `User_${referral.telegramId.toString().slice(-4)}`,
      telegramId: referral.telegramId.toString(),
      joinedAt: referral.createdAt.toISOString(),
      reward: REFERRAL_BONUS, // Reward earned from this referral
    }));

    return NextResponse.json({
      success: true,
      telegramId: user.telegramId.toString(),
      referralCount: user.referralCount,
      totalEarned,
      friends,
    });
  } catch (error) {
    console.error("Friends API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
