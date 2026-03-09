import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shifts = await prisma.shift.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(shifts);
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, startTime, endTime, requiredStaff } = await req.json();
  if (!name || !startTime || !endTime) {
    return NextResponse.json({ error: "name, startTime, endTime required" }, { status: 400 });
  }
  const shift = await prisma.shift.create({
    data: {
      name,
      startTime,
      endTime,
      requiredStaff: requiredStaff ?? 1,
    },
  });
  return NextResponse.json(shift);
}
