// @ts-nocheck
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Please provide a Telegram ID as an argument.");
    console.error("Usage: npx ts-node scripts/set-admin-role.ts <telegram_id>");
    process.exit(1);
  }

  const telegramIdInput = args[0];
  
  try {
    // Telegram ID is BigInt in schema
    const telegramId = BigInt(telegramIdInput);

    const user = await prisma.user.update({
      where: {
        telegramId: telegramId
      },
      data: {
        role: 'ADMIN'
      }
    });

    console.log(`\nSUCCESS: User with Telegram ID ${telegramIdInput} (@${user.username || 'N/A'}) is now an ADMIN.`);
    
  } catch (error) {
    if (error.code === 'P2025') {
      console.error(`\nERROR: User with Telegram ID ${telegramIdInput} not found.`);
    } else {
      console.error("\nERROR:", error);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
