import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Spin cost equivalent
const SPIN_COST = 500;

/**
 * POST /api/shop/buy
 * 
 * Purchase an item from the shop
 * 
 * Body: { itemId: string }
 * 
 * Returns: { success: boolean, message: string, newBalance: number, item: Item }
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

    const body = await request.json();
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "Item ID is required" },
        { status: 400 }
      );
    }

    // Get item details
    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: "Item not found" },
        { status: 404 }
      );
    }

    if (!item.isActive) {
      return NextResponse.json(
        { success: false, error: "This item is no longer available" },
        { status: 400 }
      );
    }

    // Get user with current balance
    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        userItems: {
          where: { itemId },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has enough balance
    if (user.balance < item.price) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Insufficient balance",
          required: item.price,
          current: user.balance,
        },
        { status: 400 }
      );
    }

    // Check if permanent item already owned
    if (item.type === "permanent" && user.userItems.length > 0) {
      return NextResponse.json(
        { success: false, error: "You already own this permanent item" },
        { status: 400 }
      );
    }

    // Parse item effect
    let effect: { type?: string; [key: string]: unknown } = {};
    try {
      effect = JSON.parse(item.effect);
    } catch {
      // If effect is not valid JSON, use empty object
      effect = { type: "unknown" };
    }
    
    let additionalUpdates = {};
    let immediateEffect = null;

    // Apply special effects based on item type
    switch (effect.type) {
      case "free_spin":
        // Energy Drink: Add spin value to balance (essentially gives a free spin)
        additionalUpdates = {
          balance: {
            increment: SPIN_COST - item.price, // Net effect after deduction
          },
        };
        immediateEffect = `+${SPIN_COST} $GIG (1 Free Spin)`;
        break;

      case "farming_boost":
        // Mining Rig: Permanently increase farming rate
        const multiplier = (effect.multiplier as number) || 1.2;
        additionalUpdates = {
          farmingRate: user.farmingRate * multiplier,
        };
        immediateEffect = `Farming speed increased to ${(user.farmingRate * multiplier).toFixed(2)}/hour`;
        break;

      case "streak_shield":
        // Streak Shield: Just add to inventory, effect applied when streak would break
        immediateEffect = "Shield activated! Your streak is protected.";
        break;

      case "spin_luck":
        // Lucky Charm: Store in user items, checked during spin
        immediateEffect = "Luck increased! Better spin rewards await.";
        break;

      case "referral_boost":
        // Referral Booster: Store with expiry time
        immediateEffect = "Referral rewards doubled for 24 hours!";
        break;

      // ===== PVP ITEMS =====
      case "logic_bomb":
        // Logic Bomb (Cyber Mine): Stored in inventory, triggers when attacked
        immediateEffect = "💣 Logic Bomb planted! Next attacker will regret it.";
        break;

      case "phantom_wallet":
        // Phantom Wallet: Hides real balance from attackers
        immediateEffect = "👻 Phantom Wallet activated! Your balance is now hidden.";
        break;

      case "nano_spy_drone":
        // Nano-Spy Drone: See through Phantom Wallets during scan
        immediateEffect = "🛸 Drone ready! Use it to reveal hidden enemy balances.";
        break;

      default:
        // Generic consumable - just add to inventory
        immediateEffect = `${item.name} added to your inventory.`;
        break;
    }

    // Execute purchase in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct balance (with any additional balance changes)
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { decrement: item.price },
          ...additionalUpdates,
        },
      });

      // Add or update user item
      if (item.type === "consumable") {
        // For consumables, increment quantity or create
        const existingItem = user.userItems[0];
        
        if (existingItem) {
          await tx.userItem.update({
            where: { id: existingItem.id },
            data: { quantity: { increment: 1 } },
          });
        } else {
          await tx.userItem.create({
            data: {
              userId: user.id,
              itemId: item.id,
              quantity: 1,
            },
          });
        }
      } else {
        // For permanent items, just create the record
        await tx.userItem.create({
          data: {
            userId: user.id,
            itemId: item.id,
            quantity: 1,
          },
        });
      }

      return updatedUser;
    });

    console.log(`🛒 Purchase: ${item.name} by user ${user.id} for ${item.price} $GIG`);

    return NextResponse.json({
      success: true,
      message: `Successfully purchased ${item.name}!`,
      newBalance: result.balance,
      item: {
        id: item.id,
        name: item.name,
        type: item.type,
        effect: effect,
      },
      immediateEffect,
    });

  } catch (error) {
    console.error("Shop buy error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process purchase" },
      { status: 500 }
    );
  }
}
