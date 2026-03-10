import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { subDays, startOfMonth, endOfMonth } from "date-fns";

function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
  today.setHours(0, 0, 0, 0);
  const payPeriodStart = subDays(today, 14);
  const payPeriodEnd = new Date(today);
  payPeriodEnd.setHours(23, 59, 59, 999);

  const role = auth.role;
  const employeeId = auth.employeeId;

  // Get manager's department
  let managerDeptId: string | null = null;
  if (role === "manager" && employeeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { departmentId: true },
    });
    managerDeptId = emp?.departmentId ?? null;
  }

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
    const totalExpected = await prisma.shiftAssignment.count({
      where: { workDate: today },
      distinct: ["employeeId"],
    });
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

    // Payroll estimate (current pay period)
    const attendanceForPayroll = await prisma.attendance.findMany({
      where: {
        workDate: { gte: payPeriodStart, lte: payPeriodEnd },
        checkIn: { not: null },
        checkOut: { not: null },
      },
      include: { employee: { select: { baseSalary: true, departmentId: true } } },
    });
    const overtimeMultiplier = 1.5;
    const hourlyRates: Record<string, number> = {};
    const employeesWithSalary = await prisma.employee.findMany({
      where: { baseSalary: { not: null } },
      select: { id: true, baseSalary: true },
    });
    employeesWithSalary.forEach((e) => {
      if (e.baseSalary) hourlyRates[e.id] = e.baseSalary / (22 * 8);
    });
    let totalPayroll = 0;
    let totalOvertimeHours = 0;
    const deptOvertime: Record<string, number> = {};
    for (const a of attendanceForPayroll) {
      if (!a.checkIn || !a.checkOut) continue;
      const hours = hoursBetween(a.checkIn, a.checkOut);
      const regularHours = Math.min(hours, 8);
      const otHours = Math.max(0, hours - 8);
      const rate = hourlyRates[a.employeeId] ?? 0;
      totalPayroll += regularHours * rate + otHours * rate * overtimeMultiplier;
      totalOvertimeHours += otHours;
      const dept = a.employee.departmentId ?? "unknown";
      deptOvertime[dept] = (deptOvertime[dept] ?? 0) + otHours;
    }
    const highestOTDept = Object.entries(deptOvertime).sort((a, b) => b[1] - a[1])[0];
    const deptNames = await prisma.department.findMany({ select: { id: true, name: true } });
    const deptMap: Record<string, string> = Object.fromEntries(
      deptNames.map((d) => [d.id, d.name])
    );

    // Training status
    const allET = await prisma.employeeTraining.findMany({
      include: { training: { select: { deadline: true } } },
    });
    const completed = allET.filter((et) => et.status === "completed").length;
    const pending = allET.filter(
      (et) => et.status === "pending" && (!et.training.deadline || et.training.deadline >= today)
    ).length;
    const overdue = allET.filter(
      (et) => et.status === "pending" && et.training.deadline && et.training.deadline < today
    ).length;

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
      payrollOverview: {
        totalPayroll: Math.round(totalPayroll),
        totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
        highestOTDept: highestOTDept ? deptMap[highestOTDept[0]] ?? "—" : "—",
      },
      trainingStatus: { completed, pending, overdue },
      pendingRequests: {
        passwordReset: passwordResetPending,
        attendanceCorrection: attendanceCorrectionPending,
        leave: leavePending,
      },
    });
  }

  if (role === "manager" && managerDeptId) {
    // ========== MANAGER DASHBOARD ==========
    const teamEmployees = await prisma.employee.findMany({
      where: { departmentId: managerDeptId, status: "active" },
      select: { id: true, firstName: true, lastName: true },
    });
    const teamIds = teamEmployees.map((e) => e.id);

    const teamAttendance = await prisma.attendance.findMany({
      where: { workDate: today, employeeId: { in: teamIds } },
      include: { employee: true },
    });
    const present = teamAttendance.filter((a) => a.checkIn).length;
    const absent = teamIds.length - present;
    const late = 0;

    const teamShiftToday = await prisma.shiftAssignment.findMany({
      where: { workDate: today, employeeId: { in: teamIds } },
      include: { employee: true, shift: true },
    });

    const missingCheckIn = teamAttendance.filter((a) => !a.checkIn && a.status === "pending");
    const correctionRequests = await prisma.attendanceCorrectionRequest.findMany({
      where: { employeeId: { in: teamIds }, status: "pending" },
      include: { employee: true },
    });

    const shiftsInDept = await prisma.shift.findMany({
      include: {
        assignments: {
          where: {
            workDate: today,
            employee: { departmentId: managerDeptId },
          },
          select: { employeeId: true },
        },
      },
    });
    const shiftCoverage = shiftsInDept.map((s) => ({
      name: s.name,
      required: s.requiredStaff,
      assigned: s.assignments.length,
    }));

    const teamTrainings = await prisma.employeeTraining.findMany({
      where: { employeeId: { in: teamIds } },
      include: { employee: true, training: true },
    });

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: { employee: { departmentId: managerDeptId }, status: "pending" },
      include: { employee: true },
      orderBy: { createdAt: "desc" },
    });

    const overtimeRequests = await prisma.overtimeRequest.findMany({
      where: { employee: { departmentId: managerDeptId }, status: "pending" },
      include: { employee: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      role: "manager",
      teamOverview: {
        teamSize: teamIds.length,
        presentToday: present,
        absent: absent,
        late,
      },
      teamShiftSchedule: teamShiftToday.map((a) => ({
        employee: `${a.employee.firstName} ${a.employee.lastName}`,
        shift: a.shift.name,
        time: `${a.shift.startTime} – ${a.shift.endTime}`,
      })),
      attendanceAlerts: [
        ...missingCheckIn.map((a) => ({
          issue: "Missing Check-In",
          employee: `${a.employee.firstName} ${a.employee.lastName}`,
        })),
        ...correctionRequests.map((c) => ({
          issue: "Correction Request",
          employee: `${c.employee.firstName} ${c.employee.lastName}`,
        })),
      ],
      shiftCoverageWarning: shiftCoverage.filter((s) => s.assigned < s.required),
      trainingProgress: teamTrainings.map((et) => ({
        employee: `${et.employee.firstName} ${et.employee.lastName}`,
        training: et.training.title,
        status:
          et.status === "completed"
            ? "Completed"
            : et.training.deadline && et.training.deadline < today
              ? "Overdue"
              : "Pending",
      })),
      pendingApprovals: {
        leave: leaveRequests.map((l) => ({
          id: l.id,
          employee: `${l.employee.firstName} ${l.employee.lastName}`,
          type: l.leaveType,
          startDate: l.startDate,
          endDate: l.endDate,
        })),
        overtime: overtimeRequests.map((o) => ({
          id: o.id,
          employee: `${o.employee.firstName} ${o.employee.lastName}`,
          hours: o.hours,
          date: o.workDate,
        })),
        attendanceCorrection: correctionRequests.map((c) => ({
          id: c.id,
          employee: `${c.employee.firstName} ${c.employee.lastName}`,
        })),
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

  const payPeriodAttendance = await prisma.attendance.findMany({
    where: {
      employeeId,
      workDate: { gte: payPeriodStart, lte: payPeriodEnd },
      checkIn: { not: null },
      checkOut: { not: null },
    },
  });
  let totalHours = 0;
  let overtimeHours = 0;
  for (const a of payPeriodAttendance) {
    if (!a.checkIn || !a.checkOut) continue;
    const h = hoursBetween(a.checkIn, a.checkOut);
    totalHours += h;
    overtimeHours += Math.max(0, h - 8);
  }

  const baseSalary = employee.baseSalary ?? 0;
  const hourlyRate = baseSalary > 0 ? baseSalary / (22 * 8) : 0;
  const overtimePay = Math.round(overtimeHours * hourlyRate * 1.5);
  const estimatedTotal = baseSalary + overtimePay;

  const myTrainings = await prisma.employeeTraining.findMany({
    where: { employeeId },
    include: { training: true },
    orderBy: { training: { deadline: "asc" } },
  });

  const leaveBalance = employee.annualLeaveBalance ?? 12;
  const myLeaveRequests = await prisma.leaveRequest.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

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
    workHoursSummary: {
      totalHours: Math.round(totalHours * 10) / 10,
      overtime: Math.round(overtimeHours * 10) / 10,
      payPeriodStart,
      payPeriodEnd,
    },
    payrollEstimate: {
      baseSalary,
      overtimePay,
      deductions: 0,
      estimatedTotal,
    },
    trainingTasks: myTrainings.map((et) => ({
      id: et.id,
      training: et.training.title,
      deadline: et.training.deadline,
      status: et.status,
    })),
    leaveBalance,
    recentLeaveRequests: myLeaveRequests,
  });
  } catch (e) {
    console.error("Dashboard API error:", e);
    return NextResponse.json(
      { error: "Failed to load dashboard", role: null },
      { status: 500 }
    );
  }
}
