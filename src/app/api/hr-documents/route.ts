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

  const { title, content, category, fileUrl } = await req.json();
  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const doc = await prisma.hrDocument.create({
    data: {
      title,
      content: content || null,
      category: category || null,
      fileUrl: fileUrl || `/policies/${title.toLowerCase().replace(/\s+/g, "-")}`,
      approvedBy: auth.userId,
    },
  });
  return NextResponse.json(doc);
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.hrDocument.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
