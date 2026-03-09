import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Total employees today (active, with shift assigned today)
  const assignedTodayForTotal = await prisma.shiftAssignment.findMany({
    where: {
      workDate: today,
      employee: { status: "active" },
    },
    select: { employeeId: true },
    distinct: ["employeeId"],
  });
  const totalEmployeesToday = assignedTodayForTotal.length;

  // Employees absent today (assigned to shift but no check-in)
  const assignedToday = await prisma.shiftAssignment.findMany({
    where: { workDate: today },
    select: { employeeId: true },
  });
  const assignedIds = Array.from(new Set(assignedToday.map((a) => a.employeeId)));
  const presentToday = await prisma.attendance.count({
    where: {
      workDate: today,
      employeeId: { in: assignedIds },
      checkIn: { not: null },
    },
  });
  const absentToday = assignedIds.length - presentToday;

  // Shifts missing staff
  const shiftsWithAssignments = await prisma.shift.findMany({
    include: {
      assignments: {
        where: { workDate: today },
        select: { employeeId: true },
      },
    },
  });
  const shiftsMissingStaff = shiftsWithAssignments
    .map((s) => ({
      ...s,
      assignedCount: s.assignments.length,
      missing: Math.max(0, s.requiredStaff - s.assignments.length),
    }))
    .filter((s) => s.missing > 0);

  // Attendance corrections pending (edits or status)
  const correctionsPending = await prisma.attendance.count({
    where: { status: "pending" },
  });

  // Upcoming training deadlines (next 7 days)
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const upcomingDeadlines = await prisma.employeeTraining.count({
    where: {
      status: "pending",
      training: {
        deadline: {
          gte: today,
          lte: weekFromNow,
        },
      },
    },
  });

  return NextResponse.json({
    totalEmployeesToday,
    absentToday,
    shiftsMissingStaff: shiftsMissingStaff.length,
    shiftsMissingStaffDetail: shiftsMissingStaff,
    correctionsPending,
    upcomingTrainingDeadlines: upcomingDeadlines,
  });
}
