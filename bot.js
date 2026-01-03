const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

// =====================================================
// GigX Telegram Bot - Cyber Heist Edition
// =====================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const WEBAPP_URL = process.env.WEBAPP_URL || "https://dilink.io.vn";
const COMMUNITY_URL = process.env.COMMUNITY_URL || "https://t.me/+ZVtj_Ye2gqViYzE1";
const CHANNEL_URL = process.env.CHANNEL_URL || "https://t.me/+ZVtj_Ye2gqViYzE1";

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
  const firstName = msg.from?.first_name || "Agent";

  const welcomeMessage = `
🕶️ *Welcome to GigX, ${firstName}\\!* 🕶️

━━━━━━━━━━━━━━━━━━━━
⚡ *THE ULTIMATE CRYPTO HEIST GAME*
━━━━━━━━━━━━━━━━━━━━

💰 *Earn \\$GIG Tokens:*
├ 📋 Complete social tasks
├ 📅 Daily check\\-in streaks
├ 🎰 Spin the Cyber Roulette
├ 👥 Refer friends \\(\\+500 \\$GIG\\)
└ 🌾 Farm tokens passively

🎮 *NEW\\! PvP Cyber Heist:*
├ 🔍 Scout enemy vaults
├ 💥 Attack \\& steal \\$GIG
├ 🛡️ Defend your stash
└ 🏆 Climb the Most Wanted list

🛒 *Black Market Shop:*
├ ⚡ Energy Drinks \\- Extra spins
├ 💣 Logic Bomb \\- Bypass shields
├ 👻 Phantom Wallet \\- Hide balance
└ 🛡️ Streak Shield \\- Protect streak

💎 *Withdraw to TON Wallet\\!*
├ Min: 100,000 \\$GIG
├ Fee: 0\\.05 TON gas
└ Direct to your wallet

━━━━━━━━━━━━━━━━━━━━
🚀 *Ready to become a crypto legend?*
`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "🚀 LAUNCH GIGX",
          web_app: { url: WEBAPP_URL },
        },
      ],
      [
        {
          text: "📢 Channel",
          url: CHANNEL_URL,
        },
        {
          text: "👥 Community",
          url: COMMUNITY_URL,
        },
      ],
      [
        {
          text: "📖 How to Play",
          callback_data: "how_to_play",
        },
        {
          text: "🎮 PvP Guide",
          callback_data: "pvp_guide",
        },
      ],
    ],
  };

  await bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: "MarkdownV2",
    reply_markup: keyboard,
  });
});

// =====================================================
// /help Command
// =====================================================
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  const helpMessage = `
📖 *GigX Complete Guide* 📖

━━━━━━━━━━━━━━━━━━━━
💰 *EARNING \\$GIG*
━━━━━━━━━━━━━━━━━━━━

📋 *Tasks* \\- Complete missions
   └ Follow, Join, Like → 50\\-500 \\$GIG

📅 *Daily Check\\-in* \\- Build streaks\\!
   ├ Day 1: 10 \\$GIG
   ├ Day 7: 100 \\$GIG \\(7x bonus\\!\\)
   └ Use Shield to protect streak

🌾 *Farming* \\- Passive income
   ├ Start session → Wait 8 hours
   ├ Base: 0\\.5 \\$GIG/hour
   └ Mining Rig: 2x rate\\!

🎰 *Lucky Spin* \\- Test your luck\\!
   ├ 1 free spin daily
   ├ Watch ads for extra spins
   └ Win up to 1,000 \\$GIG\\!

━━━━━━━━━━━━━━━━━━━━
🎮 *PvP CYBER HEIST*
━━━━━━━━━━━━━━━━━━━━

🔍 *Scout* \\- Find targets
💥 *Attack* \\- Steal 5\\-15% of balance
🛡️ *Shield* \\- Active = Protected
⚔️ *Revenge* \\- Strike back\\!

━━━━━━━━━━━━━━━━━━━━
👥 *REFERRALS*
━━━━━━━━━━━━━━━━━━━━

• Share your invite link
• You get: \\+500 \\$GIG
• Friend gets: \\+200 \\$GIG
• Build your squad\\!

━━━━━━━━━━━━━━━━━━━━
💎 *WITHDRAWALS*
━━━━━━━━━━━━━━━━━━━━

• Min: 100,000 \\$GIG
• Max: 10,000,000 \\$GIG
• Fee: 0\\.05 TON gas
• Direct to TON Wallet

━━━━━━━━━━━━━━━━━━━━
🚀 *Start earning now\\!*
`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "🚀 Play Now",
          web_app: { url: WEBAPP_URL },
        },
      ],
      [
        {
          text: "🎮 PvP Guide",
          callback_data: "pvp_guide",
        },
        {
          text: "🛒 Shop Guide",
          callback_data: "shop_guide",
        },
      ],
    ],
  };

  await bot.sendMessage(chatId, helpMessage, {
    parse_mode: "MarkdownV2",
    reply_markup: keyboard,
  });
});

