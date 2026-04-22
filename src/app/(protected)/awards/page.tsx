"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import {
  Trophy,
  Plus,
  X,
  Trash2,
  Star,
  Award as AwardIcon,
  Sparkles,
  History,
  Crown,
} from "lucide-react";

type Employee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department?: { name: string } | null;
  position?: { name: string } | null;
};

type Award = {
  id: string;
  employeeId: string;
  title: string;
  category: string | null;
  description: string | null;
  awardMonth: string;
  createdAt: string;
  employee: Employee;
};

const AWARD_CATEGORIES = [
  "Best Employee",
  "Most Contribution",
  "Team Spirit",
  "Most Creative",
  "Best Newcomer",
  "Leadership Excellence",
];

const categoryIcons: Record<string, React.ElementType> = {
  "Best Employee": Crown,
  "Most Contribution": Star,
  "Team Spirit": Sparkles,
  "Most Creative": AwardIcon,
  "Best Newcomer": Trophy,
  "Leadership Excellence": Crown,
};

const categoryGradients: Record<string, string> = {
  "Best Employee": "from-amber-400 via-yellow-500 to-orange-500",
  "Most Contribution": "from-emerald-400 via-green-500 to-teal-500",
  "Team Spirit": "from-blue-400 via-indigo-500 to-purple-500",
  "Most Creative": "from-pink-400 via-rose-500 to-red-500",
  "Best Newcomer": "from-cyan-400 via-sky-500 to-blue-500",
  "Leadership Excellence": "from-violet-400 via-purple-500 to-indigo-500",
};

export default function AwardsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === "admin";

  const [awards, setAwards] = useState<Award[]>([]);
  const [allAwards, setAllAwards] = useState<Award[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    employeeId: "",
    title: "",
    category: "",
    description: "",
  });

  const fetchAwards = () => {
    setLoading(true);
    api
      .get<Award[]>("/awards")
      .then((r) => setAwards(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchHistory = () => {
    api
      .get<Award[]>("/awards?all=true")
      .then((r) => setAllAwards(r.data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchAwards();
    if (isAdmin) {
      api.get<Employee[]>("/employees", { params: { status: "active" } }).then((r) => setEmployees(r.data));
    }
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/awards", {
        employeeId: form.employeeId,
        title: form.title,
        category: form.category || null,
        description: form.description || null,
      });
      setForm({ employeeId: "", title: "", category: "", description: "" });
      setShowForm(false);
      fetchAwards();
    } catch {
      alert("Không thể tạo giải thưởng");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa giải thưởng này?")) return;
    try {
      await api.delete(`/awards?id=${id}`);
      fetchAwards();
      if (showHistory) fetchHistory();
    } catch {
      alert("Không thể xóa");
    }
  };

  const currentMonth = format(new Date(), "MMMM yyyy");

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                <Trophy className="h-5 w-5" />
              </div>
              {t("awards.title")}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{t("awards.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) fetchHistory();
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                showHistory
                  ? "bg-slate-200 text-slate-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <History className="h-4 w-4" />
              {t("awards.history")}
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="h-4 w-4" />
                {t("awards.create")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Month Banner */}
      {!showHistory && (
        <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-[2px]">
          <div className="rounded-[14px] bg-white px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wider text-orange-500">
                  {t("awards.monthlyRecognition")}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-800">{currentMonth}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {awards.length} {t("awards.employeesRecognized")}
                </p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl">
                <Crown className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Award Form */}
      {showForm && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <Trophy className="h-5 w-5 text-amber-500" />
                {t("awards.createNew")}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t("awards.selectEmployee")} *</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                  required
                >
                  <option value="">{t("awards.chooseEmployee")}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeCode} — {emp.firstName} {emp.lastName}
                      {emp.department ? ` (${emp.department.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t("awards.awardTitle")} *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                  placeholder={t("awards.titlePlaceholder")}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t("awards.category")}</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                >
                  <option value="">{t("awards.selectCategory")}</option>
                  {AWARD_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t("awards.description")}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                  rows={4}
                  placeholder={t("awards.descriptionPlaceholder")}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  {t("emp.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting ? t("awards.saving") : t("awards.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Current Month Awards */}
      {!showHistory && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
          ) : awards.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
              <Trophy className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <p className="text-lg font-medium text-slate-500">{t("awards.noAwards")}</p>
              <p className="mt-1 text-sm text-slate-400">{t("awards.noAwardsDesc")}</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {awards.map((award) => {
                const IconComp = categoryIcons[award.category || ""] || Trophy;
                const gradient = categoryGradients[award.category || ""] || "from-amber-400 to-orange-500";
                return (
                  <div
                    key={award.id}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all hover:shadow-xl hover:-translate-y-1"
                  >
                    {/* Gradient Top Bar */}
                    <div className={`h-2 bg-gradient-to-r ${gradient}`} />

                    <div className="p-6">
                      {/* Icon & Category */}
                      <div className="mb-4 flex items-start justify-between">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
                          <IconComp className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex items-center gap-1">
                          {award.category && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                              {award.category}
                            </span>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(award.id)}
                              className="rounded-lg p-1.5 text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="mb-3 text-lg font-bold text-slate-800">{award.title}</h3>

                      {/* Employee Info */}
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-bold text-slate-600">
                          {award.employee.firstName[0]}{award.employee.lastName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {award.employee.firstName} {award.employee.lastName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {award.employee.employeeCode}
                            {award.employee.department && ` · ${award.employee.department.name}`}
                            {award.employee.position && ` · ${award.employee.position.name}`}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      {award.description && (
                        <p className="mb-3 text-sm leading-relaxed text-slate-600">{award.description}</p>
                      )}

                      {/* Date */}
                      <p className="text-xs text-slate-400">
                        {format(new Date(award.createdAt), "d MMM yyyy")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* History */}
      {showHistory && (
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-700">
            <History className="h-5 w-5 text-slate-500" />
            {t("awards.allHistory")}
          </h2>
          {allAwards.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              {t("awards.noHistory")}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white/90 shadow-sm">
              <table className="w-full">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("awards.employee")}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("awards.awardTitle")}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("awards.category")}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">{t("awards.month")}</th>
                    {isAdmin && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody>
                  {allAwards.map((award) => (
                    <tr key={award.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {award.employee.firstName} {award.employee.lastName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {award.employee.employeeCode}
                          {award.employee.department && ` · ${award.employee.department.name}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{award.title}</td>
                      <td className="px-4 py-3">
                        {award.category && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                            {award.category}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {format(new Date(award.awardMonth), "MMM yyyy")}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(award.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
