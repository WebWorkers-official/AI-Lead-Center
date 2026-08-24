"use client";

import { useState, FormEvent } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      company: formData.get("company"),
      budget: formData.get("budget"),
      message: formData.get("message"),
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit. Please try again.");
      }

      setStatus("success");
      form.reset();
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong.");
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b0b12] to-[#13131f]">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <span className="inline-block text-xs font-semibold tracking-wide text-brand-500 bg-brand-500/10 rounded-full px-3 py-1 mb-6">
          AI-POWERED LEAD MANAGEMENT
        </span>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Never let a hot lead go cold again
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Submit your enquiry below. Our AI instantly analyzes, scores, and
          routes your request to the right person — no delays, no
          spreadsheets.
        </p>
      </section>

      {/* Form */}
      <section className="max-w-lg mx-auto px-6 pb-24">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
          {status === "success" ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <h2 className="text-xl font-semibold mb-2">
                Thanks — we&apos;ve got it!
              </h2>
              <p className="text-gray-400 mb-6">
                Our AI is reviewing your enquiry now. You&apos;ll hear from us
                shortly.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="text-brand-500 hover:underline text-sm"
              >
                Submit another enquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Name *
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Email *
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="jane@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Company
                </label>
                <input
                  name="company"
                  type="text"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Acme Technologies"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Budget
                </label>
                <select
                  name="budget"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a range
                  </option>
                  <option value="<$1k">Less than $1,000</option>
                  <option value="$1k-5k">$1,000 – $5,000</option>
                  <option value="$5k-10k">$5,000 – $10,000</option>
                  <option value="$10k+">$10,000+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Message *
                </label>
                <textarea
                  name="message"
                  required
                  rows={4}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Tell us what you're looking for..."
                />
              </div>

              {status === "error" && (
                <p className="text-red-400 text-sm">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-3 transition"
              >
                {status === "loading" ? "Submitting..." : "Submit Enquiry"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
