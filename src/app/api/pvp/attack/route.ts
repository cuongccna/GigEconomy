import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Constants
const ATTACK_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown
const STEAL_PERCENTAGE = 0.05; // 5% of defender's balance
const LOSE_PENALTY = 100; // Fine when attacker loses
const WIN_THRESHOLD = 50; // Roll > 50 = WIN
const LOGIC_BOMB_PENALTY = 2000; // Penalty when stepping on Logic Bomb

// Item names
const STREAK_SHIELD = "Streak Shield";
const LOGIC_BOMB = "Logic Bomb";

// POST: Execute a PvP attack (Cyber Heist)
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
    const { targetId } = body;

    if (!targetId) {
      return NextResponse.json(
        { success: false, message: "Target ID is required" },
        { status: 400 }
      );
    }

    // Get attacker
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

    // Check cooldown
    const now = new Date();
    if (attacker.lastHeistAt) {
      const timeSinceLastHeist = now.getTime() - attacker.lastHeistAt.getTime();
      if (timeSinceLastHeist < ATTACK_COOLDOWN_MS) {
        const remainingMs = ATTACK_COOLDOWN_MS - timeSinceLastHeist;
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        return NextResponse.json({
          success: false,
          message: `Cooldown active! Wait ${remainingMinutes} minutes.`,
          cooldownRemaining: remainingMs,
        }, { status: 429 });
      }
    }

    // Get defender with their shield AND logic bomb inventory
    const defender = await prisma.user.findUnique({
      where: { id: targetId },
      include: {
        userItems: {
          include: { item: true },
          where: {
            item: { name: { in: [STREAK_SHIELD, LOGIC_BOMB] } },
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

    // Check for items
    const shieldItem = defender.userItems.find(ui => ui.item.name === STREAK_SHIELD);
    const logicBombItem = defender.userItems.find(ui => ui.item.name === LOGIC_BOMB);
    const hasShield = shieldItem && shieldItem.quantity > 0;
    const hasLogicBomb = logicBombItem && logicBombItem.quantity > 0;

    let result: "WIN" | "LOSE" | "SHIELDED" | "COUNTER_ATTACK";
    let amountStolen = 0;
    let attackerBalanceChange = 0;
    let defenderBalanceChange = 0;

    // ===== LOGIC BOMB CHECK (Cyber Mine) =====
    if (hasLogicBomb) {
      // Logic Bomb triggered! Attacker steps on a mine
      result = "COUNTER_ATTACK";
      
      // Calculate penalty (attacker loses, defender gains)
      attackerBalanceChange = -LOGIC_BOMB_PENALTY;
      defenderBalanceChange = LOGIC_BOMB_PENALTY;

      // Execute transaction
      await prisma.$transaction([
        // Consume one Logic Bomb from defender
        prisma.userItem.update({
          where: { id: logicBombItem!.id },
          data: { quantity: { decrement: 1 } },
        }),
        // Deduct penalty from attacker
        prisma.user.update({
          where: { id: attacker.id },
          data: {
            balance: { increment: attackerBalanceChange },
            lastHeistAt: now,
          },
        }),
        // Add penalty to defender
        prisma.user.update({
          where: { id: defender.id },
          data: { balance: { increment: defenderBalanceChange } },
        }),
        // Create battle log with COUNTER_ATTACK status
        prisma.battleLog.create({
          data: {
            attackerId: attacker.id,
            defenderId: defender.id,
            amountStolen: LOGIC_BOMB_PENALTY, // Record the penalty amount
            result: "COUNTER_ATTACK",
          },
        }),
        // Notify attacker: You stepped on a mine!
        prisma.notification.create({
          data: {
            userId: attacker.id,
            type: "ATTACK",
            message: `💣 You stepped on a Logic Bomb! Lost ${LOGIC_BOMB_PENALTY.toLocaleString()} $GIG to ${defender.username || `Agent-${defender.telegramId.toString().slice(-4)}`}!`,
            data: JSON.stringify({
              defenderId: defender.id,
              defenderName: defender.username || `Agent-${defender.telegramId.toString().slice(-4)}`,
              amount: LOGIC_BOMB_PENALTY,
              result: "COUNTER_ATTACK",
            }),
          },
        }),
        // Notify defender: Your mine worked!
        prisma.notification.create({
          data: {
            userId: defender.id,
            type: "REWARD",
            message: `💣 Your Logic Bomb exploded! ${attacker.username || `Agent-${attacker.telegramId.toString().slice(-4)}`} stepped on it! +${LOGIC_BOMB_PENALTY.toLocaleString()} $GIG`,
            data: JSON.stringify({
              attackerId: attacker.id,
              attackerName: attacker.username || `Agent-${attacker.telegramId.toString().slice(-4)}`,
              amount: LOGIC_BOMB_PENALTY,
              result: "COUNTER_ATTACK",
            }),
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        result: "COUNTER_ATTACK",
        amount: LOGIC_BOMB_PENALTY,
        message: `💣 BOOM! You stepped on a Logic Bomb! Lost ${LOGIC_BOMB_PENALTY.toLocaleString()} $GIG!`,
        defenderName: defender.username || `Agent-${defender.telegramId.toString().slice(-4)}`,
      });
    }

    // ===== SHIELD CHECK =====
    if (hasShield) {
      // SHIELDED: Defender's shield blocks the attack
      result = "SHIELDED";
      
      // Consume one shield from defender
      await prisma.userItem.update({
        where: { id: shieldItem!.id },
        data: { quantity: { decrement: 1 } },
      });

      // Small penalty for attacker (optional)
      attackerBalanceChange = -50;
      
    } else {
      // ===== NORMAL DICE ROLL =====
      const roll = Math.floor(Math.random() * 101);
      
      if (roll > WIN_THRESHOLD) {
        // WIN: Steal 5% of defender's balance
        result = "WIN";
        amountStolen = Math.floor(defender.balance * STEAL_PERCENTAGE);
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
      // Create battle log
      prisma.battleLog.create({
        data: {
          attackerId: attacker.id,
          defenderId: defender.id,
          amountStolen,
          result,
        },
      }),
      // Create notification for defender (on WIN or SHIELDED)
      ...(result === "WIN" || result === "SHIELDED"
        ? [
            prisma.notification.create({
              data: {
                userId: defender.id,
                type: "ATTACK",
                message:
                  result === "WIN"
                    ? `🚨 ${attacker.username || `Agent-${attacker.telegramId.toString().slice(-4)}`} stole ${amountStolen.toLocaleString()} $GIG from you!`
                    : `🛡️ ${attacker.username || `Agent-${attacker.telegramId.toString().slice(-4)}`} tried to attack you but your Shield blocked it!`,
                data: JSON.stringify({
                  attackerId: attacker.id,
                  attackerTelegramId: attacker.telegramId.toString(),
                  attackerName: attacker.username || `Agent-${attacker.telegramId.toString().slice(-4)}`,
                  amount: amountStolen,
                  result,
                  battleLogId: undefined, // Will be set after creation
                }),
              },
            }),
          ]
        : []),
    ]);

    // Generate response message
    let message: string;
    switch (result) {
      case "WIN":
        message = `💰 Heist successful! You stole ${amountStolen.toLocaleString()} $GIG!`;
        break;
      case "LOSE":
        message = `❌ Heist failed! You were caught and fined ${LOSE_PENALTY} $GIG.`;
        break;
      case "SHIELDED":
        message = `🛡️ Target had a Shield! Your attack was blocked.`;
        break;
    }

    return NextResponse.json({
      success: true,
      result,
      amount: Math.abs(attackerBalanceChange),
      message,
      defenderName: defender.username || `Agent-${defender.telegramId.toString().slice(-4)}`,
    });
  } catch (error) {
    console.error("PvP attack error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
