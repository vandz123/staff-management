import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { emailOrUsername, reason } = await req.json();
    const input = (emailOrUsername ?? "").trim();
    if (!input) {
      return NextResponse.json(
        { error: "Email or username is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: input.includes("@")
        ? { employee: { email: input } }
        : { username: input },
      include: { employee: { include: { department: true } } },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with that email or username." },
        { status: 404 }
      );
    }

    const existing = await prisma.passwordResetRequest.findFirst({
      where: { userId: user.id, status: "pending" },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already have a pending reset request." },
        { status: 400 }
      );
    }

    await prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        requestReason: reason || null,
        status: "pending",
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Forgot password error:", e);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
