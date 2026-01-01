import { prisma } from "@/lib/prisma";

export type UserRole = "USER" | "ADMIN";

/**
 * Check if a user is an admin by their user ID
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === "ADMIN";
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

/**
 * Check if a user is an admin by their Telegram ID
 */
export async function isAdminByTelegramId(telegramId: bigint | string | number): Promise<boolean> {
  try {
    const tid = typeof telegramId === "bigint" ? telegramId : BigInt(telegramId);
    const user = await prisma.user.findUnique({
      where: { telegramId: tid },
      select: { role: true },
    });
    return user?.role === "ADMIN";
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

/**
 * Get user role by ID
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return (user?.role as UserRole) || null;
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
}

/**
 * Set user role (admin only operation)
 */
export async function setUserRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    return true;
  } catch (error) {
    console.error("Error setting user role:", error);
    return false;
  }
}

/**
 * Middleware helper to protect admin routes
 * Returns the user if admin, null otherwise
 */
export async function requireAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      telegramId: true,
    },
  });

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return user;
}
