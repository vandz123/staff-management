import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/middleware";
import { hashPassword, generateTempPassword } from "@/lib/auth";

const TEMP_PASSWORD_EXPIRY_HOURS = 24;

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requests = await prisma.passwordResetRequest.findMany({
    orderBy: [{ status: "asc" }, { requestTime: "desc" }],
    include: {
      user: {
        include: {
          employee: { include: { department: true } },
        },
      },
    },
  });

  const formatted = requests.map((r) => ({
    id: r.id,
    userId: r.userId,
    username: r.user.username,
    employeeName: r.user.employee
      ? `${r.user.employee.firstName} ${r.user.employee.lastName}`
      : null,
    department: r.user.employee?.department?.name ?? null,
    requestReason: r.requestReason,
    requestTime: r.requestTime,
    status: r.status,
    approvedTime: r.approvedTime,
    generatedPassword: r.generatedPassword,
    tempPasswordExpiry: r.tempPasswordExpiry,
  }));

  return NextResponse.json(formatted);
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth || auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, action } = await req.json();
  if (!id || !action) {
    return NextResponse.json(
      { error: "Request id and action (approve|reject) required" },
      { status: 400 }
    );
  }

  const resetRequest = await prisma.passwordResetRequest.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!resetRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (resetRequest.status !== "pending") {
    return NextResponse.json(
      { error: "Request has already been processed" },
      { status: 400 }
    );
  }

  if (action === "reject") {
    await prisma.passwordResetRequest.update({
      where: { id },
      data: {
        status: "rejected",
        approvedById: auth.userId,
        approvedTime: new Date(),
      },
    });
    return NextResponse.json({ success: true, action: "rejected" });
  }

  if (action === "approve") {
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + TEMP_PASSWORD_EXPIRY_HOURS);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRequest.userId },
        data: {
          passwordHash,
          mustChangePassword: true,
          status: "active",
          loginAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.passwordResetRequest.update({
        where: { id },
        data: {
          status: "approved",
          approvedById: auth.userId,
          approvedTime: new Date(),
          generatedPassword: tempPassword,
          tempPasswordExpiry: expiry,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      action: "approved",
      tempPassword,
      message: `Temporary password: ${tempPassword}. Share this with the employee. It expires in ${TEMP_PASSWORD_EXPIRY_HOURS} hours.`,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
