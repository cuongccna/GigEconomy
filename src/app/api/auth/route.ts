import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const REFERRAL_BONUS = 1000; // Bonus for both referrer and new user

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, username, startParam } = body;

    if (!telegramId) {
      return NextResponse.json(
        { success: false, message: "telegramId is required" },
        { status: 400 }
      );
    }

    const telegramIdBigInt = BigInt(telegramId);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { telegramId: telegramIdBigInt },
    });

    if (existingUser) {
      // User exists - just return their data
      return NextResponse.json({
        success: true,
        user: {
          id: existingUser.id,
          telegramId: existingUser.telegramId.toString(),
          username: existingUser.username,
          balance: existingUser.balance,
          referralCount: existingUser.referralCount,
          isNew: false,
        },
      });
    }

    // NEW USER - handle referral logic
    let referrerId: string | null = null;
    let referrerTelegramId: bigint | null = null;

    // Parse startParam for referral (format: "ref_12345")
    if (startParam && typeof startParam === "string" && startParam.startsWith("ref_")) {
      const refIdStr = startParam.replace("ref_", "");
      try {
        referrerTelegramId = BigInt(refIdStr);
        
        // Find the referrer
        const referrer = await prisma.user.findUnique({
          where: { telegramId: referrerTelegramId },
        });

        if (referrer) {
          referrerId = referrer.id;
        }
      } catch {
        // Invalid referral ID format, ignore
        console.log("Invalid referral ID format:", refIdStr);
      }
    }

    // Create new user with referral bonus using transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the new user
      const newUser = await tx.user.create({
        data: {
          telegramId: telegramIdBigInt,
          username: username || null,
          balance: referrerId ? REFERRAL_BONUS : 0, // New user gets bonus if referred
          referredById: referrerId,
        },
      });

      // If there's a referrer, update their balance and referral count
      if (referrerId && referrerTelegramId) {
        await tx.user.update({
          where: { telegramId: referrerTelegramId },
          data: {
            balance: { increment: REFERRAL_BONUS },
            referralCount: { increment: 1 },
          },
        });
      }

      return newUser;
    });

    return NextResponse.json({
      success: true,
      user: {
        id: result.id,
        telegramId: result.telegramId.toString(),
        username: result.username,
        balance: result.balance,
        referralCount: result.referralCount,
        isNew: true,
        wasReferred: !!referrerId,
        referralBonus: referrerId ? REFERRAL_BONUS : 0,
      },
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch current user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get("telegramId");

    if (!telegramId) {
      return NextResponse.json(
        { success: false, message: "telegramId is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: {
        referredBy: {
          select: { username: true, telegramId: true },
        },
        _count: {
          select: { referrals: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        username: user.username,
        balance: user.balance,
        referralCount: user.referralCount,
        referredBy: user.referredBy
          ? {
              username: user.referredBy.username,
              telegramId: user.referredBy.telegramId.toString(),
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Auth GET error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
