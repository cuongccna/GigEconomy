import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Find the user
    const user = await prisma.user.findUnique({
      where: { telegramId },
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
