import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trainings = await prisma.training.findMany({
    include: {
      employeeTrainings: {
        include: { employee: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(trainings);
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title, description, deadline } = await req.json();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const training = await prisma.training.create({
    data: {
      title,
      description: description || null,
      deadline: deadline ? new Date(deadline) : null,
    },
  });
  return NextResponse.json(training);
}
