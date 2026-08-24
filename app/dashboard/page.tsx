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

export default function DashboardPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0b12] text-gray-400">
        Checking session...
      </div>
    );
  }

  const total = leads.length;
  const qualified = leads.filter((l) => (l.ai_score ?? 0) >= 40).length;
  const hot = leads.filter((l) => l.ai_category === "hot");
  const converted = leads.filter((l) => l.status === "won").length;

  const pipelineCounts = STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-[#0b0b12] text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">AI Lead Command Center</h1>
            <p className="text-gray-400 text-sm mt-1">
              Live lead pipeline, powered by AI scoring
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-400 hover:text-white border border-white/10 rounded-lg px-4 py-2"
          >
            Sign out
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Leads" value={total} />
          <StatCard label="Qualified" value={qualified} />
          <StatCard label="Hot Leads" value={hot.length} accent="text-orange-400" />
          <StatCard label="Converted" value={converted} accent="text-green-400" />
        </div>

        {/* Pipeline */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Lead Pipeline</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {STAGES.map((stage) => (
              <div
                key={stage}
                className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
              >
                <div className="text-2xl font-bold">
                  {pipelineCounts[stage] || 0}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">
                  {stage}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hot leads */}
        {hot.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-3">🔥 Hot Leads</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {hot.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white/5 border border-orange-500/30 rounded-xl p-5"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold">{lead.name}</div>
                      <div className="text-sm text-gray-400">
                        {lead.company || "No company"}
                      </div>
                    </div>
                    <div className="text-orange-400 font-bold text-lg">
                      {lead.ai_score}/100
                    </div>
                  </div>
                  {lead.budget && (
                    <div className="text-sm text-gray-400 mb-2">
                      Budget: {lead.budget}
                    </div>
                  )}
                  {lead.ai_reasoning && (
                    <p className="text-sm text-gray-300 mb-3">
                      {lead.ai_reasoning}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href={`mailto:${lead.email}?body=${encodeURIComponent(
                        lead.ai_suggested_reply || ""
                      )}`}
                      className="text-xs bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5"
                    >
                      Send Email
                    </a>
                    <button
                      onClick={() => updateStatus(lead.id, "contacted")}
                      disabled={updatingId === lead.id}
                      className="text-xs bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5"
                    >
                      Mark Contacted
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All leads table */}
        <div>
          <h2 className="text-lg font-semibold mb-3">All Leads</h2>
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-x-auto">
            {loading ? (
              <div className="p-6 text-gray-400 text-sm">Loading leads...</div>
            ) : leads.length === 0 ? (
              <div className="p-6 text-gray-400 text-sm">
                No leads yet — submit the form on the landing page to test.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-white/10">
                    <th className="p-3">Name</th>
                    <th className="p-3">Company</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-white/5">
                      <td className="p-3">{lead.name}</td>
                      <td className="p-3 text-gray-400">
                        {lead.company || "—"}
                      </td>
                      <td className="p-3">
                        {lead.ai_score !== null ? `${lead.ai_score}/100` : "—"}
                      </td>
                      <td className="p-3 capitalize">
                        {lead.ai_category || "—"}
                      </td>
                      <td className="p-3">
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            updateStatus(lead.id, e.target.value)
                          }
                          disabled={updatingId === lead.id}
                          className="bg-white/10 border border-white/10 rounded px-2 py-1 text-xs"
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-gray-400 text-xs">
                        {new Date(lead.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className={`text-3xl font-bold ${accent || ""}`}>{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  );
}
