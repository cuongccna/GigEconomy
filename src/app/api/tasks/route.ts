import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Hardcoded test user ID for MVP (from seed)
const TEST_USER_ID = "61c958da-e508-4184-933f-136f9b055f2b";

export async function GET() {
  try {
    // Fetch user with balance
    const user = await prisma.user.findUnique({
      where: { id: TEST_USER_ID },
      select: { balance: true },
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

    // Get completed task IDs for this user
    const completedTasks = await prisma.userTask.findMany({
      where: { userId: TEST_USER_ID },
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
