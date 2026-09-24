"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
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
  Phone,
  MessageCircle,
  Sun,
  Moon,
  LogOut,
  Users,
  TrendingUp,
  Flame,
  Award,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Menu,
} from "lucide-react";

const DEFAULT_WORKSPACE_NAME = "Workspace";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  budget: string | null;
  deal_value: number | null;
  message: string;
  ai_score: number | null;
  ai_category: string | null;
  ai_reasoning: string | null;
  ai_suggested_reply: string | null;
  ai_status: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  status: string;
  created_at: string;
};

const STAGES = ["new", "contacted", "qualified", "won", "lost"] as const;
const FOLLOW_UP_HOURS = 2;

type FilterType = "all" | "hot" | "qualified" | "followup" | "converted";

export default function DashboardPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [workspaceName, setWorkspaceName] = useState(
    DEFAULT_WORKSPACE_NAME
  );
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const searchRef = useRef<HTMLDivElement>(null);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const sidebar = document.getElementById("mobile-sidebar");
      const hamburger = document.getElementById("hamburger-btn");
      if (sidebar && !sidebar.contains(e.target as Node) && !hamburger?.contains(e.target as Node)) {
        setIsMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

        const userId = data.session.user.id;

        const { data: membership, error: membershipError } = await supabase
          .from("client_members")
          .select("client_id")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();

        if (!membershipError && membership?.client_id) {
          const { data: client, error: clientError } = await supabase
            .from("clients")
            .select("name")
            .eq("id", membership.client_id)
            .maybeSingle();

          if (!clientError && client?.name) {
            setWorkspaceName(client.name);
          }
        }

        setCheckingAuth(false);
        fetchLeads();
      }

      init();
    }, [router, fetchLeads]);

  // Click outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const total = leads.length;
  const qualified = leads.filter((l) => (l.ai_score ?? 0) >= 40).length;
  const hot = leads.filter((l) => getPriorityCategory(l.ai_score) === "hot");
  const converted = leads.filter((l) => l.status === "won").length;
  const pipelineValue = leads
  .filter(
    (l) =>
      l.status === "new" ||
      l.status === "contacted" ||
      l.status === "qualified"
  )
  .reduce((sum, l) => sum + (l.deal_value ?? 0), 0);

const potentialRevenue = leads
  .filter((l) => l.status === "qualified")
  .reduce((sum, l) => sum + (l.deal_value ?? 0), 0);

const wonRevenue = leads
  .filter((l) => l.status === "won")
  .reduce((sum, l) => sum + (l.deal_value ?? 0), 0);

