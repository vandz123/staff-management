import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const status = searchParams.get("status");
  const myOnly = searchParams.get("mine") === "true";

  const where: Record<string, unknown> = {};
  if (auth.role === "staff" && auth.employeeId) {
    where.employeeId = auth.employeeId;
  } else if (myOnly && auth.employeeId) {
    where.employeeId = auth.employeeId;
  } else if (employeeId) {
    where.employeeId = employeeId;
  }
  if (status) where.status = status;

  if (auth.role === "manager" && auth.employeeId && !employeeId && !myOnly) {
    const emp = await prisma.employee.findUnique({
      where: { id: auth.employeeId },
      select: { departmentId: true },
    });
    if (emp?.departmentId) {
      where.employee = { departmentId: emp.departmentId };
    }
  }

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: { employee: { include: { department: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.employeeId) {
    return NextResponse.json({ error: "Employee account required" }, { status: 400 });
  }

  const { leaveType, startDate, endDate, reason } = await req.json();
  if (!leaveType || !startDate || !endDate) {
    return NextResponse.json(
      { error: "leaveType, startDate, endDate required" },
      { status: 400 }
    );
  }

  const validTypes = ["annual", "sick", "unpaid", "emergency"];
  if (!validTypes.includes(leaveType)) {
    return NextResponse.json({ error: "Invalid leave type" }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (end < start) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId: auth.employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      reason: reason || null,
      status: "pending",
    },
    include: { employee: true },
  });
  return NextResponse.json(request);
}
