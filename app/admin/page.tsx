"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BUDGET_LABELS } from "@/lib/validation";

type Lead = {
  id: string;
  name: string;
  email: string;
  budget: string;
  message: string;
  status: "NEW" | "CONTACTED" | "CLOSED";
  createdAt: string;
};

const STATUSES = ["NEW", "CONTACTED", "CLOSED"] as const;

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-amber-100 text-amber-700",
  CLOSED: "bg-green-100 text-green-700",
};

export default function AdminPage() {
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [savingId, setSavingId] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const load = useCallback(async () => {
    setError("");

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/leads?${params.toString()}`);

    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }

    if (!res.ok) {
      setError("Failed to load leads.");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setLeads(data.items);
    setLoading(false);
  }, [q, statusFilter, router]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAdminEmail(d.admin.email));
  }, []);

  // Debounced search so we do not fire a request on every keystroke
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function changeStatus(id: string, status: string) {
    setSavingId(id);

    // Optimistic update, rolled back if the request fails
    const previous = leads;
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: status as Lead["status"] } : l))
    );

    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      setLeads(previous);
      setError("Could not update status.");
    }

    setSavingId("");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  const counts = {
    NEW: leads.filter((l) => l.status === "NEW").length,
    CONTACTED: leads.filter((l) => l.status === "CONTACTED").length,
    CLOSED: leads.filter((l) => l.status === "CLOSED").length,
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lead desk</h1>
          <p className="text-sm text-slate-500">
            {adminEmail ? `Signed in as ${adminEmail}` : "Loading session..."}
          </p>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100 text-black"
        >
          Sign out
        </button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {STATUSES.map((s) => (
          <div
            key={s}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">{s}</p>
            <p className="mt-1 text-2xl font-bold text-black">{counts[s]}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email or message..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-black"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-24 animate-pulse rounded-xl bg-slate-200"
            />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-medium text-black">No leads match this view</p>
          <p className="mt-1 text-sm text-slate-500">
            Clear the search, or submit an enquiry from the landing page.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {leads.map((lead) => (
            <article
              key={lead.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{lead.name}</h2>
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {lead.email}
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                    {BUDGET_LABELS[lead.budget] ?? lead.budget}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      STATUS_STYLE[lead.status]
                    }`}
                  >
                    {lead.status}
                  </span>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-line text-sm text-slate-700">
                {lead.message}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-400">
                  {new Date(lead.createdAt).toLocaleString("en-GB")}
                </p>

                <div className="flex gap-1">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      disabled={savingId === lead.id || lead.status === s}
                      onClick={() => changeStatus(lead.id, s)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        lead.status === s
                          ? "bg-slate-900 text-white"
                          : "border border-slate-300 bg-white hover:bg-slate-100"
                      } disabled:opacity-60`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}