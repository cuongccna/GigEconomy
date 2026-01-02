import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Parser from "rss-parser";
import { SocksProxyAgent } from "socks-proxy-agent";

// ============ CONFIGURATION ============
const DEBUG_MODE = true; // Set to false in production

// Full Chrome User-Agent to bypass WAFs
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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

// ============ TASK PLATFORM DOMAINS ============
const TASK_PLATFORMS = ['gleam.io', 'galxe.com', 'taskon.xyz', 'zealy.io', 'intract.io', 'layer3.xyz', 'crew3.xyz'];

// ============ SMART FILTER KEYWORDS ============
const POSITIVE_KEYWORDS = [
  'claim', 'join', 'participate', 'register', 'waitlist',
  'gleam', 'galxe', 'taskon', 'quest', 'pool',
  'airdrop', 'giveaway', 'testnet', 'reward', 'earn',
  'free', 'bonus', 'whitelist', 'mint', 'staking',
  'zealy', 'intract', 'layer3', 'crew3'
];

const NEGATIVE_KEYWORDS = [
  'price analysis', 'market update', 'prediction', 'review', 'summary',
  'scam', 'hack', 'rug', 'warning', 'avoid', 'fake', 'phishing'
];

// ============ HELPER FUNCTIONS ============

// Debug logger
function debug(...args: unknown[]) {
  if (DEBUG_MODE) {
    console.log(...args);
  }
}

// Check if title passes filter (relaxed for testing)
function isActionable(title: string, hasTaskLink: boolean = false): boolean {
  const lowerTitle = title.toLowerCase();
  
  // If we found a task platform link, be more lenient
  if (hasTaskLink) {
    const hasNegative = NEGATIVE_KEYWORDS.some(k => lowerTitle.includes(k));
    return !hasNegative; // Accept if no negative keywords
  }
  
  // Standard check: must have positive, must not have negative
  const hasPositive = POSITIVE_KEYWORDS.some(k => lowerTitle.includes(k));
  const hasNegative = NEGATIVE_KEYWORDS.some(k => lowerTitle.includes(k));
  return hasPositive && !hasNegative;
}

