"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getPriorityCategory } from "@/lib/leadPriority";
import { 
  ArrowLeft, 
  Sparkles, 
  Mail, 
  Wallet, 
  Phone, 
  MessageCircle, 
  CalendarClock,
  User,
  Building,
  AtSign,
  Clock,
  FileText,
  BarChart3
} from "lucide-react";

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
  ai_reasons_bullets: string | null;
  ai_suggested_reply: string | null;
  email_sent_at: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
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
  const [followUpDate, setFollowUpDate] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      const nextFollowUp = (data as Lead).next_follow_up_at;
      setFollowUpDate(nextFollowUp ? nextFollowUp.slice(0, 16) : "");
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
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("leads")
      .update({ status, last_contacted_at: now })
      .eq("id", lead.id);

    if (!error) {
      setLead({ ...lead, status, last_contacted_at: now });
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
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "Something went wrong.");
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
        last_contacted_at: data.sentAt,
        status: lead.status === "new" ? "contacted" : lead.status,
      });
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleSaveFollowUp() {
    if (!lead) return;
    setSavingFollowUp(true);
    const value = followUpDate ? new Date(followUpDate).toISOString() : null;
    const { error } = await supabase
      .from("leads")
      .update({ next_follow_up_at: value })
      .eq("id", lead.id);

    if (!error) {
      setLead({ ...lead, next_follow_up_at: value });
    }
    setSavingFollowUp(false);
  }

  const bg = isDark ? "bg-[#0b0b0f] text-gray-100" : "bg-[#f6f8fc] text-gray-900";
  const cardBg = isDark
    ? "bg-[#111118]/80 backdrop-blur-sm border-white/[0.06]"
    : "bg-white/80 backdrop-blur-sm border-gray-200/70 shadow-sm";
  const mutedText = isDark ? "text-gray-500" : "text-gray-500";

  if (checkingAuth || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <span className="absolute inset-0 rounded-full bg-blue-500/30 blur-2xl animate-pulse" />
            <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
          </div>
          <span className={`text-sm font-medium tracking-widest uppercase ${mutedText}`}>
            Loading lead…
          </span>
        </div>
      </div>
    );
  }

  if (notFound || !lead) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-6 px-4 ${bg}`}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Lead Not Found</h2>
          <p className={mutedText}>The lead you're looking for doesn't exist or you don't have access.</p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  const priority = priorityMeta(lead.ai_score);

  return (
    <div className={`min-h-screen font-['Inter',system-ui,sans-serif] antialiased ${bg}`}>
      {/* ===== TOP NAV ===== */}
      <nav
        className={`fixed top-0 left-0 w-full z-50 backdrop-blur-xl border-b transition-colors duration-300 ${
          isDark ? "bg-black/60 border-white/[0.06]" : "bg-white/80 border-gray-200/60"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex sm:py-3.5 items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className={`flex items-center gap-1 text-sm font-medium px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg transition-all duration-200 ${
                isDark
                  ? "text-gray-300 hover:text-white hover:bg-white/[0.06]"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <span className={`text-sm ${mutedText}`}>/</span>
            <span className={`text-sm font-semibold truncate max-w-[120px] sm:max-w-none ${isDark ? "text-white" : "text-gray-900"}`}>
              Lead Details
            </span>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className={`text-[10px] sm:text-xs font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              {currentTime.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
            <div className={`text-[8px] sm:text-[10px] font-mono tabular-nums ${mutedText}`}>
              {currentTime.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-8 sm:pb-12">
        {/* ===== Lead Header ===== */}
        <div className={`rounded-2xl p-4 sm:p-6 md:p-8 border mb-4 sm:mb-6 transition-all duration-300 hover:shadow-xl ${cardBg}`}>
          <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="truncate">{lead.name}</span>
                <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
                  isDark
                    ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400"
                    : "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600"
                }`}>
                  {lead.status}
                </span>
              </h1>
              <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 flex items-center gap-1.5 ${mutedText}`}>
                <Building className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="truncate">{lead.company || "No company provided"}</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl sm:text-3xl font-extrabold tabular-nums">
                {lead.ai_score !== null ? `${lead.ai_score}/100` : "—"}
              </div>
              <div
                className={`text-[10px] sm:text-xs font-bold tracking-wide flex items-center gap-1 justify-end ${
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

        {/* ===== RESPONSIVE TWO-COLUMN LAYOUT ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* LEFT COLUMN – Static information */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            {/* Contact Information */}
            <div className={`rounded-2xl p-4 sm:p-6 md:p-7 border transition-all duration-300 hover:shadow-lg ${cardBg}`}>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.08em] mb-4 sm:mb-5 flex items-center gap-2">
                <User className="w-4 h-4" />
                Contact Information
              </h2>
              <dl className="space-y-3 sm:space-y-4 text-sm">
                <div className="flex justify-between gap-3 border-b border-white/5 pb-2 sm:pb-3">
                  <dt className={`${mutedText} flex items-center gap-1.5 text-xs sm:text-sm`}>
                    <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Name
                  </dt>
                  <dd className="font-medium text-right text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{lead.name}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-white/5 pb-2 sm:pb-3">
                  <dt className={`${mutedText} flex items-center gap-1.5 text-xs sm:text-sm`}>
                    <AtSign className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Email
                  </dt>
                  <dd className="font-medium text-right text-xs sm:text-sm break-all">{lead.email}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-white/5 pb-2 sm:pb-3">
                  <dt className={`${mutedText} flex items-center gap-1.5 text-xs sm:text-sm`}>
                    <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Phone
                  </dt>
                  <dd className="font-medium text-right text-xs sm:text-sm">{lead.phone || "Not provided"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className={`${mutedText} flex items-center gap-1.5 text-xs sm:text-sm`}>
                    <Building className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Company
                  </dt>
                  <dd className="font-medium text-right text-xs sm:text-sm">{lead.company || "Not provided"}</dd>
                </div>
              </dl>
            </div>

            {/* Lead Information */}
            <div className={`rounded-2xl p-4 sm:p-6 md:p-7 border transition-all duration-300 hover:shadow-lg ${cardBg}`}>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.08em] mb-4 sm:mb-5 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Lead Information
              </h2>
              <dl className="space-y-3 sm:space-y-4 text-sm">
                <div className="flex justify-between gap-3 border-b border-white/5 pb-2 sm:pb-3">
                  <dt className={`${mutedText} flex items-center gap-1.5 text-xs sm:text-sm`}>
                    <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Budget
                  </dt>
                  <dd className="font-medium text-right text-xs sm:text-sm">{lead.budget || "Not provided"}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-white/5 pb-2 sm:pb-3">
                  <dt className={`${mutedText} flex items-center gap-1.5 text-xs sm:text-sm`}>
                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Submitted
                  </dt>
                  <dd className="font-medium text-right text-xs sm:text-sm">
                    {new Date(lead.created_at).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className={`${mutedText} mb-1.5 flex items-center gap-1.5 text-xs sm:text-sm`}>
                    <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Original Message
                  </dt>
                  <dd className={`p-2 sm:p-3 rounded-lg text-xs sm:text-sm ${isDark ? "bg-white/[0.03] text-gray-300" : "bg-gray-50 text-gray-700"}`}>
                    {lead.message}
                  </dd>
                </div>
              </dl>
            </div>

            {/* AI Analysis (compact) */}
            <div
              className={`rounded-2xl p-4 sm:p-6 md:p-7 border transition-all duration-300 hover:shadow-lg ${
                isDark
                  ? "bg-lime-500/[0.04] border-lime-500/20"
                  : "bg-lime-50/80 border-lime-200/70"
              }`}
            >
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.08em] mb-4 sm:mb-5 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-lime-400" />
                AI Analysis
              </h2>
              <div className="space-y-3 sm:space-y-4 text-sm">
                <div>
                  <div className={`${mutedText} mb-1.5 font-semibold text-xs sm:text-sm`}>Summary</div>
                  <p className={`text-xs sm:text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {lead.ai_reasoning || "No AI analysis available."}
                  </p>
                </div>
                {lead.ai_reasons_bullets && (() => {
                  let bullets: string[] = [];
                  try {
                    bullets = JSON.parse(lead.ai_reasons_bullets);
                  } catch {
                    bullets = [];
                  }
                  if (!bullets.length) return null;
                  return (
                    <div>
                      <div className={`${mutedText} mb-1.5 font-semibold text-xs sm:text-sm`}>Why This Score?</div>
                      <ul className={`list-disc list-inside space-y-0.5 sm:space-y-1 text-xs sm:text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        {bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
                <div>
                  <div className={`${mutedText} mb-1.5 font-semibold text-xs sm:text-sm`}>Recommended Action</div>
                  <p className={`text-xs sm:text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {recommendedAction(lead.ai_score)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN – Interactive tools */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Follow-Up */}
            <div className={`rounded-2xl p-4 sm:p-6 md:p-7 border transition-all duration-300 hover:shadow-lg ${cardBg}`}>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.08em] mb-4 sm:mb-5 flex items-center gap-2">
                <CalendarClock className="w-4 h-4" />
                Follow-Up
              </h2>
              <div className="space-y-3 sm:space-y-4 text-sm">
                <div>
                  <div className={`${mutedText} mb-1.5 text-xs sm:text-sm`}>Last Contacted</div>
                  <div className="font-medium text-xs sm:text-sm">
                    {lead.last_contacted_at
                      ? new Date(lead.last_contacted_at).toLocaleString()
                      : "Not yet contacted"}
                  </div>
                </div>
                <div>
                  <div className={`${mutedText} mb-1.5 text-xs sm:text-sm`}>Next Follow-Up</div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="datetime-local"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className={`flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition ${
                        isDark
                          ? "bg-white/[0.03] text-gray-200 border border-white/10 focus:border-blue-400/50"
                          : "bg-gray-50 text-gray-800 border border-gray-200 focus:border-blue-400/50"
                      }`}
                    />
                    <button
                      onClick={handleSaveFollowUp}
                      disabled={savingFollowUp}
                      className="shrink-0 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold rounded-lg px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-lg hover:-translate-y-0.5 text-white disabled:opacity-60 transition-all duration-200"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                      {savingFollowUp ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className={`flex items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 transition ${
                        isDark
                          ? "bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10"
                          : "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200"
                      }`}
                    >
                      <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Call
                    </a>
                  )}
                  {lead.phone && (
                    <a
                      href={`https://wa.me/${lead.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                        replyText || `Hi ${lead.name}, following up on your enquiry.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-white shadow-sm transition"
                    >
                      <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> WhatsApp
                    </a>
                  )}
                  <a
                    href={`mailto:${lead.email}?body=${encodeURIComponent(replyText || "")}`}
                    className="flex items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-lg text-white shadow-sm transition"
                  >
                    <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Email
                  </a>
                </div>
                {!lead.phone && (
                  <p className={`text-xs ${mutedText}`}>
                    No phone number provided — Call and WhatsApp unavailable.
                  </p>
                )}
              </div>
            </div>

            {/* AI Generated Response */}
            <div className={`rounded-2xl p-4 sm:p-6 md:p-7 border transition-all duration-300 hover:shadow-lg ${cardBg}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-5">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.08em] flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Response
                </h2>
                <button
                  onClick={handleGenerateResponse}
                  disabled={generating}
                  className="flex items-center gap-1.5 text-xs font-bold rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-lg hover:-translate-y-0.5 text-white disabled:opacity-60 transition-all duration-200"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {generating ? "Generating…" : "Generate"}
                </button>
              </div>

              {genError && (
                <p className="text-red-400 text-xs sm:text-sm mb-3 sm:mb-4">{genError}</p>
              )}

              {lead.ai_suggested_reply || replyText ? (
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  className={`w-full rounded-xl p-3 sm:p-4 text-xs sm:text-sm mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition ${
                    isDark
                      ? "bg-white/[0.03] text-gray-200 border border-white/10 focus:border-blue-400/50"
                      : "bg-gray-50 text-gray-800 border border-gray-200 focus:border-blue-400/50"
                  }`}
                />
              ) : (
                <p className={`text-xs sm:text-sm mb-3 sm:mb-4 ${mutedText}`}>
                  No response generated yet. Click "Generate" above.
                </p>
              )}

              {sendError && (
                <p className="text-red-400 text-xs sm:text-sm mb-3 sm:mb-4">{sendError}</p>
              )}

              {lead.email_sent_at && (
                <p className={`text-xs mb-3 sm:mb-4 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                  ✅ Email sent {new Date(lead.email_sent_at).toLocaleString()}
                </p>
              )}

              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !replyText.trim()}
                className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold rounded-xl px-4 py-2 sm:px-5 sm:py-2.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  replyText.trim()
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-lg hover:-translate-y-0.5 text-white"
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

            {/* Update Status */}
            <div className={`rounded-2xl p-4 sm:p-6 md:p-7 border transition-all duration-300 hover:shadow-lg ${cardBg}`}>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.08em] mb-4 sm:mb-5 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Update Status
              </h2>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {STAGES.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    disabled={updating}
                    className={`text-[10px] sm:text-xs font-semibold rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-2 capitalize transition-all duration-200 disabled:opacity-50 ${
                      lead.status === s
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                        : isDark
                        ? "bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10"
                        : "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200"
                    }`}
                  >
                    {lead.status === s ? "✓ " : "Mark "}
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}