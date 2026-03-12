import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { generateTempPassword, hashPassword } from "@/lib/auth";

async function handleGet(req: NextRequest, auth: { role: string; employeeId?: string | null }) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "active";

  let where: Record<string, unknown> =
    status === "all" ? {} : { status: status as "active" | "inactive" };

  // Restrict visibility based on role
  if (auth.role === "manager" && auth.employeeId) {
    const manager = await prisma.employee.findUnique({
      where: { id: auth.employeeId },
      select: { departmentId: true },
    });
    if (manager?.departmentId) {
      where = { ...where, departmentId: manager.departmentId };
    }
  } else if (auth.role === "staff" && auth.employeeId) {
    // Staff only ever sees their own record
    where = { ...where, id: auth.employeeId };
  }

  const employees = await prisma.employee.findMany({
    where,
    include: {
      department: true,
      position: true,
      user: {
        select: {
          role: true,
          username: true,
          status: true,
        },
      },
    },
    orderBy: { lastName: "asc" },
  });
  return NextResponse.json(employees);
}

async function handlePost(
  req: NextRequest,
  auth: { role: string }
) {
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    hireDate,
    departmentId,
    positionId,
    baseSalary,
    role,
    username,
    createLogin,
  } = body;

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
      baseSalary: baseSalary ?? null,
    },
    include: { department: true, position: true },
  });

  const shouldCreateLogin =
    createLogin !== false && (role === "manager" || role === "staff");

  let createdLogin:
    | {
        username: string;
        tempPassword: string;
        role: "admin" | "manager" | "staff";
      }
    | null = null;

  if (shouldCreateLogin) {
    const userRole: "manager" | "staff" =
      role === "manager" ? "manager" : "staff";

    // Generate a unique username if not provided
    let baseUsername =
      (username as string | undefined)?.trim() ||
      (email.includes("@")
        ? email.split("@")[0]
        : `${firstName}.${lastName}`.toLowerCase());
    baseUsername = baseUsername.replace(/\s+/g, ".").toLowerCase();

    let finalUsername = baseUsername;
    let suffix = 1;
    // Ensure uniqueness
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await prisma.user.findUnique({
        where: { username: finalUsername },
        select: { id: true },
      });
      if (!existing) break;
      suffix += 1;
      finalUsername = `${baseUsername}${suffix}`;
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    await prisma.user.create({
      data: {
        username: finalUsername,
        passwordHash,
        role: userRole,
        employeeId: employee.id,
        mustChangePassword: true,
      },
    });

    createdLogin = {
      username: finalUsername,
      tempPassword,
      role: userRole,
    };
  }

  return NextResponse.json({
    employee,
    login: createdLogin,
  });
}

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return handleGet(req, auth);
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return handlePost(req, auth);
}
