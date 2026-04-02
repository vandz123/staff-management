"use client";

import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  FileText,
  Plus,
  Trash2,
  X,
  Eye,
  Upload,
  Download,
  Lock,
  Filter,
  File,
} from "lucide-react";

type PolicyDoc = {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  isRestricted: boolean;
  createdAt: string;
};

const CATEGORIES = ["HR Policies", "Workplace Rules", "Compensation", "Benefits"];

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PoliciesPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<PolicyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "", isRestricted: false });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewDoc, setViewDoc] = useState<PolicyDoc | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === "admin";

  const fetchDocs = () => {
    setLoading(true);
    api
      .get<PolicyDoc[]>("/hr-documents")
      .then((r) => setDocs(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  // Get unique categories from docs
  const docCategories = Array.from(new Set(docs.map((d) => d.category).filter((c): c is string => !!c)));

  // Filter docs by active category
  const filteredDocs = activeCategory === "all"
    ? docs
    : docs.filter((d) => d.category === activeCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (file) {
        // Upload with file
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", form.title);
        formData.append("content", form.content || "");
        formData.append("category", form.category || "");
        formData.append("isRestricted", form.isRestricted.toString());
        await api.post("/hr-documents/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // Text-only document
        await api.post("/hr-documents", {
          title: form.title,
          content: form.content || null,
          category: form.category || null,
          isRestricted: form.isRestricted,
        });
      }
      setForm({ title: "", content: "", category: "", isRestricted: false });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowForm(false);
      fetchDocs();
    } catch {
      alert("Không thể thêm tài liệu");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa tài liệu này?")) return;
    try {
      await api.delete(`/hr-documents?id=${id}`);
      fetchDocs();
    } catch {
      alert("Không thể xóa");
    }
  };

  const categoryColors: Record<string, string> = {
    "HR Policies": "bg-blue-100 text-blue-700",
    "Workplace Rules": "bg-amber-100 text-amber-700",
    "Compensation": "bg-emerald-100 text-emerald-700",
    "Benefits": "bg-purple-100 text-purple-700",
  };

  const hasFileAttachment = (doc: PolicyDoc) => {
    return doc.fileName || (doc.fileUrl && doc.fileUrl.startsWith("/uploads/"));
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Chính sách công ty</h1>
          <p className="text-sm text-slate-500">Xem các tài liệu chính sách và quy định nội bộ</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Thêm chính sách
          </button>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-slate-400" />
        <button
          onClick={() => setActiveCategory("all")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            activeCategory === "all"
              ? "bg-primary-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Tất cả ({docs.length})
        </button>
        {docCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === cat
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat} ({docs.filter((d) => d.category === cat).length})
          </button>
        ))}
      </div>

      {/* Add Form (Admin only) */}
      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-primary-200 bg-primary-50/30 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Thêm tài liệu chính sách</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tiêu đề *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Ví dụ: Quy định nghỉ phép"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Danh mục</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Chọn danh mục</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* File Upload */}
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Tệp đính kèm</label>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 hover:border-primary-400 hover:bg-primary-50 transition-colors">
                <Upload className="h-4 w-4" />
                {file ? file.name : "Chọn tệp (PDF, DOCX, hình ảnh...)"}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
              {file && (
                <button
                  type="button"
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  Xóa tệp
                </button>
              )}
            </div>
            {file && (
              <p className="mt-1 text-xs text-slate-500">
                {file.name} — {formatFileSize(file.size)}
              </p>
            )}
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Nội dung</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows={6}
              placeholder="Nhập nội dung chính sách (tùy chọn nếu có tệp đính kèm)..."
            />
          </div>

          {/* Restricted toggle */}
          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="isRestricted"
              checked={form.isRestricted}
              onChange={(e) => setForm((f) => ({ ...f, isRestricted: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-primary-600"
            />
            <label htmlFor="isRestricted" className="flex items-center gap-1 text-sm text-slate-700">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              Chỉ Admin xem được (tài liệu hạn chế)
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? "Đang lưu..." : "Lưu chính sách"}
          </button>
        </form>
      )}

      {/* View Modal */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewDoc(null)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{viewDoc.title}</h2>
                <div className="mt-1 flex items-center gap-2">
                  {viewDoc.category && (
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColors[viewDoc.category] ?? "bg-slate-100 text-slate-700"}`}>
                      {viewDoc.category}
                    </span>
                  )}
                  {viewDoc.isRestricted && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      <Lock className="h-3 w-3" /> Restricted
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setViewDoc(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* File download */}
            {hasFileAttachment(viewDoc) && (
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <File className="h-8 w-8 text-primary-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{viewDoc.fileName || "Attached file"}</p>
                  {viewDoc.fileSize && (
                    <p className="text-xs text-slate-500">{formatFileSize(viewDoc.fileSize)}</p>
                  )}
                </div>
                <a
                  href={viewDoc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Tải xuống
                </a>
              </div>
            )}

            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
              {viewDoc.content || "Không có nội dung văn bản."}
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Ngày tạo: {format(new Date(viewDoc.createdAt), "d MMM yyyy")}
            </p>
          </div>
        </div>
      )}

      {/* Policy List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p>{activeCategory === "all" ? "Chưa có tài liệu chính sách nào" : `Chưa có tài liệu trong danh mục "${activeCategory}"`}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="group relative rounded-xl border border-slate-200/60 bg-white/90 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  {hasFileAttachment(doc) ? <File className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div className="flex items-center gap-1">
                  {doc.isRestricted && (
                    <span className="mr-1 flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      <Lock className="h-3 w-3" />
                    </span>
                  )}
                  <button
                    onClick={() => setViewDoc(doc)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    title="Xem chi tiết"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {hasFileAttachment(doc) && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      title="Tải xuống"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <h3 className="mb-1 font-semibold text-slate-800 cursor-pointer hover:text-primary-600" onClick={() => setViewDoc(doc)}>
                {doc.title}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                {doc.category && (
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${categoryColors[doc.category] ?? "bg-slate-100 text-slate-700"}`}>
                    {doc.category}
                  </span>
                )}
                {hasFileAttachment(doc) && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    <File className="h-3 w-3" />
                    {doc.fileName || "File"}
                    {doc.fileSize && ` (${formatFileSize(doc.fileSize)})`}
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-400 line-clamp-2">
                {doc.content?.slice(0, 100) || "Không có mô tả"}
              </p>
              <p className="mt-2 text-xs text-slate-400">{format(new Date(doc.createdAt), "d MMM yyyy")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
