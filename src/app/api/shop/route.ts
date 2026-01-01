import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/shop
 * 
 * Get all available shop items with user's ownership info
 * 
 * Returns: { items: Item[], userBalance: number, userItems: UserItem[] }
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from header
    const telegramIdStr = request.headers.get("x-telegram-id");
    
    if (!telegramIdStr) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const telegramId = BigInt(telegramIdStr);

    // Get all active items
    const items = await prisma.item.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });

    // Get user with balance and owned items
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        balance: true,
        farmingRate: true,
        userItems: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // If no items in shop, return empty list
    if (items.length === 0) {
      return NextResponse.json({
        items: [],
        userBalance: user.balance,
        userItems: [],
      });
    }

    // Map items with ownership info
    const itemsWithOwnership = items.map((item) => {
      const userItem = user.userItems.find((ui) => ui.itemId === item.id);
      let effect = {};
      try {
        effect = JSON.parse(item.effect);
      } catch {
        console.error(`Failed to parse effect for item ${item.id}`);
      }
      
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        type: item.type,
        effect: effect,
        owned: !!userItem,
        quantity: userItem?.quantity || 0,
        canBuy: item.type === "consumable" || !userItem, // Can always buy consumables
      };
    });

    return NextResponse.json({
      items: itemsWithOwnership,
      userBalance: user.balance,
      farmingRate: user.farmingRate,
      ownedItems: user.userItems.map((ui) => {
        const effect = JSON.parse(ui.item.effect);
        return {
          itemId: ui.itemId,
          name: ui.item.name,
          quantity: ui.quantity,
          acquiredAt: ui.acquiredAt,
          type: ui.item.type,
          effectType: effect.type,
        };
      }),
    });

  } catch (error) {
    console.error("Shop fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop items" },
      { status: 500 }
    );
  }
}