// =====================================================
// /pvp Command
// =====================================================
bot.onText(/\/pvp/, async (msg) => {
  const chatId = msg.chat.id;
  await sendPvPGuide(chatId);
});

// =====================================================
// /shop Command
// =====================================================
bot.onText(/\/shop/, async (msg) => {
  const chatId = msg.chat.id;
  await sendShopGuide(chatId);
});

// =====================================================
// /withdraw Command
// =====================================================
bot.onText(/\/withdraw/, async (msg) => {
  const chatId = msg.chat.id;

  const withdrawMessage = `
💎 *Withdrawal Guide* 💎

━━━━━━━━━━━━━━━━━━━━
📋 *Requirements:*
━━━━━━━━━━━━━━━━━━━━

• Min: 100,000 \\$GIG
• Max: 10,000,000 \\$GIG per request
• TON Wallet connected
• 0\\.05 TON gas fee

━━━━━━━━━━━━━━━━━━━━
📝 *How to Withdraw:*
━━━━━━━━━━━━━━━━━━━━

1️⃣ Go to *Wallet* tab
2️⃣ Connect your TON Wallet
3️⃣ Click *Withdraw* button
4️⃣ Enter amount
5️⃣ Confirm \\& pay 0\\.05 TON gas
6️⃣ Wait for admin approval

━━━━━━━━━━━━━━━━━━━━
⏱️ *Processing Time:*
━━━━━━━━━━━━━━━━━━━━

• Requests reviewed manually
• Usually within 24 hours
• You'll receive notification

━━━━━━━━━━━━━━━━━━━━
🚀 *Start withdrawing\\!*
`;

  await bot.sendMessage(chatId, withdrawMessage, {
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "💰 Open Wallet",
            web_app: { url: `${WEBAPP_URL}/wallet` },
          },
        ],
      ],
    },
  });
});

// =====================================================
// Helper: Send PvP Guide
// =====================================================
async function sendPvPGuide(chatId) {
  const pvpMessage = `
🎮 *PvP Cyber Heist Guide* 🎮

━━━━━━━━━━━━━━━━━━━━
⚔️ *HOW IT WORKS*
━━━━━━━━━━━━━━━━━━━━

1️⃣ *Scout* \\- Find a target
   └ Shows balance \\& shield status

2️⃣ *Attack* \\- Execute heist
   └ Steal 5\\-15% of their \\$GIG

3️⃣ *Defend* \\- Protect yourself
   └ Buy Shield from Shop

4️⃣ *Revenge* \\- Strike back
   └ Free attack on who robbed you

━━━━━━━━━━━━━━━━━━━━
🛡️ *SHIELDS*
━━━━━━━━━━━━━━━━━━━━

• Active shield = Can't be attacked
• Shield breaks after 1 attack
• Buy more from Black Market

━━━━━━━━━━━━━━━━━━━━
💣 *PVP ITEMS*
━━━━━━━━━━━━━━━━━━━━

*Logic Bomb* \\- Bypass enemy shield
*Phantom Wallet* \\- Hide your balance
*Nano Spy Drone* \\- See hidden balances

━━━━━━━━━━━━━━━━━━━━
🏆 *MOST WANTED*
━━━━━━━━━━━━━━━━━━━━

• Top thieves ranked by heists
• Show off your skills\\!
• Check PvP Leaderboard

━━━━━━━━━━━━━━━━━━━━
🔥 *Ready to heist?*
`;

  await bot.sendMessage(chatId, pvpMessage, {
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "⚔️ Start Heisting",
            web_app: { url: `${WEBAPP_URL}/pvp` },
          },
        ],
        [
          {
            text: "🏆 Most Wanted",
            web_app: { url: `${WEBAPP_URL}/play/leaderboard` },
          },
        ],
      ],
    },
  });
}

