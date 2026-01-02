import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminByTelegramId } from "@/lib/admin";
import { broadcastToUsers, formatCustomAnnouncement } from "@/lib/telegram";

/**
 * POST /api/admin/broadcast
 * 
 * Send a broadcast message to all users or selected users
 * 
 * Body:
 * - message: string (required) - The message to send (supports HTML)
 * - buttonText?: string - Button label
 * - buttonUrl?: string - Button URL (defaults to webapp)
 * - imageUrl?: string - Image URL to attach
 * - userIds?: string[] - Specific user IDs to send to (if not provided, sends to all)
 * - excludeInactive?: boolean - Whether to exclude users who blocked the bot
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const telegramId = request.headers.get("x-telegram-id");
    if (!telegramId || !(await isAdminByTelegramId(telegramId))) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      message, 
      buttonText, 
      buttonUrl, 
      imageUrl,
      userIds,
      excludeInactive = true
    } = body;

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    // Get target users
    let targetUserIds: string[];
    
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // Send to specific users
      targetUserIds = userIds;
    } else {
      // Send to all users
      const whereClause: { isBanned?: boolean } = {};
      
      if (excludeInactive) {
        whereClause.isBanned = false;
      }
      
      const users = await prisma.user.findMany({
        where: whereClause,
        select: { telegramId: true }
      });
      
      targetUserIds = users.map(u => u.telegramId.toString());
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No users to broadcast to" },
        { status: 400 }
      );
    }

    console.log(`📢 Starting broadcast to ${targetUserIds.length} users...`);
    console.log(`   Message: ${message.slice(0, 100)}...`);
    console.log(`   Button: ${buttonText || 'None'} -> ${buttonUrl || 'None'}`);
    console.log(`   Image: ${imageUrl || 'None'}`);

    // Format the broadcast options
    const broadcastOptions = formatCustomAnnouncement(
      message,
      buttonText,
      buttonUrl || process.env.NEXT_PUBLIC_WEBAPP_URL,
      imageUrl
    );

    // Send broadcast in batches
    const result = await broadcastToUsers(targetUserIds, broadcastOptions);

    // Mark blocked users as inactive (optional: update DB)
    if (result.blocked > 0) {
      const blockedIds = result.results
        .filter(r => r.blocked)
        .map(r => r.telegramId);
      
      console.log(`⚠️ ${blockedIds.length} users have blocked the bot`);
      
      // Optionally mark them as banned/inactive
      // await prisma.user.updateMany({
      //   where: { telegramId: { in: blockedIds } },
      //   data: { isBanned: true }
      // });
    }

    return NextResponse.json({
      success: true,
      broadcast: {
        total: result.total,
        sent: result.sent,
        failed: result.failed,
        blocked: result.blocked
      },
      message: `Broadcast sent to ${result.sent}/${result.total} users`
    });

  } catch (error) {
    console.error("Broadcast error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to send broadcast" 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/broadcast
 * 
 * Get broadcast stats (total users count)
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const telegramId = request.headers.get("x-telegram-id");
    if (!telegramId || !(await isAdminByTelegramId(telegramId))) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: { isBanned: false }
    });
    const bannedUsers = await prisma.user.count({
      where: { isBanned: true }
    });

    return NextResponse.json({
      success: true,
      stats: {
        total: totalUsers,
        active: activeUsers,
        banned: bannedUsers
      }
    });

  } catch (error) {
    console.error("Broadcast stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get stats" },
      { status: 500 }
    );
  }
}
