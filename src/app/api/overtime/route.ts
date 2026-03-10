import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const myOnly = searchParams.get("mine") === "true";

  const where: Record<string, unknown> = {};
  if (auth.role === "staff" && auth.employeeId) {
    where.employeeId = auth.employeeId;
  } else if (myOnly && auth.employeeId) {
    where.employeeId = auth.employeeId;
  } else if (employeeId) {
    where.employeeId = employeeId;
  }

  if (auth.role === "manager" && auth.employeeId && !employeeId && !myOnly) {
    const emp = await prisma.employee.findUnique({
      where: { id: auth.employeeId },
      select: { departmentId: true },
    });
    if (emp?.departmentId) {
      where.employee = { departmentId: emp.departmentId };
    }
  }

  const requests = await prisma.overtimeRequest.findMany({
    where,
    include: { employee: true },
    orderBy: { workDate: "desc" },
  });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.employeeId) {
    return NextResponse.json({ error: "Employee account required" }, { status: 400 });
  }

  const { workDate, hours, reason } = await req.json();
  if (!workDate || hours == null) {
    return NextResponse.json(
      { error: "workDate and hours required" },
      { status: 400 }
    );
  }

  const h = parseFloat(hours);
  if (isNaN(h) || h <= 0 || h > 24) {
    return NextResponse.json({ error: "Invalid hours" }, { status: 400 });
  }

  const date = new Date(workDate);
  date.setHours(0, 0, 0, 0);

  const request = await prisma.overtimeRequest.create({
    data: {
      employeeId: auth.employeeId,
      workDate: date,
      hours: h,
      reason: reason || null,
      status: "pending",
    },
    include: { employee: true },
  });
  return NextResponse.json(request);
}
