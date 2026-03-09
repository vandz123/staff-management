import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const workDate = searchParams.get("workDate");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const where: Record<string, unknown> = {};
  if (employeeId) where.employeeId = employeeId;
  if (workDate) where.workDate = new Date(workDate);
  if (start && end) {
    where.workDate = {
      gte: new Date(start),
      lte: new Date(end),
    };
  }

  const attendance = await prisma.attendance.findMany({
    where,
    include: { employee: true },
    orderBy: [{ workDate: "desc" }, { employeeId: "asc" }],
  });
  return NextResponse.json(attendance);
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { employeeId, workDate, checkIn, checkOut } = body;
  if (!employeeId || !workDate) {
    return NextResponse.json({ error: "employeeId, workDate required" }, { status: 400 });
  }

  const date = new Date(workDate);
  date.setHours(0, 0, 0, 0);

  const att = await prisma.attendance.upsert({
    where: {
      employeeId_workDate: { employeeId, workDate: date },
    },
    create: {
      employeeId,
      workDate: date,
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      status: checkIn ? "present" : "pending",
    },
    update: {
      checkIn: checkIn ? new Date(checkIn) : undefined,
      checkOut: checkOut ? new Date(checkOut) : undefined,
      status: checkIn ? "present" : undefined,
    },
    include: { employee: true },
  });
  return NextResponse.json(att);
}
