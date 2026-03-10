import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/middleware";
import { hashPassword, validatePasswordRules } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { newPassword, confirmPassword } = await req.json();
  if (!newPassword || !confirmPassword) {
    return NextResponse.json(
      { error: "New password and confirmation are required" },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "Passwords do not match" },
      { status: 400 }
    );
  }

  const validation = validatePasswordRules(newPassword);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.message },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: auth.userId },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Password updated successfully.",
  });
}
