import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/tasks
 * 
 * Get all tasks for admin management
 */
export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Admin tasks GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tasks
 * 
 * Create a new task
 * 
 * Body: { title, description, reward, link, icon, type }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, reward, link, icon, type } = body;

    // Validate required fields
    if (!title || !description || !reward) {
      return NextResponse.json(
        { success: false, error: "Title, description, and reward are required" },
        { status: 400 }
      );
    }

    // Validate reward is a positive number
    const rewardNum = parseInt(reward);
    if (isNaN(rewardNum) || rewardNum <= 0) {
      return NextResponse.json(
        { success: false, error: "Reward must be a positive number" },
        { status: 400 }
      );
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        title,
        description,
        reward: rewardNum,
        link: link || null,
        icon: icon || "other",
        type: type || "social",
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      task,
      message: "Task created successfully",
    });
  } catch (error) {
    console.error("Admin tasks POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create task" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/tasks
 * 
 * Update task status (Active/Inactive)
 * 
 * Body: { taskId, isActive }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, isActive, title, description, reward, link, icon, type } = body;

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }
    if (title !== undefined) {
      updateData.title = title;
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (reward !== undefined) {
      updateData.reward = parseInt(reward);
    }
    if (link !== undefined) {
      updateData.link = link;
    }
    if (icon !== undefined) {
      updateData.icon = icon;
    }
    if (type !== undefined) {
      updateData.type = type;
    }

    // Update task
    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      task,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error("Admin tasks PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update task" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/tasks
 * 
 * Delete a task (hard delete)
 * 
 * Body: { taskId }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    // Delete related UserTask records first
    await prisma.userTask.deleteMany({
      where: { taskId },
    });

    // Delete task
    await prisma.task.delete({
      where: { id: taskId },
    });

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Admin tasks DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