const lostRevenue = leads
  .filter((l) => l.status === "lost")
  .reduce((sum, l) => sum + (l.deal_value ?? 0), 0);

  const needsFollowUp = leads.filter((l) => {
    if (l.next_follow_up_at && new Date(l.next_follow_up_at) <= new Date()) {
      return true;
    }
    if (l.status !== "new") return false;
    const hoursSinceCreated =
      (Date.now() - new Date(l.created_at).getTime()) / (1000 * 60 * 60);
    return hoursSinceCreated >= FOLLOW_UP_HOURS;
  });

  const pipelineCounts = STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, {});

  // Search results for dropdown
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.trim().toLowerCase();
    return leads
      .filter(
        (l) =>
          l.name.toLowerCase().includes(term) ||
          (l.company && l.company.toLowerCase().includes(term)) ||
          l.email.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [leads, searchTerm]);

  // Filtered leads for table
  const filteredLeads = useMemo(() => {
    let result = leads;
    if (filter === "hot") {
      result = result.filter((l) => getPriorityCategory(l.ai_score) === "hot");
    } else if (filter === "qualified") {
      result = result.filter((l) => (l.ai_score ?? 0) >= 40);
    } else if (filter === "followup") {
      result = result.filter((l) => needsFollowUp.includes(l));
    } else if (filter === "converted") {
      result = result.filter((l) => l.status === "won");
    }
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(term) ||
          (l.company && l.company.toLowerCase().includes(term)) ||
          l.email.toLowerCase().includes(term)
      );
    }
    return result;
  }, [leads, filter, searchTerm, needsFollowUp]);

  const hotLeads = useMemo(() => {
    return leads.filter((l) => getPriorityCategory(l.ai_score) === "hot");
  }, [leads]);

  if (checkingAuth) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-700 ${
          isDark ? "bg-[#0b0b0f]" : "bg-[#f6f8fc]"
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <span className="absolute inset-0 rounded-full bg-blue-500/30 blur-2xl animate-pulse" />
            <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
          </div>
          <span
            className={`text-sm font-medium tracking-widest uppercase ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Loading session…
          </span>
        </div>
      </div>
    );
  }

  const navItems: { label: string; value: FilterType; icon: ReactNode; count: number }[] = [
    { label: "All Leads", value: "all", icon: <Users className="w-4 h-4" />, count: total },
    { label: "Hot Leads", value: "hot", icon: <Flame className="w-4 h-4" />, count: hot.length },
    { label: "Qualified", value: "qualified", icon: <TrendingUp className="w-4 h-4" />, count: qualified },
    { label: "Follow‑up", value: "followup", icon: <span className="text-base">⏰</span>, count: needsFollowUp.length },
    { label: "Converted", value: "converted", icon: <Award className="w-4 h-4" />, count: converted },
  ];

  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        className={`min-h-screen flex font-['Inter',system-ui,sans-serif] antialiased transition-colors duration-700 ${
          isDark ? "bg-[#0b0b0f] text-gray-100" : "bg-[#f6f8fc] text-gray-900"
        }`}
      >
        {/* ===== LEFT SIDEBAR – desktop (always visible on lg+) ===== */}
        <aside
          className={`hidden lg:flex shrink-0 h-screen sticky top-0 overflow-y-auto border-r transition-all duration-500 ${
            isCollapsed ? "w-20" : "w-72"
          } ${
            isDark
              ? "bg-[#111118]/90 backdrop-blur-xl border-white/[0.06]"
              : "bg-white/80 backdrop-blur-xl border-gray-200/60"
          }`}
        >
          <div className={`flex flex-col h-full px-3 py-8 ${isCollapsed ? "items-center" : "px-6"}`}>
            {/* Brand + Collapse button */}
            <div className={`flex items-center gap-3 mb-10 ${isCollapsed ? "flex-col" : ""}`}>
              <div className="relative">
                <span className="absolute inset-0 rounded-2xl bg-blue-500/30 blur-xl animate-pulse" />
                <span className="relative flex items-center justify-center w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
                  <Rocket className="w-5 h-5" strokeWidth={2.5} />
                </span>
              </div>
              {!isCollapsed && (
                <div className="leading-tight min-w-0 flex-1">
                  <h1
                    className={`text-lg font-extrabold tracking-[-0.02em] truncate bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent`}
                  >
                    AI Command
                  </h1>
                  <p
                    className={`text-[2xl] font-bold tracking-wide truncate ${
                      isDark ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    {workspaceName}
                  </p>
                </div>
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                  isDark
                    ? "hover:bg-white/10 text-gray-400 hover:text-white"
                    : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                }`}
                aria-label="Toggle sidebar"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            {/* Navigation */}
            <nav className="space-y-0.5 flex-1 w-full">
              {navItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setFilter(item.value)}
                  className={`group flex items-center justify-between w-full rounded-xl text-sm font-medium transition-all duration-300 ${
                    isCollapsed ? "px-2 py-3 justify-center" : "px-4 py-2.5"
                  } ${
                    filter === item.value
                      ? isDark
                        ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 shadow-lg shadow-blue-500/10 ring-1 ring-white/10"
                        : "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 shadow-sm ring-1 ring-blue-500/10"
                      : isDark
                      ? "hover:bg-white/5 text-gray-300 hover:text-white"
                      : "hover:bg-gray-100/70 text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <span className={`flex items-center ${isCollapsed ? "" : "gap-3"}`}>
                    <span
                      className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
                        filter === item.value
                          ? isDark
                            ? "bg-blue-500/30 text-blue-400"
                            : "bg-blue-100 text-blue-600"
                          : isDark
                          ? "bg-white/5 text-gray-400 group-hover:text-white"
                          : "bg-gray-100 text-gray-600 group-hover:text-gray-900"
                      }`}
                    >
                      {item.icon}
                    </span>
                    {!isCollapsed && item.label}
                  </span>
                  {!isCollapsed && (
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        filter === item.value
                          ? isDark
                            ? "text-blue-400"
                            : "text-blue-600"
                          : isDark
                          ? "text-gray-500"
                          : "text-gray-400"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* Bottom controls */}
            <div className={`pt-6 border-t border-white/10 space-y-2.5 w-full ${isCollapsed ? "items-center" : ""}`}>
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className={`group flex items-center justify-between w-full rounded-xl text-sm transition-all duration-300 ${
                  isCollapsed ? "px-2 py-3 justify-center" : "px-4 py-2.5"
                } ${
                  isDark
                    ? "hover:bg-white/5 text-gray-300 hover:text-white"
                    : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                }`}
              >
                <span className="flex items-center gap-3">
                  {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  {!isCollapsed && (isDark ? "Dark" : "Light")}
                </span>
                {!isCollapsed && (
                  <span
                    className={`w-8 h-4 rounded-full transition-colors ${
                      isDark ? "bg-blue-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`block w-3 h-3 rounded-full bg-white transform transition-transform mt-0.5 ml-0.5 ${
                        isDark ? "translate-x-4" : ""
                      }`}
                    />
                  </span>
                )}
              </button>

              <button
                onClick={handleSignOut}
                className={`group flex items-center gap-3 w-full rounded-xl text-sm transition-all duration-300 ${
                  isCollapsed ? "px-2 py-3 justify-center" : "px-4 py-2.5"
                } ${
                  isDark
                    ? "hover:bg-white/5 text-gray-300 hover:text-white"
                    : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                }`}
              >
                <LogOut className="w-4 h-4" />
                {!isCollapsed && "Sign out"}
              </button>
            </div>
          </div>
        </aside>

        {/* ===== MOBILE SIDEBAR (overlay) ===== */}
        <div
          id="mobile-sidebar"
          className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out ${
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          } ${
            isDark
              ? "bg-[#111118]/95 backdrop-blur-xl border-r border-white/[0.06]"
              : "bg-white/95 backdrop-blur-xl border-r border-gray-200/60"
          }`}
        >
          <div className="flex flex-col h-full px-6 py-8">
            {/* Brand */}
            <div className="flex items-center gap-3 mb-10">
              <div className="relative">
                <span className="absolute inset-0 rounded-2xl bg-blue-500/30 blur-xl animate-pulse" />
                <span className="relative flex items-center justify-center w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
                  <Rocket className="w-5 h-5" strokeWidth={2.5} />
                </span>
              </div>
              <div className="leading-tight min-w-0 flex-1">
                <h1 className="text-lg font-extrabold tracking-[-0.02em] truncate bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  AI Command
                </h1>
                <p className={`text-[2xl] font-bold tracking-wide truncate ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  {workspaceName}
                </p>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className={`p-2 rounded-lg ${isDark ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="space-y-1 flex-1 w-full">
              {navItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => {
                    setFilter(item.value);
                    setIsMobileOpen(false);
                  }}
                  className={`flex items-center justify-between w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
                    filter === item.value
                      ? isDark
                        ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 shadow-lg shadow-blue-500/10 ring-1 ring-white/10"
                        : "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 shadow-sm ring-1 ring-blue-500/10"
                      : isDark
                      ? "hover:bg-white/5 text-gray-300 hover:text-white"
                      : "hover:bg-gray-100/70 text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
                        filter === item.value
                          ? isDark
                            ? "bg-blue-500/30 text-blue-400"
                            : "bg-blue-100 text-blue-600"
                          : isDark
                          ? "bg-white/5 text-gray-400 group-hover:text-white"
                          : "bg-gray-100 text-gray-600 group-hover:text-gray-900"
                      }`}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </span>
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      filter === item.value
                        ? isDark
                          ? "text-blue-400"
                          : "text-blue-600"
                        : isDark
                        ? "text-gray-500"
                        : "text-gray-400"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              ))}
            </nav>

            {/* Bottom controls */}
            <div className="pt-6 border-t border-white/10 space-y-2.5 w-full">
              <button
                onClick={toggleTheme}
                className={`flex items-center justify-between w-full rounded-xl px-4 py-2.5 text-sm transition-all duration-300 ${
                  isDark
                    ? "hover:bg-white/5 text-gray-300 hover:text-white"
                    : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                }`}
              >
                <span className="flex items-center gap-3">
                  {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  {isDark ? "Dark" : "Light"}
                </span>
                <span
                  className={`w-8 h-4 rounded-full transition-colors ${isDark ? "bg-blue-500" : "bg-gray-300"}`}
                >
                  <span
                    className={`block w-3 h-3 rounded-full bg-white transform transition-transform mt-0.5 ml-0.5 ${
                      isDark ? "translate-x-4" : ""
                    }`}
                  />
                </span>
              </button>

              <button
                onClick={handleSignOut}
                className={`flex items-center gap-3 w-full rounded-xl px-4 py-2.5 text-sm transition-all duration-300 ${
                  isDark
                    ? "hover:bg-white/5 text-gray-300 hover:text-white"
                    : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                }`}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Mobile backdrop */}
        {isMobileOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10">
          {/* Header: Dashboard | Search | Date+Time */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 md:mb-10">
            {/* Left: Dashboard title + hamburger */}
            <div className="flex-shrink-0 flex items-center gap-3">
              {/* Hamburger button (mobile) */}
              <button
                id="hamburger-btn"
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200"
              >
                <Menu className={`w-5 h-5 ${isDark ? "text-gray-300" : "text-gray-700"}`} />
              </button>

              <div>
                <div className="flex items-center gap-3">
                  <h2
                    className={`text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Dashboard
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        isDark
                          ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400"
                          : "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600"
                      }`}
                    >
                      {filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </span>
                  </h2>
                  <span className="text-xs font-mono text-gray-400">({filteredLeads.length})</span>
                </div>
                <p
                  className={`text-xs sm:text-sm mt-0.5 ${
                    isDark ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  <Sparkles className="inline w-3.5 h-3.5 mr-1 text-blue-400" />
                  {filteredLeads.length} leads currently in view
                </p>
              </div>
            </div>

            {/* Center: Search */}
            <div className="flex-1 max-w-md mx-auto w-full" ref={searchRef}>
              <div
                className={`relative flex items-center rounded-full px-4 sm:px-5 py-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500/50 ${
                  isDark
                    ? "bg-[#1a1a24] border border-white/10 focus-within:border-blue-400/50"
                    : "bg-white border border-gray-200 shadow-md focus-within:border-blue-400/50"
                }`}
              >
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Catch the Lead"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  className={`bg-transparent border-none focus:outline-none text-sm w-full ${
                    isDark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400"
                  }`}
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setShowSearchResults(false);
                    }}
                    className="ml-2 p-0.5 rounded-full hover:bg-gray-200/50 dark:hover:bg-white/10 transition"
                  >
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}

                {/* Search Dropdown */}
                {showSearchResults && searchTerm.trim() && searchResults.length > 0 && (
                  <div
                    className={`absolute top-full left-0 right-0 mt-2 rounded-2xl border shadow-2xl overflow-hidden z-50 ${
                      isDark
                        ? "bg-[#1a1a24] border-white/10"
                        : "bg-white border-gray-200 shadow-xl"
                    }`}
                  >
                    <div className="py-2 max-h-64 overflow-y-auto">
                      {searchResults.map((lead) => (
                        <button
                          key={lead.id}
                          onClick={() => {
                            goToLead(lead.id);
                            setShowSearchResults(false);
                            setSearchTerm("");
                          }}
                          className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                            isDark
                              ? "hover:bg-white/5 text-gray-200"
                              : "hover:bg-gray-50 text-gray-800"
                          }`}
                        >
                          <Avatar name={lead.name} isDark={isDark} small />
                          <div className="flex flex-col items-start min-w-0">
                            <span className="font-medium truncate">{lead.name}</span>
                            {lead.company && (
                              <span className={`text-xs truncate ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                {lead.company}
                              </span>
                            )}
                          </div>
                          {lead.ai_score !== null && (
                            <span className={`ml-auto text-xs font-mono tabular-nums ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                              {lead.ai_score}/100
                            </span>
                          )}
                        </button>
                      ))}
                      {searchResults.length > 0 && searchResults.length < leads.filter(l => 
                        l.name.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
                        (l.company && l.company.toLowerCase().includes(searchTerm.trim().toLowerCase())) ||
                        l.email.toLowerCase().includes(searchTerm.trim().toLowerCase())
                      ).length && (
                        <div className={`px-4 py-2 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          + more results in table below
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Date + Real-time clock */}
            <div className="flex-shrink-0 text-right hidden sm:block">
              <div className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                {currentTime.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className={`text-xs font-mono tabular-nums ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                {currentTime.toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            </div>
          </div>

          {/* Pipeline KPIs – upgraded with gradient glow */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-8 sm:mb-10 md:mb-12">
            {STAGES.map((stage) => {
              const count = pipelineCounts[stage] || 0;
              const share = total > 0 ? Math.round((count / total) * 100) : 0;
              const labels: Record<string, string> = {
                new: "New",
                contacted: "Contacted",
                qualified: "Qualified",
                won: "Won",
                lost: "Lost",
              };
              const colorMap: Record<string, string> = {
                new: "from-blue-400 to-blue-500",
                contacted: "from-cyan-400 to-cyan-500",
                qualified: "from-emerald-400 to-emerald-500",
                won: "from-purple-400 to-purple-500",
                lost: "from-gray-400 to-gray-500",
              };
              const glowMap: Record<string, string> = {
                new: "shadow-blue-500/20",
                contacted: "shadow-cyan-500/20",
                qualified: "shadow-emerald-500/20",
                won: "shadow-purple-500/20",
                lost: "shadow-gray-500/20",
              };
              return (
                <div
                  key={stage}
                  className={`group relative overflow-hidden rounded-2xl p-4 sm:p-5 md:p-6 text-center border transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl ${glowMap[stage]} ${
                    isDark
                      ? "bg-[#111118] border-white/[0.06] hover:border-white/[0.12]"
                      : "bg-white border-gray-200/70 shadow-sm hover:shadow-xl"
                  }`}
                >
                  <div
                    className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br ${colorMap[stage]} blur-3xl`}
                    style={{ opacity: 0.1 }}
                  />
                  <div className="relative">
                    <div
                      className={`text-2xl sm:text-3xl md:text-4xl font-light tracking-tight tabular-nums ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {count}
                    </div>
                    <div
                      className={`text-[8px] sm:text-[10px] font-semibold uppercase tracking-[0.08em] mt-1 ${
                        isDark ? "text-gray-500" : "text-gray-500"
                      }`}
                    >
                      {labels[stage] || stage}
                    </div>
                    <div
                      className={`mt-2 sm:mt-3 h-1.5 rounded-full overflow-hidden ${
                        isDark ? "bg-white/[0.08]" : "bg-gray-200"
                      }`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${colorMap[stage]}`}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            {/* Revenue Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10 md:mb-12">
            {[
              {
                label: "Pipeline Value",
                value: pipelineValue,
                icon: <BarChart3 className="w-4 h-4" />,
                iconBg: "bg-blue-500/10",
                iconText: "text-blue-400",
              },
              {
                label: "Potential Revenue",
                value: potentialRevenue,
                icon: <TrendingUp className="w-4 h-4" />,
                iconBg: "bg-emerald-500/10",
                iconText: "text-emerald-400",
              },
              {
                label: "Won Revenue",
                value: wonRevenue,
                icon: <Trophy className="w-4 h-4" />,
                iconBg: "bg-purple-500/10",
                iconText: "text-purple-400",
              },
              {
                label: "Lost Revenue",
                value: lostRevenue,
                icon: <X className="w-4 h-4" />,
                iconBg: "bg-red-500/10",
                iconText: "text-red-400",
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className={`rounded-2xl p-4 sm:p-5 border transition-all duration-300 hover:-translate-y-1 ${
                  isDark
                    ? "bg-[#111118] border-white/[0.06] hover:border-white/[0.12]"
                    : "bg-white border-gray-200/70 shadow-sm hover:shadow-md"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span
                    className={`flex items-center justify-center w-9 h-9 rounded-xl ${metric.iconBg} ${metric.iconText}`}
                  >
                    {metric.icon}
                  </span>

                  <Wallet
                    className={`w-4 h-4 ${
                      isDark ? "text-gray-600" : "text-gray-300"
                    }`}
                  />
                </div>

                <div
                  className={`text-xl sm:text-2xl font-semibold tracking-tight tabular-nums ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  }).format(metric.value)}
                </div>

                <div
                  className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider mt-1 ${
                    isDark ? "text-gray-500" : "text-gray-500"
                  }`}
                >
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
          {/* Needs Follow-Up */}
          {(filter === "all" || filter === "followup") && needsFollowUp.length > 0 && (
            <div className="mb-8 sm:mb-10 md:mb-12">
              <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-gray-200/70 dark:border-white/[0.06]">
                <h3
                  className={`text-sm font-semibold tracking-tight flex items-center gap-2 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  <span className="text-base">⏰</span> Needs Follow-Up ({needsFollowUp.length})
                </h3>
              </div>
              <div
                className={`rounded-2xl p-4 sm:p-6 border transition-all duration-300 ${
                  isDark
                    ? "bg-[#111118] border-white/[0.06] hover:border-white/[0.12]"
                    : "bg-white border-gray-200/70 shadow-sm hover:shadow-md"
                }`}
              >
                <p
                  className={`text-sm mb-4 sm:mb-5 ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  These leads have been sitting for over {FOLLOW_UP_HOURS} hours
                  without a response.
                </p>
                <div className="space-y-2 sm:space-y-3">
                  {needsFollowUp.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => goToLead(lead.id)}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-xl px-4 sm:px-6 py-3 sm:py-4 cursor-pointer transition-all duration-300 ${
                        isDark
                          ? "bg-white/[0.03] hover:bg-white/[0.06]"
                          : "bg-gray-50/50 hover:bg-gray-100/70"
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
                      <div className="flex gap-1.5 sm:gap-2 shrink-0 flex-wrap">
                        {lead.phone && (
                          <a
                            href={"tel:" + lead.phone}
                            onClick={(e) => e.stopPropagation()}
                            className={`flex items-center gap-1.5 text-xs font-medium rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 transition ${
                              isDark
                                ? "bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10"
                                : "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200"
                            }`}
                          >
                            <Phone className="w-3.5 h-3.5" /> Call
                          </a>
                        )}
                        {lead.phone && (
                          <a
                            href={
                              "https://wa.me/" +
                              lead.phone.replace(/[^\d]/g, "") +
                              "?text=" +
                              encodeURIComponent(
                                lead.ai_suggested_reply ||
                                  "Hi " +
                                    lead.name +
                                    ", following up on your enquiry."
                              )
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-xs font-medium rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-white transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        )}
                        <a
                          href={`mailto:${lead.email}?body=${encodeURIComponent(
                            lead.ai_suggested_reply || ""
                          )}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs font-medium rounded-xl px-3 sm:px-5 py-1.5 sm:py-2 transition-all duration-200 bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          <Mail className="w-3.5 h-3.5" /> Email
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(lead.id, "contacted");
                          }}
                          disabled={updatingId === lead.id}
                          className={`text-xs font-medium rounded-xl px-3 sm:px-5 py-1.5 sm:py-2 transition-all duration-200 disabled:opacity-50 ${
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
            </div>
          )}

          {/* Hot Leads */}
          {(filter === "all" || filter === "hot") && hotLeads.length > 0 && (
            <div className="mb-8 sm:mb-10 md:mb-12">
              <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-gray-200/70 dark:border-white/[0.06]">
                <h3
                  className={`text-sm font-semibold tracking-tight flex items-center gap-2 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  <span className="text-base">🔥</span> Hot Leads ({hotLeads.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {hotLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => goToLead(lead.id)}
                    className={`rounded-2xl p-5 sm:p-7 border transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl cursor-pointer ${
                      isDark
                        ? "bg-[#111118] border-white/[0.06] hover:border-white/[0.12]"
                        : "bg-white border-gray-200/70 shadow-sm hover:shadow-xl"
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
                    <div className="flex gap-2 sm:gap-3 flex-wrap">
                      {lead.phone && (
                        <a
                          href={"tel:" + lead.phone}
                          onClick={(e) => e.stopPropagation()}
                          className={`flex items-center gap-1.5 text-xs font-medium rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 transition ${
                            isDark
                              ? "bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200"
                          }`}
                        >
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>
                      )}
                      {lead.phone && (
                        <a
                          href={
                            "https://wa.me/" +
                            lead.phone.replace(/[^\d]/g, "") +
                            "?text=" +
                            encodeURIComponent(
                              lead.ai_suggested_reply ||
                                "Hi " +
                                  lead.name +
                                  ", following up on your enquiry."
                            )
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs font-medium rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white shadow-sm transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      )}
                      <a
                        href={`mailto:${lead.email}?body=${encodeURIComponent(
                          lead.ai_suggested_reply || ""
                        )}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-xs font-medium rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 transition-all duration-200 bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
                      >
                        <Mail className="w-3.5 h-3.5" /> Send Email
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(lead.id, "contacted");
                        }}
                        disabled={updatingId === lead.id}
                        className={`text-xs font-medium rounded-xl px-4 sm:px-6 py-2 sm:py-2.5 transition-all duration-200 disabled:opacity-50 ${
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

          {/* All Leads Table */}
          <div>
            <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-gray-200/70 dark:border-white/[0.06]">
              <h3
                className={`text-sm font-semibold tracking-tight flex items-center gap-2 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                <ClipboardList className="w-4 h-4" /> All Leads ({filteredLeads.length})
              </h3>
            </div>
            <div
              className={`rounded-2xl overflow-hidden border transition-all duration-300 ${
                isDark
                  ? "bg-[#111118]/80 backdrop-blur-sm border-white/[0.06]"
                  : "bg-white/80 backdrop-blur-sm border-gray-200/70 shadow-sm"
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
              ) : filteredLeads.length === 0 ? (
                <div className="p-12 sm:p-16 text-center">
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
                    No leads found
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      isDark ? "text-gray-500" : "text-gray-500"
                    }`}
                  >
                    Try adjusting your filter or search.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[640px]">
                    <thead>
                      <tr
                        className={`text-left border-b ${
                          isDark
                            ? "text-gray-500 border-white/[0.06] bg-white/[0.02]"
                            : "text-gray-500 border-gray-200 bg-gray-50/50"
                        }`}
                      >
                        <th className="px-4 sm:px-5 py-3 sm:py-4 font-medium text-xs uppercase tracking-[0.08em]">
                          Name
                        </th>
                        <th className="px-4 sm:px-5 py-3 sm:py-4 font-medium text-xs uppercase tracking-[0.08em]">
                          Company
                        </th>
                        <th className="px-4 sm:px-5 py-3 sm:py-4 font-medium text-xs uppercase tracking-[0.08em] text-right">
                          Score
                        </th>
                        <th className="px-4 sm:px-5 py-3 sm:py-4 font-medium text-xs uppercase tracking-[0.08em]">
                          Category
                        </th>
                        <th className="px-4 sm:px-5 py-3 sm:py-4 font-medium text-xs uppercase tracking-[0.08em]">
                          Status
                        </th>
                        <th className="px-4 sm:px-5 py-3 sm:py-4 font-medium text-xs uppercase tracking-[0.08em] text-right">
                          Submitted
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => (
                        <tr
                          key={lead.id}
                          onClick={() => goToLead(lead.id)}
                          className={`border-b transition-colors duration-150 cursor-pointer ${
                            isDark
                              ? "border-white/[0.05] hover:bg-white/[0.02]"
                              : "border-gray-100 hover:bg-gray-50/50"
                          }`}
                        >
                          <td className="px-4 sm:px-5 py-3 sm:py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={lead.name} isDark={isDark} />
                              <span className="font-medium">{lead.name}</span>
                            </div>
                          </td>
                          <td
                            className={`px-4 sm:px-5 py-3 sm:py-4 ${
                              isDark ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            {lead.company || "—"}
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-4 text-right">
                            {lead.ai_score !== null ? (
                              <span
                                className={`font-medium tabular-nums ${
                                  lead.ai_score >= 70
                                    ? isDark
                                      ? "text-blue-300"
                                      : "text-blue-600"
                                    : lead.ai_score >= 40
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
                            lead.ai_status === "processing"
                              ? "Processing..."
                              : lead.ai_status === "failed"
                              ? "Unavailable"
                              : "—"
                          )}
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-4">
                            {lead.ai_score !== null ? (
                              (() => {
                                const meta = getPriorityMeta(lead.ai_score);
                                const label = meta.category;
                                return (
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium capitalize ${
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
                              lead.ai_status === "processing"
                                ? "Processing"
                                : lead.ai_status === "failed"
                                ? "Unavailable"
                                : "—"
                            )}
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={lead.status}
                              onChange={(e) =>
                                updateStatus(lead.id, e.target.value)
                              }
                              disabled={updatingId === lead.id}
                              className={`rounded-lg px-2 sm:px-3 py-1.5 text-xs font-medium capitalize cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 disabled:opacity-50 ${
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
                            className={`px-4 sm:px-5 py-3 sm:py-4 text-xs whitespace-nowrap tabular-nums text-right ${
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

// --- Helper Components ---

function Avatar({ name, isDark, small }: { name: string; isDark: boolean; small?: boolean }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const size = small ? "w-8 h-8 text-[10px]" : "w-10 h-10 text-xs";
  return (
    <div
      className={`shrink-0 rounded-full flex items-center justify-center font-medium ${size} ${
        isDark
          ? "bg-gradient-to-br from-white/10 to-white/5 text-gray-200 ring-1 ring-white/10"
          : "bg-gradient-to-br from-gray-200 to-gray-100 text-gray-700 ring-1 ring-gray-200"
      }`}
    >
      {initials || "?"}
    </div>
  );
}