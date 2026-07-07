"use client";

import { getProviders, signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Suspense, useEffect, useState } from "react";
import PageLoading from "../PageLoading";

// useSearchParams() forces the child into client-only rendering, so
// the whole subtree must be wrapped in a Suspense boundary or the
// prerender step fails. Split the page in two: a trivial outer
// component that owns the boundary, and the existing form/logic
// inside it.
export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Login />
    </Suspense>
  );
}

function Login() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Which OAuth providers are actually configured on the server.
  // Google/Apple only appear when their env vars are set (see
  // lib/auth.ts), so we ask the server which are live rather than
  // hardcoding assumptions in the UI.
  const [oauthProviders, setOauthProviders] = useState<{
    google?: boolean;
    apple?: boolean;
  }>({});
  const [oauthLoading, setOauthLoading] = useState<null | "google" | "apple">(
    null,
  );

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  useEffect(() => {
    getProviders().then((p) => {
      setOauthProviders({
        google: !!p?.google,
        apple: !!p?.apple,
      });
    });
  }, []);

  // NextAuth redirects failed OAuth flows to /login?error=... Show a
  // friendly message for the common ones; anything unrecognised falls
  // through to a generic fail-safe.
  useEffect(() => {
    const err = searchParams.get("error");
    if (!err) return;
    if (err === "OAuthNoEmail") {
      setError("Your Apple ID didn't share an email. Try Google, or the form below.");
    } else if (err === "OAuthAccountNotLinked") {
      setError(
        "That email is already registered with a different sign-in method. Use email + password below.",
      );
    } else if (err !== "CredentialsSignin") {
      setError("Sign-in failed. Try again.");
    }
  }, [searchParams]);

  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(provider);
    // redirect:true lets NextAuth handle the OAuth round-trip and
    // the eventual bounce back to /dashboard (or /signup if the
    // signIn callback rejects them for not being on the waitlist).
    await signIn(provider, { callbackUrl: "/dashboard" });
  };

  if (status === "loading") {
    return <PageLoading />;
  }

  if (status === "authenticated") {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      // NextAuth surfaces authorize() throws via res.error. Show a
      // specific message for the lockout code; everything else falls
      // through to the generic wrong-credentials copy.
      if (res.error === "ACCOUNT_LOCKED") {
        setError(
          "Too many failed attempts. This account is locked for 15 minutes.",
        );
      } else {
        setError("Incorrect email or password.");
      }
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  };

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-5">
      {/* Aurora - same language as the landing/app surfaces. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(40% 50% at 20% 0%, rgba(20,184,166,0.18) 0%, rgba(20,184,166,0) 70%), radial-gradient(40% 50% at 80% 5%, rgba(99,102,241,0.14) 0%, rgba(99,102,241,0) 70%), radial-gradient(35% 40% at 50% 60%, rgba(20,184,166,0.06) 0%, rgba(20,184,166,0) 70%)",
        }}
      />

      {/* Back chevron - top-left, matches the detail-page back pattern. */}
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
        {/* Header */}
        <div className="mb-7 text-center">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.05]">
            <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Sign in
            </span>
          </h1>
        </div>

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
                  Continue with Google
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
                  Continue with Apple
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

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
                autoFocus
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="••••••••"
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

          {/* Submit */}
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
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <i className="fa-solid fa-chevron-right text-[10px]" />
              </>
            )}
          </button>
        </form>

        {/* Footer line */}
        <div className="mt-6 text-center text-[11.5px] text-white/40">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-white/70 hover:text-white underline decoration-white/20 underline-offset-2 hover:decoration-teal-400 transition"
          >
            Join the waitlist
          </Link>
          .
        </div>
      </motion.div>
    </div>
  );
}
