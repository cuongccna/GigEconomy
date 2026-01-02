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
  isMedium?: boolean;
}

// Only Reddit and Medium - Airdrops.io blocked by Cloudflare
const FEEDS: FeedConfig[] = [
  {
    url: 'https://www.reddit.com/r/airdrops/new/.rss',
    sourceName: 'Reddit r/airdrops',
    isReddit: true
  },
  {
    url: 'https://www.reddit.com/r/CryptoAirdrop/new/.rss',
    sourceName: 'Reddit r/CryptoAirdrop',
    isReddit: true
  },
  {
    url: 'https://medium.com/feed/tag/airdrop',
    sourceName: 'Medium #airdrop',
    isMedium: true
  }
];

// ============ LINK EXTRACTION CONFIG ============
// Priority domains - prefer these links
const PRIORITY_DOMAINS = [
  't.me',           // Telegram bots
  'gleam.io',
  'galxe.com', 
  'taskon.xyz',
  'zealy.io',
  'intract.io',
  'layer3.xyz',
  'crew3.xyz',
  'forms.gle',      // Google Forms
  'docs.google.com' // Google Docs/Forms
];

// Blocked domains/patterns - never use these
const BLOCKED_PATTERNS = [
  'reddit.com',
  'redd.it',
  'preview.redd.it',
  'external-preview.redd.it',
  'i.redd.it',
  'v.redd.it',
  'imgur.com',
  '.jpg',
  '.jpeg', 
  '.png',
  '.gif',
  '.webp',
  '.mp4',
  '.svg',
  'youtube.com/watch',  // Video links not actionable
  'twitter.com',        // Just discussions
  'x.com',
  'medium.com/@',       // Author pages, not tasks
];

// ============ SMART FILTER KEYWORDS ============
const POSITIVE_KEYWORDS = [
  'claim', 'join', 'participate', 'register', 'waitlist',
  'gleam', 'galxe', 'taskon', 'quest', 'pool',
  'airdrop', 'giveaway', 'testnet', 'reward', 'earn',
  'free', 'bonus', 'whitelist', 'mint', 'staking',
  'zealy', 'intract', 'layer3', 'crew3',
  // New keywords
  'bot', 'start', 'app', 'mining', 'grass', 'blast',
  'token', 'crypto', 'web3', 'defi', 'nft'
];

const NEGATIVE_KEYWORDS = [
  'price analysis', 'market update', 'prediction', 'review', 'summary',
  'scam', 'hack', 'rug', 'warning', 'avoid', 'fake', 'phishing',
  'beware', 'don\'t trust', 'is it legit'
];

// ============ HELPER FUNCTIONS ============

// Debug logger
function debug(...args: unknown[]) {
  if (DEBUG_MODE) {
    console.log(...args);
  }
}

// Check if URL is blocked
function isBlockedUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return BLOCKED_PATTERNS.some(pattern => lowerUrl.includes(pattern));
}

// Check if URL is a priority domain
function isPriorityUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return PRIORITY_DOMAINS.some(domain => lowerUrl.includes(domain));
}

// Check if title passes filter (relaxed for testing)
function isActionable(title: string, hasTaskLink: boolean = false): boolean {
  const lowerTitle = title.toLowerCase();
  
  // If we found a valid external link, be more lenient
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
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
}

/**
 * Extract the best external link from HTML content
 * Priority: t.me > gleam/galxe > any valid https link
 */
