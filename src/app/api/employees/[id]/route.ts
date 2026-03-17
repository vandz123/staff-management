import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { department: true, position: true },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(employee);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, any> = {};
  if (body.firstName !== undefined) data.firstName = body.firstName;
  if (body.lastName !== undefined) data.lastName = body.lastName;
  if (body.email !== undefined) data.email = body.email;
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.address !== undefined) data.address = body.address;
  if (body.dateOfBirth !== undefined) data.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
  if (body.contractEndDate !== undefined) data.contractEndDate = body.contractEndDate ? new Date(body.contractEndDate) : null;
  if (body.hireDate !== undefined) data.hireDate = new Date(body.hireDate);
  if (body.departmentId !== undefined) data.departmentId = body.departmentId;
  if (body.positionId !== undefined) data.positionId = body.positionId;
  if (body.status !== undefined) data.status = body.status;

  const employee = await prisma.employee.update({
    where: { id },
    data,
    include: { department: true, position: true },
  });
  return NextResponse.json(employee);
}
