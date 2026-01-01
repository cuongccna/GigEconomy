import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminByTelegramId } from "@/lib/admin";

/**
 * GET /api/admin/users
 * 
 * Search for users by Telegram ID or username
 * 
 * Query: ?q=search_term
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin permission
    const telegramIdStr = request.headers.get("x-telegram-id");
    if (!telegramIdStr || !(await isAdminByTelegramId(telegramIdStr))) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 1) {
      return NextResponse.json({
        success: true,
        users: [],
        message: "Enter a search term",
      });
    }

    const searchTerm = query.trim();

    // Try to parse as number for Telegram ID search
    const telegramId = parseInt(searchTerm);
    const isTelegramIdSearch = !isNaN(telegramId) && searchTerm.length >= 5;

    // Search users
    const users = await prisma.user.findMany({
      where: {
        OR: [
          // Search by username (case-insensitive)
          {
            username: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          // Search by Telegram ID if it's a valid number
          ...(isTelegramIdSearch
            ? [
                {
                  telegramId: BigInt(telegramId),
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        telegramId: true,
        username: true,
        balance: true,
        role: true,
        isBanned: true,
        referralCount: true,
        streak: true,
        createdAt: true,
        _count: {
          select: {
            userTasks: true,
            spinHistory: true,
            userItems: true,
          },
        },
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    // Convert BigInt to string for JSON serialization
    const serializedUsers = users.map((user) => ({
      ...user,
      telegramId: user.telegramId.toString(),
    }));

    return NextResponse.json({
      success: true,
      users: serializedUsers,
      count: users.length,
    });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search users" },
      { status: 500 }
    );
  }
}
