import { NextRequest, NextResponse } from "next/server";
import { getAuth, requireRole } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

async function handleGet(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "active";
  const employees = await prisma.employee.findMany({
    where: status === "all" ? {} : { status: status as "active" | "inactive" },
    include: { department: true, position: true },
    orderBy: { lastName: "asc" },
  });
  return NextResponse.json(employees);
}

async function handlePost(req: NextRequest, auth: { role: string }) {
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { firstName, lastName, email, phone, dateOfBirth, hireDate, departmentId, positionId } =
    body;
  if (!firstName || !lastName || !email || !hireDate) {
    return NextResponse.json(
      { error: "firstName, lastName, email, hireDate required" },
      { status: 400 }
    );
  }
  const employee = await prisma.employee.create({
    data: {
      firstName,
      lastName,
      email,
      phone: phone || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      hireDate: new Date(hireDate),
      departmentId: departmentId || null,
      positionId: positionId || null,
    },
    include: { department: true, position: true },
  });
  return NextResponse.json(employee);
}

export async function GET(req: NextRequest) {
  return handleGet(req);
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return handlePost(req, auth);
}
