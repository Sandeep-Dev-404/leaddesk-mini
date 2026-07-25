"use client";

import { useState } from "react";
import Link from "next/link";
import { leadSchema, BUDGET_LABELS } from "@/lib/validation";

type FormState = {
  name: string;
  email: string;
  budget: string;
  message: string;
};

const EMPTY: FormState = { name: "", email: "", budget: "", message: "" };

export default function LandingPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [serverError, setServerError] = useState("");

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    // 1. CLIENT-SIDE validation using the same Zod schema as the server
    const parsed = leadSchema.safeParse(form);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0] ?? "",
        email: fieldErrors.email?.[0] ?? "",
        budget: fieldErrors.budget?.[0] ?? "",
        message: fieldErrors.message?.[0] ?? "",
      });
      return;
    }

    setStatus("sending");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (res.status === 422) {
        // 2. SERVER-SIDE validation failures are surfaced back on the fields
        const data = await res.json();
        const f = data.fields ?? {};
        setErrors({
          name: f.name?.[0] ?? "",
          email: f.email?.[0] ?? "",
          budget: f.budget?.[0] ?? "",
          message: f.message?.[0] ?? "",
        });
        setStatus("idle");
        return;
      }

      if (!res.ok) throw new Error("Request failed");

      setForm(EMPTY);
      setStatus("sent");
    } catch {
      setServerError("Something went wrong. Please try again in a moment.");
      setStatus("failed");
    }
  }

  const inputBase =
    "w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-blue-100";

  return (
    <main>
      {/* Hero */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 md:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-blue-300">
            LeadDesk Mini
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight md:text-5xl">
            Turn website visitors into qualified conversations.
          </h1>
          <p className="mt-4 max-w-xl text-slate-300">
            Tell us about your project. Every enquiry lands in our internal desk
            within seconds and is triaged by a real human, not an autoresponder.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <a
              href="#enquiry"
              className="rounded-lg bg-blue-500 px-5 py-3 font-medium hover:bg-blue-600"
            >
              Start an enquiry
            </a>
            <Link
              href="/admin"
              className="rounded-lg border border-slate-600 px-5 py-3 font-medium hover:bg-slate-800"
            >
              Admin login
            </Link>
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="enquiry" className="mx-auto max-w-5xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold">Tell us what you need</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Share a budget range so we can point you at the right approach
              instead of a generic quote.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-slate-600">
              <li>Reply within one business day</li>
              <li>No sales sequence, one human reply</li>
              <li>Your details are stored, never shared</li>
            </ul>
          </div>

          <div className="md:col-span-3">
            {status === "sent" ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                <h3 className="text-lg font-semibold text-green-800">
                  Enquiry received
                </h3>
                <p className="mt-2 text-sm text-green-700">
                  Thanks. It is now in our desk marked as New. We will get back
                  to you shortly.
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-4 rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-800"
                >
                  Send another enquiry
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                {serverError && (
                  <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {serverError}
                  </p>
                )}

                <label className="block text-sm font-medium text-black">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className={`${inputBase} mt-1 ${
                    errors.name ? "border-red-400 text-black" : "border-slate-300 text-black"
                  }`}
                  placeholder="Your Name"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                )}

                <label className="mt-4 block text-sm font-medium text-black">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className={`${inputBase} mt-1 ${
                    errors.email ? "border-red-400 text-black" : "border-slate-300 text-black"
                  }`}
                  placeholder="you@company.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                )}

                <label className="mt-4 block text-sm font-medium text-black">
                  Budget range
                </label>
                <select
                  value={form.budget}
                  onChange={(e) => update("budget", e.target.value)}
                  className={`${inputBase} mt-1 bg-white ${
                    errors.budget ? "border-red-400 text-black" : "border-slate-300 text-black"
                  }`}
                >
                  <option value="">Select a range</option>
                  {Object.entries(BUDGET_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.budget && (
                  <p className="mt-1 text-xs text-red-600">{errors.budget}</p>
                )}

                <label className="mt-4 block text-sm font-medium text-black">
                  Project details
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  rows={5}
                  className={`${inputBase} mt-1 resize-none ${
                    errors.message ? "border-red-400 text-black" : "border-slate-300 text-black"
                  }`}
                  placeholder="What are you building, and what is the deadline?"
                />
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-red-600">{errors.message}</span>
                  <span className="text-slate-400">
                    {form.message.length}/1000
                  </span>
                </div>

                <button
                  disabled={status === "sending"}
                  className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {status === "sending" ? "Sending..." : "Send enquiry"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}