"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { FileText, Plus, Trash2, ChevronDown, ChevronRight, Search } from "lucide-react";

type Doc = {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  fileUrl: string;
  createdAt: string;
};

export default function PoliciesPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    api.get<Doc[]>("/hr-documents").then((r) => setDocs(r.data)).catch(console.error);
  }, []);

  const categories = ["all", ...Array.from(new Set(docs.map((d) => d.category || "Uncategorized")))];

  const filtered = docs.filter((d) => {
    const catMatch = filter === "all" || (d.category || "Uncategorized") === filter;
    const searchMatch =
      !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      (d.content || "").toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      await api.post("/hr-documents", {
        title: newTitle.trim(),
        category: newCategory.trim() || null,
        content: newContent.trim() || null,
      });
      const { data } = await api.get<Doc[]>("/hr-documents");
      setDocs(data);
      setNewTitle("");
      setNewCategory("");
      setNewContent("");
      setShowCreate(false);
    } catch {
      alert("Failed to create document");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this policy document?")) return;
    try {
      await api.delete(`/hr-documents?id=${id}`);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch {
      alert("Failed to delete");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Policy Documents</h1>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Add Policy
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && isAdmin && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-800">New Policy Document</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Title *</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                placeholder="e.g. Data Security Policy"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Category</label>
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                placeholder="e.g. HR Policies"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-600">Content</label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              placeholder="Enter the full policy text..."
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !newTitle.trim()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Create Policy"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search policies..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                filter === cat
                  ? "bg-primary-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Document list */}
      <div className="space-y-3">
        {filtered.map((d) => {
          const isExpanded = expandedId === d.id;
          return (
            <div
              key={d.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div
                className="flex cursor-pointer items-center justify-between p-4 hover:bg-slate-50"
                onClick={() => setExpandedId(isExpanded ? null : d.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-800">{d.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {d.category && (
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">
                          {d.category}
                        </span>
                      )}
                      <span>{format(new Date(d.createdAt), "d MMM yyyy")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(d.id);
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50 p-6">
                  {d.content ? (
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
                      {d.content}
                    </pre>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No content available.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-slate-500">No policy documents found.</p>
        )}
      </div>
    </div>
  );
}
