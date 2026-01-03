import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Withdrawal constants
const MIN_WITHDRAWAL_AMOUNT = 100000; // Minimum 100,000 $GIG
const MAX_WITHDRAWAL_AMOUNT = 10000000; // Maximum 10,000,000 $GIG per transaction

/**
 * POST /api/wallet/withdraw
 * 
 * Submit a withdrawal request
 * 
 * Body: { amount: number, walletAddress: string, txHash: string }
 * 
 * Returns: { success: boolean, message: string, withdrawal?: object }
 */
export async function POST(request: NextRequest) {
  try {
    const telegramIdStr = request.headers.get("x-telegram-id");

    if (!telegramIdStr) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const telegramId = BigInt(telegramIdStr);

    // Get user
    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user is banned
    if (user.isBanned) {
      return NextResponse.json(
        { success: false, error: "Your account is suspended" },
        { status: 403 }
      );
    }

    // Parse body
    const body = await request.json();
    const { amount, walletAddress, txHash } = body;

    // Validate inputs
    if (!amount || typeof amount !== "number") {
      return NextResponse.json(
        { success: false, error: "Amount is required" },
        { status: 400 }
      );
    }

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { success: false, error: "Wallet address is required" },
        { status: 400 }
      );
    }

    if (!txHash || typeof txHash !== "string") {
      return NextResponse.json(
        { success: false, error: "Transaction hash is required" },
        { status: 400 }
      );
    }

    // Validate TON wallet address format (basic validation)
    // TON addresses are typically 48 characters (raw) or start with EQ/UQ (user-friendly)
    const isValidTonAddress = 
      /^(EQ|UQ|0:)[a-zA-Z0-9_-]{46,48}$/.test(walletAddress) ||
      /^[a-zA-Z0-9_-]{48}$/.test(walletAddress);
    
    if (!isValidTonAddress) {
      return NextResponse.json(
        { success: false, error: "Invalid TON wallet address format" },
        { status: 400 }
      );
    }

    // Validate minimum amount
    if (amount < MIN_WITHDRAWAL_AMOUNT) {
      return NextResponse.json({
        success: false,
        error: `Minimum withdrawal is ${MIN_WITHDRAWAL_AMOUNT.toLocaleString()} $GIG`,
        minAmount: MIN_WITHDRAWAL_AMOUNT,
      }, { status: 400 });
    }

    // Validate maximum amount
    if (amount > MAX_WITHDRAWAL_AMOUNT) {
      return NextResponse.json({
        success: false,
        error: `Maximum withdrawal is ${MAX_WITHDRAWAL_AMOUNT.toLocaleString()} $GIG per transaction`,
        maxAmount: MAX_WITHDRAWAL_AMOUNT,
      }, { status: 400 });
    }

    // Check if user has enough balance
    if (user.balance < amount) {
      return NextResponse.json({
        success: false,
        error: "Insufficient balance",
        currentBalance: user.balance,
        requested: amount,
      }, { status: 400 });
    }

    // Check if txHash already exists (prevent duplicates)
    const existingWithdrawal = await prisma.withdrawal.findUnique({
      where: { txHash },
    });

    if (existingWithdrawal) {
      return NextResponse.json({
        success: false,
        error: "This transaction has already been used for a withdrawal request",
      }, { status: 400 });
    }

    // Check for pending withdrawals (optional: limit concurrent requests)
    const pendingCount = await prisma.withdrawal.count({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });

    if (pendingCount >= 3) {
      return NextResponse.json({
        success: false,
        error: "You have too many pending withdrawals. Please wait for them to be processed.",
      }, { status: 400 });
    }

    // Execute withdrawal in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct balance from user
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: amount } },
      });

      // Create withdrawal record
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId: user.id,
          amount,
          walletAddress,
          txHash,
          status: "PENDING",
        },
      });

      // Create notification for user
      await tx.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          message: `💸 Withdrawal request submitted: ${amount.toLocaleString()} $GIG to ${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`,
          data: JSON.stringify({
            withdrawalId: withdrawal.id,
            amount,
            walletAddress,
            status: "PENDING",
          }),
        },
      });

      return { updatedUser, withdrawal };
    });

    console.log(`💸 Withdrawal requested: ${amount} $GIG by user ${user.id} to ${walletAddress}`);

    return NextResponse.json({
      success: true,
      message: "Withdrawal request submitted successfully. Tokens will arrive within 24 hours.",
      withdrawal: {
        id: result.withdrawal.id,
        amount: result.withdrawal.amount,
        walletAddress: result.withdrawal.walletAddress,
        status: result.withdrawal.status,
        createdAt: result.withdrawal.createdAt,
      },
      newBalance: result.updatedUser.balance,
    });

  } catch (error) {
    console.error("Withdrawal error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process withdrawal request" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wallet/withdraw
 * 
 * Get user's withdrawal history
 */
export async function GET(request: NextRequest) {
  try {
    const telegramIdStr = request.headers.get("x-telegram-id");

    if (!telegramIdStr) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const telegramId = BigInt(telegramIdStr);

    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true, balance: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get withdrawal history
    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20, // Last 20 withdrawals
    });

    // Get stats
    const stats = await prisma.withdrawal.aggregate({
      where: { userId: user.id, status: "COMPLETED" },
      _sum: { amount: true },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      balance: user.balance,
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amount: w.amount,
        walletAddress: w.walletAddress,
        status: w.status,
        txHash: w.txHash,
        createdAt: w.createdAt,
        processedAt: w.processedAt,
      })),
      stats: {
        totalWithdrawn: stats._sum.amount || 0,
        completedCount: stats._count,
      },
      minWithdrawal: MIN_WITHDRAWAL_AMOUNT,
      maxWithdrawal: MAX_WITHDRAWAL_AMOUNT,
    });

  } catch (error) {
    console.error("Get withdrawals error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch withdrawal history" },
      { status: 500 }
    );
  }
}
