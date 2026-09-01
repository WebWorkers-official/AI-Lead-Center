"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Head from "next/head";
import { supabase } from "@/lib/supabase";
import { getPriorityCategory } from "@/lib/leadPriority";
import { ArrowLeft, Sparkles, Mail, Wallet } from "lucide-react";

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
  email_sent_at: string | null;
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
  const [replyText, setReplyText] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendError, setSendError] = useState("");
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
      setReplyText((data as Lead).ai_suggested_reply || "");
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
      setReplyText(data.reply);
    } catch (err: any) {
      setGenError(err.message || "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSendEmail() {
    if (!lead || !replyText.trim()) return;
    setSendingEmail(true);
    setSendError("");
    try {
      const res = await fetch(`/api/leads/${lead.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send email.");
      }
      setLead({
        ...lead,
        email_sent_at: data.sentAt,
        status: lead.status === "new" ? "contacted" : lead.status,
      });
    } catch (err: any) {
      setSendError(err.message || "Something went wrong.");
    } finally {
      setSendingEmail(false);
    }
  }

  const bg = isDark ? "bg-[#0a0a0a] text-gray-100" : "bg-[#f5f5f5] text-gray-900";
  const cardBg = isDark
    ? "bg-white/[0.02] border-white/[0.06]"
    : "bg-white border-gray-200";
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
          className="text-sm font-medium rounded-xl px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white transition"
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const priority = priorityMeta(lead.ai_score);

  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        className={`min-h-screen font-['Inter',system-ui,sans-serif] antialiased ${bg}`}
      >
        {/* Navbar – matches dashboard */}
        <nav
          className={`fixed top-0 left-0 w-full z-50 backdrop-blur-xl border-b transition-colors duration-500 ${
            isDark
              ? "bg-black/60 border-white/[0.06]"
              : "bg-white/80 border-gray-200/60"
          }`}
        >
          <div className="max-w-5xl mx-auto px-6 sm:px-8 py-4 flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition ${
                isDark
                  ? "text-gray-300 hover:text-white hover:bg-white/[0.06]"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <span className={`text-sm ${mutedText}`}>Lead Details</span>
          </div>
        </nav>

        <main className="max-w-5xl mx-auto px-6 sm:px-8 pt-32 pb-20">
          {/* Header Card */}
          <div className={`rounded-2xl p-6 sm:p-7 border mb-6 ${cardBg}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
                  {lead.name}
                </h1>
                <p className={`text-sm mt-1 ${mutedText}`}>
                  {lead.company || "No company provided"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-light tracking-tight tabular-nums">
                  {lead.ai_score !== null ? `${lead.ai_score}/100` : "—"}
                </div>
                <div
                  className={`text-xs font-semibold tracking-wide flex items-center gap-1 justify-end ${
                    priority.color === "amber"
                      ? "text-amber-400"
                      : priority.color === "lime"
                      ? "text-blue-400"
                      : priority.color === "teal"
                      ? "text-teal-400"
                      : mutedText
                  }`}
                >
                  {priority.icon} {priority.label} PRIORITY
                </div>
              </div>
            </div>
            <div className="mt-4">
              <span
                className={`inline-block text-xs font-medium uppercase tracking-[0.06em] px-3 py-1 rounded-full ${
                  isDark
                    ? "bg-white/[0.06] text-gray-300"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                Status: {lead.status}
              </span>
            </div>
          </div>

          {/* Two-column info cards */}
          <div className="grid md:grid-cols-2 gap-5 sm:gap-6 mb-6">
            {/* Contact Information */}
            <div className={`rounded-2xl p-6 sm:p-7 border ${cardBg}`}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-gray-500 mb-4">
                Contact Information
              </h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className={mutedText}>Name</dt>
                  <dd className="font-medium text-right">{lead.name}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className={mutedText}>Email</dt>
                  <dd className="font-medium text-right break-all">{lead.email}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className={mutedText}>Phone</dt>
                  <dd className="font-medium text-right">{lead.phone || "Not provided"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className={mutedText}>Company</dt>
                  <dd className="font-medium text-right">{lead.company || "Not provided"}</dd>
                </div>
              </dl>
            </div>

            {/* Lead Information */}
            <div className={`rounded-2xl p-6 sm:p-7 border ${cardBg}`}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-gray-500 mb-4">
                Lead Information
              </h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className={`${mutedText} flex items-center gap-1.5`}>
                    <Wallet className="w-3.5 h-3.5" /> Budget
                  </dt>
                  <dd className="font-medium text-right">{lead.budget || "Not provided"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className={mutedText}>Submitted</dt>
                  <dd className="font-medium text-right">
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

          {/* AI Analysis – neutral background, no heavy colors */}
          <div
            className={`rounded-2xl p-6 sm:p-7 border mb-6 ${
              isDark
                ? "bg-white/[0.02] border-white/[0.06]"
                : "bg-white border-gray-200"
            }`}
          >
            <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-gray-500 mb-4">
              AI Lead Analysis
            </h2>
            <div className="space-y-4 text-sm">
              <div>
                <div className={`${mutedText} mb-1 font-medium`}>AI Summary</div>
                <p className={isDark ? "text-gray-300" : "text-gray-700"}>
                  {lead.ai_reasoning || "No AI analysis available for this lead."}
                </p>
              </div>
              <div>
                <div className={`${mutedText} mb-1 font-medium`}>
                  Recommended Action
                </div>
                <p className={isDark ? "text-gray-300" : "text-gray-700"}>
                  {recommendedAction(lead.ai_score)}
                </p>
              </div>
            </div>
          </div>

          {/* AI Generated Response */}
          <div className={`rounded-2xl p-6 sm:p-7 border mb-6 ${cardBg}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-gray-500">
                AI Generated Response
              </h2>
              <button
                onClick={handleGenerateResponse}
                disabled={generating}
                className="flex items-center gap-1.5 text-xs font-medium rounded-xl px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-60 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {generating ? "Generating…" : "Generate AI Response"}
              </button>
            </div>

            {genError && (
              <p className="text-red-400 text-sm mb-3">{genError}</p>
            )}

            {lead.ai_suggested_reply || replyText ? (
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={5}
                className={`w-full rounded-xl p-4 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition ${
                  isDark
                    ? "bg-white/[0.03] text-gray-200 border border-white/10"
                    : "bg-gray-50 text-gray-800 border border-gray-200"
                }`}
              />
            ) : (
              <p className={`text-sm mb-4 ${mutedText}`}>
                No response generated yet. Click "Generate AI Response" above.
              </p>
            )}

            {sendError && (
              <p className="text-red-400 text-sm mb-3">{sendError}</p>
            )}

            {lead.email_sent_at && (
              <p
                className={`text-xs mb-3 ${
                  isDark ? "text-blue-300" : "text-blue-600"
                }`}
              >
                ✅ Email sent {new Date(lead.email_sent_at).toLocaleString()}
              </p>
            )}

            <button
              onClick={handleSendEmail}
              disabled={sendingEmail || !replyText.trim()}
              className={`inline-flex items-center gap-1.5 text-sm font-medium rounded-xl px-6 py-2.5 transition disabled:opacity-50 disabled:cursor-not-allowed ${
                replyText.trim()
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-300 text-gray-500"
              }`}
            >
              <Mail className="w-4 h-4" />
              {sendingEmail
                ? "Sending…"
                : lead.email_sent_at
                ? "Resend Email"
                : "Send Email"}
            </button>
          </div>

          {/* Status Actions */}
          <div className={`rounded-2xl p-6 sm:p-7 border ${cardBg}`}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-gray-500 mb-4">
              Update Status
            </h2>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  disabled={updating}
                  className={`text-xs font-medium rounded-xl px-5 py-2.5 capitalize transition disabled:opacity-50 ${
                    lead.status === s
                      ? "bg-blue-500 text-white"
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
    </>
  );
}
