import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Spin cost
const SPIN_COST = 500;

// Rewards configuration with weights (must sum to 100)
// Index order MUST match frontend SEGMENTS array order
const REWARDS = [
  { type: "MISS", amount: 0, weight: 40, index: 0 },
  { type: "SMALL", amount: 200, weight: 30, index: 1 },
  { type: "MEDIUM", amount: 500, weight: 20, index: 2 },
  { type: "BIG", amount: 1000, weight: 9, index: 3 },
  { type: "JACKPOT", amount: 10000, weight: 1, index: 4 },
] as const;

// Calculate cumulative weights for RNG
const CUMULATIVE_WEIGHTS = REWARDS.reduce<number[]>((acc, reward, index) => {
  const prev = index === 0 ? 0 : acc[index - 1];
  acc.push(prev + reward.weight);
  return acc;
}, []);

// Determine reward based on random number (0-99)
function getRewardFromRandom(random: number): typeof REWARDS[number] {
  for (let i = 0; i < REWARDS.length; i++) {
    if (random < CUMULATIVE_WEIGHTS[i]) {
      return REWARDS[i];
    }
  }
  return REWARDS[0]; // Fallback to MISS
}

// No longer calculating degree on server - frontend handles this

export async function POST(request: NextRequest) {
  try {
    // Get user ID from header
    const telegramIdStr = request.headers.get("x-telegram-id");
    
    if (!telegramIdStr) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const telegramId = BigInt(telegramIdStr);

    // Get user and check balance
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true, balance: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (user.balance < SPIN_COST) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Not enough balance. Need ${SPIN_COST} $GIG to spin.`,
          required: SPIN_COST,
          current: user.balance,
        },
        { status: 400 }
      );
    }

    // Generate random number (0-99)
    const randomNumber = Math.floor(Math.random() * 100);
    
    // Get reward based on RNG
    const reward = getRewardFromRandom(randomNumber);
    
    // Calculate net change: reward - cost
    const netChange = reward.amount - SPIN_COST;
    
    // Update user balance and create spin history in transaction
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { balance: { increment: netChange } },
        select: { balance: true },
      }),
      prisma.spinHistory.create({
        data: {
          userId: user.id,
          rewardType: reward.type,
          amount: reward.amount,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      result: reward.type,
      resultIndex: reward.index, // Frontend uses this to calculate degree
      rewardAmount: reward.amount,
      spinCost: SPIN_COST,
      netGain: netChange,
      newBalance: updatedUser.balance,
    });
  } catch (error) {
    console.error("Spin error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to get spin info and history
export async function GET(request: NextRequest) {
  try {
    // Get user ID from header
    const telegramIdStr = request.headers.get("x-telegram-id");
    
    if (!telegramIdStr) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const telegramId = BigInt(telegramIdStr);

    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { 
        balance: true,
        spinHistory: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            rewardType: true,
            amount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      // Return default state if user not found
      return NextResponse.json({
        success: true,
        balance: 0,
        spinCost: SPIN_COST,
        canSpin: false,
        recentSpins: [],
        rewards: REWARDS.map(r => ({
          type: r.type,
          amount: r.amount,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      balance: user.balance,
      spinCost: SPIN_COST,
      canSpin: user.balance >= SPIN_COST,
      recentSpins: user.spinHistory,
      rewards: REWARDS.map(r => ({
        type: r.type,
        amount: r.amount,
      })),
    });
  } catch (error) {
    console.error("Get spin info error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
