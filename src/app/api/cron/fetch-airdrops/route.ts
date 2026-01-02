import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Parser from "rss-parser";
import { SocksProxyAgent } from "socks-proxy-agent";

// RSS Feed URLs to crawl - using specific airdrop categories for better quality
const RSS_FEEDS = [
  "https://airdrops.io/category/latest-airdrops/feed/",
  "https://airdrops.io/category/hot-airdrops/feed/",
  // Fallback to main feed if categories don't work
  // "https://airdrops.io/feed/",
];

// POSITIVE KEYWORDS - Must contain at least one for actionable tasks
const POSITIVE_KEYWORDS = [
  'claim', 'join', 'participate', 'register', 'waitlist', 
  'testnet', 'giveaway', 'reward', 'pool', 'launchpad',
  '$', 'token', 'airdrop', 'earn', 'free', 'bonus',
  'sign up', 'signup', 'whitelist', 'mint', 'staking'
];

// NEGATIVE KEYWORDS - Must NOT contain any (filters out news/analysis)
const NEGATIVE_KEYWORDS = [
  'analysis', 'report', 'review', 'what means', 'what this means',
  'summary', 'price', 'prediction', 'market', 'trend', 
  'overview', 'recap', 'inflows', 'outflows', 'volume',
  'why', 'how to', 'guide', 'tutorial', 'explained',
  'news', 'update', 'announcement', 'milestone', 'reaches',
  'dominates', 'leads', 'captures', 'record', 'historic'
];

// Check if title is an actionable task (not news/analysis)
function isActionable(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  const hasPositive = POSITIVE_KEYWORDS.some(k => lowerTitle.includes(k));
  const hasNegative = NEGATIVE_KEYWORDS.some(k => lowerTitle.includes(k));
  return hasPositive && !hasNegative;
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

    // Initialize RSS parser
    const parser = new Parser();

    let totalNewTasks = 0;
    const errors: string[] = [];
    const createdTasks: string[] = [];
    const proxyInfo = proxyUrl ? `via proxy ${proxyHost}:${proxyPort}` : 'direct (no proxy)';

    // Process each RSS feed
    for (const feedUrl of RSS_FEEDS) {
      try {
        console.log(`📡 Fetching ${feedUrl} ${proxyInfo}...`);
        
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
          errors.push(`Failed to fetch ${feedUrl}: ${response.status}`);
          continue;
        }

        console.log(`✅ Successfully fetched ${feedUrl}`);
        const xmlText = await response.text();

        // Parse the XML using rss-parser
        const feed = await parser.parseString(xmlText);

        // Process each item in the feed
        for (const item of feed.items || []) {
          if (!item.title || !item.link) continue;

          // Strict filter: only actionable tasks, no news/analysis
          if (!isActionable(item.title)) {
            console.log(`⏭️ Skipping non-actionable: ${item.title.slice(0, 50)}...`);
            continue;
          }

          // Check if task already exists (by link)
          const existingTask = await prisma.task.findFirst({
            where: { link: item.link },
          });

          if (existingTask) continue;

          // Clean the title and extract reward
          const cleanedTitle = cleanTitle(item.title);
          const reward = extractReward(item.title);

          // Create new task
          const newTask = await prisma.task.create({
            data: {
              title: cleanedTitle,
              description: item.contentSnippet?.slice(0, 500) || cleanedTitle,
              reward,
              link: item.link,
              icon: "other",
              type: "airdrop",
              isActive: false, // Draft mode for manual review
            },
          });

          console.log(`✨ Created: ${cleanedTitle} (+${reward} PTS)`);
          totalNewTasks++;
          createdTasks.push(newTask.title);
        }
      } catch (feedError) {
        const errorMsg = feedError instanceof Error ? feedError.message : "Unknown error";
        errors.push(`Error processing ${feedUrl}: ${errorMsg}`);
        console.error(`RSS Feed error for ${feedUrl}:`, feedError);
      }
    }

    return NextResponse.json({
      success: true,
      newTasks: totalNewTasks,
      createdTasks: createdTasks.length > 0 ? createdTasks : undefined,
      errors: errors.length > 0 ? errors : undefined,
      proxyUsed: proxyUrl ? `${proxyHost}:${proxyPort}` : null,
      message: totalNewTasks > 0
        ? `Successfully created ${totalNewTasks} new airdrop task(s)`
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
