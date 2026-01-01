/**
 * Script to set a user as ADMIN
 * 
 * Usage: npx ts-node scripts/set-admin.ts
 * 
 * Or run directly in Prisma Studio:
 *   npx prisma studio
 *   Find user → Set role to "ADMIN"
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setAdmin() {
  // Get Telegram ID from command line arguments
  const args = process.argv.slice(2);
  const telegramIdInput = args[0];

  if (!telegramIdInput) {
    console.log("⚠️  Usage: npx ts-node scripts/set-admin.ts <telegram_id>");
    console.log("   Example: npx ts-node scripts/set-admin.ts 123456789");
    
    console.log("\n📝 Recent users:");
    const users = await prisma.user.findMany({
      select: { id: true, username: true, telegramId: true, role: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    
    users.forEach((u) => {
      console.log(`   - ${u.username || "No username"} (ID: ${u.telegramId}) - Role: ${u.role}`);
    });
    return;
  }

  try {
    const telegramId = BigInt(telegramIdInput);
    console.log(`🔧 Setting user with Telegram ID ${telegramId} as ADMIN...\n`);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      console.log(`❌ User not found with Telegram ID: ${telegramId}`);
      return;
    }

    // Update user role to ADMIN
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });

    console.log("✅ User role updated successfully!");
    console.log("\n📋 User Details:");
    console.log(`   ID: ${updatedUser.id}`);
    console.log(`   Username: ${updatedUser.username || "N/A"}`);
    console.log(`   Telegram ID: ${updatedUser.telegramId}`);
    console.log(`   Role: ${updatedUser.role}`);
    console.log(`   Balance: ${updatedUser.balance} $GIG`);

    console.log("\n🎉 You can now access the admin panel at /admin");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

setAdmin();
