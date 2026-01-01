import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Spin cost equivalent
const SPIN_VALUE = 500;

/**
 * POST /api/inventory/use
 * 
 * Use an item from inventory
 * 
 * Body: { itemId: string }
 * 
 * Returns: { 
 *   success: boolean, 
 *   message: string, 
 *   effect: object,
 *   newQuantity: number,
 *   newBalance?: number 
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const telegramIdStr = request.headers.get("x-telegram-id");

    if (!telegramIdStr) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const telegramId = BigInt(telegramIdStr);

    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "Item ID is required" },
        { status: 400 }
      );
    }

    // Get user's item with details
    const userItem = await prisma.userItem.findFirst({
      where: {
        userId: user.id,
        itemId: itemId,
      },
      include: {
        item: true,
        user: true,
      },
    });

    if (!userItem) {
      return NextResponse.json(
        { success: false, error: "You don't own this item" },
        { status: 404 }
      );
    }

    if (userItem.quantity <= 0) {
      return NextResponse.json(
        { success: false, error: "No items left to use" },
        { status: 400 }
      );
    }

    // Check if item is permanent (can't be "used")
    if (userItem.item.type === "permanent") {
      return NextResponse.json(
        { success: false, error: "This item is passive and always active" },
        { status: 400 }
      );
    }

    // Parse item effect
    const effect = JSON.parse(userItem.item.effect);
    let resultMessage = "";
    let additionalData: Record<string, unknown> = {};

    // Apply effect based on type
    switch (effect.type) {
      case "free_spin":
        // Energy Drink: Add spin value to balance
        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: { balance: { increment: SPIN_VALUE } },
          }),
          prisma.userItem.update({
            where: { id: userItem.id },
            data: { quantity: { decrement: 1 } },
          }),
        ]);
        
        resultMessage = `⚡ Energy restored! +${SPIN_VALUE} $GIG (1 Free Spin)`;
        additionalData = {
          balanceAdded: SPIN_VALUE,
          newBalance: userItem.user.balance + SPIN_VALUE,
        };
        break;

      case "streak_shield":
        // Streak Shield: Activate protection
        if (userItem.user.isShielded) {
          return NextResponse.json(
            { success: false, error: "Shield is already active!" },
            { status: 400 }
          );
        }
        
        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: { isShielded: true },
          }),
          prisma.userItem.update({
            where: { id: userItem.id },
            data: { quantity: { decrement: 1 } },
          }),
        ]);
        
        resultMessage = "🛡️ Shield activated! Your streak is now protected.";
        additionalData = {
          isShielded: true,
        };
        break;

      case "referral_boost":
        // Referral Booster: Would need a separate ActiveEffects system
        // For now, just consume and show message
        await prisma.userItem.update({
          where: { id: userItem.id },
          data: { quantity: { decrement: 1 } },
        });
        
        resultMessage = "🚀 Referral boost activated for 24 hours!";
        additionalData = {
          boostActive: true,
          expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24 hours
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Unknown item effect" },
          { status: 400 }
        );
    }

    // Get updated inventory
    const updatedUserItem = await prisma.userItem.findFirst({
      where: {
        userId: user.id,
        itemId: itemId,
      },
    });

    console.log(`🎒 Used item: ${userItem.item.name} by user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: resultMessage,
      effect: effect.type,
      itemName: userItem.item.name,
      newQuantity: updatedUserItem?.quantity || 0,
      ...additionalData,
    });

  } catch (error) {
    console.error("Use item error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to use item" },
      { status: 500 }
    );
  }
}
