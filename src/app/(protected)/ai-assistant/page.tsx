"use client";

import { useState } from "react";
import api from "@/lib/api";
import { MessageCircle, Send, FileText, User, Bot } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  text: string;
  sources?: string[];
};

export default function AiAssistantPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const { data } = await api.post<{ answer: string; sources: string[] }>("/ai/query", {
        question: q,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.answer, sources: data.sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Error communicating with the assistant. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">HR Assistant</h1>
        <p className="text-sm text-slate-500">
          Ask HR-related questions. The AI answers using approved internal HR documents and system data.
        </p>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <MessageCircle className="mb-3 h-12 w-12" />
            <p className="text-lg font-medium">How can I help you?</p>
            <p className="mt-1 text-sm">Try asking about leave policies, attendance rules, or overtime.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                "What is the leave policy?",
                "How is overtime calculated?",
                "What are the attendance rules?",
                "Show employees with pending training",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setQuestion(q);
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100">
                  <Bot className="h-4 w-4 text-primary-600" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  m.role === "user"
                    ? "bg-primary-600 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {m.text}
                </pre>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 border-t border-slate-200 pt-2">
                    <p className="mb-1 text-xs font-medium text-slate-500">Sources:</p>
                    <div className="flex flex-wrap gap-1">
                      {m.sources.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-xs text-primary-700 shadow-sm"
                        >
                          <FileText className="h-3 w-3" />
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {m.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200">
                  <User className="h-4 w-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100">
                <Bot className="h-4 w-4 text-primary-600" />
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                Thinking...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Ask a question about HR policies, attendance, leave, overtime..."
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none"
          disabled={loading}
        />
        <button
          onClick={ask}
          disabled={loading || !question.trim()}
          className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
