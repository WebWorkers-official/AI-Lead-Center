"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

  // --- Theme state ---
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
          isDark ? "bg-[#08090a]" : "bg-[#f7f8f5]"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <span className="absolute inset-0 rounded-full bg-lime-400/20 blur-xl animate-pulse" />
            <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-lime-400 border-r-emerald-500 animate-spin" />
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
  const qualified = leads.filter((l) => (l.ai_score ?? 0) >= 40).length;
  const hot = leads.filter((l) => l.ai_category === "hot");
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
    <div
      className={`min-h-screen transition-colors duration-500 font-sans antialiased ${
        isDark ? "bg-[#08090a] text-gray-100" : "bg-[#f7f8f5] text-gray-900"
      }`}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className={`absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full blur-[130px] transition-opacity duration-700 ${
            isDark ? "bg-lime-500/[0.07]" : "bg-lime-300/20"
          }`}
        />
        <div
          className={`absolute top-1/3 -right-40 w-[26rem] h-[26rem] rounded-full blur-[130px] transition-opacity duration-700 ${
            isDark ? "bg-emerald-500/[0.05]" : "bg-emerald-200/20"
          }`}
        />
      </div>

      <nav
        className={`fixed top-0 left-0 w-full z-50 backdrop-blur-xl border-b transition-colors duration-500 ${
          isDark
            ? "bg-black/60 border-white/[0.08]"
            : "bg-white/80 border-gray-200/80"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center justify-center w-9 h-9 rounded-xl text-base bg-lime-400 text-black shadow-lg ${
                isDark ? "shadow-lime-500/20" : "shadow-lime-400/30"
              }`}
            >
              🚀
            </span>
            <div className="leading-tight">
              <h1
                className={`text-[15px] sm:text-base font-bold tracking-tight ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                AI-LEAD <span className="text-lime-400">GENERATION</span>{" "}
                <span className={isDark ? "text-gray-400" : "text-gray-500"}>
                  COMMAND CENTER
                </span>
              </h1>
              <p
                className={`text-[11px] font-medium tracking-wide ${
                  isDark ? "text-gray-500" : "text-gray-400"
                }`}
              >
                DN Homes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSignOut}
              className={`text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60 ${
                isDark
                  ? "text-gray-300 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.08]"
                  : "text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              Sign out
            </button>

            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60 focus-visible:ring-offset-2 ${
                isDark
                  ? "bg-white/10 focus-visible:ring-offset-black"
                  : "bg-gray-200 focus-visible:ring-offset-white"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center text-sm ${
                  isDark ? "translate-x-6 bg-lime-400" : "translate-x-0 bg-white"
                }`}
              >
                {isDark ? "🌙" : "☀️"}
              </span>
            </button>
          </div>
        </div>
      </nav>

      <main className="relative pt-28 pb-16 px-6 max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-14">
          <StatCard label="Total Leads" value={total} icon="📊" accent="lime" isDark={isDark} />
          <StatCard label="Qualified" value={qualified} icon="✅" accent="emerald" isDark={isDark} />
          <StatCard label="Hot Leads" value={hot.length} icon="🔥" accent="amber" isDark={isDark} />
          <StatCard label="Converted" value={converted} icon="🏆" accent="teal" isDark={isDark} />
        </div>

        {/* Needs Follow-Up */}
        {needsFollowUp.length > 0 && (
          <div className="mb-14">
            <SectionHeading icon="⏰" title={`Needs Follow-Up (${needsFollowUp.length})`} isDark={isDark} />
            <div
              className={`rounded-2xl p-5 border backdrop-blur-sm ${
                isDark ? "bg-yellow-500/[0.06] border-yellow-500/20" : "bg-yellow-50 border-yellow-200"
              }`}
            >
              <p className={`text-sm mb-4 ${isDark ? "text-yellow-200/80" : "text-yellow-800"}`}>
                These leads have been sitting for over {FOLLOW_UP_HOURS} hours without a response.
              </p>
              <div className="space-y-2">
                {needsFollowUp.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => goToLead(lead.id)}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition ${
                      isDark ? "bg-white/[0.03] hover:bg-white/[0.06]" : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={lead.name} isDark={isDark} tone="lime" />
                      <div>
                        <span className="font-semibold text-sm">{lead.name}</span>
                        <span className={`text-xs ml-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                          {lead.company || "No company"} ·{" "}
                          {lead.ai_score !== null ? `${lead.ai_score}/100` : "Not scored"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`mailto:${lead.email}?body=${encodeURIComponent(lead.ai_suggested_reply || "")}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-bold rounded-xl px-4 py-1.5 transition-all duration-200 bg-lime-400 hover:bg-lime-300 text-black"
                      >
                        ✉️ Email
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(lead.id, "contacted");
                        }}
                        disabled={updatingId === lead.id}
                        className={`text-xs font-semibold rounded-xl px-4 py-1.5 transition-all duration-200 disabled:opacity-50 ${
                          isDark
                            ? "bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10"
                            : "bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200"
                        }`}
                      >
                        {updatingId === lead.id ? "Updating…" : "Mark Contacted"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pipeline */}
        <div className="mb-14">
          <SectionHeading icon="📌" title="Lead Pipeline" isDark={isDark} />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {STAGES.map((stage) => {
              const count = pipelineCounts[stage] || 0;
              const share = total > 0 ? Math.round((count / total) * 100) : 0;
              const colorMap: Record<string, { bg: string; text: string; border: string; bar: string }> = {
                new: { bg: isDark ? "bg-teal-500/[0.08]" : "bg-teal-50", text: isDark ? "text-teal-400" : "text-teal-700", border: isDark ? "border-teal-500/20" : "border-teal-200", bar: "bg-teal-400" },
                contacted: { bg: isDark ? "bg-cyan-500/[0.08]" : "bg-cyan-50", text: isDark ? "text-cyan-400" : "text-cyan-700", border: isDark ? "border-cyan-500/20" : "border-cyan-200", bar: "bg-cyan-400" },
                qualified: { bg: isDark ? "bg-lime-500/[0.08]" : "bg-lime-50", text: isDark ? "text-lime-400" : "text-lime-700", border: isDark ? "border-lime-500/20" : "border-lime-200", bar: "bg-lime-400" },
                won: { bg: isDark ? "bg-emerald-500/[0.08]" : "bg-emerald-50", text: isDark ? "text-emerald-400" : "text-emerald-700", border: isDark ? "border-emerald-500/20" : "border-emerald-200", bar: "bg-emerald-400" },
                lost: { bg: isDark ? "bg-rose-500/[0.08]" : "bg-rose-50", text: isDark ? "text-rose-400" : "text-rose-700", border: isDark ? "border-rose-500/20" : "border-rose-200", bar: "bg-rose-400" },
              };
              const colors = colorMap[stage];
              return (
                <div
                  key={stage}
                  className={`group rounded-2xl p-5 text-center border backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${colors.bg} ${colors.border} ${
                    isDark ? "hover:shadow-black/40" : "hover:shadow-gray-300/50"
                  }`}
                >
                  <div className={`text-3xl font-bold tabular-nums ${colors.text}`}>{count}</div>
                  <div className={`text-[11px] font-semibold uppercase tracking-wider mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                    {stage}
                  </div>
                  <div className={`mt-3 h-1 rounded-full overflow-hidden ${isDark ? "bg-white/[0.06]" : "bg-black/[0.06]"}`}>
                    <div className={`h-full rounded-full ${colors.bar} transition-all duration-500`} style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hot Leads */}
        {hot.length > 0 && (
          <div className="mb-14">
            <SectionHeading icon="🔥" title="Hot Leads" isDark={isDark} />
            <div className="grid md:grid-cols-2 gap-5">
              {hot.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => goToLead(lead.id)}
                  className={`relative overflow-hidden rounded-2xl p-6 border backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 cursor-pointer ${
                    isDark
                      ? "bg-gradient-to-br from-amber-500/[0.08] via-orange-500/[0.03] to-transparent border-amber-500/20 hover:shadow-2xl hover:shadow-amber-500/10"
                      : "bg-gradient-to-br from-amber-50 via-orange-50/60 to-white border-amber-200/70 hover:shadow-2xl hover:shadow-amber-300/30"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={lead.name} isDark={isDark} tone="amber" />
                      <div>
                        <div className="text-[15px] font-bold leading-tight">{lead.name}</div>
                        <div className={`text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                          {lead.company || "No company"}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`shrink-0 text-base font-bold px-3.5 py-1 rounded-full tabular-nums ${
                        isDark ? "text-amber-300 bg-amber-500/[0.12]" : "text-amber-700 bg-amber-100"
                      }`}
                    >
                      {lead.ai_score}/100
                    </div>
                  </div>
                  {lead.budget && (
                    <div className={`inline-flex items-center gap-1.5 text-sm mb-3 font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      <span>💰</span> {lead.budget}
                    </div>
                  )}
                  {lead.ai_reasoning && (
                    <p className={`text-sm mb-5 leading-relaxed ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      {lead.ai_reasoning}
                    </p>
                  )}
                  <div className="flex gap-3 flex-wrap">
                    <a
                      href={`mailto:${lead.email}?body=${encodeURIComponent(lead.ai_suggested_reply || "")}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-bold rounded-xl px-5 py-2.5 transition-all duration-200 shadow-lg hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/60 bg-lime-400 hover:bg-lime-300 text-black shadow-lime-500/20"
                    >
                      ✉️ Send Email
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateStatus(lead.id, "contacted");
                      }}
                      disabled={updatingId === lead.id}
                      className={`text-xs font-semibold rounded-xl px-5 py-2.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                        isDark
                          ? "bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10"
                          : "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200"
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

        {/* All Leads Table */}
        <div>
          <SectionHeading icon="📋" title="All Leads" isDark={isDark} />
          <div
            className={`rounded-2xl overflow-hidden border backdrop-blur-sm transition-colors duration-300 ${
              isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            {loading ? (
              <div className="p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-4 px-4 py-4 rounded-xl animate-pulse ${isDark ? "bg-white/[0.02]" : "bg-gray-50"} ${i !== 4 ? "mb-2" : ""}`}
                  >
                    <div className={`w-9 h-9 rounded-full ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
                    <div className="flex-1 space-y-2">
                      <div className={`h-3 w-1/4 rounded ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
                      <div className={`h-2.5 w-1/6 rounded ${isDark ? "bg-white/5" : "bg-gray-100"}`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : leads.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-3xl mb-3">📭</div>
                <p className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>No leads yet</p>
                <p className={`text-sm mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  Submit the form on the landing page to test.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr
                      className={`text-left border-b ${
                        isDark ? "text-gray-500 border-white/[0.08] bg-white/[0.02]" : "text-gray-500 border-gray-200 bg-gray-50/80"
                      }`}
                    >
                      <th className="p-4 font-semibold text-xs uppercase tracking-wider">Name</th>
                      <th className="p-4 font-semibold text-xs uppercase tracking-wider">Company</th>
                      <th className="p-4 font-semibold text-xs uppercase tracking-wider">Score</th>
                      <th className="p-4 font-semibold text-xs uppercase tracking-wider">Category</th>
                      <th className="p-4 font-semibold text-xs uppercase tracking-wider">Status</th>
                      <th className="p-4 font-semibold text-xs uppercase tracking-wider">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => goToLead(lead.id)}
                        className={`border-b transition-colors duration-150 cursor-pointer ${
                          isDark ? "border-white/[0.05] hover:bg-white/[0.03]" : "border-gray-100 hover:bg-gray-50/80"
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={lead.name} isDark={isDark} tone="lime" />
                            <span className="font-semibold">{lead.name}</span>
                          </div>
                        </td>
                        <td className={`p-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>{lead.company || "—"}</td>
                        <td className="p-4">
                          {lead.ai_score !== null ? (
                            <span
                              className={`font-semibold tabular-nums ${
                                lead.ai_score >= 70
                                  ? "text-emerald-400"
                                  : lead.ai_score >= 40
                                  ? "text-amber-400"
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
                        <td className="p-4">
                          {lead.ai_category ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                                lead.ai_category === "hot"
                                  ? isDark
                                    ? "bg-amber-500/[0.12] text-amber-300"
                                    : "bg-amber-100 text-amber-700"
                                  : lead.ai_category === "warm"
                                  ? isDark
                                    ? "bg-lime-500/[0.12] text-lime-300"
                                    : "bg-lime-100 text-lime-700"
                                  : isDark
                                  ? "bg-teal-500/[0.12] text-teal-300"
                                  : "bg-teal-100 text-teal-700"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  lead.ai_category === "hot" ? "bg-amber-400" : lead.ai_category === "warm" ? "bg-lime-400" : "bg-teal-400"
                                }`}
                              />
                              {lead.ai_category}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={lead.status}
                            onChange={(e) => updateStatus(lead.id, e.target.value)}
                            disabled={updatingId === lead.id}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-wait ${
                              isDark
                                ? "bg-white/[0.06] border border-white/10 text-white focus-visible:ring-lime-500/50"
                                : "bg-gray-50 border border-gray-200 text-gray-800 focus-visible:ring-lime-400/50"
                            }`}
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s} className={isDark ? "bg-gray-900" : ""}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className={`p-4 text-xs whitespace-nowrap tabular-nums ${isDark ? "text-gray-500" : "text-gray-400"}`}>
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
  );
}

function SectionHeading({ icon, title, isDark }: { icon: string; title: string; isDark: boolean }) {
  return (
    <h2 className={`text-lg font-bold mb-5 tracking-tight flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
      <span className="text-base">{icon}</span> {title}
    </h2>
  );
}

function Avatar({ name, isDark, tone = "lime" }: { name: string; isDark: boolean; tone?: "lime" | "amber" }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const toneClasses = tone === "amber" ? "bg-amber-400 text-black" : "bg-lime-400 text-black";
  return (
    <div
      className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${toneClasses} ${
        isDark ? "ring-2 ring-white/[0.06]" : "ring-2 ring-black/[0.03]"
      }`}
    >
      {initials || "?"}
    </div>
  );
}

const ACCENTS: Record<string, { icon: string; value: string; bar: string }> = {
  lime: { icon: "bg-lime-400/10 text-lime-400", value: "text-lime-400", bar: "bg-lime-400" },
  emerald: { icon: "bg-emerald-400/10 text-emerald-400", value: "text-emerald-400", bar: "bg-emerald-400" },
  amber: { icon: "bg-amber-400/10 text-amber-400", value: "text-amber-400", bar: "bg-amber-400" },
  teal: { icon: "bg-teal-400/10 text-teal-400", value: "text-teal-400", bar: "bg-teal-400" },
};

function StatCard({
  label,
  value,
  icon,
  accent,
  isDark,
}: {
  label: string;
  value: number;
  icon: string;
  accent: "lime" | "emerald" | "amber" | "teal";
  isDark: boolean;
}) {
  const a = ACCENTS[accent];
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl p-6 border backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${
        isDark
          ? "bg-white/[0.02] border-white/[0.08] hover:shadow-2xl hover:shadow-lime-500/[0.06]"
          : "bg-white border-gray-200 shadow-sm hover:shadow-2xl hover:shadow-gray-300/40"
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-0.5 ${a.bar} opacity-70`} />
      <div className="flex items-center justify-between">
        <span className={`flex items-center justify-center w-11 h-11 rounded-xl text-xl ${isDark ? a.icon : "bg-gray-50"}`}>{icon}</span>
        <span className={`text-4xl font-extrabold tabular-nums ${a.value}`}>{value}</span>
      </div>
      <div className={`text-sm font-medium mt-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{label}</div>
    </div>
  );
}