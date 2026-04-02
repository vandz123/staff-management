import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { employeeId, trainingId } = await req.json();
  if (!employeeId || !trainingId) {
    return NextResponse.json({ error: "employeeId, trainingId required" }, { status: 400 });
  }

  const et = await prisma.employeeTraining.upsert({
    where: {
      employeeId_trainingId: { employeeId, trainingId },
    },
    create: { employeeId, trainingId, status: "pending" },
    update: {},
    include: { employee: true, training: true },
  });
  return NextResponse.json(et);
}
