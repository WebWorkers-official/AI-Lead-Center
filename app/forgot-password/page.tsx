"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Rocket,
  Mail,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Check,
} from "lucide-react";

const FEATURES = [
  "Email verification required",
  "Encrypted end-to-end",
  "Auto sign-out after reset",
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

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  const [isDark, setIsDark] = useState(true);

  // Same theme preference the dashboard uses
  useEffect(() => {
    setIsDark(localStorage.getItem("theme") !== "light");
  }, []);

  async function handleSendCode() {
    setLoading(true);
    setMessage("");
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    setLoading(false);

    if (error) {
      setError("Unable to send the code. Please try again.");
      return;
    }

    setOtpSent(true);
    setMessage("A verification code has been sent to your email.");
  }

  async function handleVerifyCode() {
    setLoading(true);
    setMessage("");
    setError("");

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    setLoading(false);

    if (error) {
      setError("Invalid or expired code. Please try again.");
      return;
    }

    setOtpVerified(true);
    setMessage("Code verified successfully.");
  }

  async function handleResetPassword() {
    setLoading(true);
    setMessage("");
    setError("");

    if (password.length < 8) {
      setLoading(false);
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setLoading(false);
      setError("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setLoading(false);
      setError("Unable to reset your password. Please try again.");
      return;
    }

    setPasswordUpdated(true);
    setMessage("Password reset successfully.");

    await supabase.auth.signOut();

    setTimeout(() => {
      router.push("/login");
    }, 1400);
  }

  const currentStep = passwordUpdated ? 3 : otpVerified ? 2 : otpSent ? 1 : 0;

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
  const inputBase = `w-full rounded-xl border text-sm transition-all duration-200 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-55 ${inputCls} ${FOCUS_RING}`;
  const btnPrimary = `group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`;

  const title = passwordUpdated
    ? "Password updated"
    : otpVerified
    ? "Create a new password"
    : otpSent
    ? "Check your email"
    : "Reset your password";

  const subtitle = passwordUpdated
    ? "Your account is secured. Taking you back to login."
    : otpVerified
    ? "Choose a strong password you’ll remember."
    : otpSent
    ? `We sent a 6-digit verification code to ${email}.`
    : "Enter your account email and we'll help you regain access.";

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
              Account security
            </span>

            <h2 className={`mt-5 text-3xl font-extrabold leading-[1.1] tracking-tight ${primaryText}`}>
              Get back to work.
            </h2>

            <p className={`mt-4 text-sm leading-6 ${subtleText}`}>
              Recover your account securely and continue managing your leads
              without losing your workflow.
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

          <p className={`flex items-center gap-2 text-xs ${subtleText}`}>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Recovery protected by secure email verification.
          </p>
        </aside>

        {/* ================= RECOVERY PANEL ================= */}
        <section className="p-6 sm:p-10">
          {/* Mobile brand */}
          <div className="mb-8 lg:hidden">
            <Brand isDark={isDark} />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-400">
              Account recovery
            </p>
            {!passwordUpdated && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  isDark ? "bg-white/[0.06] text-gray-400" : "bg-gray-100 text-gray-500"
                }`}
              >
                Step {currentStep + 1} of 3
              </span>
            )}
          </div>

          <h1 className={`mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight ${primaryText}`}>
            {title}
          </h1>
          <p className={`mt-2 text-sm leading-6 break-words ${subtleText}`}>{subtitle}</p>

          {/* Step indicator */}
          {!passwordUpdated && (
            <div className="mt-6 flex gap-2" aria-hidden="true">
              {[0, 1, 2].map((step) => (
                <div
                  key={step}
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                    step === currentStep
                      ? "bg-gradient-to-r from-blue-400 to-indigo-500"
                      : step < currentStep
                      ? "bg-blue-500/40"
                      : isDark
                      ? "bg-white/[0.08]"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          )}

          {/* ---------- Step 1 + 2: email and code ---------- */}
          {!otpVerified && !passwordUpdated && (
            <div className="mt-7 space-y-5">
              <div>
                <label htmlFor="recovery-email" className={`mb-2 block text-xs font-medium ${mutedText}`}>
                  Email address
                </label>
                <div className="group relative">
                  <IconSlot subtleText={subtleText}>
                    <Mail className="w-4 h-4" />
                  </IconSlot>
                  <input
                    id="recovery-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={otpSent}
                    placeholder="you@company.com"
                    className={`${inputBase} h-11 pl-11 ${otpSent ? "pr-16" : "pr-4"}`}
                  />
                  {otpSent && (
                    <span className={`pointer-events-none absolute right-0 top-0 flex h-11 items-center pr-4 text-[10px] font-semibold uppercase tracking-[0.14em] ${subtleText}`}>
                      Locked
                    </span>
                  )}
                </div>
              </div>

              {!otpSent && (
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading || !email}
                  className={btnPrimary}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Sending code…" : "Continue"}
                </button>
              )}

              {otpSent && (
                <div>
                  <label htmlFor="recovery-otp" className={`mb-2 block text-xs font-medium ${mutedText}`}>
                    Verification code
                  </label>
                  <div className="group relative">
                    <IconSlot subtleText={subtleText} tall>
                      <KeyRound className="w-4 h-4" />
                    </IconSlot>
                    <input
                      id="recovery-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="••••••"
                      className={`${inputBase} h-14 pl-11 pr-4 text-center text-xl font-semibold tracking-[0.5em] tabular-nums`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={loading || otp.length !== 6}
                    className={`${btnPrimary} mt-5`}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? "Verifying…" : "Verify code"}
                  </button>

                  <p className={`mt-3 text-center text-xs ${subtleText}`}>
                    Enter the 6-digit code from your email.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ---------- Step 3: new password ---------- */}
          {otpVerified && !passwordUpdated && (
            <div className="mt-7 space-y-5">
              <PasswordField
                id="new-password"
                label="New password"
                placeholder="Enter your new password"
                value={password}
                onChange={setPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                isDark={isDark}
                inputBase={inputBase}
                mutedText={mutedText}
                subtleText={subtleText}
              />

              <PasswordField
                id="confirm-password"
                label="Confirm password"
                placeholder="Enter your password again"
                value={confirmPassword}
                onChange={setConfirmPassword}
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((value) => !value)}
                isDark={isDark}
                inputBase={inputBase}
                mutedText={mutedText}
                subtleText={subtleText}
              />

              <p
                className={`flex items-center gap-2 text-xs ${
                  password.length >= 8 ? "text-emerald-500" : subtleText
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                At least 8 characters
              </p>

              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading || !password || !confirmPassword}
                className={btnPrimary}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Updating password…" : "Update password"}
              </button>
            </div>
          )}

          {/* ---------- Success ---------- */}
          {passwordUpdated && (
            <div className={`mt-7 border-t pt-6 ${divider}`}>
              <div className="flex items-center gap-4">
                <span className="flex items-center justify-center w-12 h-12 shrink-0 rounded-2xl bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </span>
                <div>
                  <p className={`text-sm font-semibold ${primaryText}`}>
                    Password changed successfully
                  </p>
                  <p className={`mt-1 text-xs ${subtleText}`}>
                    Redirecting you to secure login…
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ---------- Messages ---------- */}
          {!passwordUpdated && error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3.5 py-3 text-xs leading-5 text-red-400"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              {error}
            </div>
          )}

          {!passwordUpdated && message && (
            <div
              role="status"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3.5 py-3 text-xs leading-5 text-emerald-400"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-px" />
              {message}
            </div>
          )}

          {/* ---------- Footer ---------- */}
          <div className={`mt-8 border-t pt-5 flex items-center justify-between gap-3 ${divider}`}>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className={`flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors hover:text-blue-400 ${subtleText} ${FOCUS_RING}`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </button>
            <p className={`flex items-center gap-1.5 text-xs ${subtleText}`}>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Secure account recovery
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ============================================================
   PRESENTATIONAL COMPONENTS — no application logic
============================================================ */

function IconSlot({
  children,
  subtleText,
  tall,
}: {
  children: ReactNode;
  subtleText: string;
  tall?: boolean;
}) {
  return (
    <span
      className={`pointer-events-none absolute left-0 top-0 flex ${
        tall ? "h-14" : "h-11"
      } w-11 items-center justify-center transition-colors group-focus-within:text-blue-400 ${subtleText}`}
    >
      {children}
    </span>
  );
}

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  visible,
  onToggle,
  isDark,
  inputBase,
  mutedText,
  subtleText,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  isDark: boolean;
  inputBase: string;
  mutedText: string;
  subtleText: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={`mb-2 block text-xs font-medium ${mutedText}`}>
        {label}
      </label>
      <div className="group relative">
        <IconSlot subtleText={subtleText}>
          <Lock className="w-4 h-4" />
        </IconSlot>
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputBase} h-11 pl-11 pr-12`}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? "Hide password" : "Show password"}
          className={`absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${FOCUS_RING} ${
            isDark
              ? "text-gray-500 hover:bg-white/10 hover:text-white"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}