// =====================================================
// Helper: Send Shop Guide
// =====================================================
async function sendShopGuide(chatId) {
  const shopMessage = `
🛒 *Black Market Shop* 🛒

━━━━━━━━━━━━━━━━━━━━
⚡ *BOOSTERS*
━━━━━━━━━━━━━━━━━━━━

*Energy Drink* \\- 500 \\$GIG
└ \\+1 Free Spin

*Mining Rig* \\- 2,000 \\$GIG
└ 2x Farming Rate \\(24h\\)

*Lucky Charm* \\- 1,500 \\$GIG
└ \\+10% Better Spin Odds

*Streak Shield* \\- 1,000 \\$GIG
└ Protect Check\\-in Streak

━━━━━━━━━━━━━━━━━━━━
🛡️ *PVP GEAR*
━━━━━━━━━━━━━━━━━━━━

*Heist Shield* \\- 3,000 \\$GIG
└ Block 1 Attack

*Logic Bomb* \\- 5,000 \\$GIG
└ Bypass Enemy Shield

*Phantom Wallet* \\- 4,000 \\$GIG
└ Hide Balance \\(24h\\)

*Nano Spy Drone* \\- 3,500 \\$GIG
└ See Hidden Balances

━━━━━━━━━━━━━━━━━━━━
💎 *Spend wisely, Agent\\!*
`;

  await bot.sendMessage(chatId, shopMessage, {
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🛒 Open Shop",
            web_app: { url: `${WEBAPP_URL}/shop` },
          },
        ],
        [
          {
            text: "📦 My Inventory",
            web_app: { url: `${WEBAPP_URL}/inventory` },
          },
        ],
      ],
    },
  });
}

// =====================================================
// Callback Query Handler (for inline buttons)
// =====================================================
bot.on("callback_query", async (query) => {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  await bot.answerCallbackQuery(query.id);

  switch (query.data) {
    case "how_to_play":
      const helpMessage = `
📖 *Quick Start Guide* 📖

━━━━━━━━━━━━━━━━━━━━
💰 *EARN \\$GIG:*
━━━━━━━━━━━━━━━━━━━━

📋 Tasks → 50\\-500 \\$GIG
📅 Daily Check\\-in → Up to 100 \\$GIG
🎰 Lucky Spin → Up to 1,000 \\$GIG
👥 Referrals → \\+500 \\$GIG each
🌾 Farming → 0\\.5 \\$GIG/hour

━━━━━━━━━━━━━━━━━━━━
🎮 *PVP HEIST:*
━━━━━━━━━━━━━━━━━━━━

⚔️ Attack players → Steal 5\\-15%
🛡️ Buy shields → Stay protected
💣 Use items → Gain advantage

━━━━━━━━━━━━━━━━━━━━
💎 *WITHDRAW:*
━━━━━━━━━━━━━━━━━━━━

• Connect TON Wallet
• Min 100K \\$GIG to withdraw
• Direct to your wallet\\!

━━━━━━━━━━━━━━━━━━━━
🚀 *Let's go\\!*
`;
      await bot.sendMessage(chatId, helpMessage, {
        parse_mode: "MarkdownV2",
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
      break;

    case "pvp_guide":
      await sendPvPGuide(chatId);
      break;

    case "shop_guide":
      await sendShopGuide(chatId);
      break;

    default:
      break;
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
  console.log("\n👋 Shutting down GigX Bot...");
  bot.stopPolling();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Shutting down GigX Bot...");
  bot.stopPolling();
  process.exit(0);
});

console.log("✅ GigX Bot started successfully!");
console.log("📝 Commands: /start, /help, /pvp, /shop, /withdraw");
