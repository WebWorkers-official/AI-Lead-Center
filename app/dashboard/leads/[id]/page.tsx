"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getPriorityCategory } from "@/lib/leadPriority";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  budget: string | null;
  message: string;
  ai_score: number | null;
  ai_category: string | null;
  ai_reasoning: string | null;
  ai_suggested_reply: string | null;
  status: string;
  created_at: string;
};

const STAGES = ["new", "contacted", "qualified", "won", "lost"] as const;

function priorityMeta(score: number | null) {
  const category = getPriorityCategory(score);
  switch (category) {
    case "hot":
      return { label: "HOT", icon: "🔥", color: "amber" };
    case "warm":
      return { label: "WARM", icon: "🟡", color: "lime" };
    case "cold":
      return { label: "COLD", icon: "🔵", color: "teal" };
    default:
      return { label: "UNSCORED", icon: "⚪", color: "gray" };
  }
}

function recommendedAction(score: number | null) {
  const category = getPriorityCategory(score);
  switch (category) {
    case "hot":
      return "Contact this lead immediately — high likelihood of conversion.";
    case "warm":
      return "Follow up to gather more details before prioritizing.";
    case "cold":
      return "Nurture over time or deprioritize versus hotter leads.";
    default:
      return "Awaiting AI analysis.";
  }
}

