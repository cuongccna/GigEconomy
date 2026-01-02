import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/check
 * 
 * Check if current user has admin privileges
 * 
 * Returns: { isAdmin: boolean, user: {...} | null }
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from header
    const telegramIdStr = request.headers.get("x-telegram-id");
    
    if (!telegramIdStr) {
      return NextResponse.json({
        isAdmin: false,
        user: null,
        error: "Unauthorized",
      });
    }

    const telegramId = BigInt(telegramIdStr);

    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        username: true,
        role: true,
        balance: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        isAdmin: false,
        user: null,
        error: "User not found",
      });
    }

    // Check if user has ADMIN role
    const isAllowed = user.role === "ADMIN";

    return NextResponse.json({
      isAdmin: isAllowed,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        balance: user.balance,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Admin check error:", error);
    return NextResponse.json(
      { isAdmin: false, user: null, error: "Failed to check admin status" },
      { status: 500 }
    );
  }
}
