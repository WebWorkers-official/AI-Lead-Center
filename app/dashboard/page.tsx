"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { ReactNode, MouseEvent as ReactMouseEvent } from "react";
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
  Menu,
  Clock,
  ArrowUpRight,
  CalendarClock,
  PieChart,
} from "lucide-react";

const DEFAULT_WORKSPACE_NAME = "Workspace";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  source: string | null;
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

type FilterType = "all" | "hot" | "followup" | "qualified" | "converted" | "lost";

type SortType =
  | "newest"
  | "oldest"
  | "score_high"
  | "score_low"
  | "value_high"
  | "value_low";

const SORT_OPTIONS: { value: SortType; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "score_high", label: "Highest Score" },
  { value: "score_low", label: "Lowest Score" },
  { value: "value_high", label: "Highest Deal Value" },
  { value: "value_low", label: "Lowest Deal Value" },
];

// Shared lead definitions: sidebar counts and views both use these, so they cannot drift apart.
// A missing AI score is never treated as hot.
const isHotLead = (l: Lead) =>
  l.ai_score !== null && getPriorityCategory(l.ai_score) === "hot";
const isActiveHotLead = (l: Lead) => isHotLead(l) && l.status !== "won";
const isActiveQualifiedLead = (l: Lead) =>
  (l.ai_score ?? 0) >= 40 && l.status !== "won";

// Case-insensitive partial match across the lead fields loaded on the dashboard
function matchesSearch(lead: Lead, rawTerm: string) {
  const term = rawTerm.trim().toLowerCase();
  if (!term) return true;
  const text = [lead.name, lead.email, lead.phone, lead.source, lead.message]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (text.includes(term)) return true;
  // Phone numbers: ignore spaces, dashes and brackets when the query looks like a number
  if (lead.phone && /^[\d\s()+-]+$/.test(term)) {
    const digits = term.replace(/\D/g, "");
    return digits.length > 0 && lead.phone.replace(/\D/g, "").includes(digits);
  }
  return false;
}

// Numeric comparator that always keeps empty values at the bottom
function byNumber(get: (l: Lead) => number | null, dir: 1 | -1) {
  return (a: Lead, b: Lead) => {
    const x = get(a);
    const y = get(b);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return (x - y) * dir;
  };
}

type NavItem = {
  label: string;
  value: FilterType;
  icon: ReactNode;
  count: number;
};

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
};

const STAGE_COLORS: Record<string, string> = {
  new: "from-blue-400 to-blue-500",
  contacted: "from-cyan-400 to-cyan-500",
  qualified: "from-emerald-400 to-emerald-500",
  won: "from-purple-400 to-purple-500",
  lost: "from-gray-400 to-gray-500",
};

