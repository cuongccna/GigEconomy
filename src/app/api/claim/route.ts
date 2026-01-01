import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const telegramIdStr = request.headers.get("x-telegram-id");

    if (!telegramIdStr) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const telegramId = BigInt(telegramIdStr);

    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 }
      );
    }

    // Check if task exists and is active
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    if (!task.isActive) {
      return NextResponse.json(
        { error: "Task is no longer active" },
        { status: 400 }
      );
    }

    // Check if user already completed this task
    const existingUserTask = await prisma.userTask.findUnique({
      where: {
        userId_taskId: {
          userId: user.id,
          taskId: taskId,
        },
      },
    });

    if (existingUserTask) {
      return NextResponse.json(
        { error: "Task already completed" },
        { status: 400 }
      );
    }

    // Create UserTask record and update balance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the UserTask record
      await tx.userTask.create({
        data: {
          userId: user.id,
          taskId: taskId,
          status: "COMPLETED",
        },
      });

      // Update user balance
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: {
            increment: task.reward,
          },
        },
        select: { balance: true },
      });

      return updatedUser;
    });

    return NextResponse.json({
      success: true,
      message: `Claimed ${task.reward} points!`,
      newBalance: result.balance,
      reward: task.reward,
    });
  } catch (error) {
    console.error("Error claiming reward:", error);
    return NextResponse.json(
      { error: "Failed to claim reward" },
      { status: 500 }
    );
  }
}
