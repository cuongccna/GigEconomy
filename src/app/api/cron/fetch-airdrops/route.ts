import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Parser from "rss-parser";
import { SocksProxyAgent } from "socks-proxy-agent";

// RSS Feed URLs to crawl
const RSS_FEEDS = [
  "https://airdrops.io/feed/",
  // Add more RSS feeds as needed
];

// Keywords to filter relevant airdrops
const KEYWORDS = ["airdrop", "giveaway", "token", "crypto", "free"];

// Generate random reward between min and max
function randomReward(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Check if title contains any of the keywords
function matchesKeywords(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return KEYWORDS.some((keyword) => lowerTitle.includes(keyword));
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

          // Filter by keywords
          if (!matchesKeywords(item.title)) continue;

          // Check if task already exists (by link)
          const existingTask = await prisma.task.findFirst({
            where: { link: item.link },
          });

          if (existingTask) continue;

          // Create new task
          const newTask = await prisma.task.create({
            data: {
              title: item.title.slice(0, 200), // Limit title length
              description: item.contentSnippet?.slice(0, 500) || item.title,
              reward: randomReward(500, 1000),
              link: item.link,
              icon: "other",
              type: "airdrop",
              isActive: false, // Draft mode for manual review
            },
          });

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