// Decode HTML entities (Reddit content uses &lt; &gt; &amp; etc.)
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Extract task platform URL from content (handles HTML escaped content)
function extractTaskPlatformUrl(rawContent: string): string | null {
  if (!rawContent) return null;
  
  // Decode HTML entities first
  const content = decodeHtmlEntities(rawContent);
  
  debug('    [extractTaskPlatformUrl] Content length:', content.length);
  debug('    [extractTaskPlatformUrl] Content preview:', content.substring(0, 300));
  
  // Step 1: Check if any task platform domain exists in content
  const foundPlatform = TASK_PLATFORMS.find(domain => 
    content.toLowerCase().includes(domain)
  );
  
  if (!foundPlatform) {
    debug('    [extractTaskPlatformUrl] No task platform domain found');
    return null;
  }
  
  debug('    [extractTaskPlatformUrl] Found platform:', foundPlatform);
  
  // Step 2: Try to extract full URL with various patterns
  const urlPatterns = [
    // Standard https URL
    new RegExp(`https?://(?:www\\.)?${foundPlatform.replace('.', '\\.')}[^\\s<>"'\\)\\]]*`, 'i'),
    // URL without protocol (some content strips it)
    new RegExp(`(?:www\\.)?${foundPlatform.replace('.', '\\.')}[^\\s<>"'\\)\\]]*`, 'i'),
  ];
  
  for (const pattern of urlPatterns) {
    const match = content.match(pattern);
    if (match) {
      let url = match[0];
      // Ensure https prefix
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      // Clean trailing punctuation
      url = url.replace(/[.,;:!?\)\]]+$/, '');
      debug('    [extractTaskPlatformUrl] Extracted URL:', url);
      return url;
    }
  }
  
  // Step 3: Fallback - just return domain link if we know it exists
  debug('    [extractTaskPlatformUrl] Using fallback domain URL');
  return `https://${foundPlatform}`;
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
      let skippedNoLink = 0;
      let skippedFilter = 0;
      let skippedDuplicate = 0;
      
      try {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`📡 [${sourceName}] Fetching ${proxyInfo}...`);
        console.log(`   URL: ${feedUrl}`);
        
        // Fetch RSS XML through proxy using native fetch with agent
        const fetchOptions: RequestInit & { agent?: unknown } = {
          headers: {
            "User-Agent": USER_AGENT,
            "Accept": "application/rss+xml, application/xml, text/xml, */*",
            "Accept-Language": "en-US,en;q=0.9",
          },
        };
        
        // Add proxy agent if configured
        if (agent) {
          fetchOptions.agent = agent;
        }
        
        const response = await fetch(feedUrl, fetchOptions);
        
        console.log(`   HTTP Status: ${response.status} ${response.statusText}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);

        if (!response.ok) {
          errors.push(`[${sourceName}] HTTP ${response.status}`);
          continue;
        }

        const responseText = await response.text();
        
        // Debug: Check if response is HTML (Cloudflare block) or XML
        const isLikelyXml = responseText.trim().startsWith('<?xml') || responseText.trim().startsWith('<rss') || responseText.trim().startsWith('<feed');
        console.log(`   Response length: ${responseText.length} chars`);
        console.log(`   Looks like XML: ${isLikelyXml ? 'YES ✅' : 'NO ❌ (likely Cloudflare/HTML)'}`);
        
        if (!isLikelyXml) {
          // Log first 300 chars to debug Cloudflare blocks
          console.log(`   ⚠️ RAW RESPONSE START:`);
          console.log(`   ${responseText.substring(0, 300).replace(/\n/g, '\\n')}`);
          errors.push(`[${sourceName}] Response is not XML (Cloudflare block?)`);
          feedStats.push({ source: sourceName, processed: 0, created: 0 });
          continue;
        }

        // Parse the XML using rss-parser
        let feed;
        try {
          feed = await parser.parseString(responseText);
        } catch (parseError) {
          console.log(`   ❌ XML Parse Error: ${parseError instanceof Error ? parseError.message : 'Unknown'}`);
          console.log(`   RAW RESPONSE START: ${responseText.substring(0, 200)}`);
          errors.push(`[${sourceName}] XML parse error`);
          feedStats.push({ source: sourceName, processed: 0, created: 0 });
          continue;
        }
        
        console.log(`   ✅ Parsed ${feed.items?.length || 0} items from feed`);

        // Process each item in the feed
        for (const item of feed.items || []) {
          processedCount++;
          
          if (!item.title) {
            debug(`   [Item ${processedCount}] No title, skipping`);
            continue;
          }
          
          debug(`\n--- [Item ${processedCount}] Checking: ${item.title.slice(0, 60)}...`);

          // Determine the task link FIRST (for Reddit)
          let taskLink: string | null = null;
          
          if (isReddit) {
            // Reddit: Extract Gleam/Galxe/TaskOn URL from content
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const itemAny = item as any;
            const rawContent = itemAny['content:encoded'] 
              || itemAny['content'] 
              || item.contentSnippet 
              || '';
            
            debug(`    Content fields available: content:encoded=${!!itemAny['content:encoded']}, content=${!!itemAny['content']}, snippet=${!!item.contentSnippet}`);
            
            taskLink = extractTaskPlatformUrl(rawContent);
            
            if (!taskLink) {
              debug(`    ❌ No task platform URL found`);
              skippedNoLink++;
              continue;
            }
            
            debug(`    ✅ Found task link: ${taskLink}`);
            
            // For Reddit with valid task link, use relaxed filter
            if (!isActionable(item.title, true)) {
              debug(`    ❌ Failed keyword filter (with link)`);
              skippedFilter++;
              continue;
            }
          } else {
            // Standard RSS: Apply filter first, then use item link
            if (!isActionable(item.title, false)) {
              debug(`    ❌ Failed keyword filter`);
              skippedFilter++;
              continue;
            }
            taskLink = item.link || null;
          }

          if (!taskLink) {
            debug(`    ❌ No link available`);
            skippedNoLink++;
            continue;
          }

          // Check if task already exists (by link)
          const existingTask = await prisma.task.findFirst({
            where: { link: taskLink },
          });

          if (existingTask) {
            debug(`    ⏭️ Duplicate in DB`);
            skippedDuplicate++;
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
          console.log(`   Link: ${taskLink}`);
          createdCount++;
          totalNewTasks++;
        }
        
        feedStats.push({ source: sourceName, processed: processedCount, created: createdCount });
        console.log(`\n📊 [${sourceName}] Summary:`);
        console.log(`   - Total items: ${processedCount}`);
        console.log(`   - Created: ${createdCount}`);
        console.log(`   - Skipped (no link): ${skippedNoLink}`);
        console.log(`   - Skipped (filter): ${skippedFilter}`);
        console.log(`   - Skipped (duplicate): ${skippedDuplicate}`);
        
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
