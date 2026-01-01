import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Clear existing data (order matters due to foreign keys)
  console.log("🧹 Clearing existing data...");
  await prisma.userTask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();

  // Create dummy user
  console.log("👤 Creating test user...");
  const user = await prisma.user.create({
    data: {
      telegramId: BigInt(123456789),
      username: "cyber_degen",
      balance: 12500,
    },
  });
  console.log(`   ✅ Created user: ${user.username} (ID: ${user.id})`);

  // Create cyberpunk-style tasks
  console.log("🎯 Creating tasks...");
  const tasks = await prisma.task.createMany({
    data: [
      {
        title: "🔥 Join Alpha Channel",
        reward: 2500,
        link: "https://t.me/gigx_alpha",
        icon: "Send",
        isActive: true,
      },
      {
        title: "🐦 Retweet Pinned Post",
        reward: 500,
        link: "https://twitter.com/GigXOfficial",
        icon: "Twitter",
        isActive: true,
      },
      {
        title: "💎 Connect Phantom Wallet",
        reward: 1000,
        link: "https://phantom.app",
        icon: "Wallet",
        isActive: true,
      },
      {
        title: "🌐 Visit Partner dApp",
        reward: 300,
        link: "https://partner.gigx.io",
        icon: "Globe",
        isActive: true,
      },
      {
        title: "👥 Invite 3 Frens",
        reward: 1500,
        link: "https://t.me/gigx_bot?start=ref",
        icon: "Users",
        isActive: true,
      },
    ],
  });
  console.log(`   ✅ Created ${tasks.count} tasks`);

  // Display summary
  const allTasks = await prisma.task.findMany();
  console.log("\n📋 Task Summary:");
  console.log("─".repeat(50));
  for (const task of allTasks) {
    console.log(`   ${task.title} → ${task.reward} PTS`);
  }
  console.log("─".repeat(50));

  console.log("\n✨ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
