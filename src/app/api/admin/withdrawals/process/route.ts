import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/withdrawals/process
 * 
 * Process a withdrawal request (approve or reject)
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

    // Check if user is admin
    const admin = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true, role: true, username: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    const { id, action, adminNote } = await request.json();

    if (!id || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be APPROVE or REJECT" },
        { status: 400 }
      );
    }

    // Find the withdrawal
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            balance: true,
          },
        },
      },
    });

    if (!withdrawal) {
      return NextResponse.json(
        { success: false, error: "Withdrawal not found" },
        { status: 404 }
      );
    }

    if (withdrawal.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: `Withdrawal already processed (${withdrawal.status})` },
        { status: 400 }
      );
    }

    if (action === "APPROVE") {
      // Approve the withdrawal
      await prisma.$transaction([
        // Update withdrawal status
        prisma.withdrawal.update({
          where: { id },
          data: {
            status: "COMPLETED",
            adminNotes: adminNote || `Approved by ${admin.username || "admin"}`,
            processedAt: new Date(),
          },
        }),
        // Send success notification to user
        prisma.notification.create({
          data: {
            userId: withdrawal.userId,
            type: "WITHDRAWAL_SUCCESS",
            message: `🎉 Withdrawal Successful! ${withdrawal.amount.toLocaleString()} $GIG has been sent to your wallet.`,
            data: JSON.stringify({
              amount: withdrawal.amount,
              walletAddress: withdrawal.walletAddress,
              withdrawalId: withdrawal.id,
            }),
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: "Withdrawal approved successfully",
        withdrawal: {
          id: withdrawal.id,
          status: "COMPLETED",
          amount: withdrawal.amount,
          user: withdrawal.user.username,
        },
      });
    } else {
      // Reject the withdrawal - refund balance
      if (!adminNote) {
        return NextResponse.json(
          { success: false, error: "Admin note is required for rejection" },
          { status: 400 }
        );
      }

      await prisma.$transaction([
        // Update withdrawal status
        prisma.withdrawal.update({
          where: { id },
          data: {
            status: "FAILED",
            adminNotes: adminNote,
            processedAt: new Date(),
          },
        }),
        // Refund the amount back to user
        prisma.user.update({
          where: { id: withdrawal.userId },
          data: {
            balance: { increment: withdrawal.amount },
          },
        }),
        // Send rejection notification to user
        prisma.notification.create({
          data: {
            userId: withdrawal.userId,
            type: "WITHDRAWAL_FAILED",
            message: `❌ Withdrawal Rejected. Reason: ${adminNote}. Your ${withdrawal.amount.toLocaleString()} $GIG has been refunded.`,
            data: JSON.stringify({
              amount: withdrawal.amount,
              reason: adminNote,
              withdrawalId: withdrawal.id,
              refunded: true,
            }),
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: "Withdrawal rejected and balance refunded",
        withdrawal: {
          id: withdrawal.id,
          status: "FAILED",
          amount: withdrawal.amount,
          refunded: true,
          user: withdrawal.user.username,
        },
      });
    }
  } catch (error) {
    console.error("Admin withdrawal process error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
