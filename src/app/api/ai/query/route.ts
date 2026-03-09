import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/middleware";

export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question } = await req.json();
  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }

  // Placeholder for RAG integration (OpenAI + vector DB)
  // AI answers only from approved HR documents - restricted knowledge source
  return NextResponse.json({
    answer: `[AI Assistant - RAG not configured]\n\nYour question: "${question}"\n\nTo enable: Add OpenAI API key, configure a vector DB (Pinecone/Weaviate), ingest HR documents, and implement RAG retrieval + generation. Responses will be restricted to approved internal HR documents only.`,
    sources: [],
  });
}
