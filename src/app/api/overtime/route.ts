import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const myOnly = searchParams.get("mine") === "true";

  const where: Record<string, unknown> = {};
  if (auth.role === "staff" && auth.employeeId) {
    where.employeeId = auth.employeeId;
  } else if (myOnly && auth.employeeId) {
    where.employeeId = auth.employeeId;
  } else if (employeeId) {
    where.employeeId = employeeId;
  }



  const requests = await prisma.overtimeRequest.findMany({
    where,
    include: {
      employee: {
        include: {
          position: { select: { name: true } },
        },
      },
    },
    orderBy: { workDate: "desc" },
  });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.employeeId) {
    return NextResponse.json({ error: "Employee account required" }, { status: 400 });
  }

  const body = await req.json();
  const { workDate, startTime, endTime, reason, hours: legacyHours } = body;

  if (!workDate) {
    return NextResponse.json({ error: "workDate is required" }, { status: 400 });
  }

  let hours: number;

  if (startTime && endTime) {
    // Calculate hours from startTime and endTime
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    // Handle overnight shifts (e.g., 22:00 - 06:00)
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }
    hours = (endMinutes - startMinutes) / 60;
    if (hours <= 0 || hours > 24) {
      return NextResponse.json({ error: "Invalid time range" }, { status: 400 });
    }
  } else if (legacyHours != null) {
    // Legacy support: accept hours directly
    hours = parseFloat(legacyHours);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      return NextResponse.json({ error: "Invalid hours" }, { status: 400 });
    }
  } else {
    return NextResponse.json(
      { error: "startTime and endTime, or hours required" },
      { status: 400 }
    );
  }

  const date = new Date(workDate);
  date.setHours(0, 0, 0, 0);

  const request = await prisma.overtimeRequest.create({
    data: {
      employeeId: auth.employeeId,
      workDate: date,
      hours: Math.round(hours * 10) / 10,
      startTime: startTime || null,
      endTime: endTime || null,
      reason: reason || null,
      status: "pending",
    },
    include: {
      employee: {
        include: {
          position: { select: { name: true } },
        },
      },
    },
  });
  return NextResponse.json(request);
}
