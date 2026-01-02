import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminByTelegramId } from "@/lib/admin";
import { 
  AFFILIATE_IDS, 
  AFFILIATE_TASK_TEMPLATES, 
  ExchangeKey 
} from "@/config/affiliates";

/**
 * POST /api/admin/tasks/auto-generate
 * 
 * Auto-generates affiliate tasks based on configured affiliate IDs.
 * Skips any tasks that already exist (by matching title and link).
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin permission
    const telegramIdStr = request.headers.get("x-telegram-id");
    if (!telegramIdStr || !(await isAdminByTelegramId(telegramIdStr))) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const tasksToCreate: {
      title: string;
      description: string;
      reward: number;
      link: string;
      icon: string;
      type: string;
      isActive: boolean;
    }[] = [];

    const skippedTasks: string[] = [];

    // Get all existing tasks to check for duplicates
    const existingTasks = await prisma.task.findMany({
      select: { title: true, link: true },
    });

    const existingTaskSet = new Set(
      existingTasks.map((t) => `${t.title}::${t.link}`)
    );

    // Loop through each exchange
    for (const [exchange, affiliateId] of Object.entries(AFFILIATE_IDS)) {
      // Skip if no affiliate ID is configured (still placeholder)
      if (affiliateId.startsWith('YOUR_')) {
        continue;
      }

      const templates = AFFILIATE_TASK_TEMPLATES[exchange as ExchangeKey];
      if (!templates) continue;

      // Process each template for this exchange
      for (const template of templates) {
        const link = template.linkTemplate.replace('{ID}', affiliateId);
        const taskKey = `${template.title}::${link}`;

        // Check if task already exists
        if (existingTaskSet.has(taskKey)) {
          skippedTasks.push(template.title);
          continue;
        }

        tasksToCreate.push({
          title: template.title,
          description: template.description,
          reward: template.reward,
          link,
          icon: template.icon,
          type: template.type,
          isActive: true,
        });
      }
    }

    // Create all new tasks at once
    let createdCount = 0;
    if (tasksToCreate.length > 0) {
      const result = await prisma.task.createMany({
        data: tasksToCreate,
      });
      createdCount = result.count;
    }

    return NextResponse.json({
      success: true,
      createdCount,
      skippedCount: skippedTasks.length,
      skippedTasks: skippedTasks.length > 0 ? skippedTasks : undefined,
      message: createdCount > 0 
        ? `Successfully created ${createdCount} affiliate task(s)`
        : 'No new tasks to create (all already exist or no affiliate IDs configured)',
    });
  } catch (error) {
    console.error("Auto-generate tasks error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to auto-generate tasks" },
      { status: 500 }
    );
  }
}
