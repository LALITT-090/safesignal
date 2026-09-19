"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"checking" | "invalid" | "ready" | "request-sent">("checking");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const supabase = createSupabaseBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || session) {
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (cancelled) {
          return;
        }

        if (userError || !userData.user) {
          setError("This password reset link has expired or is invalid.");
          setStatus("invalid");
          return;
        }

        setStatus("ready");
      }
    });

    async function checkRecoverySession() {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (userError || !userData.user) {
        setError("This password reset link has expired or is invalid.");
        setStatus("invalid");
        return;
      }

      setStatus("ready");
    }

    void checkRecoverySession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function handleRequestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter the email address associated with your SafeSignal authority account.");
      setLoading(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: "http://localhost:3000/reset-password",
    });

    if (resetError) {
      setError(resetError.message || "We could not send the password reset email.");
      setLoading(false);
      return;
    }

    setSuccess("If that account exists, a password reset email has been sent.");
    setStatus("request-sent");
    setLoading(false);
  }

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setError("This password reset link has expired or is invalid.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message || "We could not update your password.");
      setLoading(false);
      return;
    }

    setSuccess("Password updated successfully.");
    setLoading(false);
    await supabase.auth.signOut();
    setTimeout(() => {
      router.push("/login");
    }, 1200);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">SafeSignal</p>

        {status === "checking" && (
          <>
            <h1 className="mt-3 text-3xl font-bold">Checking reset link</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Verifying your password reset session.
            </p>
          </>
        )}

        {status === "invalid" && (
          <>
            <h1 className="mt-3 text-3xl font-bold">Reset link unavailable</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              This password reset link has expired or is invalid.
            </p>
            <div className="mt-6 space-y-4">
              {error && (
                <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  {error}
                </p>
              )}
              <Link
                href="/login"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Request a new reset link
              </Link>
            </div>
          </>
        )}

        {status === "request-sent" && (
          <>
            <h1 className="mt-3 text-3xl font-bold">Check your email</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              If an account exists for that email, a password reset email has been sent.
            </p>
            {success && (
              <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                {success}
              </p>
            )}
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 font-semibold text-white transition hover:border-slate-500"
              >
                Back to sign in
              </Link>
            </div>
          </>
        )}

        {status === "ready" && (
          <>
            <h1 className="mt-3 text-3xl font-bold">Set a new password</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Choose a new password for your SafeSignal authority account.
            </p>
            <form onSubmit={handleUpdatePassword} className="mt-8 space-y-5">
              <div>
                <label htmlFor="new-password" className="mb-2 block text-sm font-medium">New password</label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium">Confirm new password</label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  {error}
                </p>
              )}

              {success && (
                <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="min-h-12 w-full rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Updating password..." : "Update password"}
              </button>
            </form>
          </>
        )}

        {status !== "ready" && status !== "invalid" && status !== "request-sent" && (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
            Checking your reset link...
          </div>
        )}

        {status !== "ready" && status !== "checking" && status !== "request-sent" && (
          <div className="mt-6">
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="mb-2 block text-sm font-medium">Email</label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 font-semibold text-white transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending reset link..." : "Request reset link"}
              </button>
            </form>
          </div>
        )}

        <div className="mt-6">
          <Link href="/login" className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 font-semibold text-white transition hover:border-slate-500">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
