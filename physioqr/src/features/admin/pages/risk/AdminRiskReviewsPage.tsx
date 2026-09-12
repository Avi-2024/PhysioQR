import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import apiClient from "@/lib/api-client";

type Review = {
  _id: string;
  patient?: { patientId?: string; fullName?: string; mobile?: string };
  caseType?: { name?: string };
  painCategory?: { name?: string };
  surgeryType?: { name?: string };
  reviewType?: string;
  status: string;
  redFlagDetails?: unknown[];
  createdAt: string;
  reviewedAt?: string;
};
type Response = {
  items: Review[];
  meta: { page: number; pages: number; total: number };
  summary: {
    total: number;
    pending: number;
    cleared: number;
    blocked: number;
    redFlags: number;
    physioReviews: number;
  };
};
const label = (value?: string) =>
  String(value || "—")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
const date = (value?: string) =>
  value ? new Date(value).toLocaleString() : "—";

export default function AdminRiskReviewsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending_review");
  const [reviewType, setReviewType] = useState("all");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin-risk-reviews", search, status, reviewType, page],
    queryFn: async () =>
      (
        await apiClient.get<Response>("/admin/risk-reviews", {
          params: {
            search: search || undefined,
            status,
            reviewType,
            page,
            limit: 20,
          },
        })
      ).data,
  });
  const data = query.data;
  const cards = [
    ["All reviews", data?.summary.total, Stethoscope],
    ["Pending review", data?.summary.pending, ShieldAlert],
    ["Red-flag cases", data?.summary.redFlags, AlertTriangle],
    ["Physio review cases", data?.summary.physioReviews, ShieldCheck],
  ] as const;
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-amber-700">
            CLINICAL REVIEW QUEUE
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            Clinical Reviews
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Review red-flag assessments and pathways such as post-surgery that
            require clinical approval before a rehabilitation programme can be
            selected.
          </p>
        </div>
        <button
          onClick={() => query.refetch()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([title, value, Icon]) => (
          <div
            key={title}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{title}</p>
              <Icon size={17} className="text-slate-400" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {query.isLoading ? "—" : (value ?? 0)}
            </p>
          </div>
        ))}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search patient, doctor, case, body region, or surgery"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
          <select
            value={reviewType}
            onChange={(e) => {
              setReviewType(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            <option value="all">All review types</option>
            <option value="red_flag">Red flag</option>
            <option value="physio_review">Physio review</option>
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            <option value="pending_review">Pending review</option>
            <option value="cleared">Cleared</option>
            <option value="blocked">Blocked</option>
            <option value="all">All statuses</option>
          </select>
        </div>
        {query.isLoading ? (
          <div className="p-8 text-sm text-slate-500">
            Loading clinical review queue…
          </div>
        ) : query.isError ? (
          <div className="p-8">
            <p className="font-medium text-red-700">
              Clinical reviews could not be loaded.
            </p>
            <button
              onClick={() => query.refetch()}
              className="mt-3 text-sm font-semibold text-emerald-700"
            >
              Retry
            </button>
          </div>
        ) : !data?.items.length ? (
          <div className="p-10 text-center">
            <ShieldCheck className="mx-auto text-emerald-600" />
            <p className="mt-3 font-medium text-slate-900">
              No matching clinical reviews
            </p>
            <p className="mt-1 text-sm text-slate-500">
              There are no assessments for the selected filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Case</th>
                  <th className="px-4 py-3">Body region / surgery</th>
                  <th className="px-4 py-3">Review reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3  ">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">
                        {row.patient?.fullName || "Unnamed patient"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.patient?.patientId || row.patient?.mobile || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {row.caseType?.name || "Legacy assessment"}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-slate-700">
                        {row.painCategory?.name || "—"}
                      </p>
                      {row.surgeryType?.name && (
                        <p className="mt-1 text-xs text-slate-500">
                          {row.surgeryType.name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {row.reviewType === "physio_review" ? (
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                          Physio review
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          {row.redFlagDetails?.length || 0} red flag
                          {(row.redFlagDetails?.length || 0) === 1 ? "" : "s"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === "blocked" ? "bg-red-50 text-red-700" : row.status === "cleared" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}
                      >
                        {label(row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4  ">
                      <button
                        onClick={() =>
                          navigate(`/admin/risk-reviews/${row._id}`)
                        }
                        className="font-semibold text-emerald-700 hover:text-emerald-800"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.meta.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
            <span className="text-slate-500">
              Page {data.meta.page} of {data.meta.pages} · {data.meta.total}{" "}
              records
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border p-2 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page >= data.meta.pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border p-2 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
