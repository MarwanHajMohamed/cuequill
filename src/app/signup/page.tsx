"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";

// Self-serve account creation. Collects name / email / password, creates
// the account via /api/auth/register, then signs the user straight in.
// Google / Apple sign-up (when configured) create the account through
// NextAuth's signIn callback instead.

export default function SignupPage() {
  // useSearchParams() forces client-only rendering, so the subtree must
  // sit inside a Suspense boundary or the prerender step fails.
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [firstname, setFirstname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Set when NextAuth's OAuth signIn callback bounces a user here because
  // their Google/Apple email isn't invited (only in invite-only mode).
  const oauthNotInvited = searchParams.get("reason") === "oauth-not-invited";

  const [oauthProviders, setOauthProviders] = useState<{
    google?: boolean;
    apple?: boolean;
  }>({});
  const [oauthLoading, setOauthLoading] = useState<null | "google" | "apple">(
    null,
  );
  useEffect(() => {
    getProviders().then((p) =>
      setOauthProviders({ google: !!p?.google, apple: !!p?.apple }),
    );
  }, []);

  const canSubmit =
    firstname.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    !loading;

  const handleOAuth = (provider: "google" | "apple") => {
    setOauthLoading(provider);
    signIn(provider, { callbackUrl: "/dashboard" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    let timezone: string | null = null;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
    } catch {
      /* leave null - the app falls back elsewhere */
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: firstname.trim(),
          email: email.trim(),
          password,
          timezone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again?");
        setLoading(false);
        return;
      }

      // Account created - sign in with the same credentials and land in
      // the app.
      const signInRes = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (signInRes?.error) {
        // Created but couldn't auto-sign-in (rare) - send them to login.
        router.push("/login");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Network error. Try again?");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-5">
      {/* Aurora - same treatment as the login card. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(40% 50% at 20% 0%, rgba(20,184,166,0.18) 0%, rgba(20,184,166,0) 70%), radial-gradient(40% 50% at 80% 5%, rgba(99,102,241,0.14) 0%, rgba(99,102,241,0) 70%), radial-gradient(35% 40% at 50% 60%, rgba(20,184,166,0.06) 0%, rgba(20,184,166,0) 70%)",
        }}
      />

      <Link
        href="/"
        aria-label="Back to home"
        className="absolute top-6 left-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md text-white/65 hover:bg-white/[0.06] hover:text-white transition text-[12px] font-medium"
      >
        <i className="fa-solid fa-chevron-left text-[10px]" />
        Back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-7 md:p-8 shadow-[0_24px_80px_var(--shadow)]"
      >
        <div className="flex flex-col gap-1.5 mb-7 text-center">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.05]">
            <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Create your account
            </span>
          </h1>
          <p className="text-[13px] text-white/50 mt-1">
            Start journaling in under a minute. Free, no card required.
          </p>
        </div>

        {oauthNotInvited && (
          <div className="mb-5 border border-teal-500/25 bg-teal-500/[0.06] rounded-xl px-3.5 py-2.5 text-[12.5px] text-teal-200 flex items-start gap-2">
            <i className="fa-solid fa-circle-info text-[12px] mt-0.5" />
            <span>
              That account isn&apos;t on the list yet. Create an account with
              your email below.
            </span>
          </div>
        )}

        {(oauthProviders.google || oauthProviders.apple) && (
          <>
            <div className="flex flex-col gap-2 mb-5">
              {oauthProviders.google && (
                <button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  disabled={oauthLoading !== null}
                  className="inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-full border border-white/15 bg-white text-black hover:bg-white/90 transition text-[13.5px] font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {oauthLoading === "google" ? (
                    <i className="fa-solid fa-circle-notch animate-spin text-[12px]" />
                  ) : (
                    <i className="fa-brands fa-google text-[13px]" />
                  )}
                  Sign up with Google
                </button>
              )}
              {oauthProviders.apple && (
                <button
                  type="button"
                  onClick={() => handleOAuth("apple")}
                  disabled={oauthLoading !== null}
                  className="inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-full border border-white/15 bg-black text-white hover:bg-neutral-900 transition text-[13.5px] font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {oauthLoading === "apple" ? (
                    <i className="fa-solid fa-circle-notch animate-spin text-[12px]" />
                  ) : (
                    <i className="fa-brands fa-apple text-[14px]" />
                  )}
                  Sign up with Apple
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 mb-5 text-[10.5px] tracking-[0.12em] text-white/35">
              <div className="flex-1 h-px bg-white/10" />
              OR
              <div className="flex-1 h-px bg-white/10" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* First name */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] tracking-[0.08em] text-white/45 font-medium">
              First name
            </span>
            <div className="relative">
              <i className="fa-solid fa-user absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-white/35" />
              <input
                type="text"
                autoComplete="given-name"
                value={firstname}
                onChange={(e) => {
                  setFirstname(e.target.value);
                  setError("");
                }}
                placeholder="Marwan"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition"
              />
            </div>
          </label>

          {/* Email */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] tracking-[0.08em] text-white/45 font-medium">
              Email
            </span>
            <div className="relative">
              <i className="fa-solid fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-white/35" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="you@example.com"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition"
              />
            </div>
          </label>

          {/* Password */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] tracking-[0.08em] text-white/45 font-medium">
              Password
            </span>
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-white/35" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="At least 8 characters"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md text-white/45 hover:text-white hover:bg-white/[0.05] transition cursor-pointer flex items-center justify-center"
              >
                <i
                  className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} text-[11px]`}
                />
              </button>
            </div>
          </label>

          {error && (
            <div
              aria-live="polite"
              className="border border-red-500/25 bg-red-500/10 text-red-300 text-[12.5px] rounded-lg px-3 py-2 flex items-center gap-2"
            >
              <i className="fa-solid fa-triangle-exclamation text-[11px]" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border transition text-[13.5px] font-medium ${
              canSubmit
                ? "bg-teal-500/15 text-teal-300 border-teal-500/25 hover:bg-teal-500/25 cursor-pointer"
                : "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin text-[12px]" />
                Creating account…
              </>
            ) : (
              <>
                Create account
                <i className="fa-solid fa-chevron-right text-[10px]" />
              </>
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-white/35 leading-relaxed">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="text-white/55 hover:text-white underline decoration-white/20 underline-offset-2">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-white/55 hover:text-white underline decoration-white/20 underline-offset-2">
            Privacy policy
          </Link>
          .
        </p>

        <div className="mt-4 text-center text-[11.5px] text-white/40">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-white/70 hover:text-white underline decoration-white/20 underline-offset-2 hover:decoration-teal-400 transition"
          >
            Sign in
          </Link>
          .
        </div>
      </motion.div>
    </div>
  );
}
