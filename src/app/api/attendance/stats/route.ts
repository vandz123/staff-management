import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek } from "date-fns";

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeIdParam = searchParams.get("employeeId");

  // Determine which employee(s) to query
  let employeeIds: string[] = [];

  if (auth.role === "staff" && auth.employeeId) {
    employeeIds = [auth.employeeId];
  } else if (employeeIdParam) {
    employeeIds = [employeeIdParam];
  } else if (auth.role === "admin") {
    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: { status: "active" },
      select: { id: true },
    });
    employeeIds = employees.map((e) => e.id);
  }

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const results = await Promise.all(
    employeeIds.map(async (empId) => {
      // Total counts
      const totalLate = await prisma.attendance.count({
        where: { employeeId: empId, isLate: true },
      });
      const totalEarlyLeave = await prisma.attendance.count({
        where: { employeeId: empId, isEarlyLeave: true },
      });

      // This week counts
      const weeklyLate = await prisma.attendance.count({
        where: {
          employeeId: empId,
          isLate: true,
          workDate: { gte: weekStart, lte: weekEnd },
        },
      });
      const weeklyEarlyLeave = await prisma.attendance.count({
        where: {
          employeeId: empId,
          isEarlyLeave: true,
          workDate: { gte: weekStart, lte: weekEnd },
        },
      });

      // Violations = weekly (late + earlyLeave) count / 3
      const weeklyViolations = weeklyLate + weeklyEarlyLeave;

      // Count total weeks with 3+ violations
      // Simplified: count all-time violations = (totalLate + totalEarlyLeave) / 3
      const totalViolations = totalLate + totalEarlyLeave;
      const warningCount = Math.floor(totalViolations / 3);

      // Get employee info
      const emp = await prisma.employee.findUnique({
        where: { id: empId },
        select: { employeeCode: true, firstName: true, lastName: true },
      });

      return {
        employeeId: empId,
        employeeCode: emp?.employeeCode,
        name: emp ? `${emp.firstName} ${emp.lastName}` : "",
        totalLate,
        totalEarlyLeave,
        weeklyLate,
        weeklyEarlyLeave,
        weeklyViolations,
        warningCount, // 3 violations = 1 warning
        isWarned: warningCount >= 3,
      };
    })
  );

  // If single employee, return flat object
  if (employeeIds.length === 1) {
    return NextResponse.json(results[0] ?? {});
  }

  return NextResponse.json(results);
}
