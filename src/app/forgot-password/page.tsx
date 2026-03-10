"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [checkEmail, setCheckEmail] = useState("");
  const [checkStatus, setCheckStatus] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const [statusData, setStatusData] = useState<{
    status: string;
    tempPassword?: string;
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", {
        emailOrUsername: emailOrUsername.trim(),
        reason: reason.trim() || undefined,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { error?: string } } })?.response?.data;
      setError(res?.error || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckStatus("loading");
    setStatusData(null);
    try {
      const { data } = await api.post("/auth/check-reset-status", {
        emailOrUsername: checkEmail.trim(),
      });
      setStatusData(data);
      setCheckStatus("found");
    } catch {
      setStatusData({ status: "notfound", message: "No reset request found for that account." });
      setCheckStatus("notfound");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold text-slate-800">Password Reset Request</h1>
        <p className="mb-6 text-slate-500">Submit a request for an admin to approve</p>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email or Username
              </label>
              <input
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g. admin or admin@company.com"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Reason <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="e.g. Forgot my password"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-primary-600 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="rounded-lg bg-green-50 p-4 text-green-800">
              Your password reset request has been submitted. An admin will review it. You will be
              notified when it is approved.
            </p>
            <p className="text-sm text-slate-600">
              You can check the status of your request below.
            </p>
          </div>
        )}

        <hr className="my-6 border-slate-200" />
        <h2 className="mb-2 text-sm font-medium text-slate-700">Check reset status</h2>
        <form onSubmit={handleCheckStatus} className="space-y-2">
          <input
            type="text"
            value={checkEmail}
            onChange={(e) => setCheckEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Enter your email or username"
          />
          <button
            type="submit"
            disabled={checkStatus === "loading"}
            className="w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {checkStatus === "loading" ? "Checking..." : "Check Status"}
          </button>
        </form>
        {statusData && (
          <div
            className={`mt-3 rounded-lg p-4 text-sm ${
              statusData.status === "approved"
                ? "bg-green-50 text-green-800"
                : statusData.status === "pending"
                  ? "bg-amber-50 text-amber-800"
                  : statusData.status === "rejected"
                    ? "bg-red-50 text-red-800"
                    : "bg-slate-50 text-slate-700"
            }`}
          >
            {statusData.message}
            {statusData.tempPassword && (
              <p className="mt-2 font-mono font-semibold">
                Temporary password: {statusData.tempPassword}
              </p>
            )}
          </div>
        )}

        <p className="mt-6 text-center">
          <Link href="/login" className="text-sm text-primary-600 hover:text-primary-700">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
