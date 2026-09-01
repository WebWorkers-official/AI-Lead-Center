"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import { supabase } from "@/lib/supabase";
import { getPriorityCategory, getPriorityMeta } from "@/lib/leadPriority";
import {
  Rocket,
  BarChart3,
  CheckCircle2,
  Trophy,
  Workflow,
  ClipboardList,
  Wallet,
  Mail,
  Inbox,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";

const WORKSPACE_NAME = "DN Homes";

type Lead = {
  id: string;
  name: string;
  email: string;
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
const FOLLOW_UP_HOURS = 2;

export default function DashboardPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light") setIsDark(false);
    else if (stored === "dark") setIsDark(true);
    else setIsDark(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setLeads(data as Lead[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      setCheckingAuth(false);
      fetchLeads();
    }
    init();
  }, [router, fetchLeads]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    const { error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", id);

    if (!error) {
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status } : l))
      );
    }
    setUpdatingId(null);
  }

  function goToLead(id: string) {
    router.push(`/dashboard/leads/${id}`);
  }

  if (checkingAuth) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${
          isDark ? "bg-[#0a0a0a]" : "bg-[#f5f5f5]"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <span className="absolute inset-0 rounded-full bg-blue-400/20 blur-xl animate-pulse" />
            <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
          </div>
          <span
            className={`text-sm font-medium tracking-wide ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Checking session…
          </span>
        </div>
      </div>
    );
  }

  const total = leads.length;
  const qualified = leads.filter((l) => (l.ai_score ?? 0) >= 50).length;
  const hot = leads.filter((l) => getPriorityCategory(l.ai_score) === "hot");
  const converted = leads.filter((l) => l.status === "won").length;

  const needsFollowUp = leads.filter((l) => {
    if (l.status !== "new") return false;
    const hoursSinceCreated =
      (Date.now() - new Date(l.created_at).getTime()) / (1000 * 60 * 60);
    return hoursSinceCreated >= FOLLOW_UP_HOURS;
  });

  const pipelineCounts = STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, {});

  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        className={`min-h-screen transition-colors duration-500 font-['Inter',system-ui,sans-serif] antialiased ${
          isDark ? "bg-[#0a0a0a] text-gray-100" : "bg-[#f5f5f5] text-gray-900"
        }`}
      >
        {/* Subtle glow – kept but muted */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div
            className={`absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full blur-[130px] transition-opacity duration-700 ${
              isDark ? "bg-blue-500/[0.04]" : "bg-blue-400/10"
            }`}
          />
          <div
            className={`absolute top-1/3 -right-40 w-[26rem] h-[26rem] rounded-full blur-[130px] transition-opacity duration-700 ${
              isDark ? "bg-indigo-500/[0.04]" : "bg-indigo-300/10"
            }`}
          />
        </div>

        {/* Navbar – clean, minimal, better padding */}
        <nav
          className={`fixed top-0 left-0 w-full z-50 backdrop-blur-xl border-b transition-colors duration-500 ${
            isDark
              ? "bg-black/60 border-white/[0.06]"
              : "bg-white/80 border-gray-200/60"
          }`}
        >
          <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-blue-500 text-white">
                <Rocket className="w-5 h-5" strokeWidth={2.5} />
              </span>
              <div className="leading-tight min-w-0">
                <h1
                  className={`text-base sm:text-lg font-semibold tracking-[-0.02em] truncate ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  AI Lead Command Center
                </h1>
                <p
                  className={`text-[11px] font-medium tracking-wide truncate ${
                    isDark ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  Capture. Qualify. Convert. · {WORKSPACE_NAME}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={handleSignOut}
                className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 ${
                  isDark
                    ? "text-gray-300 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06]"
                    : "text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>

              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 ${
                  isDark
                    ? "bg-white/10 focus-visible:ring-offset-black"
                    : "bg-gray-200 focus-visible:ring-offset-white"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                    isDark
                      ? "translate-x-6 bg-blue-500"
                      : "translate-x-0 bg-white"
                  }`}
                >
                  {isDark ? (
                    <Moon className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-blue-500" />
                  )}
                </span>
              </button>
            </div>
          </div>
        </nav>

        <main className="relative pt-32 pb-20 px-6 sm:px-8 max-w-7xl mx-auto">
          {/* Stats Grid – wider gaps, bigger numbers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6 mb-14 sm:mb-16">
            <StatCard
              label="Total Leads"
              value={total}
              icon={<BarChart3 className="w-5 h-5" />}
              isDark={isDark}
            />
            <StatCard
              label="Qualified"
              value={qualified}
              icon={<CheckCircle2 className="w-5 h-5" />}
              isDark={isDark}
            />
            <StatCard
              label="Hot Leads"
              value={hot.length}
              icon={<span className="text-lg">🔥</span>}
              isDark={isDark}
            />
            <StatCard
              label="Converted"
              value={converted}
              icon={<Trophy className="w-5 h-5" />}
              isDark={isDark}
            />
          </div>

          {/* Needs Follow-Up – cleaner spacing */}
          {needsFollowUp.length > 0 && (
            <div className="mb-14 sm:mb-16">
              <SectionHeading
                icon={<span className="text-base">⏰</span>}
                title={`Needs Follow-Up (${needsFollowUp.length})`}
                isDark={isDark}
              />
              <div
                className={`rounded-2xl p-5 sm:p-6 border ${
                  isDark
                    ? "bg-white/[0.03] border-white/[0.08]"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <p
                  className={`text-sm mb-4 ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  These leads have been sitting for over {FOLLOW_UP_HOURS} hours
                  without a response.
                </p>
                <div className="space-y-2.5">
                  {needsFollowUp.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => goToLead(lead.id)}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl px-5 py-3.5 cursor-pointer transition ${
                        isDark
                          ? "bg-white/[0.03] hover:bg-white/[0.06]"
                          : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={lead.name} isDark={isDark} />
                        <div className="min-w-0">
                          <span className="font-semibold text-sm">
                            {lead.name}
                          </span>
                          <span
                            className={`text-xs ml-2 ${
                              isDark ? "text-gray-500" : "text-gray-500"
                            }`}
                          >
                            {lead.company || "No company"} ·{" "}
                            {lead.ai_score !== null
                              ? `${lead.ai_score}/100`
                              : "Not scored"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <a
                          href={`mailto:${lead.email}?body=${encodeURIComponent(
                            lead.ai_suggested_reply || ""
                          )}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs font-medium rounded-xl px-5 py-2 transition-all duration-200 bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          <Mail className="w-3.5 h-3.5" /> Email
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(lead.id, "contacted");
                          }}
                          disabled={updatingId === lead.id}
                          className={`text-xs font-medium rounded-xl px-5 py-2 transition-all duration-200 disabled:opacity-50 ${
                            isDark
                              ? "bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200"
                          }`}
                        >
                          {updatingId === lead.id
                            ? "Updating…"
                            : "Mark Contacted"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pipeline – more breathing room */}
          <div className="mb-14 sm:mb-16">
            <SectionHeading
              icon={<Workflow className="w-4 h-4" />}
              title="Lead Pipeline"
              isDark={isDark}
            />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-5">
              {STAGES.map((stage) => {
                const count = pipelineCounts[stage] || 0;
                const share =
                  total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div
                    key={stage}
                    className={`rounded-2xl p-5 sm:p-6 text-center border transition-all duration-300 ${
                      isDark
                        ? "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15]"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`text-3xl font-light tracking-tight tabular-nums ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {count}
                    </div>
                    <div
                      className={`text-[10px] font-semibold uppercase tracking-[0.06em] mt-1 ${
                        isDark ? "text-gray-500" : "text-gray-500"
                      }`}
                    >
                      {stage}
                    </div>
                    <div
                      className={`mt-3 h-1 rounded-full overflow-hidden ${
                        isDark ? "bg-white/[0.08]" : "bg-gray-200"
                      }`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDark ? "bg-blue-400" : "bg-blue-500"
                        }`}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hot Leads – spacious cards */}
          {hot.length > 0 && (
            <div className="mb-14 sm:mb-16">
              <SectionHeading
                icon={<span className="text-base">🔥</span>}
                title="Hot Leads"
                isDark={isDark}
              />
              <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
                {hot.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => goToLead(lead.id)}
                    className={`rounded-2xl p-6 sm:p-7 border transition-all duration-300 hover:-translate-y-0.5 cursor-pointer ${
                      isDark
                        ? "bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15]"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={lead.name} isDark={isDark} />
                        <div className="min-w-0">
                          <div className="text-[15px] font-semibold leading-tight truncate">
                            {lead.name}
                          </div>
                          <div
                            className={`text-sm truncate ${
                              isDark ? "text-gray-500" : "text-gray-500"
                            }`}
                          >
                            {lead.company || "No company"}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`shrink-0 text-sm font-medium px-3.5 py-1 rounded-full tabular-nums flex items-center gap-1.5 ${
                          isDark
                            ? "bg-white/[0.06] text-gray-300"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        🔥 {lead.ai_score}/100
                      </div>
                    </div>
                    {lead.budget && (
                      <div
                        className={`inline-flex items-center gap-1.5 text-sm mb-3 font-medium ${
                          isDark ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        <Wallet className="w-4 h-4" /> {lead.budget}
                      </div>
                    )}
                    {lead.ai_reasoning && (
                      <p
                        className={`text-sm mb-5 leading-relaxed ${
                          isDark ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {lead.ai_reasoning}
                      </p>
                    )}
                    <div className="flex gap-3 flex-wrap">
                      <a
                        href={`mailto:${lead.email}?body=${encodeURIComponent(
                          lead.ai_suggested_reply || ""
                        )}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-xs font-medium rounded-xl px-6 py-2.5 transition-all duration-200 bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
                      >
                        <Mail className="w-3.5 h-3.5" /> Send Email
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(lead.id, "contacted");
                        }}
                        disabled={updatingId === lead.id}
                        className={`text-xs font-medium rounded-xl px-6 py-2.5 transition-all duration-200 disabled:opacity-50 ${
                          isDark
                            ? "bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200"
                        }`}
                      >
                        {updatingId === lead.id ? "Updating…" : "Mark Contacted"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Leads Table – refined typography and alignment */}
          <div>
            <SectionHeading
              icon={<ClipboardList className="w-4 h-4" />}
              title="All Leads"
              isDark={isDark}
            />
            <div
              className={`rounded-2xl overflow-hidden border transition-colors duration-300 ${
                isDark
                  ? "bg-white/[0.02] border-white/[0.06]"
                  : "bg-white border-gray-200"
              }`}
            >
              {loading ? (
                <div className="p-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-4 px-5 py-4 rounded-xl animate-pulse ${
                        isDark ? "bg-white/[0.02]" : "bg-gray-50"
                      } ${i !== 4 ? "mb-2" : ""}`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full ${
                          isDark ? "bg-white/10" : "bg-gray-200"
                        }`}
                      />
                      <div className="flex-1 space-y-2">
                        <div
                          className={`h-3 w-1/4 rounded ${
                            isDark ? "bg-white/10" : "bg-gray-200"
                          }`}
                        />
                        <div
                          className={`h-2.5 w-1/6 rounded ${
                            isDark ? "bg-white/5" : "bg-gray-100"
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : leads.length === 0 ? (
                <div className="p-16 text-center">
                  <Inbox
                    className={`w-8 h-8 mx-auto mb-3 ${
                      isDark ? "text-gray-600" : "text-gray-300"
                    }`}
                  />
                  <p
                    className={`text-sm font-medium ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    No leads yet
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      isDark ? "text-gray-500" : "text-gray-500"
                    }`}
                  >
                    Submit the form on the landing page to test.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr
                        className={`text-left border-b ${
                          isDark
                            ? "text-gray-500 border-white/[0.06] bg-white/[0.02]"
                            : "text-gray-500 border-gray-200 bg-gray-50/50"
                        }`}
                      >
                        <th className="px-5 py-4 font-medium text-xs uppercase tracking-[0.06em]">
                          Name
                        </th>
                        <th className="px-5 py-4 font-medium text-xs uppercase tracking-[0.06em]">
                          Company
                        </th>
                        <th className="px-5 py-4 font-medium text-xs uppercase tracking-[0.06em] text-right">
                          Score
                        </th>
                        <th className="px-5 py-4 font-medium text-xs uppercase tracking-[0.06em]">
                          Category
                        </th>
                        <th className="px-5 py-4 font-medium text-xs uppercase tracking-[0.06em]">
                          Status
                        </th>
                        <th className="px-5 py-4 font-medium text-xs uppercase tracking-[0.06em] text-right">
                          Submitted
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr
                          key={lead.id}
                          onClick={() => goToLead(lead.id)}
                          className={`border-b transition-colors duration-150 cursor-pointer ${
                            isDark
                              ? "border-white/[0.05] hover:bg-white/[0.02]"
                              : "border-gray-100 hover:bg-gray-50/50"
                          }`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={lead.name} isDark={isDark} />
                              <span className="font-medium">{lead.name}</span>
                            </div>
                          </td>
                          <td
                            className={`px-5 py-4 ${
                              isDark ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            {lead.company || "—"}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {lead.ai_score !== null ? (
                              <span
                                className={`font-medium tabular-nums ${
                                  lead.ai_score >= 80
                                    ? isDark
                                      ? "text-blue-300"
                                      : "text-blue-600"
                                    : lead.ai_score >= 50
                                    ? isDark
                                      ? "text-gray-300"
                                      : "text-gray-700"
                                    : isDark
                                    ? "text-gray-500"
                                    : "text-gray-400"
                                }`}
                              >
                                {lead.ai_score}/100
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {lead.ai_score !== null ? (
                              (() => {
                                const meta = getPriorityMeta(lead.ai_score);
                                const label = meta.category;
                                return (
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium capitalize ${
                                      isDark
                                        ? "bg-white/[0.06] text-gray-300"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        label === "hot"
                                          ? "bg-red-400"
                                          : label === "warm"
                                          ? "bg-blue-400"
                                          : "bg-gray-400"
                                      }`}
                                    />
                                    {label}
                                  </span>
                                );
                              })()
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={lead.status}
                              onChange={(e) =>
                                updateStatus(lead.id, e.target.value)
                              }
                              disabled={updatingId === lead.id}
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 disabled:opacity-50 ${
                                isDark
                                  ? "bg-white/[0.06] border border-white/10 text-white focus-visible:ring-blue-400/50"
                                  : "bg-gray-50 border border-gray-200 text-gray-800 focus-visible:ring-blue-400/50"
                              }`}
                            >
                              {STAGES.map((s) => (
                                <option
                                  key={s}
                                  value={s}
                                  className={isDark ? "bg-gray-900" : ""}
                                >
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td
                            className={`px-5 py-4 text-xs whitespace-nowrap tabular-nums text-right ${
                              isDark ? "text-gray-500" : "text-gray-400"
                            }`}
                          >
                            {new Date(lead.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

function SectionHeading({
  icon,
  title,
  isDark,
}: {
  icon: React.ReactNode;
  title: string;
  isDark: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 pb-3 mb-6 border-b ${
        isDark ? "border-white/[0.06]" : "border-gray-200/70"
      }`}
    >
      <h2
        className={`text-base font-semibold tracking-tight flex items-center gap-2 ${
          isDark ? "text-white" : "text-gray-900"
        }`}
      >
        {icon} {title}
      </h2>
    </div>
  );
}

function Avatar({ name, isDark }: { name: string; isDark: boolean }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium ${
        isDark
          ? "bg-white/10 text-gray-200 ring-1 ring-white/10"
          : "bg-gray-200 text-gray-700 ring-1 ring-gray-200"
      }`}
    >
      {initials || "?"}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  isDark,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl p-6 sm:p-7 border transition-all duration-300 hover:-translate-y-1 ${
        isDark
          ? "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
          : "bg-white border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex items-center justify-center w-11 h-11 rounded-xl ${
            isDark
              ? "bg-white/5 text-gray-400"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {icon}
        </span>
        <span
          className={`text-3xl sm:text-4xl font-light tracking-tight tabular-nums ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          {value}
        </span>
      </div>
      <div
        className={`text-sm font-medium mt-3 ${
          isDark ? "text-gray-500" : "text-gray-500"
        }`}
      >
        {label}
      </div>
    </div>
  );
}