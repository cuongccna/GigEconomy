import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Parser from "rss-parser";
import { SocksProxyAgent } from "socks-proxy-agent";

// ============ MULTI-SOURCE FEED CONFIGURATION ============
interface FeedConfig {
  url: string;
  sourceName: string;
  isReddit?: boolean;
}

const FEEDS: FeedConfig[] = [
  {
    url: 'https://airdrops.io/category/hot-airdrops/feed/',
    sourceName: 'Airdrops.io (Hot)'
  },
  {
    url: 'https://airdrops.io/category/latest-airdrops/feed/',
    sourceName: 'Airdrops.io (Latest)'
  },
  {
    url: 'https://www.reddit.com/r/airdrops/new/.rss',
    sourceName: 'Reddit Airdrops',
    isReddit: true
  }
];

// ============ SMART FILTER KEYWORDS ============
// POSITIVE KEYWORDS - Must contain at least one for actionable tasks
const POSITIVE_KEYWORDS = [
  'claim', 'join', 'participate', 'register', 'waitlist',
  'gleam', 'galxe', 'taskon', 'quest', 'pool',
  'airdrop', 'giveaway', 'testnet', 'reward', 'earn',
  'free', 'bonus', 'whitelist', 'mint', 'staking',
  'zealy', 'intract', 'layer3', 'crew3'
];

// NEGATIVE KEYWORDS - Must NOT contain any (filters out news/analysis/spam)
const NEGATIVE_KEYWORDS = [
  'price analysis', 'market', 'prediction', 'review', 'summary',
  'why', 'what is', 'report', 'scam', 'hack', 'rug',
  'overview', 'recap', 'inflows', 'outflows', 'volume',
  'how to', 'guide', 'tutorial', 'explained', 'news',
  'update', 'announcement', 'milestone', 'reaches',
  'dominates', 'leads', 'captures', 'record', 'historic',
  'warning', 'avoid', 'fake', 'phishing', 'suspicious'
];

// Regex to extract task platform URLs from Reddit content
const TASK_PLATFORM_REGEX = /https?:\/\/(?:www\.)?(gleam\.io|galxe\.com|taskon\.xyz|zealy\.io|intract\.io|layer3\.xyz|crew3\.xyz)[^\s<>"')]+/gi;

// Check if title is an actionable task (not news/analysis)
function isActionable(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  const hasPositive = POSITIVE_KEYWORDS.some(k => lowerTitle.includes(k));
  const hasNegative = NEGATIVE_KEYWORDS.some(k => lowerTitle.includes(k));
  return hasPositive && !hasNegative;
}

// Extract task platform URL from Reddit content (Gleam, Galxe, etc.)
function extractTaskPlatformUrl(content: string): string | null {
  if (!content) return null;
  
  // Reset regex lastIndex for global matching
  TASK_PLATFORM_REGEX.lastIndex = 0;
  const match = TASK_PLATFORM_REGEX.exec(content);
  
  if (match) {
    // Clean the URL (remove trailing punctuation)
    return match[0].replace(/[.,;:!?)]+$/, '');
  }
  
  return null;
}

// Clean and format the title
function cleanTitle(title: string): string {
  let cleaned = title;
  
  // Remove common prefixes like "Project Name (TOKEN) - " or "TOKEN: "
  cleaned = cleaned.replace(/^\s*[\w\s]+\s*\([A-Z0-9]+\)\s*[-–:]\s*/i, '');
  cleaned = cleaned.replace(/^[A-Z0-9]{2,10}:\s*/i, '');
  
  // Remove trailing " - Airdrops.io" or similar
  cleaned = cleaned.replace(/\s*[-–|]\s*(Airdrops\.io|airdrops\.io)$/i, '');
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  
  return cleaned.slice(0, 200); // Limit length
}

// Extract prize amount from title if mentioned (e.g., "$10,000 Prize Pool")
function extractReward(title: string): number {
  const lowerTitle = title.toLowerCase();
  
  // Match patterns like "$10,000", "$1M", "$500K", etc.
  const patterns = [
    /\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:m|million)/i,  // $1M, $1 million
    /\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:k|thousand)/i, // $10K, $10 thousand
    /\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/i,                   // $10,000
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      let amount = parseFloat(match[1].replace(/,/g, ''));
      
      // Check for multipliers
      if (/million|m\b/i.test(match[0])) {
        amount *= 1000000;
      } else if (/thousand|k\b/i.test(match[0])) {
        amount *= 1000;
      }
      
      // Convert to points (1 USD = 100 points, capped)
      const points = Math.min(Math.floor(amount / 10), 10000); // Max 10,000 points
      if (points >= 100) {
        return points;
      }
    }
  }
  
  // Check for token amount mentions
  if (lowerTitle.includes('pool') || lowerTitle.includes('prize')) {
    return randomReward(800, 1500); // Higher reward for prize pools
  }
  
  if (lowerTitle.includes('testnet') || lowerTitle.includes('waitlist')) {
    return randomReward(300, 600); // Lower for early access
  }
  
  // Default random reward
  return randomReward(500, 1000);
}

