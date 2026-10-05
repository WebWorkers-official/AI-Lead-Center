"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Rocket,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Check,
} from "lucide-react";

const FEATURES = [
  "Qualify inbound leads automatically",
  "AI-assisted follow-ups, never miss one",
  "Your pipeline, always in clear view",
];

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50";

/* Same brand block as the dashboard sidebar */
function Brand({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <span className="absolute inset-0 rounded-2xl bg-blue-500/30 blur-xl" />
        <span className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
          <Rocket className="w-5 h-5" strokeWidth={2.5} />
        </span>
      </div>
      <div className="leading-tight">
        <p className="text-lg font-extrabold tracking-[-0.02em] bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          RaveWebs
        </p>
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
            isDark ? "text-gray-500" : "text-gray-400"
          }`}
        >
          Lead Command Center
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Same theme preference the dashboard uses
  useEffect(() => {
    setIsDark(localStorage.getItem("theme") !== "light");
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
  }

  /* ---------------- Design tokens (dashboard palette) ---------------- */

  const pageBg = isDark ? "bg-[#0b0b0f] text-gray-100" : "bg-[#f6f8fc] text-gray-900";
  const cardCls = isDark
    ? "bg-[#111118] border-white/[0.06]"
    : "bg-white border-gray-200/70 shadow-xl";
  const divider = isDark ? "border-white/[0.06]" : "border-gray-200/70";
  const primaryText = isDark ? "text-white" : "text-gray-900";
  const mutedText = isDark ? "text-gray-400" : "text-gray-600";
  const subtleText = isDark ? "text-gray-500" : "text-gray-400";
  const inputCls = isDark
    ? "bg-white/[0.06] border-white/10 text-white placeholder:text-gray-600 hover:border-white/20"
    : "bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 hover:border-gray-300";

  return (
    <main
      className={`min-h-screen flex items-center justify-center px-4 py-8 font-['Inter',system-ui,sans-serif] antialiased transition-colors duration-700 ${pageBg}`}
    >
      <div
        className={`w-full max-w-[960px] grid lg:grid-cols-2 overflow-hidden rounded-2xl border ${cardCls}`}
      >
        {/* ================= BRAND PANEL ================= */}
        <aside
          className={`hidden lg:flex flex-col justify-between p-10 border-r ${divider} ${
            isDark ? "bg-white/[0.02]" : "bg-gray-50/60"
          }`}
        >
          <Brand isDark={isDark} />

          <div className="max-w-[340px]">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                isDark
                  ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400"
                  : "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Your workspace
            </span>

            <h2 className={`mt-5 text-3xl font-extrabold leading-[1.1] tracking-tight ${primaryText}`}>
              Turn leads into conversations.
            </h2>

            <p className={`mt-4 text-sm leading-6 ${subtleText}`}>
              Manage, qualify and follow up with your leads from one focused
              workspace.
            </p>

            <ul className="mt-8 space-y-3">
              {FEATURES.map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-0.5 flex items-center justify-center w-5 h-5 shrink-0 rounded-full bg-blue-500/10 text-blue-400">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                  <span className={`text-sm leading-5 ${mutedText}`}>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className={`text-xs ${subtleText}`}>AI Lead Command Center · RaveWebs</p>
        </aside>

        {/* ================= LOGIN PANEL ================= */}
        <section className="p-6 sm:p-10">
          {/* Mobile brand */}
          <div className="mb-8 lg:hidden">
            <Brand isDark={isDark} />
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-400">
            Welcome back
          </p>
          <h1 className={`mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight ${primaryText}`}>
            Sign in to your workspace
          </h1>
          <p className={`mt-2 text-sm leading-6 ${subtleText}`}>
            Access your leads, pipeline and AI-powered tools.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className={`mb-2 block text-xs font-medium ${mutedText}`}>
                Email address
              </label>
              <div className="group relative">
                <span
                  className={`pointer-events-none absolute left-0 top-0 flex h-11 w-11 items-center justify-center transition-colors group-focus-within:text-blue-400 ${subtleText}`}
                >
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className={`h-11 w-full rounded-xl border pl-11 pr-4 text-sm transition-all duration-200 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/25 ${inputCls} ${FOCUS_RING}`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className={`block text-xs font-medium ${mutedText}`}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => router.push("/forgot-password")}
                  className={`rounded-md text-xs font-medium transition-colors hover:text-blue-400 ${subtleText} ${FOCUS_RING}`}
                >
                  Forgot password?
                </button>
              </div>
              <div className="group relative">
                <span
                  className={`pointer-events-none absolute left-0 top-0 flex h-11 w-11 items-center justify-center transition-colors group-focus-within:text-blue-400 ${subtleText}`}
                >
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`h-11 w-full rounded-xl border pl-11 pr-12 text-sm transition-all duration-200 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/25 ${inputCls} ${FOCUS_RING}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className={`absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${FOCUS_RING} ${
                    isDark
                      ? "text-gray-500 hover:bg-white/10 hover:text-white"
                      : "text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3.5 py-3 text-xs leading-5 text-red-400"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
              {!loading && (
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              )}
            </button>
          </form>

          {/* Security note */}
          <div className={`mt-8 border-t pt-5 ${divider}`}>
            <p className={`flex items-center justify-center gap-2 text-xs ${subtleText}`}>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Secure access to your RaveWebs workspace
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}