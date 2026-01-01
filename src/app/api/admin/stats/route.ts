import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminByTelegramId } from "@/lib/admin";

/**
 * GET /api/admin/stats
 * 
 * Get dashboard statistics for admin panel
 * 
 * Returns: { success: boolean, stats: {...} }
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

    // Get total users
    const totalUsers = await prisma.user.count();

    // Get sum of all balances
    const balanceSum = await prisma.user.aggregate({
      _sum: { balance: true },
    });

    // Get total tasks
    const totalTasks = await prisma.task.count({ where: { isActive: true } });

    // Get total spin history count
    const totalSpins = await prisma.spinHistory.count();

    // Get total purchases (user items)
    const totalPurchases = await prisma.userItem.count();

    // Get total referrals
    const referralSum = await prisma.user.aggregate({
      _sum: { referralCount: true },
    });

    // Get new users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = await prisma.user.count({
      where: {
        createdAt: { gte: today },
      },
    });

    // Get active users today (users who checked in or spun today)
    const activeUsersToday = await prisma.user.count({
      where: {
        OR: [
          { lastCheckIn: { gte: today } },
          {
            spinHistory: {
              some: { createdAt: { gte: today } },
            },
          },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalBalance: balanceSum._sum.balance || 0,
        totalTasks,
        totalSpins,
        totalPurchases,
        newUsersToday,
        activeUsersToday,
        totalReferrals: referralSum._sum.referralCount || 0,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
