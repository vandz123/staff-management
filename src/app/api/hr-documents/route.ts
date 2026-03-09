import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docs = await prisma.hrDocument.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title, fileUrl } = await req.json();
  if (!title || !fileUrl) {
    return NextResponse.json({ error: "title, fileUrl required" }, { status: 400 });
  }

  const doc = await prisma.hrDocument.create({
    data: { title, fileUrl, approvedBy: auth.userId },
  });
  return NextResponse.json(doc);
}