const STAGE_DOT: Record<string, string> = {
  new: "bg-blue-400",
  contacted: "bg-cyan-400",
  qualified: "bg-emerald-400",
  won: "bg-purple-400",
  lost: "bg-gray-400",
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50";

// --- Design tokens (presentation only) ---

const DARK = {
  page: "bg-[#0b0b0f] text-gray-100 selection:bg-emerald-500/30",
  card: "bg-[#121218] border-white/[0.07]",
  inner: "bg-white/[0.025] border-white/[0.06]",
  innerHover: "hover:bg-white/[0.045] hover:border-white/[0.1]",
  head: "bg-[#16161d]",
  title: "text-white",
  text: "text-gray-300",
  muted: "text-gray-400",
  faint: "text-gray-500",
  track: "bg-white/[0.07]",
  line: "border-white/[0.06]",
  hover: "hover:bg-white/[0.04]",
  btn: "bg-white/[0.04] hover:bg-white/[0.09] text-gray-200 ring-1 ring-inset ring-white/[0.08]",
  field: "bg-white/[0.04] ring-white/[0.08] text-gray-200 hover:bg-white/[0.07]",
  sidebar: "bg-[#0e0e13] border-white/[0.06]",
  menu: "bg-[#17171f] border-white/[0.08] shadow-black/40",
  chip: "bg-white/[0.04] text-gray-400 ring-white/[0.06]",
};

type Theme = typeof DARK;

const LIGHT: Theme = {
  page: "bg-[#f4f6fa] text-gray-900 selection:bg-emerald-500/20",
  card: "bg-white border-gray-200/80 shadow-sm",
  inner: "bg-gray-50/70 border-gray-100",
  innerHover: "hover:bg-white hover:border-gray-200",
  head: "bg-gray-50",
  title: "text-gray-900",
  text: "text-gray-700",
  muted: "text-gray-500",
  faint: "text-gray-400",
  track: "bg-gray-100",
  line: "border-gray-200/70",
  hover: "hover:bg-gray-50",
  btn: "bg-white hover:bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-200 hover:ring-gray-300",
  field: "bg-white ring-gray-200 text-gray-700 hover:bg-gray-50",
  sidebar: "bg-white border-gray-200/70",
  menu: "bg-white border-gray-200 shadow-gray-200/60",
  chip: "bg-gray-50 text-gray-600 ring-gray-200",
};

const ACCENTS = {
  blue: { chip: "bg-blue-500/10 text-blue-500", bar: "bg-blue-500", hex: "#3b82f6" },
  red: { chip: "bg-red-500/10 text-red-500", bar: "bg-red-500", hex: "#f87171" },
  emerald: { chip: "bg-emerald-500/10 text-emerald-500", bar: "bg-emerald-500", hex: "#34d399" },
  amber: { chip: "bg-amber-500/10 text-amber-500", bar: "bg-amber-500", hex: "#fbbf24" },
  purple: { chip: "bg-purple-500/10 text-purple-500", bar: "bg-purple-500", hex: "#a78bfa" },
  cyan: { chip: "bg-cyan-500/10 text-cyan-500", bar: "bg-cyan-500", hex: "#22d3ee" },
};
type AccentKey = keyof typeof ACCENTS;

type KpiItem = {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent: AccentKey;
  hint: string;
  share: number;
  trendUp?: boolean;
  spark?: number[];
};

// Relative label for a follow-up date
function formatDue(iso: string, now: number) {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hrs = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const span = mins < 60 ? `${Math.max(mins, 1)}m` : hrs < 24 ? `${hrs}h` : `${days}d`;
  if (diff < 0) return { text: `Overdue ${span}`, tone: "overdue" as const };
  if (diff < 86400000) return { text: `In ${span}`, tone: "soon" as const };
  return { text: `In ${span}`, tone: "later" as const };
}

export default function DashboardPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [workspaceName, setWorkspaceName] = useState(DEFAULT_WORKSPACE_NAME);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortType>("newest");
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
      if (window.innerWidth >= 1024) setIsMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const sidebar = document.getElementById("mobile-sidebar");
      const hamburger = document.getElementById("hamburger-btn");
      if (
        sidebar &&
        !sidebar.contains(e.target as Node) &&
        !hamburger?.contains(e.target as Node)
      ) {
        setIsMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape closes the mobile sidebar and the search dropdown
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileOpen(false);
        setShowSearchResults(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light") setIsDark(false);
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

    if (!error && data) setLeads(data as Lead[]);
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
        .select("client_id, role")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (membershipError || !membership || membership.role !== "owner") {
        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      if (membership.client_id) {
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .select("name")
          .eq("id", membership.client_id)
          .maybeSingle();

        if (!clientError && client?.name) setWorkspaceName(client.name);
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
      .update({
        status,
        ...(status === "won" || status === "lost"
          ? { next_follow_up_at: null }
          : {}),
      })
      .eq("id", id);

    if (!error) {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === id
            ? {
                ...l,
                status,
                ...(status === "won" || status === "lost"
                  ? { next_follow_up_at: null }
                  : {}),
              }
            : l
        )
      );
    }
    setUpdatingId(null);
  }

  function goToLead(id: string) {
    router.push(`/dashboard/leads/${id}`);
  }

  const total = leads.length;
  const qualified = leads.filter(isActiveQualifiedLead).length;
  const hot = leads.filter(isActiveHotLead);
  const converted = leads.filter((l) => l.status === "won").length;
  const lost = leads.filter((l) => l.status === "lost").length;
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

  const sumValue = (predicate: (l: Lead) => boolean) =>
    leads.filter(predicate).reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);

  const pipelineValue = sumValue(
    (l) => l.status === "new" || l.status === "contacted" || l.status === "qualified"
  );
  const potentialRevenue = sumValue((l) => l.status === "qualified");
  const wonRevenue = sumValue((l) => l.status === "won");
  const lostRevenue = sumValue((l) => l.status === "lost");

  // --- Analytics (derived from `leads` only) ---
  const percentOf = (part: number, whole: number) =>
    whole > 0 ? Math.round((part / whole) * 100) : 0;

  const hotCount = leads.filter(isHotLead).length;
  const warmCount = leads.filter(
    (l) => l.ai_score !== null && getPriorityCategory(l.ai_score) === "warm"
  ).length;
  const unscoredCount = leads.filter((l) => l.ai_score === null).length;
  const coldCount = total - hotCount - warmCount - unscoredCount;

  const qualityRows = [
    { label: "Hot", count: hotCount, dot: "bg-red-400" },
    { label: "Warm", count: warmCount, dot: "bg-blue-400" },
    { label: "Cold", count: coldCount, dot: "bg-gray-400" },
  ];

  const funnelQualified = leads.filter((l) => (l.ai_score ?? 0) >= 40).length;
  const funnelRows = [
    { label: "Total Leads", count: total, percent: total > 0 ? 100 : 0, bar: STAGE_COLORS.new },
    { label: "Qualified", count: funnelQualified, percent: percentOf(funnelQualified, total), bar: STAGE_COLORS.qualified },
    { label: "Won", count: converted, percent: percentOf(converted, total), bar: STAGE_COLORS.won },
  ];
  const qualifiedToWonRate = percentOf(converted, funnelQualified);

  const needsFollowUp = leads.filter((l) => {
    if (l.status === "won" || l.status === "lost") return false;

    return Boolean(l.next_follow_up_at);
  });

  // Leads whose status is not one of the five stages (should normally be 0)
  const otherStatusCount = leads.filter(
    (l) => !(STAGES as readonly string[]).includes(l.status)
  ).length;

  const pipelineCounts = STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, {});

  // All leads matching the search term
  const searchMatches = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return leads.filter((l) => matchesSearch(l, searchTerm));
  }, [leads, searchTerm]);

  const searchResults = useMemo(() => searchMatches.slice(0, 8), [searchMatches]);

  // Filtered leads for table
  const filteredLeads = useMemo(() => {
    let result = leads;
    if (filter === "hot") {
      result = result.filter(isActiveHotLead);
    } else if (filter === "followup") {
      result = result.filter((l) => needsFollowUp.includes(l));
    } else if (filter === "qualified") {
      result = result.filter(isActiveQualifiedLead);
    } else if (filter === "converted") {
      result = result.filter((l) => l.status === "won");
    } else if (filter === "lost") {
      result = result.filter((l) => l.status === "lost");
    }
    if (searchTerm.trim()) {
      result = result.filter((l) => matchesSearch(l, searchTerm));
    }
    return result;
  }, [leads, filter, searchTerm, needsFollowUp]);

  // Sorting applies to the already filtered + searched leads (table only)
  const sortedLeads = useMemo(() => {
    const time = (l: Lead) => new Date(l.created_at).getTime();
    const copy = [...filteredLeads];
    switch (sortBy) {
      case "oldest":
        return copy.sort((a, b) => time(a) - time(b));
      case "score_high":
        return copy.sort(byNumber((l) => l.ai_score, -1));
      case "score_low":
        return copy.sort(byNumber((l) => l.ai_score, 1));
      case "value_high":
        return copy.sort(byNumber((l) => l.deal_value, -1));
      case "value_low":
        return copy.sort(byNumber((l) => l.deal_value, 1));
      default:
        return copy.sort((a, b) => time(b) - time(a));
    }
  }, [filteredLeads, sortBy]);

  // Active hot leads created in the last 24 hours (only used in the Hot view)
  const newHotLeads = useMemo(
    () =>
      filteredLeads.filter(
        (l) => Date.now() - new Date(l.created_at).getTime() <= 24 * 60 * 60 * 1000
      ),
    [filteredLeads]
  );

  // Leads created per day over the last 7 days (real data, used for the Total Leads sparkline)
  const intakeSeries = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const day = 86400000;
    const base = start.getTime() - 6 * day;
    const series: number[] = [0, 0, 0, 0, 0, 0, 0];
    leads.forEach((l) => {
      const idx = Math.floor((new Date(l.created_at).getTime() - base) / day);
      if (idx >= 0 && idx < 7) series[idx] += 1;
    });
    return series;
  }, [leads]);

  if (checkingAuth) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-700 ${
          isDark ? "bg-[#0b0b0f]" : "bg-[#f4f6fa]"
        }`}
      >
        <div className="flex flex-col items-center gap-4" role="status">
          <div className="relative w-12 h-12">
            <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 border-r-emerald-500/40 animate-spin" />
            <span className="absolute inset-3 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
          </div>
          <span className="text-xs font-medium tracking-wide text-gray-500">
            Loading session…
          </span>
        </div>
      </div>
    );
  }

  const t: Theme = isDark ? DARK : LIGHT;
  const nowMs = currentTime.getTime();
  const last7 = intakeSeries.reduce((s, n) => s + n, 0);
  const overdueFollowUps = needsFollowUp.filter(
    (l) => new Date(l.next_follow_up_at as string).getTime() <= nowMs
  ).length;
  const upcomingFollowUps = [...needsFollowUp]
    .sort(
      (a, b) =>
        new Date(a.next_follow_up_at as string).getTime() -
        new Date(b.next_follow_up_at as string).getTime()
    )
    .slice(0, 6);

  const navItems: NavItem[] = [
    { label: "All Leads", value: "all", icon: <Users className="w-4 h-4" />, count: total },
    { label: "Hot Leads", value: "hot", icon: <Flame className="w-4 h-4" />, count: hot.length },
    { label: "Follow-Up", value: "followup", icon: <Clock className="w-4 h-4" />, count: needsFollowUp.length },
    { label: "Qualified", value: "qualified", icon: <TrendingUp className="w-4 h-4" />, count: qualified },
    { label: "Converted", value: "converted", icon: <Award className="w-4 h-4" />, count: converted },
    { label: "Lost Leads", value: "lost", icon: <X className="w-4 h-4" />, count: lost },
  ];

  const leadMetrics: KpiItem[] = [
    {
      label: "Total Leads",
      value: total,
      icon: <Users className="w-4 h-4" />,
      accent: "blue",
      hint: `${last7 > 0 ? "+" : ""}${last7} in last 7 days`,
      share: total > 0 ? 100 : 0,
      trendUp: last7 > 0,
      spark: intakeSeries,
    },
    {
      label: "Hot Leads",
      value: hot.length,
      icon: <Flame className="w-4 h-4" />,
      accent: "red",
      hint: `${percentOf(hot.length, total)}% of all leads`,
      share: percentOf(hot.length, total),
    },
    {
      label: "Qualified Leads",
      value: qualified,
      icon: <TrendingUp className="w-4 h-4" />,
      accent: "emerald",
      hint: `${percentOf(qualified, total)}% of all leads`,
      share: percentOf(qualified, total),
    },
    {
      label: "Needs Follow-Up",
      value: needsFollowUp.length,
      icon: <Workflow className="w-4 h-4" />,
      accent: "amber",
      hint: `${overdueFollowUps} due or overdue`,
      share: percentOf(needsFollowUp.length, total),
    },
    {
      label: "Won Leads",
      value: converted,
      icon: <Trophy className="w-4 h-4" />,
      accent: "purple",
      hint: `${currency.format(wonRevenue)} won`,
      share: percentOf(converted, total),
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      icon: <CheckCircle2 className="w-4 h-4" />,
      accent: "cyan",
      hint: `${converted} of ${total} leads won`,
      share: conversionRate,
    },
  ];

  const revenueSegments = [
    { label: "Active Pipeline", value: pipelineValue, hex: "#3b82f6", dot: "bg-blue-500" },
    { label: "Won Revenue", value: wonRevenue, hex: "#a78bfa", dot: "bg-purple-400" },
    { label: "Lost Revenue", value: lostRevenue, hex: "#f87171", dot: "bg-red-400" },
  ];
  const revenueTotal = revenueSegments.reduce((s, r) => s + r.value, 0);

  const healthRows = [
    ...funnelRows,
    { label: "Lost", count: lost, percent: percentOf(lost, total), bar: "from-red-400 to-red-500" },
  ];

  const qualityHex = ["#f87171", "#60a5fa", "#9ca3af"];

  const filterTitles: Record<FilterType, string> = {
    all: "All",
    hot: "Hot",
    followup: "Follow-Up",
    qualified: "Qualified",
    converted: "Converted",
    lost: "Lost",
  };
  const tableTitles: Record<FilterType, string> = {
    all: "All Leads",
    hot: "All Hot Leads",
    followup: "Follow-Up Leads",
    qualified: "All Qualified Leads",
    converted: "All Converted Leads",
    lost: "All Lost Leads",
  };
  const filterTitle = filterTitles[filter];
  const tableTitle = tableTitles[filter];

  const hour = currentTime.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const showTable = filter !== "followup" || filteredLeads.length === 0;

  const sidebarProps = {
    t,
    isDark,
    navItems,
    filter,
    workspaceName,
    onSelect: (value: FilterType) => setFilter(value),
    onToggleTheme: toggleTheme,
    onSignOut: handleSignOut,
  };

  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        className={`min-h-screen flex font-['Inter',system-ui,sans-serif] antialiased transition-colors duration-500 ${t.page}`}
      >
        {/* Desktop sidebar */}
        <aside
          className={`hidden lg:flex shrink-0 h-screen sticky top-0 overflow-hidden border-r transition-all duration-300 ${
            isCollapsed ? "w-[72px]" : "w-64"
          } ${t.sidebar}`}
        >
          <SidebarContent
            {...sidebarProps}
            collapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          />
        </aside>

        {/* Mobile sidebar */}
        <div
          id="mobile-sidebar"
          className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-out border-r ${t.sidebar} ${
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarContent
            {...sidebarProps}
            onSelect={(value) => {
              setFilter(value);
              setIsMobileOpen(false);
            }}
            onClose={() => setIsMobileOpen(false)}
          />
        </div>

        {isMobileOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-5">
          <div className="max-w-[1720px] mx-auto">
            {/* Header */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-6 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  id="hamburger-btn"
                  onClick={() => setIsMobileOpen(true)}
                  aria-label="Open menu"
                  className={`lg:hidden flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-colors ${FOCUS_RING} ${t.btn}`}
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <h2
                    className={`text-lg sm:text-xl font-semibold tracking-[-0.02em] truncate ${t.title}`}
                  >
                    {greeting}, {workspaceName}
                  </h2>
                  <p className={`flex items-center gap-2 text-xs mt-0.5 ${t.faint}`}>
                    <span>Here&apos;s what&apos;s happening with your leads.</span>
                    <span
                      className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ring-1 text-[11px] font-medium ${t.chip}`}
                    >
                      {filterTitle} view ·{" "}
                      <span className="tabular-nums">{filteredLeads.length}</span> in view
                    </span>
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="flex-1 max-w-md w-full lg:mx-auto" ref={searchRef}>
                <div
                  className={`relative flex items-center rounded-xl px-3.5 py-2.5 transition-all duration-200 focus-within:ring-2 focus-within:ring-emerald-500/40 border ${
                    isDark
                      ? "bg-[#16161d] border-white/[0.08] focus-within:border-emerald-400/40 hover:border-white/[0.14]"
                      : "bg-white border-gray-200 shadow-sm focus-within:border-emerald-400/50 hover:border-gray-300"
                  }`}
                >
                  <Search className="w-4 h-4 text-gray-500 mr-2.5 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search leads by name, email or phone…"
                    aria-label="Search leads by name or email"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSearchResults(true);
                    }}
                    onFocus={() => setShowSearchResults(true)}
                    className={`bg-transparent border-none focus:outline-none text-sm w-full ${
                      isDark
                        ? "text-white placeholder-gray-500"
                        : "text-gray-900 placeholder-gray-400"
                    }`}
                  />
                  {searchTerm ? (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setShowSearchResults(false);
                      }}
                      aria-label="Clear search"
                      className={`ml-2 p-1 rounded-full transition ${FOCUS_RING} ${
                        isDark ? "hover:bg-white/10" : "hover:bg-gray-200/60"
                      }`}
                    >
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  ) : (
                    <kbd
                      className={`hidden sm:inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-mono ring-1 ${t.chip}`}
                    >
                      ⌘K
                    </kbd>
                  )}

                  {showSearchResults && searchTerm.trim() && searchResults.length > 0 && (
                    <div
                      className={`absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-2xl overflow-hidden z-50 ${t.menu}`}
                    >
                      <div className="py-1.5 max-h-72 overflow-y-auto">
                        {searchResults.map((lead) => (
                          <button
                            key={lead.id}
                            onClick={() => {
                              goToLead(lead.id);
                              setShowSearchResults(false);
                              setSearchTerm("");
                            }}
                            className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left transition-colors ${FOCUS_RING} ${t.hover} ${t.text}`}
                          >
                            <Avatar name={lead.name} isDark={isDark} small />
                            <div className="flex flex-col items-start min-w-0 flex-1">
                              <span className="font-medium truncate max-w-full">{lead.name}</span>
                              <span className={`text-xs truncate max-w-full ${t.faint}`}>
                                {lead.email}
                              </span>
                            </div>
                            {lead.ai_score !== null && (
                              <span
                                className={`shrink-0 text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-md ${
                                  isDark
                                    ? "text-gray-300 bg-white/[0.05]"
                                    : "text-gray-600 bg-gray-100"
                                }`}
                              >
                                {lead.ai_score}
                              </span>
                            )}
                          </button>
                        ))}
                        {searchResults.length < searchMatches.length && (
                          <div className={`px-3.5 py-2 text-[11px] border-t ${t.faint} ${t.line}`}>
                            + {searchMatches.length - searchResults.length} more in the table below
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Date + clock */}
              <div className="hidden sm:flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className={`text-[13px] font-semibold tracking-tight ${t.text}`}>
                    {currentTime.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className={`text-[11px] font-mono tabular-nums mt-0.5 ${t.faint}`}>
                    {currentTime.toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                </div>
                <Avatar name={workspaceName} isDark={isDark} />
              </div>
            </header>

            {/* BOX 1 — Primary KPIs */}
            <section
              aria-label="Lead metrics"
              className={`rounded-2xl border p-3 sm:p-4 mb-4 ${t.card}`}
            >
              <div className="flex items-center justify-between mb-3 px-0.5">
                <h3 className={`text-sm font-semibold tracking-[-0.01em] ${t.title}`}>
                  Lead Performance
                </h3>
                <span className={`flex items-center gap-1.5 text-[11px] ${t.faint}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Live from your pipeline
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
                {leadMetrics.map((metric) => (
                  <KpiCell key={metric.label} t={t} {...metric} />
                ))}
              </div>
            </section>

            {/* BOX 2 — Pipeline stages */}

            {/* Analytics row */}
            <section
              aria-label="Analytics"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 mb-4 items-stretch"
            >
              {/* Revenue overview */}
              <Panel
                t={t}
                className="md:col-span-2 xl:col-span-5"
                icon={<BarChart3 className="w-4 h-4" />}
                iconClass="bg-emerald-500/10 text-emerald-500"
                title="Revenue Overview"
                subtitle="Total and potential revenue from your pipeline"
                footer="Active Pipeline = New + Contacted + Qualified"
              >
                <div className="flex flex-col sm:flex-row items-center gap-5 h-full">
                  <Donut
                    isDark={isDark}
                    size={152}
                    segments={revenueSegments.map((s) => ({ value: s.value, color: s.hex }))}
                  >
                    <div className="text-center px-3">
                      <div
                        className={`text-lg font-semibold tabular-nums tracking-[-0.02em] leading-tight ${t.title}`}
                      >
                        {currency.format(revenueTotal)}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${t.faint}`}>Total value</div>
                    </div>
                  </Donut>

                  <div className="flex-1 w-full min-w-0 space-y-2.5">
                    <div className={`rounded-xl border divide-y ${t.inner} ${t.line}`}>
                      {revenueSegments.map((row) => (
                        <div
                          key={row.label}
                          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm ${t.line}`}
                        >
                          <span className={`flex items-center gap-2 min-w-0 ${t.text}`}>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${row.dot}`} />
                            <span className="truncate">{row.label}</span>
                          </span>
                          <span className="flex items-baseline gap-3 tabular-nums shrink-0">
                            <span className={`font-semibold ${t.title}`}>
                              {currency.format(row.value)}
                            </span>
                            <span className={`text-[11px] w-9 text-right ${t.faint}`}>
                              {percentOf(row.value, revenueTotal)}%
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                    <div
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${t.inner}`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                          <TrendingUp className="w-3.5 h-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-xs font-medium ${t.text}`}>
                            Potential Revenue
                          </span>
                          <span className={`block text-[11px] ${t.faint}`}>
                            From qualified leads
                          </span>
                        </span>
                      </span>
                      <span className={`text-base font-semibold tabular-nums ${t.title}`}>
                        {currency.format(potentialRevenue)}
                      </span>
                    </div>
                  </div>
                </div>
              </Panel>

              {/* Pipeline health */}
              <Panel
                t={t}
                className="xl:col-span-4"
                icon={<Workflow className="w-4 h-4" />}
                iconClass="bg-blue-500/10 text-blue-500"
                title="Pipeline Health"
                subtitle="Lead progression through your funnel"
                footer={`Qualified → Won: ${qualifiedToWonRate}%`}
              >
                <div className="flex flex-col justify-center gap-4 h-full py-1">
                  {healthRows.map((row) => (
                    <BarRow
                      key={row.label}
                      t={t}
                      label={row.label}
                      count={row.count}
                      percent={row.percent}
                      barClass={`bg-gradient-to-r ${row.bar}`}
                    />
                  ))}
                </div>
              </Panel>

              {/* Lead quality */}
              <Panel
                t={t}
                className="xl:col-span-3"
                icon={<PieChart className="w-4 h-4" />}
                iconClass="bg-purple-500/10 text-purple-500"
                title="Lead Quality"
                subtitle="Based on AI scoring"
                footer={unscoredCount > 0 ? `${unscoredCount} not scored yet` : undefined}
              >
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-4 h-full">
                  <Donut
                    isDark={isDark}
                    size={116}
                    segments={[
                      ...qualityRows.map((r, i) => ({ value: r.count, color: qualityHex[i] })),
                      { value: unscoredCount, color: isDark ? "#3f3f46" : "#d4d4d8" },
                    ]}
                  >
                    <div className="text-center">
                      <div
                        className={`text-xl font-semibold tabular-nums leading-none ${t.title}`}
                      >
                        {total}
                      </div>
                      <div className={`text-[10px] mt-1 ${t.faint}`}>Total Leads</div>
                    </div>
                  </Donut>
                  <div className="flex-1 min-w-[140px] space-y-2.5">
                    {qualityRows.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className={`flex items-center gap-2 ${t.text}`}>
                          <span className={`w-2 h-2 rounded-full ${row.dot}`} />
                          {row.label}
                        </span>
                        <span className="flex items-baseline gap-2 tabular-nums">
                          <span className={`font-semibold ${t.title}`}>{row.count}</span>
                          <span className={`text-[11px] w-9 text-right ${t.faint}`}>
                            {percentOf(row.count, total)}%
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            </section>

            {/* Needs follow-up (follow-up view) */}
            {filter === "followup" && filteredLeads.length > 0 && (
              <section className="mb-4">
                <SectionHeading t={t}>
                  <CalendarClock className="w-4 h-4" /> {tableTitle} ({filteredLeads.length})
                </SectionHeading>
                <div className={`rounded-2xl p-4 sm:p-5 border ${t.card}`}>
                  <p className={`text-sm mb-4 ${t.muted}`}>
                    These leads have a follow-up that is due or overdue.
                  </p>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                    {filteredLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => goToLead(lead.id)}
                        className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-xl px-4 py-3 cursor-pointer transition-colors border ${t.inner} ${t.innerHover}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={lead.name} isDark={isDark} />
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{lead.name}</div>
                            <div className={`text-xs mt-0.5 ${t.faint}`}>
                              {lead.ai_score !== null ? `${lead.ai_score}/100` : "Not scored"}
                            </div>
                          </div>
                        </div>
                        <LeadActions
                          t={t}
                          lead={lead}
                          updating={updatingId === lead.id}
                          onUpdateStatus={(status) => updateStatus(lead.id, status)}
                          onOpenLead={() => goToLead(lead.id)}
                          emailLabel="Email"
                          compact
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Hot leads (hot view) */}
            {filter === "hot" && (
              <section className="mb-4">
                <SectionHeading t={t}>
                  <Flame className="w-4 h-4 text-red-400" /> New Hot Leads in 24 Hours (
                  {newHotLeads.length})
                </SectionHeading>
                {newHotLeads.length === 0 && (
                  <div className={`rounded-2xl border p-8 text-center ${t.card}`}>
                    <Flame className={`w-8 h-8 mx-auto mb-3 ${t.faint}`} />
                    <p className={`text-sm font-medium ${t.text}`}>
                      No new hot leads in the last 24 hours.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {newHotLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => goToLead(lead.id)}
                      className={`group relative rounded-2xl p-4 sm:p-5 border transition-colors cursor-pointer ${t.card} ${
                        isDark ? "hover:border-white/[0.14]" : "hover:border-gray-300"
                      }`}
                    >
                      <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={lead.name} isDark={isDark} />
                          <div className="min-w-0">
                            <div className="text-[15px] font-semibold leading-tight truncate">
                              {lead.name}
                            </div>
                            <div className={`text-sm truncate mt-0.5 ${t.faint}`}>
                              {lead.email}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`shrink-0 text-sm font-medium px-3 py-1 rounded-full tabular-nums flex items-center gap-1.5 ring-1 ${
                            isDark
                              ? "bg-red-500/[0.08] text-red-300 ring-red-500/20"
                              : "bg-red-50 text-red-600 ring-red-100"
                          }`}
                        >
                          <Flame className="w-3.5 h-3.5" /> {lead.ai_score}
                        </div>
                      </div>
                      {lead.ai_reasoning && (
                        <p className={`text-sm mb-4 leading-relaxed line-clamp-3 ${t.muted}`}>
                          {lead.ai_reasoning}
                        </p>
                      )}
                      <LeadActions
                        t={t}
                        lead={lead}
                        updating={updatingId === lead.id}
                        onUpdateStatus={(status) => updateStatus(lead.id, status)}
                        onOpenLead={() => goToLead(lead.id)}
                        emailLabel="Send Email"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Leads table + follow-up timeline */}
            <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
              {showTable && (
                <Panel
                  t={t}
                  flush
                  className="xl:col-span-8"
                  icon={<ClipboardList className="w-4 h-4" />}
                  iconClass="bg-blue-500/10 text-blue-500"
                  title={`${tableTitle} (${filteredLeads.length})`}
                  subtitle="Click a row to open the lead"
                  action={
                    <>
                      {(searchTerm.trim() || sortBy !== "newest") && (
                        <button
                          onClick={() => {
                            setSearchTerm("");
                            setSortBy("newest");
                            setShowSearchResults(false);
                          }}
                          className={`text-xs font-medium rounded-lg px-2.5 py-1.5 transition ${FOCUS_RING} ${
                            isDark
                              ? "text-gray-400 hover:text-white hover:bg-white/[0.06]"
                              : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                          }`}
                        >
                          Clear
                        </button>
                      )}
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortType)}
                        aria-label="Sort leads"
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-all duration-200 ring-1 ${FOCUS_RING} ${t.field}`}
                      >
                        {SORT_OPTIONS.map((o) => (
                          <option
                            key={o.value}
                            value={o.value}
                            className={isDark ? "bg-gray-900" : ""}
                          >
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </>
                  }
                >
                  {loading ? (
                    <div className="p-3" role="status" aria-label="Loading leads">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-4 px-4 py-3 rounded-xl animate-pulse ${
                            isDark ? "bg-white/[0.02]" : "bg-gray-50"
                          } ${i !== 4 ? "mb-2" : ""}`}
                        >
                          <div
                            className={`w-9 h-9 rounded-full ${
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
                    <div className="p-10 sm:p-14 text-center">
                      <div
                        className={`w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center border ${t.inner}`}
                      >
                        <Inbox className={`w-5 h-5 ${t.faint}`} />
                      </div>
                      <p className={`text-sm font-semibold ${t.text}`}>
                        {total === 0 ? "No leads yet" : "No leads found"}
                      </p>
                      <p className={`text-sm mt-1.5 max-w-sm mx-auto ${t.faint}`}>
                        {total === 0
                          ? "New leads will appear here as they come in."
                          : "Try adjusting your search or filter to find what you're looking for."}
                      </p>
                      {total > 0 && (filter !== "all" || searchTerm.trim()) && (
                        <button
                          onClick={() => {
                            if (searchTerm.trim()) setSearchTerm("");
                            else setFilter("all");
                          }}
                          className={`mt-5 text-xs font-medium rounded-xl px-4 py-2 transition ${FOCUS_RING} ${t.btn}`}
                        >
                          {searchTerm.trim() ? "Clear search" : "Show all leads"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-auto max-h-[460px]">
                      <table className="w-full text-sm border-collapse min-w-[680px]">
                        <thead className={`sticky top-0 z-10 ${t.head}`}>
                          <tr className={`text-left border-y ${t.faint} ${t.line}`}>
                            {[
                              { label: "Name", right: false },
                              { label: "Source", right: false },
                              { label: "Score", right: true },
                              { label: "Category", right: false },
                              { label: "Status", right: false },
                              { label: "Submitted", right: true },
                            ].map((col) => (
                              <th
                                key={col.label}
                                scope="col"
                                className={`px-4 py-2.5 font-medium text-xs ${
                                  col.right ? "text-right" : ""
                                }`}
                              >
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedLeads.map((lead) => {
                            const placeholder =
                              lead.ai_status === "processing"
                                ? "Processing…"
                                : lead.ai_status === "failed"
                                  ? "Unavailable"
                                  : "—";
                            return (
                              <tr
                                key={lead.id}
                                onClick={() => goToLead(lead.id)}
                                className={`group border-b last:border-b-0 transition-colors duration-150 cursor-pointer ${t.line} ${
                                  isDark ? "hover:bg-white/[0.03]" : "hover:bg-emerald-50/40"
                                }`}
                              >
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <Avatar name={lead.name} isDark={isDark} small />
                                    <div className="min-w-0">
                                      <div className="font-medium truncate leading-tight">
                                        {lead.name}
                                      </div>
                                      <div className={`text-[11px] truncate mt-0.5 ${t.faint}`}>
                                        {lead.email}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className={`px-4 py-2.5 ${t.muted}`}>
                                  {lead.source || "Website"}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  {lead.ai_score !== null ? (
                                    <span
                                      className={`inline-flex items-baseline px-2 py-0.5 rounded-md font-semibold tabular-nums text-xs ring-1 ${
                                        lead.ai_score >= 70
                                          ? "bg-blue-500/10 text-blue-400 ring-blue-500/20"
                                          : lead.ai_score >= 40
                                            ? isDark
                                              ? "bg-white/[0.05] text-gray-200 ring-white/[0.08]"
                                              : "bg-gray-100 text-gray-800 ring-gray-200"
                                            : isDark
                                              ? "bg-white/[0.02] text-gray-500 ring-white/[0.05]"
                                              : "bg-gray-50 text-gray-400 ring-gray-100"
                                      }`}
                                    >
                                      {lead.ai_score}
                                      <span className="font-normal opacity-60">/100</span>
                                    </span>
                                  ) : (
                                    <span className={t.faint}>{placeholder}</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5">
                                  {lead.ai_score !== null ? (
                                    (() => {
                                      const label = getPriorityMeta(lead.ai_score).category;
                                      return (
                                        <span
                                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize ring-1 ${
                                            label === "hot"
                                              ? "bg-red-500/10 text-red-400 ring-red-500/20"
                                              : label === "warm"
                                                ? "bg-blue-500/10 text-blue-400 ring-blue-500/20"
                                                : t.chip
                                          }`}
                                        >
                                          {label}
                                        </span>
                                      );
                                    })()
                                  ) : (
                                    <span className={t.faint}>{placeholder}</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                                  <div className="relative inline-flex items-center">
                                    <span
                                      className={`pointer-events-none absolute left-2.5 w-1.5 h-1.5 rounded-full ${
                                        STAGE_DOT[lead.status] || "bg-gray-400"
                                      }`}
                                    />
                                    <select
                                      value={lead.status}
                                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                                      disabled={updatingId === lead.id}
                                      aria-label={`Status for ${lead.name}`}
                                      className={`rounded-full pl-6 pr-2.5 py-1 text-xs font-medium capitalize cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-wait ring-1 ${FOCUS_RING} ${t.field}`}
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
                                  </div>
                                </td>
                                <td
                                  className={`px-4 py-2.5 text-xs whitespace-nowrap tabular-nums text-right ${t.faint}`}
                                >
                                  {new Date(lead.created_at).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                  })}{" "}
                                  <span className="opacity-70">
                                    {new Date(lead.created_at).toLocaleTimeString(undefined, {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Panel>
              )}

              {showTable && (
                <Panel
                  t={t}
                  className="xl:col-span-4"
                  icon={<CalendarClock className="w-4 h-4" />}
                  iconClass="bg-amber-500/10 text-amber-500"
                  title="Upcoming Follow-Ups"
                  subtitle={`${needsFollowUp.length} scheduled · ${overdueFollowUps} due or overdue`}
                  action={
                    needsFollowUp.length > 0 ? (
                      <button
                        onClick={() => setFilter("followup")}
                        className={`text-xs font-medium rounded-lg px-2.5 py-1.5 transition ${FOCUS_RING} ${t.btn}`}
                      >
                        View all
                      </button>
                    ) : undefined
                  }
                >
                  {upcomingFollowUps.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-8">
                      <div
                        className={`w-11 h-11 mb-3 rounded-2xl flex items-center justify-center border ${t.inner}`}
                      >
                        <CalendarClock className={`w-5 h-5 ${t.faint}`} />
                      </div>
                      <p className={`text-sm font-medium ${t.text}`}>No follow-ups scheduled</p>
                      <p className={`text-xs mt-1 ${t.faint}`}>
                        Leads with a follow-up date will appear here.
                      </p>
                    </div>
                  ) : (
                    <ol className="relative">
                      <span
                        aria-hidden="true"
                        className={`absolute left-[5px] top-3 bottom-3 border-l ${t.line}`}
                      />
                      {upcomingFollowUps.map((lead) => {
                        const due = formatDue(lead.next_follow_up_at as string, nowMs);
                        const tone =
                          due.tone === "overdue"
                            ? { dot: "bg-red-400", pill: "bg-red-500/10 text-red-400 ring-red-500/20" }
                            : due.tone === "soon"
                              ? { dot: "bg-amber-400", pill: "bg-amber-500/10 text-amber-400 ring-amber-500/20" }
                              : { dot: "bg-blue-400", pill: "bg-blue-500/10 text-blue-400 ring-blue-500/20" };
                        return (
                          <li key={lead.id} className="relative pl-6">
                            <span
                              className={`absolute left-0 top-[22px] w-[11px] h-[11px] rounded-full ring-4 ${tone.dot} ${
                                isDark ? "ring-[#121218]" : "ring-white"
                              }`}
                            />
                            <button
                              onClick={() => goToLead(lead.id)}
                              className={`w-full flex items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 my-0.5 text-left transition-colors ${FOCUS_RING} ${t.hover}`}
                            >
                              <span className="flex items-center gap-3 min-w-0">
                                <Avatar name={lead.name} isDark={isDark} small />
                                <span className="min-w-0">
                                  <span className={`block text-sm font-medium truncate ${t.text}`}>
                                    {lead.name}
                                  </span>
                                  <span className={`block text-[11px] truncate capitalize ${t.faint}`}>
                                    {lead.status} ·{" "}
                                    {new Date(lead.next_follow_up_at as string).toLocaleDateString(
                                      undefined,
                                      { month: "short", day: "numeric" }
                                    )}
                                  </span>
                                </span>
                              </span>
                              <span
                                className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 tabular-nums ${tone.pill}`}
                              >
                                {due.text}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </Panel>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

// --- Helper Components ---

type SidebarProps = {
  t: Theme;
  isDark: boolean;
  navItems: NavItem[];
  filter: FilterType;
  workspaceName: string;
  collapsed?: boolean;
  onSelect: (value: FilterType) => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
  onToggleCollapse?: () => void;
  onClose?: () => void;
};

function SidebarContent({
  t,
  isDark,
  navItems,
  filter,
  workspaceName,
  collapsed = false,
  onSelect,
  onToggleTheme,
  onSignOut,
  onToggleCollapse,
  onClose,
}: SidebarProps) {
  const rowBase = `group flex items-center w-full rounded-lg text-sm font-medium transition-colors duration-150 ${FOCUS_RING} ${
    collapsed ? "px-2 py-2 justify-center" : "px-2.5 py-2"
  }`;
  const rowIdle = isDark
    ? "hover:bg-white/[0.05] text-gray-400 hover:text-white"
    : "hover:bg-gray-100/80 text-gray-600 hover:text-gray-900";
  const iconBtn = `flex items-center justify-center rounded-lg transition-colors ${FOCUS_RING} ${
    isDark
      ? "hover:bg-white/[0.06] text-gray-500 hover:text-white"
      : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
  }`;

  return (
    <div
      className={`flex flex-col h-full w-full py-5 ${
        collapsed ? "items-center px-3" : "px-3.5"
      }`}
    >
      {/* Brand */}
      <div className={`flex items-center gap-3 mb-6 ${collapsed ? "flex-col" : "px-1"}`}>
        <span className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/20">
          <Rocket className="w-[17px] h-[17px]" strokeWidth={2.3} />
        </span>
        {!collapsed && (
          <div className="leading-tight min-w-0 flex-1">
            <h1 className={`text-[15px] font-semibold tracking-[-0.02em] truncate ${t.title}`}>
              AI Command
            </h1>
            <p className={`text-[11px] truncate mt-0.5 ${t.faint}`}>{workspaceName}</p>
          </div>
        )}
        {onToggleCollapse && !collapsed && (
          <button
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            className={`w-7 h-7 ${iconBtn}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {onToggleCollapse && collapsed && (
          <button
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            className={`w-7 h-7 ${iconBtn}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        {onClose && (
          <button onClick={onClose} aria-label="Close menu" className={`w-8 h-8 ${iconBtn}`}>
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {!collapsed && <p className={`px-2.5 mb-2 text-xs font-medium ${t.faint}`}>Views</p>}

      {/* Navigation */}
      <nav
        aria-label="Lead filters"
        className="space-y-0.5 flex-1 w-full overflow-y-auto -mx-1 px-1"
      >
        {navItems.map((item) => {
          const active = filter === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onSelect(item.value)}
              aria-current={active ? "page" : undefined}
              title={collapsed ? `${item.label} (${item.count})` : undefined}
              className={`${rowBase} justify-between relative ${
                active
                  ? isDark
                    ? "bg-emerald-500/[0.12] text-white ring-1 ring-inset ring-emerald-500/20"
                    : "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-500/20"
                  : rowIdle
              }`}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-emerald-400" />
              )}
              <span className={`flex items-center ${collapsed ? "" : "gap-3"} min-w-0`}>
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors ${
                    active
                      ? isDark
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-emerald-100 text-emerald-700"
                      : isDark
                        ? "text-gray-400 group-hover:text-white"
                        : "text-gray-500 group-hover:text-gray-900"
                  }`}
                >
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </span>
              {!collapsed && (
                <span
                  className={`shrink-0 ml-2 text-[11px] font-medium tabular-nums px-1.5 py-0.5 min-w-[22px] text-center rounded-md ${
                    active
                      ? isDark
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-emerald-100 text-emerald-700"
                      : isDark
                        ? "bg-white/[0.05] text-gray-400"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className={`pt-4 mt-4 border-t space-y-0.5 w-full ${t.line}`}>
        <button
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          className={`${rowBase} justify-between ${rowIdle}`}
        >
          <span className={`flex items-center ${collapsed ? "" : "gap-3"}`}>
            <span className="flex items-center justify-center w-7 h-7">
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </span>
            {!collapsed && <span>{isDark ? "Dark mode" : "Light mode"}</span>}
          </span>
          {!collapsed && (
            <span
              className={`w-9 h-[18px] rounded-full transition-colors ring-1 ${
                isDark ? "bg-emerald-500 ring-emerald-400/50" : "bg-gray-200 ring-gray-300"
              }`}
            >
              <span
                className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform mt-[1.5px] ${
                  isDark ? "translate-x-[18px] ml-0.5" : "translate-x-0 ml-0.5"
                }`}
              />
            </span>
          )}
        </button>

        <button
          onClick={onSignOut}
          className={`${rowBase} ${collapsed ? "" : "gap-3"} ${
            isDark
              ? "text-gray-400 hover:bg-red-500/[0.08] hover:text-red-300"
              : "text-gray-600 hover:bg-red-50 hover:text-red-600"
          }`}
        >
          <span className="flex items-center justify-center w-7 h-7">
            <LogOut className="w-4 h-4" />
          </span>
          {!collapsed && "Sign out"}
        </button>
      </div>
    </div>
  );
}

function KpiCell({
  t,
  label,
  value,
  icon,
  accent,
  hint,
  share,
  trendUp,
  spark,
}: KpiItem & { t: Theme }) {
  const a = ACCENTS[accent];
  return (
    <div
      className={`rounded-xl border p-3.5 transition-colors min-w-0 ${t.inner} ${t.innerHover}`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${a.chip}`}>
          {icon}
        </span>
        <span className={`text-xs font-medium truncate ${t.muted}`}>{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2 mt-3">
        <span
          className={`text-[28px] font-semibold tracking-[-0.03em] tabular-nums leading-none truncate ${t.title}`}
        >
          {value}
        </span>
        {spark && <Sparkline data={spark} color={a.hex} />}
      </div>
      <p
        className={`mt-2 flex items-center gap-1 text-[11px] truncate ${
          trendUp ? "text-emerald-500" : t.faint
        }`}
      >
        {trendUp && <ArrowUpRight className="w-3 h-3 shrink-0" />}
        <span className="truncate">{hint}</span>
      </p>
      <div
        className={`mt-2.5 h-1 rounded-full overflow-hidden ${t.track}`}
        role="progressbar"
        aria-valuenow={share}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} share`}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ${a.bar}`}
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}

function Sparkline({
  data,
  color,
  w = 72,
  h = 26,
}: {
  data: number[];
  color: string;
  w?: number;
  h?: number;
}) {
  const max = Math.max(...data, 1);
  const step = w / Math.max(data.length - 1, 1);
  const points = data
    .map((v, i) => `${(i * step).toFixed(1)},${(h - 3 - (v / max) * (h - 7)).toFixed(1)}`)
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
      className="shrink-0"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Donut({
  segments,
  size,
  isDark,
  children,
}: {
  segments: { value: number; color: string }[];
  size: number;
  isDark: boolean;
  children?: ReactNode;
}) {
  const sum = segments.reduce((s, x) => s + x.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  const arcs = visible.reduce<{ pct: number; offset: number; color: string }[]>(
    (acc, seg) => {
      const pct = (seg.value / sum) * 100;
      const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].pct : 0;
      acc.push({ pct, offset, color: seg.color });
      return acc;
    },
    []
  );
  const gap = visible.length > 1 ? 1 : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90" aria-hidden="true">
        <circle
          cx={50}
          cy={50}
          r={42}
          fill="none"
          strokeWidth={13}
          stroke={isDark ? "rgba(255,255,255,0.07)" : "#eef0f4"}
        />
        {sum > 0 &&
          arcs.map((arc, i) => (
            <circle
              key={i}
              cx={50}
              cy={50}
              r={42}
              fill="none"
              strokeWidth={13}
              stroke={arc.color}
              pathLength={100}
              strokeDasharray={`${Math.max(arc.pct - gap, 0.01)} ${100 - Math.max(arc.pct - gap, 0.01)}`}
              strokeDashoffset={-arc.offset}
            />
          ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

function BarRow({
  t,
  label,
  count,
  percent,
  barClass,
}: {
  t: Theme;
  label: string;
  count: number;
  percent: number;
  barClass: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`w-[88px] shrink-0 truncate text-xs font-medium ${t.text}`}>{label}</span>
      <div
        className={`flex-1 h-2.5 rounded-full overflow-hidden ${t.track}`}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} share of leads`}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ${barClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`w-7 text-right font-semibold tabular-nums ${t.title}`}>{count}</span>
      <span className={`w-9 text-right text-[11px] tabular-nums ${t.faint}`}>{percent}%</span>
    </div>
  );
}

function Panel({
  t,
  title,
  subtitle,
  icon,
  iconClass,
  action,
  footer,
  flush = false,
  className = "",
  children,
}: {
  t: Theme;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  iconClass?: string;
  action?: ReactNode;
  footer?: string;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border flex flex-col min-w-0 ${t.card} ${className}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap px-4 sm:px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <span
              className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${iconClass || ""}`}
            >
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className={`text-sm font-semibold tracking-[-0.01em] truncate ${t.title}`}>
              {title}
            </h3>
            {subtitle && <p className={`text-xs truncate mt-0.5 ${t.faint}`}>{subtitle}</p>}
          </div>
        </div>
        {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
      </div>
      <div className={`flex-1 min-w-0 ${flush ? "" : "px-4 sm:px-5 pb-4"}`}>{children}</div>
      {footer && (
        <p className={`px-4 sm:px-5 py-2.5 text-[11px] border-t ${t.line} ${t.faint}`}>{footer}</p>
      )}
    </div>
  );
}

function SectionHeading({
  t,
  children,
  actions,
}: {
  t: Theme;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      className={`pb-3 mb-3 border-b flex items-center justify-between gap-3 flex-wrap ${t.line}`}
    >
      <h3
        className={`text-sm font-semibold tracking-[-0.01em] flex items-center gap-2 ${t.title}`}
      >
        {children}
      </h3>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

function LeadActions({
  t,
  lead,
  updating,
  onUpdateStatus,
  onOpenLead,
  emailLabel,
  compact = false,
}: {
  t: Theme;
  lead: Lead;
  updating: boolean;
  onUpdateStatus: (status: string) => void;
  onOpenLead: () => void;
  emailLabel: string;
  compact?: boolean;
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showEmailNotice, setShowEmailNotice] = useState(false);

  const pad = compact ? "px-3 py-1.5" : "px-3.5 py-2";
  const base = `inline-flex items-center gap-1.5 text-xs font-medium rounded-lg transition-colors duration-200 ${FOCUS_RING} ${pad}`;
  const neutral = t.btn;
  const stop = (e: ReactMouseEvent) => e.stopPropagation();

  const handleStatusChange = (status: string) => {
    setShowStatusMenu(false);
    onUpdateStatus(status);
  };

  return (
    <div className="flex gap-1.5 shrink-0 flex-wrap items-center">
      {lead.phone && (
        <a href={"tel:" + lead.phone} onClick={stop} className={`${base} ${neutral}`}>
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
                "Hi " + lead.name + ", following up on your enquiry."
            )
          }
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          className={`${base} bg-emerald-500 hover:bg-emerald-400 text-white`}
        >
          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
        </a>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            setShowEmailNotice((current) => !current);
            setShowStatusMenu(false);
          }}
          className={`${base} bg-blue-500 hover:bg-blue-400 text-white`}
        >
          <Mail className="w-3.5 h-3.5" /> {emailLabel}
        </button>

        {showEmailNotice && (
          <div
            onClick={stop}
            className={`absolute right-0 top-full mt-2 z-30 w-64 rounded-xl border p-3 shadow-2xl ${t.menu}`}
          >
            <p className={`text-xs leading-relaxed ${t.text}`}>
              Open the full lead dashboard to review and send this email.
            </p>
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                setShowEmailNotice(false);
                onOpenLead();
              }}
              className="mt-2.5 w-full rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-400"
            >
              Open Lead Dashboard
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            setShowStatusMenu((current) => !current);
            setShowEmailNotice(false);
          }}
          disabled={updating}
          className={`${base} ${neutral} disabled:opacity-50 disabled:cursor-wait`}
        >
          {updating ? "Updating…" : "Update Status"}
        </button>

        {showStatusMenu && !updating && (
          <div
            onClick={stop}
            className={`absolute right-0 top-full mt-2 z-30 min-w-40 rounded-xl border p-1.5 shadow-2xl ${t.menu}`}
          >
            {[
              { value: "qualified", label: "Qualified" },
              { value: "won", label: "Won" },
              { value: "lost", label: "Lost" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={(e) => {
                  stop(e);
                  handleStatusChange(option.value);
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition ${t.text} ${t.hover}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({
  name,
  isDark,
  small,
}: {
  name: string;
  isDark: boolean;
  small?: boolean;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const size = small ? "w-8 h-8 text-[10px]" : "w-9 h-9 text-[11px]";
  return (
    <div
      aria-hidden="true"
      className={`shrink-0 rounded-full flex items-center justify-center font-semibold tracking-wide ${size} ${
        isDark
          ? "bg-gradient-to-br from-white/[0.12] to-white/[0.04] text-gray-200 ring-1 ring-inset ring-white/[0.08]"
          : "bg-gradient-to-br from-gray-100 to-gray-50 text-gray-700 ring-1 ring-inset ring-gray-200"
      }`}
    >
      {initials || "?"}
    </div>
  );
}