"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

// Requests a password-reset email. The API always answers 200 (it never
// reveals whether an email has an account), so on success we show the same
// "check your inbox" message regardless.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = email.trim().length > 0 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        setError("Something went wrong. Try again?");
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Try again?");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-5">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(40% 50% at 20% 0%, rgba(20,184,166,0.18) 0%, rgba(20,184,166,0) 70%), radial-gradient(40% 50% at 80% 5%, rgba(99,102,241,0.14) 0%, rgba(99,102,241,0) 70%), radial-gradient(35% 40% at 50% 60%, rgba(20,184,166,0.06) 0%, rgba(20,184,166,0) 70%)",
        }}
      />

      <Link
        href="/login"
        aria-label="Back to sign in"
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
        {sent ? (
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="w-12 h-12 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
              <i className="fa-solid fa-envelope-circle-check text-teal-300 text-[16px]" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Check your inbox
              </h1>
              <p className="mt-2 text-[13px] text-white/55 leading-relaxed">
                If an account exists for{" "}
                <span className="text-white/80">{email.trim()}</span>, we&apos;ve
                sent a link to reset your password. It expires in an hour.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[13px] font-medium"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5 mb-7 text-center">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.05]">
                <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  Reset password
                </span>
              </h1>
              <p className="text-[13px] text-white/50 mt-1">
                Enter your email and we&apos;ll send you a link to set a new
                password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                    Sending…
                  </>
                ) : (
                  <>
                    Send reset link
                    <i className="fa-solid fa-chevron-right text-[10px]" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-[11.5px] text-white/40">
              Remembered it?{" "}
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
