"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

const MIN_PASSWORD_LENGTH = 8;
const EXPIRED_RESET_LINK_ERROR =
  "This password reset link has expired or has already been used. Please request a new one below.";

function getExpiredResetLinkState() {
  if (typeof window === "undefined") {
    return { hasExpiredLink: false, status: "checking" as const, error: "" };
  }

  const hash = window.location.hash;
  const search = window.location.search;
  const searchParams = new URLSearchParams(search);
  const hasOtpExpired =
    hash.includes("error_code=otp_expired") ||
    hash.includes("access_denied") ||
    searchParams.get("error_code") === "otp_expired" ||
    searchParams.get("error") === "access_denied";

  if (hasOtpExpired) {
    return { hasExpiredLink: true, status: "request" as const, error: EXPIRED_RESET_LINK_ERROR };
  }

  return { hasExpiredLink: false, status: "checking" as const, error: "" };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const initialResetLinkState = useMemo(() => getExpiredResetLinkState(), []);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"checking" | "request" | "ready" | "request-sent">(initialResetLinkState.status);
  const [error, setError] = useState(initialResetLinkState.error);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const search = typeof window !== "undefined" ? window.location.search : "";
    const searchParams = new URLSearchParams(search);

    if (initialResetLinkState.hasExpiredLink) {
      return;
    }

    const hasRecoverySignal =
      hash.includes("type=recovery") ||
      hash.includes("access_token") ||
      searchParams.has("code");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      if (event === "PASSWORD_RECOVERY" || (session && hasRecoverySignal)) {
        setStatus("ready");
        setError("");
      }
    });

    async function checkSession() {
      const code = searchParams.get("code");
      if (code) {
        try {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (!exchangeError) {
            if (!cancelled) {
              setStatus("ready");
              setError("");
              return;
            }
          }
        } catch {
          // fallback
        }
      }

      if (hasRecoverySignal) {
        const { data: userData } = await supabase.auth.getUser();
        if (cancelled) return;

        if (userData?.user) {
          setStatus("ready");
          setError("");
          return;
        }
      }

      if (!cancelled) {
        setStatus("request");
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [initialResetLinkState.hasExpiredLink]);

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

    const redirectUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : "http://localhost:3000/reset-password";

    const supabase = createSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: redirectUrl,
    });

    if (resetError) {
      setError(resetError.message || "We could not send the password reset email.");
      setLoading(false);
      return;
    }

    setSuccess("If an account exists for that email, a password reset email has been sent.");
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
      setError("This password reset link has expired or is invalid. Please request a new link.");
      setStatus("request");
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

    setSuccess("Password updated successfully. Redirecting to sign in...");
    setLoading(false);
    await supabase.auth.signOut();
    setTimeout(() => {
      router.push("/login");
    }, 1500);
  }

  return (
    <main className="min-h-screen bg-[#FAF8F5] px-6 py-16 text-[#3B3540]">
      <div className="mx-auto max-w-md rounded-[22px] border border-[#E7E0E3] bg-[#FFFFFF] p-8 shadow-[0_18px_32px_rgba(67,42,82,0.06)]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#432A52]">SafeSignal</p>

        {status === "checking" && (
          <div className="mt-6 rounded-2xl border border-[#E7E0E3] bg-[#FAF8F5] p-4 text-sm text-[#5E5967]">
            Checking your reset link...
          </div>
        )}

        {status === "request" && (
          <>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#2D1B36]">Reset password</h1>
            <p className="mt-3 text-sm leading-6 text-[#5E5967]">
              Enter the email address associated with your SafeSignal authority account to receive a reset link.
            </p>

            {error && (
              <p role="alert" className="mt-6 rounded-xl border border-[#E7E0E3] bg-[#FFF9F8] p-4 text-sm text-[#B94A48]">
                {error}
              </p>
            )}

            <form onSubmit={handleRequestReset} className="mt-6 space-y-5">
              <div>
                <label htmlFor="reset-email" className="mb-2 block text-sm font-bold text-[#2D1B36]">Email</label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="min-h-12 w-full rounded-xl border border-[#E7E0E3] bg-[#FAF8F5] px-4 py-3 text-[#3B3540] outline-none transition focus:border-[#432A52]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="min-h-12 w-full rounded-xl bg-[#432A52] px-5 py-3 font-semibold text-[#FFFFFF] transition hover:bg-[#5F3E66] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending reset link..." : "Send reset link"}
              </button>
            </form>
          </>
        )}

        {status === "request-sent" && (
          <>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#2D1B36]">Check your email</h1>
            <p className="mt-3 text-sm leading-6 text-[#5E5967]">
              If an account exists for that email, a password reset email has been sent.
            </p>
            {success && (
              <p className="mt-4 rounded-xl border border-[#E7E0E3] bg-[#F0F7F3] p-4 text-sm text-[#3F7D63]">
                {success}
              </p>
            )}
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#E7E0E3] bg-[#FAF8F5] px-5 py-3 font-semibold text-[#2D1B36] transition hover:bg-[#F2ECF3]"
              >
                Back to sign in
              </Link>
            </div>
          </>
        )}

        {status === "ready" && (
          <>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#2D1B36]">Set a new password</h1>
            <p className="mt-3 text-sm leading-6 text-[#5E5967]">
              Choose a new password for your SafeSignal authority account.
            </p>
            <form onSubmit={handleUpdatePassword} className="mt-8 space-y-5">
              <div>
                <label htmlFor="new-password" className="mb-2 block text-sm font-bold text-[#2D1B36]">New password</label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="min-h-12 w-full rounded-xl border border-[#E7E0E3] bg-[#FAF8F5] px-4 py-3 text-[#3B3540] outline-none transition focus:border-[#432A52]"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-sm font-bold text-[#2D1B36]">Confirm new password</label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="min-h-12 w-full rounded-xl border border-[#E7E0E3] bg-[#FAF8F5] px-4 py-3 text-[#3B3540] outline-none transition focus:border-[#432A52]"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-[#E7E0E3] bg-[#FFF9F8] p-4 text-sm text-[#B94A48]">
                  {error}
                </p>
              )}

              {success && (
                <p className="rounded-xl border border-[#E7E0E3] bg-[#F0F7F3] p-4 text-sm text-[#3F7D63]">
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="min-h-12 w-full rounded-xl bg-[#432A52] px-5 py-3 font-semibold text-[#FFFFFF] transition hover:bg-[#5F3E66] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Updating password..." : "Update password"}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 border-t border-[#E7E0E3] pt-6">
          <Link href="/login" className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#E7E0E3] bg-[#FAF8F5] px-5 py-3 font-semibold text-[#2D1B36] transition hover:bg-[#F2ECF3]">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
