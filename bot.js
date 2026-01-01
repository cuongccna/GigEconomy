const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

// =====================================================
// GigX Telegram Bot
// =====================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const WEBAPP_URL = process.env.WEBAPP_URL || "https://dilink.io.vn";
const COMMUNITY_URL = process.env.COMMUNITY_URL || "https://t.me/GigXCommunity";

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is required in .env file!");
  console.error("   Add: TELEGRAM_BOT_TOKEN=\"your_bot_token_here\"");
  process.exit(1);
}

// Create bot instance
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log("🤖 GigX Bot is running...");
console.log(`📱 Web App URL: ${WEBAPP_URL}`);

// =====================================================
// /start Command
// =====================================================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || "Cyber Agent";

  const welcomeMessage = `
🔥 *Welcome to GigX, ${firstName}!* 🔥

💎 *Web3 Task Marketplace* - Where Hustlers Get Paid!

🎯 *How to Earn \\$GIG:*
• Complete social tasks
• Daily check-in streaks
• Spin the Cyber Roulette
• Refer friends (+500 \\$GIG each!)
• Farm tokens passively

🎰 *Lucky Spin* - Win up to 1000 \\$GIG!
🛒 *Shop* - Buy power-ups & boosters
🏆 *Leaderboard* - Compete for top ranks

💰 *Connect TON Wallet* for future airdrops!

🚀 *Ready to start earning?*
`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "🚀 LAUNCH APP",
          web_app: { url: WEBAPP_URL },
        },
      ],
      [
        {
          text: "👥 Community",
          url: COMMUNITY_URL,
        },
        {
          text: "📖 How to Play",
          callback_data: "how_to_play",
        },
      ],
    ],
  };

  await bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
});

// =====================================================
// /help Command
// =====================================================
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  const helpMessage = `
📖 *How to Play GigX* 📖

━━━━━━━━━━━━━━━━━━━━

🎯 *EARNING \\$GIG*

• *Tasks* - Complete social missions
  → Follow Twitter, Join Telegram, etc.
  → Earn 50-500 \\$GIG per task

• *Daily Check-in* - Don't break the streak!
  → Day 1: 10 \\$GIG
  → Day 7: 100 \\$GIG (7x bonus!)
  → Use Streak Shield to protect

• *Farming* - Passive income
  → Start farming session
  → Collect after 8 hours
  → Earn 0.5 \\$GIG/hour base

• *Lucky Spin* - Test your luck!
  → 1 free spin daily
  → Watch ads for extra spins
  → Win up to 1000 \\$GIG!

━━━━━━━━━━━━━━━━━━━━

👥 *REFERRALS*

• Share your invite link
• Earn +500 \\$GIG per friend
• Friends get +200 \\$GIG bonus
• Build your squad!

━━━━━━━━━━━━━━━━━━━━

🛒 *SHOP ITEMS*

• *Energy Drink* - +1 Free Spin
• *Mining Rig* - 2x farming rate
• *Lucky Charm* - Better spin odds
• *Streak Shield* - Protect streak

━━━━━━━━━━━━━━━━━━━━

🏆 *LEADERBOARD*

• Top Miners - Most \\$GIG earned
• Top Squad - Most referrals
• Compete for glory!

━━━━━━━━━━━━━━━━━━━━

💰 *Connect TON Wallet* for future rewards!

🚀 *Start earning now!*
`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "🚀 Start Playing",
          web_app: { url: WEBAPP_URL },
        },
      ],
    ],
  };

  await bot.sendMessage(chatId, helpMessage, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
});

// =====================================================
// Callback Query Handler (for inline buttons)
// =====================================================
bot.on("callback_query", async (query) => {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  if (query.data === "how_to_play") {
    const helpMessage = `
📖 *How to Play GigX* 📖

🎯 *EARNING \\$GIG:*
• Complete tasks → 50-500 \\$GIG
• Daily check-in → Up to 100 \\$GIG
• Lucky Spin → Up to 1000 \\$GIG
• Refer friends → +500 \\$GIG each
• Farm tokens → 0.5 \\$GIG/hour

🛒 *SHOP:*
• Energy Drink - +1 Free Spin
• Mining Rig - 2x farming
• Lucky Charm - Better odds
• Streak Shield - Protect streak

🏆 *COMPETE:*
• Top Miners leaderboard
• Top Referrers squad

💰 Connect TON Wallet for airdrops!
`;

    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId, helpMessage, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚀 Start Playing",
              web_app: { url: WEBAPP_URL },
            },
          ],
        ],
      },
    });
  }
});

// =====================================================
// Error Handler
// =====================================================
bot.on("polling_error", (error) => {
  console.error("Polling error:", error.message);
});

bot.on("error", (error) => {
  console.error("Bot error:", error.message);
});

// =====================================================
// Graceful Shutdown
// =====================================================
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down bot...");
  bot.stopPolling();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Shutting down bot...");
  bot.stopPolling();
  process.exit(0);
});

console.log("✅ Bot started successfully!");
