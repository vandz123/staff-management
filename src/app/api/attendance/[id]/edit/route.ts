import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin" && auth.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { newCheckIn, newCheckOut, editReason } = await req.json();

  const attendance = await prisma.attendance.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!attendance) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const editorEmployeeId = auth.employeeId;
  if (!editorEmployeeId) {
    return NextResponse.json(
      { error: "Editor must be linked to an employee record for audit" },
      { status: 400 }
    );
  }

  const oldCheckIn = attendance.checkIn;
  const oldCheckOut = attendance.checkOut;

  const [updated, editRecord] = await prisma.$transaction([
    prisma.attendance.update({
      where: { id },
      data: {
        checkIn: newCheckIn ? new Date(newCheckIn) : null,
        checkOut: newCheckOut ? new Date(newCheckOut) : null,
        status: newCheckIn ? "present" : "pending",
      },
      include: { employee: true },
    }),
    prisma.attendanceEdit.create({
      data: {
        attendanceId: id,
        editedById: editorEmployeeId,
        oldCheckIn,
        oldCheckOut,
        newCheckIn: newCheckIn ? new Date(newCheckIn) : null,
        newCheckOut: newCheckOut ? new Date(newCheckOut) : null,
        editReason: editReason || null,
      },
    }),
  ]);

  return NextResponse.json({ attendance: updated, editRecord });
}
