import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "start and end date required" }, { status: 400 });
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const attendance = await prisma.attendance.findMany({
    where: {
      workDate: { gte: startDate, lte: endDate },
      checkIn: { not: null },
      checkOut: { not: null },
    },
    include: { employee: true },
  });

  const byEmployee: Record<
    string,
    { employee: { id: string; firstName: string; lastName: string; email: string }; totalHours: number; records: number }
  > = {};

  for (const a of attendance) {
    if (!a.checkIn || !a.checkOut) continue;
    const hours = hoursBetween(a.checkIn, a.checkOut);
    const overtime = Math.max(0, hours - 8);
    if (!byEmployee[a.employeeId]) {
      byEmployee[a.employeeId] = {
        employee: {
          id: a.employee.id,
          firstName: a.employee.firstName,
          lastName: a.employee.lastName,
          email: a.employee.email,
        },
        totalHours: 0,
        records: 0,
      };
    }
    byEmployee[a.employeeId].totalHours += hours;
    byEmployee[a.employeeId].records += 1;
  }

  const summary = Object.entries(byEmployee).map(([id, data]) => ({
    employeeId: id,
    ...data,
    overtimeHours: Math.max(0, data.totalHours - data.records * 8),
  }));

  return NextResponse.json({
    startDate: start,
    endDate: end,
    summary,
  });
}
