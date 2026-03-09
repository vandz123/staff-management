import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeTrainingId } = await req.json();
  if (!employeeTrainingId) {
    return NextResponse.json({ error: "employeeTrainingId required" }, { status: 400 });
  }

  const et = await prisma.employeeTraining.findUnique({
    where: { id: employeeTrainingId },
  });
  if (!et) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (auth.role === "staff" && et.employeeId !== auth.employeeId) {
    return NextResponse.json({ error: "Can only complete own training" }, { status: 403 });
  }

  const updated = await prisma.employeeTraining.update({
    where: { id: employeeTrainingId },
    data: { status: "completed", completionDate: new Date() },
    include: { employee: true, training: true },
  });
  return NextResponse.json(updated);
}