// Generate random reward between min and max
function randomReward(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * GET /api/cron/fetch-airdrops
 * 
 * Fetches airdrop data from RSS feeds through a SOCKS5 proxy.
 * Creates new tasks for each unique airdrop found.
 * 
 * Environment variables required:
 * - PROXY_HOST: SOCKS5 proxy hostname
 * - PROXY_PORT: SOCKS5 proxy port
 * - PROXY_USER: Proxy username (optional)
 * - PROXY_PASS: Proxy password (optional)
 * - CRON_SECRET: Secret key to authorize cron requests
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional security measure)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Build proxy URL
    const proxyHost = process.env.PROXY_HOST;
    const proxyPort = process.env.PROXY_PORT;
    const proxyUser = process.env.PROXY_USER;
    const proxyPass = process.env.PROXY_PASS;

    if (!proxyHost || !proxyPort) {
      console.log("⚠️ Proxy configuration missing, will fetch directly without proxy");
    }

    // Build proxy URL with or without authentication
    let proxyUrl: string | null = null;
    let agent = null;
    
    if (proxyHost && proxyPort) {
      if (proxyUser && proxyPass) {
        proxyUrl = `socks5://${proxyUser}:****@${proxyHost}:${proxyPort}`;
        const fullProxyUrl = `socks5://${proxyUser}:${proxyPass}@${proxyHost}:${proxyPort}`;
        agent = new SocksProxyAgent(fullProxyUrl);
      } else {
        proxyUrl = `socks5://${proxyHost}:${proxyPort}`;
        agent = new SocksProxyAgent(proxyUrl);
      }
      console.log(`🔒 Using SOCKS5 Proxy: ${proxyUrl}`);
    }

    // Initialize RSS parser (with custom fields for Reddit)
    const parser = new Parser({
      customFields: {
        item: ['content:encoded', 'content']
      }
    });

    let totalNewTasks = 0;
    const errors: string[] = [];
    const feedStats: { source: string; processed: number; created: number }[] = [];
    const proxyInfo = proxyUrl ? `via proxy ${proxyHost}:${proxyPort}` : 'direct (no proxy)';

    // Process each feed source
    for (const feedConfig of FEEDS) {
      const { url: feedUrl, sourceName, isReddit } = feedConfig;
      let processedCount = 0;
      let createdCount = 0;
      
      try {
        console.log(`\n📡 [${sourceName}] Fetching ${proxyInfo}...`);
        
        // Fetch RSS XML through proxy using native fetch with agent
        const fetchOptions: RequestInit & { agent?: unknown } = {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        };
        
        // Add proxy agent if configured
        if (agent) {
          fetchOptions.agent = agent;
        }
        
        const response = await fetch(feedUrl, fetchOptions);

        if (!response.ok) {
          errors.push(`[${sourceName}] HTTP ${response.status}`);
          continue;
        }

        console.log(`✅ [${sourceName}] Feed fetched successfully`);
        const xmlText = await response.text();

        // Parse the XML using rss-parser
        const feed = await parser.parseString(xmlText);

        // Process each item in the feed
        for (const item of feed.items || []) {
          processedCount++;
          
          if (!item.title) continue;

          // Apply Smart Filter on title
          if (!isActionable(item.title)) {
            console.log(`⏭️ [${sourceName}] Skipping: ${item.title.slice(0, 50)}...`);
            continue;
          }

          // Determine the task link
          let taskLink: string | null = null;
          
          if (isReddit) {
            // Reddit: Extract Gleam/Galxe/TaskOn URL from content
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const itemAny = item as any;
            const content = itemAny['content:encoded'] 
              || itemAny['content'] 
              || item.contentSnippet 
              || '';
            
            taskLink = extractTaskPlatformUrl(content);
            
            if (!taskLink) {
              console.log(`⏭️ [${sourceName}] No task platform URL found: ${item.title.slice(0, 40)}...`);
              continue; // Skip Reddit posts without external task links
            }
          } else {
            // Standard RSS: Use item link
            taskLink = item.link || null;
          }

          if (!taskLink) continue;

          // Check if task already exists (by link)
          const existingTask = await prisma.task.findFirst({
            where: { link: taskLink },
          });

          if (existingTask) {
            console.log(`⏭️ [${sourceName}] Duplicate: ${item.title.slice(0, 40)}...`);
            continue;
          }

          // Clean the title and extract reward
          const cleanedTitle = cleanTitle(item.title);
          const reward = extractReward(item.title);

          // Create new task (Draft mode for manual review)
          await prisma.task.create({
            data: {
              title: cleanedTitle,
              description: item.contentSnippet?.slice(0, 500) || cleanedTitle,
              reward,
              link: taskLink,
              icon: isReddit ? "community" : "other",
              type: "airdrop",
              isActive: false, // Draft mode for admin review
            },
          });

          console.log(`✨ [${sourceName}] Created: ${cleanedTitle} (+${reward} PTS)`);
          createdCount++;
          totalNewTasks++;
        }
        
        feedStats.push({ source: sourceName, processed: processedCount, created: createdCount });
        console.log(`📊 [${sourceName}] Processed ${processedCount} items. Created ${createdCount} new tasks.`);
        
      } catch (feedError) {
        const errorMsg = feedError instanceof Error ? feedError.message : "Unknown error";
        errors.push(`[${sourceName}] ${errorMsg}`);
        console.error(`❌ [${sourceName}] Error:`, feedError);
        feedStats.push({ source: sourceName, processed: processedCount, created: createdCount });
      }
    }

    // Summary log
    console.log(`\n========================================`);
    console.log(`📈 TOTAL: Created ${totalNewTasks} new tasks from ${FEEDS.length} sources`);
    feedStats.forEach(s => console.log(`   - ${s.source}: ${s.created}/${s.processed} tasks`));
    console.log(`========================================\n`);

    return NextResponse.json({
      success: true,
      totalNewTasks,
      feedStats,
      errors: errors.length > 0 ? errors : undefined,
      proxyUsed: proxyUrl ? `${proxyHost}:${proxyPort}` : null,
      message: totalNewTasks > 0
        ? `Created ${totalNewTasks} new airdrop task(s) from ${FEEDS.length} sources`
        : "No new airdrops found",
    });
  } catch (error) {
    console.error("Fetch airdrops cron error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch airdrops" 
      },
      { status: 500 }
    );
  }
}
