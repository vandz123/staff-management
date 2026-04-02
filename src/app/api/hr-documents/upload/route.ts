import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "documents");

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const category = formData.get("category") as string | null;
    const content = formData.get("content") as string | null;
    const isRestricted = formData.get("isRestricted") === "true";

    if (!title) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    let fileUrl = `/policies/${title.toLowerCase().replace(/\s+/g, "-")}`;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;

    if (file && file.size > 0) {
      // Ensure upload directory exists
      await mkdir(UPLOAD_DIR, { recursive: true });

      // Generate unique filename
      const ext = path.extname(file.name);
      const baseName = path.basename(file.name, ext);
      const safeName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const uniqueName = `${safeName}_${Date.now()}${ext}`;
      const filePath = path.join(UPLOAD_DIR, uniqueName);

      // Write file to disk
      const bytes = await file.arrayBuffer();
      await writeFile(filePath, Buffer.from(bytes));

      fileUrl = `/uploads/documents/${uniqueName}`;
      fileName = file.name;
      fileSize = file.size;
      mimeType = file.type || null;
    }

    const doc = await prisma.hrDocument.create({
      data: {
        title,
        content: content || null,
        category: category || null,
        fileUrl,
        fileName,
        fileSize,
        mimeType,
        isRestricted,
        approvedBy: auth.userId,
      },
    });

    return NextResponse.json(doc);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