export default function LeadDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params?.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    setIsDark(stored !== "light");
  }, []);

  const fetchLead = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (error || !data) {
      setNotFound(true);
    } else {
      setLead(data as Lead);
    }
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      setCheckingAuth(false);
      fetchLead();
    }
    init();
  }, [router, fetchLead]);

  async function updateStatus(status: string) {
    if (!lead) return;
    setUpdating(true);
    const { error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", lead.id);

    if (!error) {
      setLead({ ...lead, status });
    }
    setUpdating(false);
  }

  async function handleGenerateResponse() {
    if (!lead) return;
    setGenerating(true);
    setGenError("");
    try {
      const res = await fetch(`/api/leads/${lead.id}/generate-response`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate response.");
      }
      setLead({ ...lead, ai_suggested_reply: data.reply });
    } catch (err: any) {
      setGenError(err.message || "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  const bg = isDark ? "bg-[#08090a] text-gray-100" : "bg-[#f7f8f5] text-gray-900";
  const cardBg = isDark
    ? "bg-white/[0.02] border-white/[0.08]"
    : "bg-white border-gray-200 shadow-sm";
  const mutedText = isDark ? "text-gray-500" : "text-gray-500";

  if (checkingAuth || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <span className={`text-sm ${mutedText}`}>Loading lead…</span>
      </div>
    );
  }

  if (notFound || !lead) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${bg}`}>
        <p className="text-lg font-semibold">Lead not found</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm bg-lime-400 text-black font-bold rounded-xl px-5 py-2.5"
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const priority = priorityMeta(lead.ai_score);

  return (
    <div className={`min-h-screen font-sans antialiased ${bg}`}>
      {/* Top bar */}
      <nav
        className={`fixed top-0 left-0 w-full z-50 backdrop-blur-xl border-b ${
          isDark ? "bg-black/60 border-white/[0.08]" : "bg-white/80 border-gray-200/80"
        }`}
      >
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${
              isDark
                ? "text-gray-300 hover:text-white hover:bg-white/[0.06]"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            ← Dashboard
          </button>
          <span className={`text-sm ${mutedText}`}>Lead Details</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className={`rounded-2xl p-6 border mb-6 ${cardBg}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{lead.name}</h1>
              <p className={`text-sm mt-1 ${mutedText}`}>
                {lead.company || "No company provided"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-extrabold tabular-nums">
                  {lead.ai_score !== null ? `${lead.ai_score}/100` : "—"}
                </div>
                <div
                  className={`text-xs font-bold tracking-wide flex items-center gap-1 justify-end ${
                    priority.color === "amber"
                      ? "text-amber-400"
                      : priority.color === "lime"
                      ? "text-lime-400"
                      : priority.color === "teal"
                      ? "text-teal-400"
                      : mutedText
                  }`}
                >
                  {priority.icon} {priority.label} PRIORITY
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <span
              className={`inline-block text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full ${
                isDark ? "bg-white/[0.06] text-gray-300" : "bg-gray-100 text-gray-700"
              }`}
            >
              Status: {lead.status}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Contact Info */}
          <div className={`rounded-2xl p-6 border ${cardBg}`}>
            <h2 className="text-sm font-bold uppercase tracking-wide mb-4">
              Contact Information
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className={mutedText}>Name</dt>
                <dd className="font-medium">{lead.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className={mutedText}>Email</dt>
                <dd className="font-medium">{lead.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className={mutedText}>Phone</dt>
                <dd className="font-medium">{lead.phone || "Not provided"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className={mutedText}>Company</dt>
                <dd className="font-medium">{lead.company || "Not provided"}</dd>
              </div>
            </dl>
          </div>

          {/* Lead Info */}
          <div className={`rounded-2xl p-6 border ${cardBg}`}>
            <h2 className="text-sm font-bold uppercase tracking-wide mb-4">
              Lead Information
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className={mutedText}>Budget</dt>
                <dd className="font-medium">{lead.budget || "Not provided"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className={mutedText}>Submitted</dt>
                <dd className="font-medium">
                  {new Date(lead.created_at).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className={`${mutedText} mb-1`}>Original Message</dt>
                <dd className={isDark ? "text-gray-300" : "text-gray-700"}>
                  {lead.message}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* AI Analysis */}
        <div
          className={`rounded-2xl p-6 border mb-6 ${
            isDark
              ? "bg-lime-500/[0.04] border-lime-500/20"
              : "bg-lime-50 border-lime-200"
          }`}
        >
          <h2 className="text-sm font-bold uppercase tracking-wide mb-4">
            AI Lead Analysis
          </h2>
          <div className="space-y-4 text-sm">
            <div>
              <div className={`${mutedText} mb-1 font-semibold`}>AI Summary</div>
              <p className={isDark ? "text-gray-300" : "text-gray-700"}>
                {lead.ai_reasoning || "No AI analysis available for this lead."}
              </p>
            </div>
            <div>
              <div className={`${mutedText} mb-1 font-semibold`}>
                Recommended Action
              </div>
              <p className={isDark ? "text-gray-300" : "text-gray-700"}>
                {recommendedAction(lead.ai_score)}
              </p>
            </div>
          </div>
        </div>

        {/* AI Generated Response */}
        <div className={`rounded-2xl p-6 border mb-6 ${cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wide">
              AI Generated Response
            </h2>
            <button
              onClick={handleGenerateResponse}
              disabled={generating}
              className="text-xs font-bold rounded-xl px-4 py-2 bg-lime-400 hover:bg-lime-300 text-black disabled:opacity-60 transition"
            >
              {generating ? "Generating…" : "✨ Generate AI Response"}
            </button>
          </div>

          {genError && (
            <p className="text-red-400 text-sm mb-3">{genError}</p>
          )}

          {lead.ai_suggested_reply ? (
            <div
              className={`rounded-xl p-4 text-sm whitespace-pre-wrap mb-4 ${
                isDark ? "bg-white/[0.03] text-gray-300" : "bg-gray-50 text-gray-700"
              }`}
            >
              {lead.ai_suggested_reply}
            </div>
          ) : (
            <p className={`text-sm mb-4 ${mutedText}`}>
              No response generated yet. Click "Generate AI Response" above.
            </p>
          )}

          <a
            href={`mailto:${lead.email}?body=${encodeURIComponent(
              lead.ai_suggested_reply || ""
            )}`}
            className={`inline-block text-sm font-bold rounded-xl px-5 py-2.5 transition ${
              lead.ai_suggested_reply
                ? "bg-lime-400 hover:bg-lime-300 text-black"
                : "bg-gray-300 text-gray-500 pointer-events-none"
            }`}
          >
            ✉️ Send Email
          </a>
        </div>

        {/* Status Actions */}
        <div className={`rounded-2xl p-6 border ${cardBg}`}>
          <h2 className="text-sm font-bold uppercase tracking-wide mb-4">
            Update Status
          </h2>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                disabled={updating}
                className={`text-xs font-semibold rounded-xl px-4 py-2 capitalize transition disabled:opacity-50 ${
                  lead.status === s
                    ? "bg-lime-400 text-black"
                    : isDark
                    ? "bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10"
                    : "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200"
                }`}
              >
                Mark {s}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
