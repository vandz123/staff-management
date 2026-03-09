import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const edits = await prisma.attendanceEdit.findMany({
    include: {
      attendance: { include: { employee: true } },
      editedBy: true,
    },
    orderBy: { editedAt: "desc" },
    take: 100,
  });
  return NextResponse.json(edits);
}
