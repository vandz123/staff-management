import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (auth.role !== "staff" || !auth.employeeId) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }

  // Build UTC midnight for today's local date so PostgreSQL DATE column matches
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const today = new Date(todayStr + "T00:00:00.000Z");

  const assignment = await prisma.shiftAssignment.findFirst({
    where: {
      employeeId: auth.employeeId,
      workDate: today,
    },
    include: { shift: true },
    orderBy: { shift: { endTime: "desc" } }, // latest shift if multiple
  });

  if (!assignment) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    shiftName: assignment.shift.name,
    shiftStartTime: assignment.shift.startTime,
    shiftEndTime: assignment.shift.endTime,
  });
}
