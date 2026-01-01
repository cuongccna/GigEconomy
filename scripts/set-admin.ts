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

// The test user ID to set as admin
const TEST_USER_ID = "61c958da-e508-4184-933f-136f9b055f2b";

async function setAdmin() {
  try {
    console.log("🔧 Setting user as ADMIN...\n");

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: TEST_USER_ID },
    });

    if (!user) {
      console.log("❌ User not found with ID:", TEST_USER_ID);
      console.log("\n📝 Available users:");
      const users = await prisma.user.findMany({
        select: { id: true, username: true, role: true },
        take: 10,
      });
      users.forEach((u) => {
        console.log(`   - ${u.username || "No username"} (${u.id}) - Role: ${u.role}`);
      });
      return;
    }

    // Update user role to ADMIN
    const updatedUser = await prisma.user.update({
      where: { id: TEST_USER_ID },
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
