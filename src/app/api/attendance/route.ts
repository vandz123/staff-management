import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

// Fixed schedule constants
const SHIFT_START_HOUR = 8;
const SHIFT_START_MIN = 0;
const LATE_THRESHOLD_MIN = 10; // 8:10
const SHIFT_END_HOUR = 17;
const SHIFT_END_MIN = 30;
const EARLY_LEAVE_THRESHOLD_MIN = 40; // Before 17:40

/**
 * Parse a "YYYY-MM-DD" string into a UTC-midnight Date.
 */
function toUTCDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00.000Z");
}

/**
 * Check if the employee has an approved late_arrival or early_leave request for the given date.
 */
async function hasApprovedExemption(employeeId: string, workDate: Date, type: "late_arrival" | "early_leave"): Promise<boolean> {
  const request = await prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      leaveType: type,
      status: "approved",
      startDate: { lte: workDate },
      endDate: { gte: workDate },
    },
  });
  return !!request;
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
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
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

  // Determine isLate based on check-in time
  let isLate = false;
  if (checkIn) {
    const checkInDate = new Date(checkIn);
    const checkInHour = checkInDate.getHours();
    const checkInMin = checkInDate.getMinutes();
    const totalMinutes = checkInHour * 60 + checkInMin;
    const lateThreshold = SHIFT_START_HOUR * 60 + SHIFT_START_MIN + LATE_THRESHOLD_MIN; // 8:10 = 490
    if (totalMinutes > lateThreshold) {
      // Check if there's an approved late_arrival exemption
      const exempted = await hasApprovedExemption(targetEmployeeId, date, "late_arrival");
      isLate = !exempted;
    }
  }

  // Determine isEarlyLeave based on check-out time
  let isEarlyLeave = false;
  if (checkOut) {
    const checkOutDate = new Date(checkOut);
    const checkOutHour = checkOutDate.getHours();
    const checkOutMin = checkOutDate.getMinutes();
    const totalMinutes = checkOutHour * 60 + checkOutMin;
    const earlyThreshold = SHIFT_END_HOUR * 60 + EARLY_LEAVE_THRESHOLD_MIN; // 17:40 = 1100
    if (totalMinutes < earlyThreshold) {
      // Check if there's an approved early_leave exemption
      const exempted = await hasApprovedExemption(targetEmployeeId, date, "early_leave");
      isEarlyLeave = !exempted;
    }
  }

  const att = await prisma.attendance.upsert({
    where: {
      employeeId_workDate: { employeeId: targetEmployeeId, workDate: date },
    },
    create: {
      employeeId: targetEmployeeId,
      workDate: date,
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      status: checkIn ? (isLate ? "late" : "present") : "pending",
      isLate,
      isEarlyLeave,
    },
    update: {
      ...(checkIn ? { checkIn: new Date(checkIn), isLate } : {}),
      ...(checkOut ? { checkOut: new Date(checkOut), isEarlyLeave } : {}),
      ...(checkIn ? { status: isLate ? "late" : "present" } : {}),
    },
    include: { employee: true },
  });
  return NextResponse.json(att);
}
