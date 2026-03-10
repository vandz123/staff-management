import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const startDate = startParam ? new Date(startParam) : subDays(today, 13);
  const endDate = endParam ? new Date(endParam) : new Date(today);
  startDate.setHours(0, 0, 0, 0);

  let targetEmployeeId = employeeId;
  if (auth.role === "staff" && auth.employeeId) {
    targetEmployeeId = auth.employeeId;
  }

  if (!targetEmployeeId) {
    return NextResponse.json(
      { error: "Employee ID required for payroll summary" },
      { status: 400 }
    );
  }

  if (auth.role === "staff" && targetEmployeeId !== auth.employeeId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    (auth.role === "manager" || auth.role === "admin") &&
    targetEmployeeId !== auth.employeeId
  ) {
    const emp = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { departmentId: true },
    });
    if (auth.role === "manager" && auth.employeeId) {
      const manager = await prisma.employee.findUnique({
        where: { id: auth.employeeId },
        select: { departmentId: true },
      });
      if (manager?.departmentId !== emp?.departmentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  const employee = await prisma.employee.findUnique({
    where: { id: targetEmployeeId },
    select: { baseSalary: true, firstName: true, lastName: true },
  });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const baseSalary = employee.baseSalary ?? 0;
  const hourlyRate = baseSalary > 0 ? baseSalary / (22 * 8) : 0;

  const attendance = await prisma.attendance.findMany({
    where: {
      employeeId: targetEmployeeId,
      workDate: { gte: startDate, lte: endDate },
      checkIn: { not: null },
      checkOut: { not: null },
    },
  });

  let totalHours = 0;
  let overtimeHours = 0;
  const dailyBreakdown: Array<{ date: string; hours: number; overtime: number; regular: number }> = [];

  for (const a of attendance) {
    if (!a.checkIn || !a.checkOut) continue;
    const hours = hoursBetween(a.checkIn, a.checkOut);
    const regular = Math.min(hours, 8);
    const ot = Math.max(0, hours - 8);
    totalHours += hours;
    overtimeHours += ot;
    dailyBreakdown.push({
      date: a.workDate.toISOString().split("T")[0],
      hours,
      overtime: ot,
      regular,
    });
  }

  const regularPay = Math.round(
    (totalHours - overtimeHours) * hourlyRate
  );
  const overtimePay = Math.round(overtimeHours * hourlyRate * 1.5);
  const estimatedTotal = regularPay + overtimePay;

  const approvedOvertime = await prisma.overtimeRequest.findMany({
    where: {
      employeeId: targetEmployeeId,
      workDate: { gte: startDate, lte: endDate },
      status: "approved",
    },
  });
  const approvedOTHours = approvedOvertime.reduce((s, o) => s + o.hours, 0);
  const approvedOTPay = Math.round(approvedOTHours * hourlyRate * 1.5);

  return NextResponse.json({
    employee: `${employee.firstName} ${employee.lastName}`,
    period: { start: startDate.toISOString().split("T")[0], end: endDate.toISOString().split("T")[0] },
    baseSalary,
    hourlyRate: Math.round(hourlyRate),
    totalHours: Math.round(totalHours * 10) / 10,
    overtimeHours: Math.round(overtimeHours * 10) / 10,
    regularPay,
    overtimePay,
    approvedOvertimeHours: approvedOTHours,
    approvedOvertimePay: approvedOTPay,
    estimatedTotal,
    dailyBreakdown,
  });
}
