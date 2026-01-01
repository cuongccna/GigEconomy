import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/shop
 * 
 * Get all items for admin management
 */
export async function GET() {
  try {
    const items = await prisma.item.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { userItems: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error("Admin shop GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/shop
 * 
 * Create a new shop item
 * 
 * Body: { name, description, price, image, type, effect }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, price, image, type, effect } = body;

    // Validate required fields
    if (!name || !description || !price || !type) {
      return NextResponse.json(
        { success: false, error: "Name, description, price, and type are required" },
        { status: 400 }
      );
    }

    // Validate price is a positive number
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return NextResponse.json(
        { success: false, error: "Price must be a positive number" },
        { status: 400 }
      );
    }

    // Check if item with same name exists
    const existingItem = await prisma.item.findUnique({
      where: { name },
    });

    if (existingItem) {
      return NextResponse.json(
        { success: false, error: "An item with this name already exists" },
        { status: 400 }
      );
    }

    // Create item
    const item = await prisma.item.create({
      data: {
        name,
        description,
        price: priceNum,
        image: image || "/items/default.png",
        type,
        effect: effect || "",
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      item,
      message: "Item created successfully",
    });
  } catch (error) {
    console.error("Admin shop POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create item" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/shop
 * 
 * Update item details
 * 
 * Body: { itemId, name?, description?, price?, image?, type?, effect?, isActive? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, name, description, price, image, type, effect, isActive } = body;

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "Item ID is required" },
        { status: 400 }
      );
    }

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: "Item not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      // Check name uniqueness if changing
      if (name !== existingItem.name) {
        const nameExists = await prisma.item.findUnique({
          where: { name },
        });
        if (nameExists) {
          return NextResponse.json(
            { success: false, error: "An item with this name already exists" },
            { status: 400 }
          );
        }
      }
      updateData.name = name;
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (price !== undefined) {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return NextResponse.json(
          { success: false, error: "Price must be a positive number" },
          { status: 400 }
        );
      }
      updateData.price = priceNum;
    }
    if (image !== undefined) {
      updateData.image = image;
    }
    if (type !== undefined) {
      updateData.type = type;
    }
    if (effect !== undefined) {
      updateData.effect = effect;
    }
    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }

    // Update item
    const item = await prisma.item.update({
      where: { id: itemId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      item,
      message: "Item updated successfully",
    });
  } catch (error) {
    console.error("Admin shop PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update item" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/shop
 * 
 * Delete an item (soft delete by setting isActive = false, or hard delete)
 * 
 * Body: { itemId, hardDelete?: boolean }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, hardDelete } = body;

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "Item ID is required" },
        { status: 400 }
      );
    }

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: "Item not found" },
        { status: 404 }
      );
    }

    if (hardDelete) {
      // Delete related UserItem records first
      await prisma.userItem.deleteMany({
        where: { itemId },
      });

      // Hard delete item
      await prisma.item.delete({
        where: { id: itemId },
      });

      return NextResponse.json({
        success: true,
        message: "Item permanently deleted",
      });
    } else {
      // Soft delete (set isActive = false)
      await prisma.item.update({
        where: { id: itemId },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        message: "Item deactivated",
      });
    }
  } catch (error) {
    console.error("Admin shop DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
