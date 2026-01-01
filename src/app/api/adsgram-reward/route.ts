import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Adsgram Reward Callback
 * 
 * Block ID: 20377
 * Reward URL: https://dilink.io.vn/api/adsgram-reward?userid=[userId]
 * 
 * This endpoint is called by Adsgram servers when a user completes watching an ad.
 * It grants the user 500 $GIG (equivalent to 1 free spin).
 */

// Reward amount for watching an ad (1 free spin = 500 $GIG)
const AD_REWARD_AMOUNT = 500;

export async function GET(request: NextRequest) {
  try {
    // Parse query params from Adsgram callback
    const { searchParams } = new URL(request.url);
    const userid = searchParams.get("userid");      // Telegram user ID
    const type = searchParams.get("type");          // Should be 'reward'
    const record = searchParams.get("record");      // Unique transaction ID from Adsgram
    const signature = searchParams.get("signature"); // Security signature
    
    // Log incoming request for debugging
    console.log("📺 Adsgram Callback Received:", {
      userid,
      type,
      record,
      signature: signature ? "[present]" : "[missing]",
      timestamp: new Date().toISOString(),
    });
    
    // Validate required params
    if (!userid) {
      console.error("❌ Missing userid parameter");
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // TODO: [SECURITY] Add signature verification here when Adsgram provides the method
    // Example implementation:
    // const isValidSignature = verifyAdsgramSignature(searchParams, signature, ADSGRAM_SECRET);
    // if (!isValidSignature) {
    //   console.error("❌ Invalid signature");
    //   return NextResponse.json({ ok: false }, { status: 401 });
    // }
    
    const telegramId = BigInt(userid);
    
    // User Verification: Check if user exists in our database
    const user = await prisma.user.findUnique({
      where: { telegramId },
    });
    
    if (!user) {
      console.error(`❌ User not found with telegramId: ${userid}`);
      // Still return ok: true to prevent Adsgram from retrying
      // (user might have been deleted or never registered)
      return NextResponse.json({ ok: true });
    }
    
    // Check for duplicate reward (optional but recommended)
    if (record) {
      const existingReward = await prisma.adReward.findUnique({
        where: { recordId: record },
      });
      
      if (existingReward) {
        console.log(`⚠️ Duplicate reward request for record: ${record}`);
        return NextResponse.json({ ok: true }); // Already processed
      }
    }
    
    // Grant reward: Add 500 $GIG (1 free spin) to user's balance
    await prisma.$transaction(async (tx) => {
      // Update user balance
      await tx.user.update({
        where: { telegramId },
        data: { balance: { increment: AD_REWARD_AMOUNT } },
      });
      
      // Track the ad reward (for analytics & preventing duplicates)
      if (record) {
        await tx.adReward.create({
          data: {
            recordId: record,
            telegramId,
            rewardType: type || "reward",
            amount: AD_REWARD_AMOUNT,
            ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
          },
        });
      }
    });
    
    console.log(`✅ Reward granted: ${AD_REWARD_AMOUNT} $GIG to user ${userid}`);
    
    // Return success response as required by Adsgram
    return NextResponse.json({ ok: true });
    
  } catch (error) {
    console.error("❌ Adsgram reward error:", error);
    // Return ok: true even on error to prevent infinite retries
    // Log the error for investigation
    return NextResponse.json({ ok: true });
  }
}

// Support POST method as well (some ad networks use POST)
export async function POST(request: NextRequest) {
  return GET(request);
}
