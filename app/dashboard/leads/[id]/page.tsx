"use client";

import { useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getPriorityCategory } from "@/lib/leadPriority";

import {
  ArrowLeft,
  Sparkles,
  Mail,
  Phone,
  MessageCircle,
  CalendarClock,
  User,
  AtSign,
  Clock,
  FileText,
  BarChart3,
  Check,
  Circle,
  AlertCircle,
  CheckCircle2,
  Send,
  Loader2,
  MessageSquareText,
  Target,
  BriefcaseBusiness,
  Wallet,
} from "lucide-react";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  deal_value: number | null;
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

type CustomLeadField = {
  id: string;
  field_id: string;
  value: string | null;
  field_name: string;
  field_type: string;
  display_order: number;
};

const STAGES = ["new", "contacted", "qualified", "won", "lost"] as const;

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50";

/* Same category colors the dashboard table uses: hot = red, warm = blue, cold = gray */
function priorityMeta(score: number | null) {
  const category = getPriorityCategory(score);

  switch (category) {
    case "hot":
      return { label: "Hot", dot: "bg-red-400", text: "text-red-400" };
    case "warm":
      return { label: "Warm", dot: "bg-blue-400", text: "text-blue-400" };
    case "cold":
      return { label: "Cold", dot: "bg-gray-400", text: "text-gray-400" };
    default:
      return { label: "Unscored", dot: "bg-gray-500", text: "text-gray-500" };
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

function getFollowUpStatus(nextFollowUpAt: string | null) {
  if (!nextFollowUpAt) {
    return { label: "No follow-up set", type: "none" };
  }

  const followUpTime = new Date(nextFollowUpAt).getTime();
  const now = Date.now();

  if (followUpTime < now) {
    return { label: "Follow-up overdue", type: "overdue" };
  }

  const today = new Date();
  const followUpDate = new Date(nextFollowUpAt);

  const isToday =
    followUpDate.getFullYear() === today.getFullYear() &&
    followUpDate.getMonth() === today.getMonth() &&
    followUpDate.getDate() === today.getDate();

  if (isToday) {
    return { label: "Follow-up due today", type: "today" };
  }

  return { label: "Follow-up upcoming", type: "upcoming" };
}

function formatActivityTime(value: string | null) {
  if (!value) return null;

  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function LeadDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params?.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [lead, setLead] = useState<Lead | null>(null);
  const [customFields, setCustomFields] = useState<CustomLeadField[]>([]);
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
  const [dealValue, setDealValue] = useState("");
  const [savingDealValue, setSavingDealValue] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  /* ---------------- Real-time clock ---------------- */

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* ---------------- Theme ---------------- */

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    setIsDark(stored !== "light");
  }, []);

  /* ---------------- Fetch lead ---------------- */

  const fetchLead = useCallback(async () => {
    if (!leadId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    const { data: customFieldData, error: customFieldError } = await supabase
      .from("custom_field_values")
      .select(
        `
        id,
        field_id,
        value,
        custom_fields (
          field_name,
          field_type,
          display_order
        )
      `
      )
      .eq("lead_id", leadId);

    if (customFieldError) {
      console.error("Failed to load custom field values:", customFieldError);
    } else {
      const formattedCustomFields = (customFieldData || [])
        .map((item: any) => ({
          id: item.id,
          field_id: item.field_id,
          value: item.value,
          field_name: item.custom_fields?.field_name || "Custom Field",
          field_type: item.custom_fields?.field_type || "text",
          display_order: item.custom_fields?.display_order || 0,
        }))
        .sort((a, b) => a.display_order - b.display_order);

      setCustomFields(formattedCustomFields);
    }

    if (error || !data) {
      setNotFound(true);
    } else {
      setLead(data as Lead);
      setReplyText((data as Lead).ai_suggested_reply || "");

      const nextFollowUp = (data as Lead).next_follow_up_at;
      setFollowUpDate(nextFollowUp ? nextFollowUp.slice(0, 16) : "");

      const existingDealValue = (data as Lead).deal_value;
      setDealValue(
        existingDealValue !== null && existingDealValue !== undefined
          ? String(existingDealValue)
          : ""
      );
    }

    setLoading(false);
  }, [leadId]);

  /* ---------------- Auth ---------------- */

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

  /* ---------------- Status ---------------- */

  async function updateStatus(status: string) {
    if (!lead || lead.status === status) return;

    setUpdating(true);

    const updateData: {
      status: string;
      last_contacted_at?: string;
      next_follow_up_at?: string | null;
    } = { status };

    // Only moving into "contacted" records the contact timestamp.
    if (status === "contacted") {
      updateData.last_contacted_at = new Date().toISOString();
    }
    // Closed leads no longer need a follow-up.
    if (status === "won" || status === "lost") {
      updateData.next_follow_up_at = null;
    }

    const { error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", lead.id);

    if (!error) {
      setLead({
        ...lead,
        status,
        ...(status === "contacted"
          ? { last_contacted_at: updateData.last_contacted_at! }
          : {}),
        // Keep the screen in sync with what was just saved
        ...(status === "won" || status === "lost"
          ? { next_follow_up_at: null }
          : {}),
      });
      if (status === "won" || status === "lost") setFollowUpDate("");
    } else {
      console.error("Failed to update lead status:", error);
      alert("Failed to update status. Please try again.");
    }

    setUpdating(false);
  }

  /* ---------------- AI response ---------------- */

  async function handleGenerateResponse() {
    if (!lead) return;

    setGenerating(true);
    setGenError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Session expired. Please log in again.");
      }

      const res = await fetch(`/api/leads/${lead.id}/generate-response`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
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

  /* ---------------- Send email ---------------- */

  async function handleSendEmail() {
    if (!lead || !replyText.trim()) return;

    setSendingEmail(true);
    setSendError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Session expired. Please log in again.");
      }

      const res = await fetch(`/api/leads/${lead.id}/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
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

  /* ---------------- Call ---------------- */

  async function handleCall() {
    if (!lead) return;

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("leads")
      .update({
        last_contacted_at: now,
        status: lead.status === "new" ? "contacted" : lead.status,
      })
      .eq("id", lead.id);

    if (!error) {
      setLead({
        ...lead,
        last_contacted_at: now,
        status: lead.status === "new" ? "contacted" : lead.status,
      });
    }

    window.location.href = `tel:${lead.phone}`;
  }

  /* ---------------- WhatsApp ---------------- */

  async function handleWhatsApp() {
    if (!lead) return;

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("leads")
      .update({
        last_contacted_at: now,
        status: lead.status === "new" ? "contacted" : lead.status,
      })
      .eq("id", lead.id);

    if (!error) {
      setLead({
        ...lead,
        last_contacted_at: now,
        status: lead.status === "new" ? "contacted" : lead.status,
      });
    }

    const phone = (lead.phone ?? "").replace(/[^\d]/g, "");
    const message =
      replyText || `Hi ${lead.name}, following up on your enquiry.`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  }

  /* ---------------- Follow-up ---------------- */

  async function handleSaveFollowUp() {
    if (!lead) return;

    // Clear follow-up
    if (!followUpDate) {
      const { error } = await supabase
        .from("leads")
        .update({ next_follow_up_at: null })
        .eq("id", lead.id);

      if (!error) {
        setLead({ ...lead, next_follow_up_at: null });
      }

      return;
    }

    const selectedDate = new Date(followUpDate);

    // Prevent past date/time
    if (selectedDate.getTime() <= Date.now()) {
      alert("Please select a future date and time.");
      return;
    }

    setSavingFollowUp(true);

    const value = selectedDate.toISOString();

    const { error } = await supabase
      .from("leads")
      .update({ next_follow_up_at: value })
      .eq("id", lead.id);

    if (error) {
      console.error("Failed to save follow-up:", error);
      alert("Failed to save follow-up. Please try again.");
      setSavingFollowUp(false);
      return;
    }

    setLead({ ...lead, next_follow_up_at: value });
    setSavingFollowUp(false);
  }

  async function handleClearFollowUp() {
    if (!lead) return;

    setSavingFollowUp(true);

    const { error } = await supabase
      .from("leads")
      .update({ next_follow_up_at: null })
      .eq("id", lead.id);

    if (error) {
      console.error("Failed to clear follow-up:", error);
      alert("Failed to clear follow-up. Please try again.");
      setSavingFollowUp(false);
      return;
    }

    setFollowUpDate("");
    setLead({ ...lead, next_follow_up_at: null });
    setSavingFollowUp(false);
  }

  /* ---------------- Deal value ---------------- */

  async function handleSaveDealValue() {
    if (!lead) return;

    setSavingDealValue(true);

    const value = dealValue.trim() === "" ? null : Number(dealValue);

    if (value !== null && (Number.isNaN(value) || value < 0)) {
      setSavingDealValue(false);
      return;
    }

    const { error } = await supabase
      .from("leads")
      .update({ deal_value: value })
      .eq("id", lead.id);

    if (!error) {
      setLead({ ...lead, deal_value: value });
    }

    setSavingDealValue(false);
  }

  /* =========================================================
     DESIGN TOKENS — same palette as the dashboard
  ========================================================= */

  const pageBg = isDark ? "bg-[#0b0b0f] text-gray-100" : "bg-[#f6f8fc] text-gray-900";
  const divider = isDark ? "border-white/[0.06]" : "border-gray-200/70";
  const mutedText = isDark ? "text-gray-400" : "text-gray-600";
  const subtleText = isDark ? "text-gray-500" : "text-gray-400";
  const primaryText = isDark ? "text-white" : "text-gray-900";

  const inputCls = isDark
    ? "bg-white/[0.06] border-white/10 text-white placeholder:text-gray-600"
    : "bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400";

  const btnBase = `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING}`;
  const btnPrimary = `${btnBase} bg-blue-500 hover:bg-blue-600 text-white shadow-sm`;
  const btnSecondary = `${btnBase} ${
    isDark
      ? "bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10"
      : "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200"
  }`;
  const btnWhatsApp = `${btnBase} bg-emerald-500 hover:bg-emerald-400 text-white shadow-sm`;

  /* =========================================================
     LOADING
  ========================================================= */

  if (checkingAuth || loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-700 font-['Inter',system-ui,sans-serif] ${pageBg}`}
      >
        <div className="flex flex-col items-center gap-4" role="status">
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

  /* =========================================================
     NOT FOUND
  ========================================================= */

  if (notFound || !lead) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center gap-5 px-4 font-['Inter',system-ui,sans-serif] ${pageBg}`}
      >
        <div className="text-center">
          <div
            className={`mx-auto mb-4 w-12 h-12 rounded-2xl flex items-center justify-center bg-red-500/10 text-red-400`}
          >
            <AlertCircle className="w-5 h-5" />
          </div>
          <h2 className={`text-xl font-extrabold tracking-tight mb-2 ${primaryText}`}>
            Lead Not Found
          </h2>
          <p className={`text-sm max-w-md mx-auto ${mutedText}`}>
            The lead you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
          </p>
        </div>

        <button onClick={() => router.push("/dashboard")} className={btnPrimary}>
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  const priority = priorityMeta(lead.ai_score);
  const followUpStatus = getFollowUpStatus(lead.next_follow_up_at);

  const followUpTone =
    followUpStatus.type === "overdue"
      ? { box: isDark ? "border-red-500/20 bg-red-500/[0.04]" : "border-red-200 bg-red-50", bar: "bg-red-500/70", pill: "bg-red-500/10 text-red-400" }
      : followUpStatus.type === "today"
      ? { box: isDark ? "border-amber-500/20 bg-amber-500/[0.04]" : "border-amber-200 bg-amber-50", bar: "bg-amber-500/70", pill: "bg-amber-500/10 text-amber-400" }
      : followUpStatus.type === "upcoming"
      ? { box: isDark ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-emerald-200 bg-emerald-50/60", bar: "bg-emerald-500/70", pill: "bg-emerald-500/10 text-emerald-400" }
      : { box: isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-gray-200 bg-gray-50/60", bar: isDark ? "bg-white/10" : "bg-gray-300", pill: isDark ? "bg-white/[0.06] text-gray-400" : "bg-gray-100 text-gray-500" };

  const statusPill =
    lead.status === "won"
      ? isDark ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20" : "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : lead.status === "lost"
      ? isDark ? "bg-red-500/10 text-red-300 ring-red-500/20" : "bg-red-50 text-red-600 ring-red-100"
      : isDark ? "bg-blue-500/10 text-blue-300 ring-blue-500/20" : "bg-blue-50 text-blue-700 ring-blue-100";

  const bullets: string[] = (() => {
    if (!lead.ai_reasons_bullets) return [];
    try {
      const parsed = JSON.parse(lead.ai_reasons_bullets);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  /* =========================================================
     MAIN UI
  ========================================================= */

  return (
    <div
      className={`min-h-screen font-['Inter',system-ui,sans-serif] antialiased transition-colors duration-700 ${pageBg}`}
    >
      {/* ===== Top bar ===== */}
      <nav
        className={`sticky top-0 z-40 border-b backdrop-blur-xl ${
          isDark ? "bg-[#0b0b0f]/85 border-white/[0.06]" : "bg-white/85 border-gray-200/70"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center min-w-0">
            <button
              onClick={() => router.push("/dashboard")}
              className={`flex items-center gap-2 text-sm font-medium rounded-lg px-2.5 py-1.5 transition-colors ${FOCUS_RING} ${
                isDark
                  ? "text-gray-400 hover:text-white hover:bg-white/10"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
            <span className={`mx-2 select-none ${subtleText}`}>/</span>
            <span className={`text-sm font-medium truncate ${mutedText}`}>Lead Details</span>
          </div>

          <div className="hidden sm:block text-right">
            <div className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>
              {currentTime.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <div className={`text-xs font-mono tabular-nums ${subtleText}`}>
              {currentTime.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* ===================================================
            LEAD HEADER — who, how hot, and what to do next
        =================================================== */}
        <Card isDark={isDark}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <div
                className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-lg font-medium ring-1 ${
                  isDark
                    ? "bg-gradient-to-br from-white/10 to-white/5 text-gray-200 ring-white/10"
                    : "bg-gradient-to-br from-gray-200 to-gray-100 text-gray-700 ring-gray-200"
                }`}
              >
                {lead.name?.charAt(0)?.toUpperCase() || "?"}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className={`text-xl sm:text-2xl font-extrabold tracking-tight truncate ${primaryText}`}>
                    {lead.name}
                  </h1>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ring-inset ${statusPill}`}
                  >
                    {lead.status}
                  </span>
                </div>

                <div className={`mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${mutedText}`}>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <AtSign className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{lead.email}</span>
                  </span>
                  {lead.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {lead.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Key figures */}
            <div
              className={`flex items-stretch divide-x rounded-2xl border ${
                isDark
                  ? "border-white/[0.06] bg-white/[0.02] divide-white/[0.06]"
                  : "border-gray-200 bg-gray-50/60 divide-gray-200"
              }`}
            >
              <Stat label="AI Score" isDark={isDark}>
                <span className={`text-2xl font-semibold tabular-nums leading-none ${primaryText}`}>
                  {lead.ai_score !== null ? lead.ai_score : "—"}
                  <span className={`text-xs font-normal ml-0.5 ${mutedText}`}>/100</span>
                </span>
                <span className={`mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${priority.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
                  {priority.label}
                </span>
              </Stat>

              <Stat label="Deal Value" isDark={isDark}>
                <span className={`text-2xl font-semibold tabular-nums leading-none ${primaryText}`}>
                  {lead.deal_value !== null ? currency.format(lead.deal_value) : "—"}
                </span>
              </Stat>

              <Stat label="Submitted" isDark={isDark}>
                <span className={`text-sm font-semibold ${primaryText}`}>
                  {new Date(lead.created_at).toLocaleDateString()}
                </span>
                <span className={`text-[11px] font-mono tabular-nums mt-0.5 ${subtleText}`}>
                  {new Date(lead.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </Stat>
            </div>
          </div>

          {/* Quick actions */}
          <div className={`mt-5 pt-4 border-t ${divider} flex flex-wrap items-center gap-2`}>
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail || !replyText.trim()}
              className={btnPrimary}
            >
              {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {sendingEmail ? "Sending…" : lead.email_sent_at ? "Resend Email" : "Email Lead"}
            </button>

            <button onClick={handleCall} disabled={!lead.phone} className={btnSecondary}>
              <Phone className="w-4 h-4" />
              Call
            </button>

            <button onClick={handleWhatsApp} disabled={!lead.phone} className={btnWhatsApp}>
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>

            <a
              href={`mailto:${lead.email}?body=${encodeURIComponent(replyText || "")}`}
              className={btnSecondary}
            >
              <AtSign className="w-4 h-4" />
              Open in Mail App
            </a>

            {!lead.phone && (
              <span className={`text-xs ${mutedText}`}>
                No phone number — Call and WhatsApp unavailable.
              </span>
            )}
          </div>
        </Card>

        {/* ===================================================
            TWO COLUMNS — left: the lead, right: work on the lead
        =================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* ---------------- LEFT ---------------- */}
          <div className="lg:col-span-7 space-y-4">
            {/* Lead details */}
            <Card isDark={isDark}>
              <CardTitle isDark={isDark} icon={<User className="w-4 h-4" />} title="Lead Details" />

              <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
                <InfoRow label="Name" value={lead.name} icon={<User className="w-3.5 h-3.5" />} isDark={isDark} />
                <InfoRow label="Email" value={lead.email} icon={<AtSign className="w-3.5 h-3.5" />} isDark={isDark} />
                <InfoRow label="Phone" value={lead.phone || "Not provided"} icon={<Phone className="w-3.5 h-3.5" />} isDark={isDark} />
                <InfoRow label="Submitted" value={new Date(lead.created_at).toLocaleString()} icon={<Clock className="w-3.5 h-3.5" />} isDark={isDark} />
              </div>

              {/* Deal value */}
              <div className={`mt-4 pt-4 border-t ${divider}`}>
                <Label isDark={isDark} icon={<Wallet className="w-3.5 h-3.5" />}>
                  Deal Value
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1 min-w-0">
                    <span
                      className={`pointer-events-none absolute left-0 top-0 h-full w-9 flex items-center justify-center text-sm font-semibold ${subtleText}`}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={dealValue}
                      onChange={(e) => setDealValue(e.target.value)}
                      placeholder="0"
                      aria-label="Deal value"
                      className={`w-full rounded-xl border pl-8 pr-3 py-2 text-sm tabular-nums transition-all duration-200 ${inputCls} ${FOCUS_RING}`}
                    />
                  </div>
                  <button onClick={handleSaveDealValue} disabled={savingDealValue} className={`${btnPrimary} shrink-0`}>
                    {savingDealValue ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </button>
                </div>
              </div>

              {/* Custom fields */}
              {customFields.length > 0 && (
                <div className={`mt-4 pt-4 border-t ${divider}`}>
                  <Label isDark={isDark} icon={<FileText className="w-3.5 h-3.5" />}>
                    Custom Fields
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
                    {customFields.map((field) => (
                      <div
                        key={field.id}
                        className={`flex items-start justify-between gap-4 py-2.5 border-b ${divider}`}
                      >
                        <span className={`text-sm ${mutedText}`}>{field.field_name}</span>
                        <span className={`text-sm font-medium text-right break-words ${primaryText}`}>
                          {field.field_type === "checkbox"
                            ? field.value === "true"
                              ? "Yes"
                              : "No"
                            : field.value || "Not provided"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Original message */}
            <Card isDark={isDark}>
              <CardTitle isDark={isDark} icon={<MessageSquareText className="w-4 h-4" />} title="Original Message" />
              <div
                className={`relative rounded-xl border pl-5 pr-4 py-3.5 text-sm leading-6 whitespace-pre-wrap break-words ${
                  isDark
                    ? "bg-white/[0.02] border-white/[0.06] text-gray-300"
                    : "bg-gray-50 border-gray-200 text-gray-700"
                }`}
              >
                <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b from-blue-500 to-indigo-500/30" />
                {lead.message}
              </div>
            </Card>

            {/* AI analysis */}
            <Card isDark={isDark}>
              <CardTitle
                isDark={isDark}
                icon={<BarChart3 className="w-4 h-4" />}
                title="AI Analysis"
                subtitle="Lead intelligence"
                right={
                  <span className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${priority.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
                    {priority.label}
                  </span>
                }
              />

              <div className="space-y-5">
                <div>
                  <Label isDark={isDark}>Summary</Label>
                  <p className={`text-sm leading-6 ${primaryText}`}>
                    {lead.ai_reasoning || "No AI analysis available."}
                  </p>
                </div>

                {bullets.length > 0 && (
                  <div>
                    <Label isDark={isDark}>Why This Score</Label>
                    <ul className="space-y-2">
                      {bullets.map((bullet, index) => (
                        <li key={index} className="flex items-start gap-2.5">
                          <span className="mt-[9px] w-1 h-1 shrink-0 rounded-full bg-blue-400" />
                          <span className={`text-sm leading-5 ${mutedText}`}>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div
                  className={`relative overflow-hidden rounded-xl border px-4 py-3 ${
                    isDark ? "border-blue-500/20 bg-blue-500/[0.05]" : "border-blue-200 bg-blue-50/60"
                  }`}
                >
                  <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500/60" />
                  <div className={`text-[10px] uppercase tracking-[0.14em] font-semibold mb-1 ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                    Recommended Action
                  </div>
                  <p className={`text-sm leading-5 ${primaryText}`}>
                    {recommendedAction(lead.ai_score)}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* ---------------- RIGHT ---------------- */}
          <div className="lg:col-span-5 space-y-4">
            {/* Pipeline status */}
            <Card isDark={isDark}>
              <CardTitle
                isDark={isDark}
                icon={<Target className="w-4 h-4" />}
                title="Pipeline Status"
                right={
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ring-inset ${statusPill}`}>
                    {lead.status}
                  </span>
                }
              />

              <div className="grid grid-cols-5 gap-1.5">
                {STAGES.map((stage) => {
                  const active = lead.status === stage;
                  return (
                    <button
                      key={stage}
                      onClick={() => updateStatus(stage)}
                      disabled={updating || active}
                      aria-pressed={active}
                      className={`flex flex-col items-start justify-between min-h-[56px] rounded-xl border px-2.5 py-2 text-left transition-all duration-200 disabled:cursor-not-allowed ${FOCUS_RING} ${
                        active
                          ? isDark
                            ? "border-blue-500/40 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-300"
                            : "border-blue-500/30 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600"
                          : isDark
                          ? "border-white/[0.06] bg-white/[0.02] text-gray-400 hover:bg-white/5 hover:text-white"
                          : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                      }`}
                    >
                      <span className="flex w-full items-center justify-between">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            active
                              ? stage === "won"
                                ? "bg-emerald-400"
                                : stage === "lost"
                                ? "bg-red-400"
                                : "bg-blue-400"
                              : isDark
                              ? "bg-gray-700"
                              : "bg-gray-300"
                          }`}
                        />
                        {active && <Check className="w-3 h-3" />}
                      </span>
                      <span className="text-[11px] font-semibold capitalize">{stage}</span>
                    </button>
                  );
                })}
              </div>
              <p className={`mt-3 text-xs ${subtleText}`}>
                Update the stage as the lead moves through your pipeline.
              </p>
            </Card>

            {/* Follow-up */}
            <Card isDark={isDark}>
              <CardTitle isDark={isDark} icon={<CalendarClock className="w-4 h-4" />} title="Follow-Up" />

              <div className="space-y-4">
                <div className={`relative overflow-hidden rounded-xl border px-4 py-3 ${followUpTone.box}`}>
                  <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${followUpTone.bar}`} />
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${subtleText}`}>
                      Status
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${followUpTone.pill}`}
                    >
                      {followUpStatus.type === "overdue" ? (
                        <AlertCircle className="w-3 h-3" />
                      ) : followUpStatus.type === "today" ? (
                        <Clock className="w-3 h-3" />
                      ) : followUpStatus.type === "upcoming" ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Circle className="w-3 h-3" />
                      )}
                      {followUpStatus.label}
                    </span>
                  </div>
                  <div className={`mt-2 text-sm font-semibold ${primaryText}`}>
                    {lead.next_follow_up_at
                      ? new Date(lead.next_follow_up_at).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "No follow-up scheduled"}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className={mutedText}>Last contacted</span>
                  <span className={`font-medium tabular-nums text-right ${primaryText}`}>
                    {lead.last_contacted_at
                      ? new Date(lead.last_contacted_at).toLocaleString()
                      : "Not yet contacted"}
                  </span>
                </div>

                <div className={`pt-4 border-t ${divider}`}>
                  <Label isDark={isDark}>Set Follow-Up</Label>
                  <div className="space-y-2">
                    <input
                      type="datetime-local"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      aria-label="Follow-up date and time"
                      className={`w-full rounded-xl border px-3 py-2 text-sm transition-all duration-200 ${
                        isDark ? "[color-scheme:dark]" : ""
                      } ${inputCls} ${FOCUS_RING}`}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveFollowUp}
                        disabled={savingFollowUp}
                        className={btnPrimary}
                      >
                        {savingFollowUp && <Loader2 className="w-4 h-4 animate-spin" />}
                        {savingFollowUp ? "Saving…" : "Save Follow-Up"}
                      </button>
                      {lead.next_follow_up_at && (
                        <button
                          type="button"
                          onClick={handleClearFollowUp}
                          disabled={savingFollowUp}
                          className={btnSecondary}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* AI response */}
            <Card isDark={isDark}>
              <CardTitle
                isDark={isDark}
                icon={<Sparkles className="w-4 h-4" />}
                title="AI Response"
                subtitle="Review, edit, and send an assisted reply"
                right={
                  <button
                    onClick={handleGenerateResponse}
                    disabled={generating}
                    className={`${btnSecondary} !px-3 !py-1.5 !text-xs`}
                  >
                    {generating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {generating ? "Generating…" : replyText.trim() ? "Regenerate" : "Generate"}
                  </button>
                }
              />

              {genError && <ErrorNote>{genError}</ErrorNote>}

              {lead.ai_suggested_reply || replyText ? (
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <Label isDark={isDark} className="!mb-0">
                      Suggested Reply
                    </Label>
                    <span className={`text-[10px] ${subtleText}`}>Editable before sending</span>
                  </div>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={7}
                    aria-label="Suggested reply"
                    className={`w-full rounded-xl border p-3 text-sm leading-6 resize-y transition-all duration-200 ${inputCls} ${FOCUS_RING}`}
                    placeholder="Your AI-assisted reply will appear here..."
                  />
                </div>
              ) : (
                <div
                  className={`rounded-xl border border-dashed px-4 py-6 text-center text-sm ${mutedText} ${
                    isDark ? "border-white/10" : "border-gray-200"
                  }`}
                >
                  Generate a response based on this lead&apos;s enquiry.
                </div>
              )}

              {sendError && (
                <div className="mt-3">
                  <ErrorNote>{sendError}</ErrorNote>
                </div>
              )}

              {lead.email_sent_at && (
                <div className={`mt-3 flex items-center gap-2 text-xs ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Email sent · {new Date(lead.email_sent_at).toLocaleString()}
                </div>
              )}

              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !replyText.trim()}
                className={`${btnPrimary} w-full mt-4`}
              >
                {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sendingEmail ? "Sending…" : lead.email_sent_at ? "Resend Email" : "Send Email"}
              </button>
            </Card>

            {/* Activity */}
            <Card isDark={isDark}>
              <CardTitle isDark={isDark} icon={<Clock className="w-4 h-4" />} title="Activity" />

              <div className="relative">
                <div
                  className={`absolute left-4 top-4 bottom-4 w-px ${isDark ? "bg-white/[0.08]" : "bg-gray-200"}`}
                />
                <div className="space-y-4">
                  {lead.email_sent_at && (
                    <ActivityItem
                      isDark={isDark}
                      icon={<Mail className="w-3.5 h-3.5 text-blue-400" />}
                      title="Email sent"
                      detail={formatActivityTime(lead.email_sent_at)}
                    />
                  )}

                  {lead.last_contacted_at &&
                    lead.last_contacted_at !== lead.email_sent_at && (
                      <ActivityItem
                        isDark={isDark}
                        icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        title="Lead contacted"
                        detail={formatActivityTime(lead.last_contacted_at)}
                      />
                    )}

                  <ActivityItem
                    isDark={isDark}
                    icon={<BriefcaseBusiness className="w-3.5 h-3.5 text-indigo-400" />}
                    title="Current stage"
                    detail={lead.status}
                    capitalize
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   PRESENTATIONAL COMPONENTS — no application logic
============================================================ */

function Card({ isDark, children }: { isDark: boolean; children: ReactNode }) {
  return (
    <section
      className={`rounded-2xl border p-4 sm:p-5 transition-colors duration-300 ${
        isDark
          ? "bg-[#111118] border-white/[0.06] hover:border-white/[0.12]"
          : "bg-white border-gray-200/70 shadow-sm hover:shadow-md"
      }`}
    >
      {children}
    </section>
  );
}

function CardTitle({
  isDark,
  icon,
  title,
  subtitle,
  right,
}: {
  isDark: boolean;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex items-center justify-center w-8 h-8 shrink-0 rounded-xl bg-blue-500/10 text-blue-400">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className={`text-sm font-semibold tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
            {title}
          </h2>
          {subtitle && (
            <p className={`text-[11px] mt-0.5 truncate ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}

function Label({
  isDark,
  icon,
  children,
  className = "",
}: {
  isDark: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] ${
        isDark ? "text-gray-500" : "text-gray-400"
      } ${className}`}
    >
      {icon}
      {children}
    </div>
  );
}

function Stat({
  label,
  isDark,
  children,
}: {
  label: string;
  isDark: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-center px-4 py-3 min-w-[96px]">
      <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] mb-1.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
        {label}
      </span>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
  isDark,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  isDark: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-2.5 border-b ${
        isDark ? "border-white/[0.06]" : "border-gray-200/70"
      }`}
    >
      <span className={`flex items-center gap-2 text-sm shrink-0 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
        {icon}
        {label}
      </span>
      <span className={`text-sm font-medium text-right break-all ${isDark ? "text-white" : "text-gray-900"}`}>
        {value}
      </span>
    </div>
  );
}

function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3.5 py-2.5 mb-3 text-xs text-red-400 flex items-start gap-2.5"
    >
      <AlertCircle className="w-3.5 h-3.5 mt-px shrink-0" />
      {children}
    </div>
  );
}

function ActivityItem({
  isDark,
  icon,
  title,
  detail,
  capitalize,
}: {
  isDark: boolean;
  icon: ReactNode;
  title: string;
  detail: string | null;
  capitalize?: boolean;
}) {
  return (
    <div className="relative flex items-start gap-3">
      <span
        className={`relative z-10 w-8 h-8 shrink-0 rounded-full flex items-center justify-center ring-1 ring-inset ${
          isDark ? "bg-[#111118] ring-white/10" : "bg-white ring-gray-200 shadow-sm"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{title}</p>
        <p className={`text-xs mt-0.5 tabular-nums ${capitalize ? "capitalize" : ""} ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          {detail}
        </p>
      </div>
    </div>
  );
}