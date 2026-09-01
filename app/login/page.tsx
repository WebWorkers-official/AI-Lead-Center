"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-6 font-['Inter',system-ui,sans-serif] antialiased">
        <div className="w-full max-w-sm bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 sm:p-7 backdrop-blur-sm transition-colors duration-300">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-white">
              AI Lead Command Center
            </h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.06em] text-gray-500 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.06em] text-gray-500 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-medium rounded-xl px-4 py-2.5 transition duration-200 text-sm"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
