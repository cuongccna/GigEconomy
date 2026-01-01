import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/users/action
 * 
 * Perform admin actions on users
 * 
 * Body: { 
 *   action: "gift" | "ban" | "unban" | "setRole",
 *   userId: string,
 *   amount?: number (for gift),
 *   role?: string (for setRole),
 *   adminId: string (for logging)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, amount, role, adminId } = body;

    // Validate required fields
    if (!action || !userId) {
      return NextResponse.json(
        { success: false, error: "Action and userId are required" },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get admin info for logging
    let adminUsername = "Unknown Admin";
    if (adminId) {
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { username: true, telegramId: true },
      });
      if (admin) {
        adminUsername = admin.username || `TG:${admin.telegramId}`;
      }
    }

    const targetUsername = targetUser.username || `TG:${targetUser.telegramId}`;

    // Handle different actions
    switch (action) {
      case "gift": {
        if (!amount || amount <= 0) {
          return NextResponse.json(
            { success: false, error: "Amount must be a positive number" },
            { status: 400 }
          );
        }

        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            balance: { increment: amount },
          },
        });

        // Log the action
        console.log(
          `[ADMIN ACTION] ${adminUsername} gifted ${amount} $GIG to ${targetUsername} (${userId})`
        );

        return NextResponse.json({
          success: true,
          message: `Gifted ${amount} $GIG to ${targetUsername}`,
          user: {
            ...updatedUser,
            telegramId: updatedUser.telegramId.toString(),
          },
        });
      }

      case "ban": {
        if (targetUser.role === "ADMIN") {
          return NextResponse.json(
            { success: false, error: "Cannot ban an admin user" },
            { status: 400 }
          );
        }

        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { isBanned: true },
        });

        // Log the action
        console.log(
          `[ADMIN ACTION] ${adminUsername} BANNED user ${targetUsername} (${userId})`
        );

        return NextResponse.json({
          success: true,
          message: `User ${targetUsername} has been banned`,
          user: {
            ...updatedUser,
            telegramId: updatedUser.telegramId.toString(),
          },
        });
      }

      case "unban": {
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { isBanned: false },
        });

        // Log the action
        console.log(
          `[ADMIN ACTION] ${adminUsername} UNBANNED user ${targetUsername} (${userId})`
        );

        return NextResponse.json({
          success: true,
          message: `User ${targetUsername} has been unbanned`,
          user: {
            ...updatedUser,
            telegramId: updatedUser.telegramId.toString(),
          },
        });
      }

      case "setRole": {
        if (!role || !["USER", "ADMIN"].includes(role)) {
          return NextResponse.json(
            { success: false, error: "Invalid role. Must be USER or ADMIN" },
            { status: 400 }
          );
        }

        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { role },
        });

        // Log the action
        console.log(
          `[ADMIN ACTION] ${adminUsername} changed role of ${targetUsername} (${userId}) to ${role}`
        );

        return NextResponse.json({
          success: true,
          message: `User ${targetUsername} role set to ${role}`,
          user: {
            ...updatedUser,
            telegramId: updatedUser.telegramId.toString(),
          },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Admin users action error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
