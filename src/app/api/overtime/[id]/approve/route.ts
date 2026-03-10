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
  const { action } = await req.json();
  if (!action || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const overtimeRequest = await prisma.overtimeRequest.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!overtimeRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (overtimeRequest.status !== "pending") {
    return NextResponse.json({ error: "Request already processed" }, { status: 400 });
  }

  if (auth.role === "manager" && auth.employeeId) {
    const manager = await prisma.employee.findUnique({
      where: { id: auth.employeeId },
      select: { departmentId: true },
    });
    if (manager?.departmentId !== overtimeRequest.employee.departmentId) {
      return NextResponse.json(
        { error: "Can only approve overtime for your team" },
        { status: 403 }
      );
    }
  }

  await prisma.overtimeRequest.update({
    where: { id },
    data: {
      status: action === "approve" ? "approved" : "rejected",
      approvedById: auth.userId,
      approvedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    status: action === "approve" ? "approved" : "rejected",
  });
}
