import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/pvp/leaderboard
 * 
 * Fetch top 20 PvP players by wins
 */
export async function GET(request: NextRequest) {
  try {
    const telegramIdStr = request.headers.get("x-telegram-id");

    // Get current user if authenticated
    let currentUserId: string | null = null;
    if (telegramIdStr) {
      const currentUser = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramIdStr) },
        select: { id: true },
      });
      currentUserId = currentUser?.id || null;
    }

    // Fetch top 20 by PvP wins
    const topPlayers = await prisma.user.findMany({
      where: {
        isBanned: false,
        pvpWins: { gt: 0 },
      },
      orderBy: [
        { pvpWins: "desc" },
        { pvpTotalStolen: "desc" },
      ],
      take: 20,
      select: {
        id: true,
        telegramId: true,
        username: true,
        pvpWins: true,
        pvpTotalStolen: true,
        balance: true,
        userItems: {
          where: {
            item: { name: "Streak Shield" },
            quantity: { gt: 0 },
          },
          select: { quantity: true },
        },
      },
    });

    // Get current user's rank if not in top 20
    let currentUserRank: number | null = null;
    let currentUserData = null;

    if (currentUserId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: {
          id: true,
          telegramId: true,
          username: true,
          pvpWins: true,
          pvpTotalStolen: true,
          balance: true,
          userItems: {
            where: {
              item: { name: "Streak Shield" },
              quantity: { gt: 0 },
            },
            select: { quantity: true },
          },
        },
      });

      if (currentUser) {
        // Count users with more wins
        const rank = await prisma.user.count({
          where: {
            isBanned: false,
            OR: [
              { pvpWins: { gt: currentUser.pvpWins } },
              {
                pvpWins: currentUser.pvpWins,
                pvpTotalStolen: { gt: currentUser.pvpTotalStolen },
              },
            ],
          },
        });

        currentUserRank = rank + 1;
        currentUserData = {
          ...currentUser,
          telegramId: currentUser.telegramId.toString(),
          hasShield: currentUser.userItems.length > 0,
          shieldCount: currentUser.userItems[0]?.quantity || 0,
        };
      }
    }

    // Format response
    const formattedPlayers = topPlayers.map((player, index) => ({
      rank: index + 1,
      id: player.id,
      telegramId: player.telegramId.toString(),
      username: player.username,
      displayName: player.username || `Agent-${player.telegramId.toString().slice(-4)}`,
      avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${player.telegramId}`,
      pvpWins: player.pvpWins,
      pvpTotalStolen: player.pvpTotalStolen,
      pvpTotalStolenFormatted: formatBalance(player.pvpTotalStolen),
      balance: player.balance,
      balanceFormatted: formatBalance(player.balance),
      hasShield: player.userItems.length > 0,
      shieldCount: player.userItems[0]?.quantity || 0,
      isCurrentUser: player.id === currentUserId,
    }));

    return NextResponse.json({
      success: true,
      topPlayers: formattedPlayers,
      currentUserRank,
      currentUser: currentUserData
        ? {
            ...currentUserData,
            displayName: currentUserData.username || `Agent-${currentUserData.telegramId.slice(-4)}`,
            avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${currentUserData.telegramId}`,
            pvpTotalStolenFormatted: formatBalance(currentUserData.pvpTotalStolen),
            balanceFormatted: formatBalance(currentUserData.balance),
          }
        : null,
      totalPvPPlayers: await prisma.user.count({
        where: { isBanned: false, pvpWins: { gt: 0 } },
      }),
    });
  } catch (error) {
    console.error("PvP leaderboard error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Format balance for display
function formatBalance(balance: number): string {
  if (balance >= 1000000) {
    return `${(balance / 1000000).toFixed(1)}M`;
  } else if (balance >= 1000) {
    return `${(balance / 1000).toFixed(1)}K`;
  }
  return balance.toLocaleString();
}
