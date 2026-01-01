import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Test user ID (from seed)
const TEST_USER_ID = "61c958da-e508-4184-933f-136f9b055f2b";

/**
 * GET /api/shop
 * 
 * Get all available shop items with user's ownership info
 * 
 * Returns: { items: Item[], userBalance: number, userItems: UserItem[] }
 */
export async function GET() {
  try {
    // Get all active items
    const items = await prisma.item.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });

    // Get user with balance and owned items
    const user = await prisma.user.findUnique({
      where: { id: TEST_USER_ID },
      select: {
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

    // Map items with ownership info
    const itemsWithOwnership = items.map((item) => {
      const userItem = user.userItems.find((ui) => ui.itemId === item.id);
      const effect = JSON.parse(item.effect);
      
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
