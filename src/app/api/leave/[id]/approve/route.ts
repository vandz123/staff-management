import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { action } = await req.json();
  if (!action || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!leaveRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (leaveRequest.status !== "pending") {
    return NextResponse.json({ error: "Request already processed" }, { status: 400 });
  }



  const update: { status: string; approvedById: string; approvedAt: Date } = {
    status: action === "approve" ? "approved" : "rejected",
    approvedById: auth.userId,
    approvedAt: new Date(),
  };

  if (action === "approve" && leaveRequest.leaveType === "annual") {
    const days = Math.ceil(
      (leaveRequest.endDate.getTime() - leaveRequest.startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    const emp = await prisma.employee.findUnique({
      where: { id: leaveRequest.employeeId },
      select: { annualLeaveBalance: true },
    });
    const balance = emp?.annualLeaveBalance ?? 0;
    if (balance < days) {
      return NextResponse.json(
        { error: `Insufficient leave balance (${balance} days). Requested ${days} days.` },
        { status: 400 }
      );
    }
    await prisma.$transaction([
      prisma.leaveRequest.update({ where: { id }, data: update }),
      prisma.employee.update({
        where: { id: leaveRequest.employeeId },
        data: { annualLeaveBalance: { decrement: days } },
      }),
    ]);
  } else {
    await prisma.leaveRequest.update({ where: { id }, data: update });
  }

  return NextResponse.json({
    success: true,
    status: action === "approve" ? "approved" : "rejected",
  });
}
