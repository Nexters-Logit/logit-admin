import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";
import type { Prisma } from "@/generated/prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const env = await getServerEnv();
    const prisma = getPrisma(env);
    const { id } = await params;
    const body = await req.json();

    const data: Prisma.PlanUpdateInput = {};
    if ("name" in body) data.name = body.name;
    if ("original_price" in body) data.original_price = Number(body.original_price);
    if ("price" in body) data.price = Number(body.price);
    if ("monthly_tokens" in body) data.monthly_tokens = Number(body.monthly_tokens);
    if ("description" in body) data.description = body.description;
    if ("badge" in body) data.badge = body.badge;
    if ("features" in body) data.features = body.features;
    if ("is_recommended" in body) data.is_recommended = body.is_recommended;
    if ("is_active" in body) data.is_active = body.is_active;
    if ("display_order" in body) data.display_order = Number(body.display_order);

    const plan = await prisma.plan.update({ where: { id }, data });
    return NextResponse.json(plan);
  } catch (error) {
    console.error("Plan update error:", error);
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const env = await getServerEnv();
    const prisma = getPrisma(env);
    const { id } = await params;
    await prisma.plan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Plan delete error:", error);
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }
}
