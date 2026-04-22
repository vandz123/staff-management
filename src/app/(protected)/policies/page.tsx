"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
  File,
  Search,
  ArrowUpAZ,
  ArrowDownAZ,
  SlidersHorizontal,
  CalendarDays,
  HardDrive,
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

  // Enhanced filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [fileSizeFilter, setFileSizeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "none">("none");
  const [showFilters, setShowFilters] = useState(false);

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

  // Apply all filters
  const filteredDocs = useMemo(() => {
    let result = [...docs];

    // Category filter
    if (activeCategory !== "all") {
      result = result.filter((d) => d.category === activeCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((d) =>
        d.title.toLowerCase().includes(query) ||
        d.fileName?.toLowerCase().includes(query) ||
        d.content?.toLowerCase().includes(query)
      );
    }

    // File size filter
    if (fileSizeFilter !== "all") {
      result = result.filter((d) => {
        const size = d.fileSize || 0;
        switch (fileSizeFilter) {
          case "small": return size > 0 && size < 1024 * 1024;
          case "medium": return size >= 1024 * 1024 && size <= 5 * 1024 * 1024;
          case "large": return size > 5 * 1024 * 1024;
          default: return true;
        }
      });
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((d) => new Date(d.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((d) => new Date(d.createdAt) <= to);
    }

    // Sort by name
    if (sortOrder !== "none") {
      result.sort((a, b) => {
        const cmp = a.title.localeCompare(b.title, "vi");
        return sortOrder === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [docs, activeCategory, searchQuery, fileSizeFilter, dateFrom, dateTo, sortOrder]);

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

  const clearFilters = () => {
    setSearchQuery("");
    setFileSizeFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortOrder("none");
    setActiveCategory("all");
  };

  const hasActiveFilters = searchQuery || fileSizeFilter !== "all" || dateFrom || dateTo || sortOrder !== "none";

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

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm tài liệu theo tên, nội dung..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Filter Controls Row */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Toggle advanced filters */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            showFilters || hasActiveFilters
              ? "bg-primary-100 text-primary-700 border border-primary-200"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Bộ lọc nâng cao
          {hasActiveFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs text-white">
              !
            </span>
          )}
        </button>

        {/* Sort button */}
        <button
          onClick={() => {
            setSortOrder((prev) =>
              prev === "none" ? "asc" : prev === "asc" ? "desc" : "none"
            );
          }}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            sortOrder !== "none"
              ? "bg-blue-100 text-blue-700 border border-blue-200"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {sortOrder === "desc" ? (
            <ArrowDownAZ className="h-4 w-4" />
          ) : (
            <ArrowUpAZ className="h-4 w-4" />
          )}
          {sortOrder === "none" ? "Sắp xếp A→Z" : sortOrder === "asc" ? "A → Z" : "Z → A"}
        </button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <X className="h-4 w-4" />
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Advanced Filter Panel */}
      {showFilters && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* File Size Filter */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <HardDrive className="h-4 w-4 text-slate-400" />
                Kích thước file
              </label>
              <select
                value={fileSizeFilter}
                onChange={(e) => setFileSizeFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 outline-none"
              >
                <option value="all">Tất cả</option>
                <option value="small">&lt; 1 MB</option>
                <option value="medium">1 - 5 MB</option>
                <option value="large">&gt; 5 MB</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                Từ ngày
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 outline-none"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                Đến ngày
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
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

      {/* Results count */}
      {hasActiveFilters && (
        <p className="mb-4 text-sm text-slate-500">
          Tìm thấy <span className="font-semibold text-slate-700">{filteredDocs.length}</span> tài liệu
          {searchQuery && <> cho &ldquo;<span className="font-medium text-primary-600">{searchQuery}</span>&rdquo;</>}
        </p>
      )}

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
          <p>{searchQuery ? `Không tìm thấy tài liệu cho "${searchQuery}"` : activeCategory === "all" ? "Chưa có tài liệu chính sách nào" : `Chưa có tài liệu trong danh mục "${activeCategory}"`}</p>
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
