import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { subDays, startOfMonth, endOfMonth, format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const role = auth.role;
    const employeeId = auth.employeeId;


    if (role === "admin") {
      // ========== ADMIN DASHBOARD ==========
      const allEmployees = await prisma.employee.findMany({
        where: {},
        select: { id: true, status: true, hireDate: true, departmentId: true },
      });
      const activeCount = allEmployees.filter((e) => e.status === "active").length;
      const inactiveCount = allEmployees.filter((e) => e.status === "inactive").length;
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      const newThisMonth = allEmployees.filter(
        (e) => e.hireDate >= monthStart && e.hireDate <= monthEnd
      ).length;

      // Attendance today
      const todayAttendance = await prisma.attendance.findMany({
        where: { workDate: today },
        include: { employee: { select: { departmentId: true } } },
      });
      const assignmentsToday = await prisma.shiftAssignment.findMany({
        where: { workDate: today },
        include: { shift: true },
      });
      const shiftByEmployee: Record<string, { startTime: string }> = {};
      assignmentsToday.forEach((a) => {
        shiftByEmployee[a.employeeId] = a.shift;
      });
      let late = 0;
      for (const a of todayAttendance) {
        if (!a.checkIn) continue;
        const shift = shiftByEmployee[a.employeeId];
        if (!shift) continue;
        const [h, m] = shift.startTime.split(":").map(Number);
        const shiftStart = new Date(a.checkIn);
        shiftStart.setHours(h, m, 0, 0);
        if (a.checkIn > shiftStart) late++;
      }
      const present = todayAttendance.filter((a) => a.checkIn && a.status === "present").length;
      const missingCheckIn = todayAttendance.filter(
        (a) => a.status === "pending" && !a.checkIn
      ).length;

      // Count unique employees scheduled to work today
      const scheduledEmployees = await prisma.shiftAssignment.findMany({
        where: { workDate: today },
        select: { employeeId: true },
        distinct: ["employeeId"],
      });
      const totalExpected = scheduledEmployees.length;
      const absent = Math.max(0, totalExpected - present);

      // Shift coverage
      const shifts = await prisma.shift.findMany({
        include: {
          assignments: { where: { workDate: today }, select: { employeeId: true } },
        },
      });
      const shiftCoverage = shifts.map((s) => ({
        name: s.name,
        required: s.requiredStaff,
        assigned: s.assignments.length,
        status:
          s.assignments.length >= s.requiredStaff
            ? "ok"
            : s.assignments.length >= s.requiredStaff * 0.8
              ? "warning"
              : "missing",
      }));

      // Pending requests
      const passwordResetPending = await prisma.passwordResetRequest.count({
        where: { status: "pending" },
      });
      const attendanceCorrectionPending = await prisma.attendanceCorrectionRequest.count({
        where: { status: "pending" },
      });
      const leavePending = await prisma.leaveRequest.count({
        where: { status: "pending" },
      });

      // 7-day attendance trend
      const trendDays: { label: string; present: number; late: number; absent: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = subDays(today, i);
        day.setHours(0, 0, 0, 0);
        const dayAttendance = await prisma.attendance.findMany({
          where: { workDate: day },
        });
        const dayAssignments = await prisma.shiftAssignment.findMany({
          where: { workDate: day },
          include: { shift: true },
        });
        const dayShiftMap: Record<string, string> = {};
        dayAssignments.forEach((a) => { dayShiftMap[a.employeeId] = a.shift.startTime; });
        let dayPresent = 0;
        let dayLate = 0;
        for (const a of dayAttendance) {
          if (a.checkIn) {
            const shift = dayShiftMap[a.employeeId];
            if (shift) {
              const [sh, sm] = shift.split(":").map(Number);
              const shiftStart = new Date(a.checkIn);
              shiftStart.setHours(sh, sm, 0, 0);
              if (a.checkIn > shiftStart) {
                dayLate++;
              } else {
                dayPresent++;
              }
            } else {
              dayPresent++;
            }
          }
        }
        const dayScheduled = await prisma.shiftAssignment.findMany({
          where: { workDate: day },
          select: { employeeId: true },
          distinct: ["employeeId"],
        });
        const dayAbsent = Math.max(0, dayScheduled.length - dayPresent - dayLate);
        trendDays.push({
          label: format(day, "dd/MM"),
          present: dayPresent,
          late: dayLate,
          absent: dayAbsent,
        });
      }

      // Attendance breakdown (totals from last 7 days)
      const totalOnTime = trendDays.reduce((s, d) => s + d.present, 0);
      const totalLate = trendDays.reduce((s, d) => s + d.late, 0);
      const totalAbsent = trendDays.reduce((s, d) => s + d.absent, 0);

      return NextResponse.json({
        role: "admin",
        workforceOverview: {
          totalEmployees: allEmployees.length,
          activeEmployees: activeCount,
          inactiveEmployees: inactiveCount,
          newThisMonth,
        },
        attendanceSummary: {
          present,
          absent,
          late,
          missingCheckIn,
        },
        shiftCoverage,
        pendingRequests: {
          passwordReset: passwordResetPending,
          attendanceCorrection: attendanceCorrectionPending,
          leave: leavePending,
        },
        attendanceTrend: trendDays,
        attendanceBreakdown: {
          onTime: totalOnTime,
          late: totalLate,
          absent: totalAbsent,
        },
      });
    }

    // ========== STAFF DASHBOARD ==========
    if (!employeeId) {
      return NextResponse.json({
        role: "staff",
        message: "No employee linked to account",
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true, position: true },
    });
    if (!employee) {
      return NextResponse.json({ role: "staff", message: "Employee not found" });
    }

    const todaysAssignment = await prisma.shiftAssignment.findFirst({
      where: { employeeId, workDate: today },
      include: { shift: true },
    });

    const todaysAttendance = await prisma.attendance.findUnique({
      where: { employeeId_workDate: { employeeId, workDate: today } },
    });

    const leaveBalance = employee.annualLeaveBalance ?? 12;

    return NextResponse.json({
      role: "staff",
      todaysSchedule: todaysAssignment
        ? {
            date: todaysAssignment.workDate,
            shift: todaysAssignment.shift.name,
            time: `${todaysAssignment.shift.startTime} – ${todaysAssignment.shift.endTime}`,
          }
        : null,
      attendanceStatus: todaysAttendance
        ? {
            checkIn: todaysAttendance.checkIn,
            checkOut: todaysAttendance.checkOut,
            status: todaysAttendance.checkIn ? "Working" : "Not checked in",
          }
        : { checkIn: null, checkOut: null, status: "No record" },
      leaveBalance,
    });
  } catch (e) {
    console.error("Dashboard API error:", e);
    return NextResponse.json(
      { error: "Failed to load dashboard", role: null },
      { status: 500 }
    );
  }
}
