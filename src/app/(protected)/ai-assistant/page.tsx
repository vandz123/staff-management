"use client";

import { useState } from "react";
import api from "@/lib/api";
import { MessageCircle, Send } from "lucide-react";

export default function AiAssistantPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const { data } = await api.post<{ answer: string }>("/ai/query", {
        question: question.trim(),
      });
      setAnswer(data.answer);
    } catch (err) {
      setAnswer("Error asking the assistant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">HR Assistant</h1>
      <p className="mb-4 text-slate-600">
        Ask HR-related questions. The AI answers only using approved internal HR documents.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="e.g. How many days of annual leave do I have?"
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
        />
        <button
          onClick={ask}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Ask
        </button>
      </div>
      {loading && (
        <div className="mt-4 flex items-center gap-2 text-slate-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          Thinking...
        </div>
      )}
      {answer && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-primary-600">
            <MessageCircle className="h-5 w-5" />
            <span className="font-medium">Response</span>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-slate-700">{answer}</pre>
        </div>
      )}
    </div>
  );
}
