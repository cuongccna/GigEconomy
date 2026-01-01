import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Test user ID (from seed)
const TEST_USER_ID = "61c958da-e508-4184-933f-136f9b055f2b";

/**
 * GET /api/admin/check
 * 
 * Check if current user has admin privileges
 * 
 * Returns: { isAdmin: boolean, user: {...} | null }
 */
export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: { id: TEST_USER_ID },
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

    return NextResponse.json({
      isAdmin: user.role === "ADMIN",
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
