import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = parseTime(start1);
  const e1 = parseTime(end1);
  const s2 = parseTime(start2);
  const e2 = parseTime(end2);
  return s1 < e2 && s2 < e1;
}

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workDate = searchParams.get("workDate");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!workDate) {
    const assignments = await prisma.shiftAssignment.findMany({
      include: { employee: true, shift: true },
      orderBy: [{ workDate: "asc" }, { shiftId: "asc" }],
    });
    return NextResponse.json(assignments);
  }

  const date = new Date(workDate + "T00:00:00.000Z");

  let assignments = await prisma.shiftAssignment.findMany({
    where: { workDate: date },
    include: { employee: true, shift: true },
  });

  if (start && end) {
    assignments = assignments.filter((a) =>
      timesOverlap(a.shift.startTime, a.shift.endTime, start, end)
    );
  }

  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin" && auth.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { employeeId, shiftId, workDate } = await req.json();
  if (!employeeId || !shiftId || !workDate) {
    return NextResponse.json(
      { error: "employeeId, shiftId, workDate required" },
      { status: 400 }
    );
  }

  const date = new Date(workDate + "T00:00:00.000Z");

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

  const existingSameDay = await prisma.shiftAssignment.findMany({
    where: { employeeId, workDate: date },
    include: { shift: true },
  });

  for (const e of existingSameDay) {
    if (timesOverlap(e.shift.startTime, e.shift.endTime, shift.startTime, shift.endTime)) {
      return NextResponse.json(
        {
          error: "Conflict: Employee already assigned to overlapping shift",
          conflictingShift: e.shift.name,
        },
        { status: 409 }
      );
    }
  }

  const assignment = await prisma.shiftAssignment.create({
    data: {
      employeeId,
      shiftId,
      workDate: date,
      assignedById: auth.userId,
    },
    include: { employee: true, shift: true },
  });
  return NextResponse.json(assignment);
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin" && auth.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.shiftAssignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
