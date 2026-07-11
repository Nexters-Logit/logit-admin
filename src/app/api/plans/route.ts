import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const env = await getServerEnv();
    const prisma = getPrisma(env);
    const plans = await prisma.plan.findMany({
      orderBy: [{ subscription_type: "asc" }, { display_order: "asc" }],
    });
    return NextResponse.json({ data: plans });
  } catch (error) {
    console.error("Plans fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const env = await getServerEnv();
    const prisma = getPrisma(env);
    const body = await req.json();

    const {
      subscription_type,
      plan_key,
      name,
      original_price,
      price,
      monthly_tokens,
      description,
      badge,
      features,
      is_recommended,
      is_free,
      is_active,
      display_order,
      show_on_mobile,
    } = body;

    if (!subscription_type || !plan_key || !name) {
      return NextResponse.json({ error: "subscription_type, plan_key, name은 필수입니다." }, { status: 400 });
    }

    const plan = await prisma.plan.create({
      data: {
        id: randomUUID(),
        subscription_type,
        plan_key,
        name,
        original_price: Number(original_price ?? 0),
        price: Number(price ?? 0),
        monthly_tokens: Number(monthly_tokens ?? 0),
        description: description || null,
        badge: badge || null,
        features: features ?? null,
        is_recommended: is_recommended ?? false,
        is_free: is_free ?? false,
        is_active: is_active ?? true,
        display_order: Number(display_order ?? 0),
        show_on_mobile: show_on_mobile ?? true,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("Plan create error:", error);
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }
}
