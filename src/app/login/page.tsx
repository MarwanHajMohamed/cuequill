"use client";

import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import PageLoading from "../PageLoading";

export default function Login() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

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
      setError("Incorrect email or password.");
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
        back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-7 md:p-8 shadow-[0_24px_80px_var(--shadow)]"
      >
        {/* Header */}
        <div className="flex flex-col gap-1.5 mb-7 text-center">
          <div className="text-[11px] tracking-[0.18em] text-white/40 font-medium">
            welcome back
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-[1.05]">
            <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
              sign in
            </span>
          </h1>
          <p className="text-[13px] text-white/50 mt-1">
            Pick up where you left off.
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* Email */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] tracking-[0.14em] text-white/45 font-medium">
              email
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
            <span className="text-[11px] tracking-[0.14em] text-white/45 font-medium">
              password
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

          {/* Error - reserves height so the layout doesn't jump. */}
          <div
            className={`min-h-[36px] transition-all ${error ? "opacity-100" : "opacity-0"}`}
            aria-live="polite"
          >
            {error && (
              <div className="border border-red-500/25 bg-red-500/10 text-red-300 text-[12.5px] rounded-lg px-3 py-2 flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-[11px]" />
                {error}
              </div>
            )}
          </div>

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
                signing in…
              </>
            ) : (
              <>
                sign in
                <i className="fa-solid fa-chevron-right text-[10px]" />
              </>
            )}
          </button>
        </form>

        {/* Footer line */}
        <div className="mt-6 text-center text-[11.5px] text-white/40">
          Currently invite-only. Need access?{" "}
          <a
            href="mailto:hi@cuequill.app"
            className="text-white/70 hover:text-white underline decoration-white/20 underline-offset-2 hover:decoration-teal-400 transition"
          >
            Get in touch
          </a>
          .
        </div>
      </motion.div>
    </div>
  );
}
