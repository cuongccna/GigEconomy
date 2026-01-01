import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get user ID from header
    const telegramIdStr = request.headers.get("x-telegram-id");
    
    if (!telegramIdStr) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const telegramId = BigInt(telegramIdStr);

    // Fetch user with balance
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true, balance: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Fetch all active tasks
    const tasks = await prisma.task.findMany({
      where: { isActive: true },
      orderBy: { reward: "desc" },
    });

    // If no tasks, return empty list but success
    if (tasks.length === 0) {
      return NextResponse.json({
        tasks: [],
        userBalance: user.balance,
      });
    }

    // Get completed task IDs for this user
    const completedTasks = await prisma.userTask.findMany({
      where: { userId: user.id },
      select: { taskId: true },
    });

    const completedTaskIds = new Set(completedTasks.map((ut) => ut.taskId));

    // Add isCompleted flag to each task
    const tasksWithStatus = tasks.map((task) => ({
      ...task,
      isCompleted: completedTaskIds.has(task.id),
    }));

    return NextResponse.json({
      tasks: tasksWithStatus,
      userBalance: user.balance,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
