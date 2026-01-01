import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Hardcoded test user ID for MVP (from seed)
const TEST_USER_ID = "61c958da-e508-4184-933f-136f9b055f2b";

export async function POST(request: NextRequest) {
  try {
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
          userId: TEST_USER_ID,
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
          userId: TEST_USER_ID,
          taskId: taskId,
          status: "COMPLETED",
        },
      });

      // Update user balance
      const updatedUser = await tx.user.update({
        where: { id: TEST_USER_ID },
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
