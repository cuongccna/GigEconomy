import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/withdrawals
 * 
 * Fetch all withdrawal requests with filters
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

    // Check if user is admin
    const admin = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true, role: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause
    const where = status === "ALL" 
      ? {} 
      : status === "HISTORY"
        ? { status: { in: ["COMPLETED", "FAILED"] } }
        : { status };

    // Fetch withdrawals with user info
    const [withdrawals, totalCount] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              telegramId: true,
              username: true,
              balance: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.withdrawal.count({ where }),
    ]);

    // Get stats
    const stats = await prisma.withdrawal.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: true,
    });

    const pendingStats = stats.find(s => s.status === "PENDING");
    const completedStats = stats.find(s => s.status === "COMPLETED");
    const failedStats = stats.find(s => s.status === "FAILED");

    return NextResponse.json({
      success: true,
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amount: w.amount,
        walletAddress: w.walletAddress,
        txHash: w.txHash,
        status: w.status,
        adminNotes: w.adminNotes,
        processedAt: w.processedAt?.toISOString() || null,
        createdAt: w.createdAt.toISOString(),
        user: {
          id: w.user.id,
          telegramId: w.user.telegramId.toString(),
          username: w.user.username,
          balance: w.user.balance,
        },
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: {
        pending: {
          count: pendingStats?._count || 0,
          totalAmount: pendingStats?._sum.amount || 0,
        },
        completed: {
          count: completedStats?._count || 0,
          totalAmount: completedStats?._sum.amount || 0,
        },
        failed: {
          count: failedStats?._count || 0,
          totalAmount: failedStats?._sum.amount || 0,
        },
      },
    });
  } catch (error) {
    console.error("Admin withdrawals fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