function extractBestLink(rawContent: string): string | null {
  if (!rawContent) return null;
  
  // Decode HTML entities first
  const content = decodeHtmlEntities(rawContent);
  
  debug('    [extractBestLink] Content length:', content.length);
  
  // Extract all URLs from content using multiple patterns
  const urlPatterns = [
    /href=["']([^"']+)["']/gi,           // href="url"
    /https?:\/\/[^\s<>"')\]]+/gi,        // Raw URLs
  ];
  
  const allUrls: string[] = [];
  
  for (const pattern of urlPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      // For href pattern, get captured group; for raw URL, get full match
      const url = match[1] || match[0];
      if (url && url.startsWith('http')) {
        // Clean the URL
        const cleanUrl = url.replace(/[.,;:!?\)\]'"]+$/, '');
        allUrls.push(cleanUrl);
      }
    }
  }
  
  // Remove duplicates
  const uniqueUrls = Array.from(new Set(allUrls));
  
  debug('    [extractBestLink] Found', uniqueUrls.length, 'unique URLs');
  if (uniqueUrls.length > 0) {
    debug('    [extractBestLink] Sample URLs:', uniqueUrls.slice(0, 5));
  }
  
  // Filter out blocked URLs
  const validUrls = uniqueUrls.filter(url => !isBlockedUrl(url));
  debug('    [extractBestLink] After filtering blocked:', validUrls.length, 'URLs');
  
  if (validUrls.length === 0) {
    debug('    [extractBestLink] ❌ No valid URLs found');
    return null;
  }
  
  // First, try to find a priority domain URL
  const priorityUrl = validUrls.find(url => isPriorityUrl(url));
  if (priorityUrl) {
    debug('    [extractBestLink] ✅ [Priority Link Found]:', priorityUrl);
    return priorityUrl;
  }
  
  // Fallback: use the first valid non-blocked URL
  const fallbackUrl = validUrls[0];
  debug('    [extractBestLink] ✅ [Fallback Link Found]:', fallbackUrl);
  return fallbackUrl;
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
    const feedStats: { source: string; processed: number; created: number; skippedNoLink?: number; skippedFilter?: number; skippedDuplicate?: number }[] = [];
    const debugSamples: { title: string; link: string | null; source: string }[] = [];
    const proxyInfo = proxyUrl ? `via proxy ${proxyHost}:${proxyPort}` : 'direct (no proxy)';

    // Process each feed source
    for (const feedConfig of FEEDS) {
      const { url: feedUrl, sourceName, isReddit, isMedium } = feedConfig;
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

          // Determine the task link
          let taskLink: string | null = null;
          
          if (isReddit || isMedium) {
            // Reddit/Medium: Extract best external link from content
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const itemAny = item as any;
            const rawContent = itemAny['content:encoded'] 
              || itemAny['content'] 
              || item.contentSnippet 
              || '';
            
            debug(`    Content fields: content:encoded=${!!itemAny['content:encoded']}, content=${!!itemAny['content']}, snippet=${!!item.contentSnippet}`);
            debug(`    Content length: ${rawContent.length} chars`);
            
            // Use the new extractBestLink function
            taskLink = extractBestLink(rawContent);
            
            // Collect debug samples
            if (debugSamples.length < 10) {
              debugSamples.push({
                title: item.title.slice(0, 60),
                link: taskLink,
                source: sourceName
              });
            }
            
            if (!taskLink) {
              debug(`    ❌ No valid external link found`);
              skippedNoLink++;
              continue;
            }
            
            console.log(`    [Link Found]: ${taskLink}`);
            
            // For Reddit/Medium with valid link, use relaxed filter
            if (!isActionable(item.title, true)) {
              debug(`    ❌ Failed keyword filter (negative keywords found)`);
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
          
          // Determine icon based on source/link
          let icon = 'other';
          if (isReddit) icon = 'community';
          else if (isMedium) icon = 'article';
          else if (taskLink.includes('t.me')) icon = 'telegram';
          else if (taskLink.includes('gleam.io') || taskLink.includes('galxe.com')) icon = 'quest';

          // Create new task (Draft mode for manual review)
          await prisma.task.create({
            data: {
              title: cleanedTitle,
              description: item.contentSnippet?.slice(0, 500) || cleanedTitle,
              reward,
              link: taskLink,
              icon,
              type: "airdrop",
              isActive: false, // Draft mode for admin review
            },
          });

          console.log(`✨ [${sourceName}] Created: ${cleanedTitle} (+${reward} PTS)`);
          console.log(`   Link: ${taskLink}`);
          createdCount++;
          totalNewTasks++;
        }
        
        feedStats.push({ 
          source: sourceName, 
          processed: processedCount, 
          created: createdCount,
          skippedNoLink,
          skippedFilter,
          skippedDuplicate
        });
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
      debugSamples: DEBUG_MODE && debugSamples.length > 0 ? debugSamples : undefined,
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
