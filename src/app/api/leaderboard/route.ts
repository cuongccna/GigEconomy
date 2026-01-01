import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Generate avatar placeholder URL based on user id
function getAvatarUrl(userId: string, username?: string | null): string {
  // Using DiceBear API for consistent avatars
  const seed = username || userId.slice(0, 8);
  return `https://api.dicebear.com/7.x/cyber/svg?seed=${seed}&backgroundColor=0a0a0a`;
}

// Mask username for privacy (optional - can be disabled for Telegram apps)
function maskUsername(username: string | null, shouldMask: boolean = false): string {
  if (!username) return "Anonymous Agent";
  if (!shouldMask) return username;
  
  // Mask middle characters: "username" -> "use***me"
  if (username.length <= 4) return username;
  const visibleStart = Math.ceil(username.length * 0.3);
  const visibleEnd = Math.floor(username.length * 0.3);
  return username.slice(0, visibleStart) + "***" + username.slice(-visibleEnd);
}

// Format balance for display
function formatBalance(balance: number): string {
  if (balance >= 1000000) {
    return (balance / 1000000).toFixed(1) + "M";
  }
  if (balance >= 1000) {
    return (balance / 1000).toFixed(1) + "K";
  }
  return balance.toFixed(0);
}

/**
 * GET /api/leaderboard
 * 
 * Get leaderboard data: Top Miners (by balance) and Top Referrers
 * 
 * Returns: {
 *   topMiners: [...],
 *   topReferrers: [...],
 *   currentUserRank: { miners: number, referrers: number },
 *   totalUsers: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from header
    const telegramIdStr = request.headers.get("x-telegram-id");
    
    if (!telegramIdStr) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const telegramId = BigInt(telegramIdStr);

    // Fetch Top 50 users by balance (Top Miners)
    const topMinerUsers = await prisma.user.findMany({
      orderBy: { balance: "desc" },
      take: 50,
      select: {
        id: true,
        username: true,
        balance: true,
        createdAt: true,
      },
    });

    // Fetch Top 50 users by referralCount (Top Referrers)
    const topReferrerUsers = await prisma.user.findMany({
      orderBy: { referralCount: "desc" },
      take: 50,
      where: {
        referralCount: { gt: 0 }, // Only users with at least 1 referral
      },
      select: {
        id: true,
        username: true,
        referralCount: true,
        createdAt: true,
      },
    });

    // Get total user count
    const totalUsers = await prisma.user.count();

    // Get current user data for rank calculation
    const currentUser = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        username: true,
        balance: true,
        referralCount: true,
      },
    });

    // Calculate current user's rank in miners leaderboard
    let minerRank = 0;
    if (currentUser) {
      const usersWithHigherBalance = await prisma.user.count({
        where: {
          balance: { gt: currentUser.balance },
        },
      });
      minerRank = usersWithHigherBalance + 1;
    }

    // Calculate current user's rank in referrers leaderboard
    let referrerRank = 0;
    if (currentUser && currentUser.referralCount > 0) {
      const usersWithMoreReferrals = await prisma.user.count({
        where: {
          referralCount: { gt: currentUser.referralCount },
        },
      });
      referrerRank = usersWithMoreReferrals + 1;
    }

    // Format top miners (hide telegramId, add avatar)
    const topMiners = topMinerUsers.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      username: maskUsername(user.username, false), // Set to true for privacy
      displayName: user.username || `Agent #${user.id.slice(0, 4)}`,
      balance: user.balance,
      balanceFormatted: formatBalance(user.balance),
      avatarUrl: getAvatarUrl(user.id, user.username),
      isCurrentUser: currentUser ? user.id === currentUser.id : false,
    }));

    // Format top referrers
    const topReferrers = topReferrerUsers.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      username: maskUsername(user.username, false),
      displayName: user.username || `Agent #${user.id.slice(0, 4)}`,
      referralCount: user.referralCount,
      avatarUrl: getAvatarUrl(user.id, user.username),
      isCurrentUser: currentUser ? user.id === currentUser.id : false,
    }));

    // Current user's stats for the leaderboard
    const currentUserStats = currentUser
      ? {
          id: currentUser.id,
          username: currentUser.username,
          displayName: currentUser.username || "You",
          balance: currentUser.balance,
          balanceFormatted: formatBalance(currentUser.balance),
          referralCount: currentUser.referralCount,
          avatarUrl: getAvatarUrl(currentUser.id, currentUser.username),
        }
      : null;

    return NextResponse.json({
      topMiners,
      topReferrers,
      currentUserRank: {
        miners: minerRank,
        referrers: referrerRank > 0 ? referrerRank : null,
      },
      currentUser: currentUserStats,
      totalUsers,
      updatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Leaderboard fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
