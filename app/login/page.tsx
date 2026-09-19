"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isAuthorityUser } from "../../lib/supabase/authority";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);

  useEffect(() => {
    async function checkCurrentSession() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && isAuthorityUser(user)) {
        router.replace(searchParams.get("next") || "/dashboard");
        return;
      }

      if (user && !isAuthorityUser(user)) {
        setError("This account is not authorized to access the SafeSignal authority tools.");
      }

      setSessionChecking(false);
    }

    void checkCurrentSession();
  }, [router, searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError("We could not sign you in. Check your credentials or contact an administrator.");
      setLoading(false);
      return;
    }

    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();

    const user = sessionUser ?? data.user;
    if (!user || !isAuthorityUser(user)) {
      await supabase.auth.signOut();
      setError("This account is not authorized to access the SafeSignal authority tools.");
      setLoading(false);
      return;
    }

    router.replace(searchParams.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">SafeSignal</p>
        <h1 className="mt-3 text-3xl font-bold">Authority sign in</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Authorized access is required for dashboards, review tools and exact internal location data.
        </p>

        {sessionChecking ? (
          <div className="mt-8 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
            Checking your session...
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
            />
          </div>

          {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}

          <div className="flex items-center justify-end">
            <Link href="/reset-password" className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 w-full rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        )}
      </div>
    </main>
  );
}
