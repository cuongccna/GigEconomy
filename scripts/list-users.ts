// @ts-nocheck
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      telegramId: true,
      username: true,
      role: true,
      balance: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 50 // List last 50 users
  });

  console.log("\n=== LIST OF USERS (Last 10) ===");
  if (users.length === 0) {
    console.log("No users found in the database.");
  } else {
    users.forEach(user => {
      // Convert BigInt to string for display
      console.log(`Telegram ID: ${user.telegramId.toString()} | Username: @${user.username || 'N/A'} | Role: ${user.role}`);
    });
  }
  console.log("===============================\n");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
