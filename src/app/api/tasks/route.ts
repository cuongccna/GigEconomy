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

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // Filter by task type
    const search = searchParams.get("search"); // Search by title
    const status = searchParams.get("status"); // "completed", "pending", or "all"
    const cursor = searchParams.get("cursor"); // Cursor for pagination
    const limit = parseInt(searchParams.get("limit") || "20"); // Items per page

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

    // Get completed task IDs for this user
    const completedTasks = await prisma.userTask.findMany({
      where: { userId: user.id },
      select: { taskId: true },
    });
    const completedTaskIds = new Set(completedTasks.map((ut) => ut.taskId));

    // Build where clause for filtering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isActive: true };

    // Filter by type
    if (type && type !== "all") {
      where.type = type;
    }

    // Search by title
    if (search && search.trim()) {
      where.title = {
        contains: search.trim(),
        mode: "insensitive",
      };
    }

    // Filter by completion status
    if (status === "completed") {
      where.id = { in: Array.from(completedTaskIds) };
    } else if (status === "pending") {
      where.id = { notIn: Array.from(completedTaskIds) };
    }

    // Cursor-based pagination
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paginationArgs: any = {
      take: limit + 1, // Fetch one extra to check if there's more
      orderBy: [
        { reward: "desc" as const },
        { createdAt: "desc" as const },
      ],
    };

    if (cursor) {
      paginationArgs.cursor = { id: cursor };
      paginationArgs.skip = 1; // Skip the cursor item
    }

    // Fetch tasks with pagination
    const tasks = await prisma.task.findMany({
      where,
      ...paginationArgs,
    });

    // Check if there are more items
    const hasMore = tasks.length > limit;
    const taskList = hasMore ? tasks.slice(0, limit) : tasks;
    const nextCursor = hasMore ? taskList[taskList.length - 1]?.id : null;

    // Add isCompleted flag to each task
    const tasksWithStatus = taskList.map((task) => ({
      ...task,
      isCompleted: completedTaskIds.has(task.id),
    }));

    // Get available task types for filter options
    const taskTypes = await prisma.task.groupBy({
      by: ["type"],
      where: { isActive: true },
      _count: { type: true },
    });

    return NextResponse.json({
      tasks: tasksWithStatus,
      userBalance: user.balance,
      pagination: {
        hasMore,
        nextCursor,
        total: taskList.length,
      },
      filters: {
        types: taskTypes.map((t) => ({ type: t.type, count: t._count.type })),
      },
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
