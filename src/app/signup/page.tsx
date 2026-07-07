"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

// Pre-launch signup. Cuequill is currently invite-only, so instead of
// creating a real account this collects an email into the waitlist
// collection. Copy is written to make the "not yet" a feature, not a
// dead end.

type State =
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "success"; existed: boolean }
  | { kind: "error"; message: string };

export default function SignupPage() {
  const [firstname, setFirstname] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "form" });
  const searchParams = useSearchParams();
  // Set when NextAuth's OAuth signIn callback bounces a user here
  // because their Google/Apple email isn't on the waitlist yet.
  const oauthNotInvited = searchParams.get("reason") === "oauth-not-invited";

  const canSubmit =
    email.trim().length > 0 && state.kind !== "submitting";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setState({ kind: "submitting" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstname: firstname.trim(),
          source: "signup-page",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({
          kind: "error",
          message: data.error ?? "Something went wrong. Try again?",
        });
        return;
      }
      setState({ kind: "success", existed: !!data.existed });
    } catch {
      setState({
        kind: "error",
        message: "Network error. Try again?",
      });
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-5">
      {/* Aurora — same treatment as the login card. */}
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
        {state.kind === "success" ? (
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="w-12 h-12 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
              <i className="fa-solid fa-check text-teal-300 text-[16px]" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {state.existed ? "Already on the list." : "You're on the list."}
            </h1>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium"
            >
              Back home
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5 mb-7 text-center">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.05]">
                <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  Join the waitlist
                </span>
              </h1>
              <p className="text-[13px] text-white/50 mt-1">
                Drop your email and we&apos;ll invite you as soon as we&apos;re
                open.
              </p>
            </div>

            {oauthNotInvited && (
              <div className="mb-5 border border-teal-500/25 bg-teal-500/[0.06] rounded-xl px-3.5 py-2.5 text-[12.5px] text-teal-200 flex items-start gap-2">
                <i className="fa-solid fa-circle-info text-[12px] mt-0.5" />
                <span>
                  That account isn&apos;t on the waitlist yet. Enter your
                  email below to request access.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                    onChange={(e) => setFirstname(e.target.value)}
                    placeholder="Marwan"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition"
                  />
                </div>
              </label>

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
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (state.kind === "error") setState({ kind: "form" });
                    }}
                    placeholder="you@example.com"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition"
                  />
                </div>
              </label>

              <div
                className={`min-h-[36px] transition-all ${
                  state.kind === "error" ? "opacity-100" : "opacity-0"
                }`}
                aria-live="polite"
              >
                {state.kind === "error" && (
                  <div className="border border-red-500/25 bg-red-500/10 text-red-300 text-[12.5px] rounded-lg px-3 py-2 flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation text-[11px]" />
                    {state.message}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border transition text-[13.5px] font-medium ${
                  canSubmit
                    ? "bg-teal-500/15 text-teal-300 border-teal-500/25 hover:bg-teal-500/25 cursor-pointer"
                    : "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
                }`}
              >
                {state.kind === "submitting" ? (
                  <>
                    <i className="fa-solid fa-circle-notch animate-spin text-[12px]" />
                    Joining…
                  </>
                ) : (
                  <>
                    Get on the list
                    <i className="fa-solid fa-chevron-right text-[10px]" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-[11.5px] text-white/40">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-white/70 hover:text-white underline decoration-white/20 underline-offset-2 hover:decoration-teal-400 transition"
              >
                Sign in
              </Link>
              .
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
