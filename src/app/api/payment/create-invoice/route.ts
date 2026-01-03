import { NextRequest, NextResponse } from "next/server";
import { getPackageById } from "@/config/starsPackages";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * POST /api/payment/create-invoice
 * 
 * Creates a Telegram Stars invoice link for a package
 */
export async function POST(request: NextRequest) {
  try {
    const telegramIdStr = request.headers.get("x-telegram-id");

    if (!telegramIdStr) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const telegramId = telegramIdStr;
    const { packageId } = await request.json();

    if (!packageId) {
      return NextResponse.json(
        { success: false, error: "Package ID is required" },
        { status: 400 }
      );
    }

    // Get package info
    const pkg = getPackageById(packageId);
    if (!pkg) {
      return NextResponse.json(
        { success: false, error: "Invalid package" },
        { status: 400 }
      );
    }

    // Build description
    let description = pkg.description + "\n\nYou will receive:";
    if (pkg.content.gig) {
      description += `\n• ${pkg.content.gig.toLocaleString()} $GIG`;
    }
    if (pkg.content.items) {
      pkg.content.items.forEach((item) => {
        description += `\n• ${item.quantity}x ${item.name}`;
      });
    }
    if (pkg.content.effects) {
      pkg.content.effects.forEach((effect) => {
        if (effect.type === "DOUBLE_FARMING" && effect.duration) {
          description += `\n• 2x Farming Rate (${effect.duration / 24} days)`;
        }
      });
    }

    // Create invoice link using Telegram Bot API
    // https://core.telegram.org/bots/api#createinvoicelink
    const response = await fetch(`${TELEGRAM_API}/createInvoiceLink`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: pkg.title,
        description: description.substring(0, 255), // Max 255 chars
        payload: JSON.stringify({
          packageId: pkg.id,
          telegramId: telegramId,
          timestamp: Date.now(),
        }),
        currency: "XTR", // Telegram Stars
        prices: [
          {
            label: pkg.title,
            amount: pkg.price, // Stars amount (no need to multiply, 1 = 1 Star)
          },
        ],
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("Telegram API error:", data);
      return NextResponse.json(
        { success: false, error: data.description || "Failed to create invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invoiceLink: data.result,
      package: {
        id: pkg.id,
        title: pkg.title,
        price: pkg.price,
      },
    });
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payment/create-invoice
 * 
 * Get all available packages
 */
export async function GET() {
  const { STARS_PACKAGES } = await import("@/config/starsPackages");
  
  return NextResponse.json({
    success: true,
    packages: STARS_PACKAGES,
  });
}
