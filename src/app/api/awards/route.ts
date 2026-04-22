import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const showAll = searchParams.get("all") === "true";

  // By default, only show awards from the current month
  let where = {};
  if (!showAll) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    where = {
      awardMonth: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    };
  }

  const awards = await prisma.award.findMany({
    where,
    include: {
      employee: {
        include: {
          department: true,
          position: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(awards);
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { employeeId, title, category, description } = await req.json();

  if (!employeeId || !title) {
    return NextResponse.json({ error: "employeeId and title are required" }, { status: 400 });
  }

  // Check employee exists
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Set awardMonth to the first day of the current month
  const now = new Date();
  const awardMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const award = await prisma.award.create({
    data: {
      employeeId,
      title,
      category: category || null,
      description: description || null,
      awardMonth,
    },
    include: {
      employee: {
        include: {
          department: true,
          position: true,
        },
      },
    },
  });

  return NextResponse.json(award);
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.award.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
