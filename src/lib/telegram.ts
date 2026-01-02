import TelegramBot from 'node-telegram-bot-api';

// Initialize Telegram Bot (polling disabled for webhook mode)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

// Create bot instance without polling (we use it for sending only)
let bot: TelegramBot | null = null;

function getBot(): TelegramBot {
  if (!bot) {
    if (!BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }
    bot = new TelegramBot(BOT_TOKEN, { polling: false });
  }
  return bot;
}

// Broadcast message options
interface BroadcastOptions {
  message: string;
  buttonText?: string;
  buttonUrl?: string;
  imageUrl?: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

// Result of sending to a single user
interface SendResult {
  telegramId: string;
  success: boolean;
  error?: string;
  blocked?: boolean;
}

/**
 * Send a message to a single Telegram user
 */
export async function sendToUser(
  telegramId: string,
  options: BroadcastOptions
): Promise<SendResult> {
  try {
    const telegramBot = getBot();
    const { message, buttonText, buttonUrl, imageUrl, parseMode = 'HTML' } = options;

    // Build inline keyboard if button provided
    const inlineKeyboard = buttonText && buttonUrl
      ? {
          inline_keyboard: [[
            { text: buttonText, url: buttonUrl }
          ]]
        }
      : undefined;

    // Send photo with caption or just text message
    if (imageUrl) {
      await telegramBot.sendPhoto(telegramId, imageUrl, {
        caption: message,
        parse_mode: parseMode,
        reply_markup: inlineKeyboard
      });
    } else {
      await telegramBot.sendMessage(telegramId, message, {
        parse_mode: parseMode,
        reply_markup: inlineKeyboard,
        disable_web_page_preview: !buttonUrl // Enable preview only if button URL exists
      });
    }

    return { telegramId, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if user blocked the bot (403) or chat not found (400)
    const isBlocked = errorMessage.includes('403') || 
                      errorMessage.includes('bot was blocked') ||
                      errorMessage.includes('chat not found') ||
                      errorMessage.includes('user is deactivated');

    return {
      telegramId,
      success: false,
      error: errorMessage,
      blocked: isBlocked
    };
  }
}

/**
 * Broadcast message to multiple users in batches
 * @param telegramIds Array of Telegram user IDs
 * @param options Broadcast options
 * @param batchSize Number of messages to send in parallel (default: 25)
 * @param delayBetweenBatches Delay between batches in ms (default: 1000)
 */
export async function broadcastToUsers(
  telegramIds: string[],
  options: BroadcastOptions,
  batchSize: number = 25,
  delayBetweenBatches: number = 1000
): Promise<{
  total: number;
  sent: number;
  failed: number;
  blocked: number;
  results: SendResult[];
}> {
  const results: SendResult[] = [];
  let sent = 0;
  let failed = 0;
  let blocked = 0;

  // Process in batches to avoid rate limiting
  for (let i = 0; i < telegramIds.length; i += batchSize) {
    const batch = telegramIds.slice(i, i + batchSize);
    
    console.log(`📤 Broadcasting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(telegramIds.length / batchSize)} (${batch.length} users)`);
    
    // Send to all users in batch concurrently
    const batchResults = await Promise.all(
      batch.map(id => sendToUser(id, options))
    );

    // Collect results
    for (const result of batchResults) {
      results.push(result);
      if (result.success) {
        sent++;
      } else {
        failed++;
        if (result.blocked) {
          blocked++;
        }
      }
    }

    // Delay between batches to respect Telegram rate limits (30 messages/second)
    if (i + batchSize < telegramIds.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  console.log(`✅ Broadcast complete: ${sent}/${telegramIds.length} sent, ${failed} failed (${blocked} blocked)`);

  return {
    total: telegramIds.length,
    sent,
    failed,
    blocked,
    results
  };
}

/**
 * Format a task announcement message
 */
export function formatTaskAnnouncement(task: {
  title: string;
  reward: number;
  description?: string;
  type?: string;
}): BroadcastOptions {
  const emoji = task.type === 'airdrop' ? '🪂' : '🔥';
  const typeLabel = task.type === 'airdrop' ? 'NEW AIRDROP' : 'NEW MISSION';
  
  const message = `
${emoji} <b>${typeLabel}</b>

📋 <b>${task.title}</b>

💰 Reward: <b>${task.reward.toLocaleString()} $GIG</b>

${task.description ? `📝 ${task.description.slice(0, 200)}${task.description.length > 200 ? '...' : ''}` : ''}

⏰ Complete now to earn rewards!
`.trim();

  return {
    message,
    buttonText: '🚀 Start Task',
    buttonUrl: process.env.NEXT_PUBLIC_WEBAPP_URL || 'https://t.me/YourBotName/app',
    parseMode: 'HTML'
  };
}

/**
 * Format a custom announcement message
 */
export function formatCustomAnnouncement(
  message: string,
  buttonText?: string,
  buttonUrl?: string,
  imageUrl?: string
): BroadcastOptions {
  return {
    message,
    buttonText,
    buttonUrl,
    imageUrl,
    parseMode: 'HTML'
  };
}
