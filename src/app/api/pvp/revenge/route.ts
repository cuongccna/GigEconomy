import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Constants for Revenge Attack
const REVENGE_COOLDOWN_MS = 30 * 60 * 1000; // 30 min cooldown (shorter than normal)
const REVENGE_STEAL_PERCENTAGE = 0.08; // 8% of target's balance (bonus!)
const LOSE_PENALTY = 100; // Fine when attacker loses
const WIN_THRESHOLD = 45; // Roll > 45 = WIN (slightly easier for revenge)

/**
 * POST /api/pvp/revenge
 * 
 * Execute a revenge attack against someone who attacked you.
 * Bonus: Higher steal %, lower cooldown, easier win threshold.
 */
export async function POST(request: NextRequest) {
  try {
    const telegramIdStr = request.headers.get("x-telegram-id");
    
    if (!telegramIdStr) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const telegramId = BigInt(telegramIdStr);
    const body = await request.json();
    const { targetId, notificationId } = body;

    if (!targetId) {
      return NextResponse.json(
        { success: false, message: "Target ID is required" },
        { status: 400 }
      );
    }

    // Get attacker (the person seeking revenge)
    const attacker = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!attacker) {
      return NextResponse.json(
        { success: false, message: "Attacker not found" },
        { status: 404 }
      );
    }

    // Check if attacker is banned
    if (attacker.isBanned) {
      return NextResponse.json(
        { success: false, message: "You are banned from attacking" },
        { status: 403 }
      );
    }

    // Verify this is a valid revenge attack
    // Check if target has attacked the current user before
    const previousAttack = await prisma.battleLog.findFirst({
      where: {
        attackerId: targetId,
        defenderId: attacker.id,
        result: { in: ["WIN", "SHIELDED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!previousAttack) {
      return NextResponse.json({
        success: false,
        message: "This player hasn't attacked you. Use normal attack instead.",
      }, { status: 400 });
    }

    // Check cooldown (shorter for revenge)
    const now = new Date();
    if (attacker.lastHeistAt) {
      const timeSinceLastHeist = now.getTime() - attacker.lastHeistAt.getTime();
      if (timeSinceLastHeist < REVENGE_COOLDOWN_MS) {
        const remainingMs = REVENGE_COOLDOWN_MS - timeSinceLastHeist;
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        return NextResponse.json({
          success: false,
          message: `Revenge cooldown! Wait ${remainingMinutes} minutes.`,
          cooldownRemaining: remainingMs,
        }, { status: 429 });
      }
    }

    // Get defender (the original attacker) with their shield inventory
    const defender = await prisma.user.findUnique({
      where: { id: targetId },
      include: {
        userItems: {
          include: { item: true },
          where: {
            item: { name: "Streak Shield" },
            quantity: { gt: 0 },
          },
        },
      },
    });

    if (!defender) {
      return NextResponse.json(
        { success: false, message: "Target not found" },
        { status: 404 }
      );
    }

    // Prevent attacking yourself
    if (defender.id === attacker.id) {
      return NextResponse.json(
        { success: false, message: "You cannot attack yourself!" },
        { status: 400 }
      );
    }

    // Check if defender is banned
    if (defender.isBanned) {
      return NextResponse.json(
        { success: false, message: "Target is unavailable" },
        { status: 400 }
      );
    }

    // Check if defender has a shield
    const hasShield = defender.userItems.length > 0 && defender.userItems[0].quantity > 0;

    let result: "WIN" | "LOSE" | "SHIELDED";
    let amountStolen = 0;
    let attackerBalanceChange = 0;
    let defenderBalanceChange = 0;

    if (hasShield) {
      // SHIELDED: Defender's shield blocks the attack
      result = "SHIELDED";
      
      // Consume one shield from defender
      await prisma.userItem.update({
        where: { id: defender.userItems[0].id },
        data: { quantity: { decrement: 1 } },
      });

      // Small penalty for attacker
      attackerBalanceChange = -50;
      
    } else {
      // Roll the dice (0-100) - easier threshold for revenge
      const roll = Math.floor(Math.random() * 101);
      
      if (roll > WIN_THRESHOLD) {
        // WIN: Steal 8% of defender's balance (bonus for revenge!)
        result = "WIN";
        amountStolen = Math.floor(defender.balance * REVENGE_STEAL_PERCENTAGE);
        attackerBalanceChange = amountStolen;
        defenderBalanceChange = -amountStolen;
      } else {
        // LOSE: Pay a fine
        result = "LOSE";
        attackerBalanceChange = -LOSE_PENALTY;
      }
    }

    // Execute all updates in a transaction
    await prisma.$transaction([
      // Update attacker: balance + lastHeistAt + pvpWins/pvpTotalStolen if WIN
      prisma.user.update({
        where: { id: attacker.id },
        data: {
          balance: { increment: attackerBalanceChange },
          lastHeistAt: now,
          ...(result === "WIN" && {
            pvpWins: { increment: 1 },
            pvpTotalStolen: { increment: amountStolen },
          }),
        },
      }),
      // Update defender balance (if any change)
      ...(defenderBalanceChange !== 0
        ? [
            prisma.user.update({
              where: { id: defender.id },
              data: { balance: { increment: defenderBalanceChange } },
            }),
          ]
        : []),
      // Create battle log with revenge flag
      prisma.battleLog.create({
        data: {
          attackerId: attacker.id,
          defenderId: defender.id,
          amountStolen,
          result,
          isRevenge: true,
        },
      }),
      // Create notification for defender
      ...(result === "WIN" || result === "SHIELDED"
        ? [
            prisma.notification.create({
              data: {
                userId: defender.id,
                type: "ATTACK",
                message:
                  result === "WIN"
                    ? `⚔️ REVENGE! ${attacker.username || `Agent-${attacker.telegramId.toString().slice(-4)}`} got revenge and stole ${amountStolen.toLocaleString()} $GIG from you!`
                    : `🛡️ ${attacker.username || `Agent-${attacker.telegramId.toString().slice(-4)}`} tried to get revenge but your Shield blocked it!`,
                data: JSON.stringify({
                  attackerId: attacker.id,
                  attackerTelegramId: attacker.telegramId.toString(),
                  attackerName: attacker.username || `Agent-${attacker.telegramId.toString().slice(-4)}`,
                  amount: amountStolen,
                  result,
                  isRevenge: true,
                }),
              },
            }),
          ]
        : []),
      // Mark the notification as read if provided
      ...(notificationId
        ? [
            prisma.notification.update({
              where: { id: notificationId },
              data: { isRead: true },
            }),
          ]
        : []),
    ]);

    // Generate response message
    let message: string;
    switch (result) {
      case "WIN":
        message = `⚔️ REVENGE SUCCESSFUL! You stole ${amountStolen.toLocaleString()} $GIG! (+3% bonus)`;
        break;
      case "LOSE":
        message = `❌ Revenge failed! You were caught and fined ${LOSE_PENALTY} $GIG.`;
        break;
      case "SHIELDED":
        message = `🛡️ Target had a Shield! Your revenge was blocked.`;
        break;
    }

    return NextResponse.json({
      success: true,
      result,
      amount: Math.abs(attackerBalanceChange),
      message,
      isRevenge: true,
      defenderName: defender.username || `Agent-${defender.telegramId.toString().slice(-4)}`,
    });
  } catch (error) {
    console.error("PvP revenge error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
