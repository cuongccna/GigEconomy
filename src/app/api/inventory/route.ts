import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/inventory
 * 
 * Get user's inventory items
 */
export async function GET(request: NextRequest) {
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

    // Get all user items with item details
    const userItems = await prisma.userItem.findMany({
      where: {
        userId: user.id,
        quantity: { gt: 0 },
      },
      include: {
        item: true,
      },
      orderBy: {
        acquiredAt: "desc",
      },
    });

    // Format items for response
    const inventory = userItems.map((ui) => ({
      id: ui.item.id,
      name: ui.item.name,
      description: ui.item.description,
      image: ui.item.image,
      type: ui.item.type,
      effect: ui.item.effect,
      quantity: ui.quantity,
      acquiredAt: ui.acquiredAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      inventory,
      balance: user.balance,
    });
  } catch (error) {
    console.error("Inventory fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
