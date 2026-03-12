import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

/**
 * Parse a "YYYY-MM-DD" string into a UTC-midnight Date.
 * PostgreSQL DATE columns extract the UTC date portion,
 * so we must always send UTC midnight to avoid off-by-one day shifts.
 */
function toUTCDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00.000Z");
}

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeIdParam = searchParams.get("employeeId");
  const workDate = searchParams.get("workDate");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const where: Record<string, unknown> = {};

  // Staff can only ever see their own attendance
  if (auth.role === "staff" && auth.employeeId) {
    where.employeeId = auth.employeeId;
  } else if (employeeIdParam) {
    where.employeeId = employeeIdParam;
  }

  if (workDate) {
    where.workDate = toUTCDate(workDate);
  }
  if (start && end) {
    where.workDate = {
      gte: toUTCDate(start),
      lte: toUTCDate(end),
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
  const { employeeId: bodyEmployeeId, workDate, checkIn, checkOut } = body;

  // Staff can only record their own attendance
  const targetEmployeeId =
    auth.role === "staff" && auth.employeeId ? auth.employeeId : bodyEmployeeId;

  if (!targetEmployeeId || !workDate) {
    return NextResponse.json(
      { error: "employeeId and workDate required" },
      { status: 400 },
    );
  }

  if (auth.role === "staff" && auth.employeeId && targetEmployeeId !== auth.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const date = toUTCDate(workDate);

  const att = await prisma.attendance.upsert({
    where: {
      employeeId_workDate: { employeeId: targetEmployeeId, workDate: date },
    },
    create: {
      employeeId: targetEmployeeId,
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
