"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type Doc = { id: string; title: string; fileUrl: string; createdAt: string };

export default function PoliciesPage() {
  const [docs, setDocs] = useState<Doc[]>([]);

  useEffect(() => {
    api.get<Doc[]>("/hr-documents").then((r) => setDocs(r.data)).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Policy Documents</h1>
      <div className="space-y-2">
        {docs.map((d) => (
          <a
            key={d.id}
            href={d.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
          >
            <span className="font-medium">{d.title}</span>
            <span className="ml-2 text-sm text-slate-500">{d.fileUrl}</span>
          </a>
        ))}
        {docs.length === 0 && <p className="text-slate-500">No policy documents yet.</p>}
      </div>
    </div>
  );
}
