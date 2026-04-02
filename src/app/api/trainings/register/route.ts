import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

// POST /api/trainings/register — staff self-registers for an open training
export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.employeeId) {
    return NextResponse.json({ error: "No employee linked to account" }, { status: 400 });
  }

  const { trainingId } = await req.json();
  if (!trainingId) {
    return NextResponse.json({ error: "trainingId required" }, { status: 400 });
  }

  // Fetch the training
  const training = await prisma.training.findUnique({
    where: { id: trainingId },
    include: { employeeTrainings: true },
  });

  if (!training) {
    return NextResponse.json({ error: "Training not found" }, { status: 404 });
  }

  if (!training.isOpenForRegistration) {
    return NextResponse.json({ error: "This training is not open for registration" }, { status: 400 });
  }

  // Check max participants
  if (training.maxParticipants && training.employeeTrainings.length >= training.maxParticipants) {
    return NextResponse.json({ error: "This training is full" }, { status: 400 });
  }

  // Check if already registered
  const existing = await prisma.employeeTraining.findUnique({
    where: {
      employeeId_trainingId: {
        employeeId: auth.employeeId,
        trainingId,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "You are already registered for this training" }, { status: 400 });
  }

  // Register
  const registration = await prisma.employeeTraining.create({
    data: {
      employeeId: auth.employeeId,
      trainingId,
      status: "pending",
    },
    include: {
      employee: true,
      training: true,
    },
  });

  return NextResponse.json(registration);
}

// DELETE /api/trainings/register — staff unregisters from a training
export async function DELETE(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.employeeId) {
    return NextResponse.json({ error: "No employee linked to account" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const trainingId = searchParams.get("trainingId");
  if (!trainingId) {
    return NextResponse.json({ error: "trainingId required" }, { status: 400 });
  }

  const existing = await prisma.employeeTraining.findUnique({
    where: {
      employeeId_trainingId: {
        employeeId: auth.employeeId,
        trainingId,
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not registered for this training" }, { status: 404 });
  }

  // Only allow unregistering if still pending
  if (existing.status === "completed") {
    return NextResponse.json({ error: "Cannot unregister from a completed training" }, { status: 400 });
  }

  await prisma.employeeTraining.delete({
    where: { id: existing.id },
  });

  return NextResponse.json({ ok: true });
}
