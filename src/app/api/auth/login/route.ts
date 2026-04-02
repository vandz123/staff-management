import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken } from "@/lib/auth";

const LOGIN_ATTEMPT_LIMIT = 5;
const LOCKOUT_MINUTES = 10;

function isValidEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const usernameOrEmail = (body.username ?? body.email ?? "").trim();
    const password = body.password;

    if (!usernameOrEmail || !password) {
      return NextResponse.json(
        { error: "Please enter a valid email/username and password." },
        { status: 400 }
      );
    }

    if (usernameOrEmail.includes("@") && !isValidEmail(usernameOrEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email and password." },
        { status: 400 }
      );
    }

    let user = await prisma.user.findFirst({
      where: usernameOrEmail.includes("@")
        ? { employee: { email: usernameOrEmail } }
        : { username: usernameOrEmail },
      include: { employee: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { error: "Account temporarily locked. Try again later." },
        { status: 403 }
      );
    }

    if (user.status !== "active") {
      return NextResponse.json(
        { error: "Your account is inactive. Please contact HR." },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const attempts = (user.loginAttempts ?? 0) + 1;
      const update: { loginAttempts: number; lockedUntil?: Date } = {
        loginAttempts: attempts,
      };
      if (attempts >= LOGIN_ATTEMPT_LIMIT) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_MINUTES);
        update.lockedUntil = lockUntil;
      }
      await prisma.user.update({
        where: { id: user.id },
        data: update,
      });
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    const token = await createToken({
      userId: user.id,
      username: user.username,
      role: user.role as "admin" | "staff",
      employeeId: user.employeeId ?? undefined,
      mustChangePassword: user.mustChangePassword ?? undefined,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employeeId: user.employeeId,
        mustChangePassword: user.mustChangePassword ?? false,
        employee: user.employee
          ? {
              id: user.employee.id,
              firstName: user.employee.firstName,
              lastName: user.employee.lastName,
              email: user.employee.email,
            }
          : null,
      },
    });
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
