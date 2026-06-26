"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

// Shared chrome for the marketing surfaces (landing + pricing). Lives
// under `_marketing` so Next's file-router treats it as private and
// doesn't try to route it. Each page file can only have a default
// export, so anything reused between pages goes here.

export const CuequillLogo = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="16 25 30 52"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    aria-label="Cuequill"
  >
    <path
      d="M31 27.2C37 39.8 43.5 61.2 40.5 62.6C37.5 64 31 75.2 31 75.2C31 75.2 24.5 64.5 21.5 62.6C18.5 60.7 25 39.8 31 27.2Z"
      fill="currentColor"
    />
    <path
      d="M31 47V75"
      style={{ stroke: "var(--background)" }}
      strokeWidth="1.32"
      strokeLinecap="round"
    />
    <path
      d="M31 54.56C31.8616 54.56 32.56 53.8616 32.56 53C32.56 52.1384 31.8616 51.44 31 51.44C30.1384 51.44 29.44 52.1384 29.44 53C29.44 53.8616 30.1384 54.56 31 54.56Z"
      style={{ fill: "var(--background)" }}
    />
  </svg>
);

// Pill navbar - preserved from the previous landing page per the brief.
// Glass-pill structure, fixed at top, centered up to a max width. On
// phones the Features / Pricing links and Sign in pill collapse behind
// a single hamburger that expands a sheet menu so all three remain
// reachable without crowding the pill.
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none px-3 md:px-10"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="pointer-events-auto flex justify-between items-center w-full max-w-[1200px] mt-3 md:mt-5 py-2 pl-3 pr-2 bg-white/[0.03] backdrop-blur-md rounded-full border border-white/10 shadow-[0_2px_24px_var(--shadow-soft)]">
        <Link
          href="/"
          className="flex items-center gap-2 pl-2 pr-3 py-1"
          onClick={() => setMenuOpen(false)}
        >
          <CuequillLogo className="h-6 w-auto" />
          <span className="text-[13.5px] font-semibold tracking-tight">
            Cuequill
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/features"
            className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-white/55 hover:text-white transition text-[12.5px]"
          >
            features
          </Link>
          <Link
            href="/pricing"
            className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-white/55 hover:text-white transition text-[12.5px]"
          >
            pricing
          </Link>
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 hover:bg-teal-500/25 transition text-[12.5px] font-medium"
          >
            sign in
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/15 text-white/80 hover:text-white hover:border-white/30 transition cursor-pointer"
          >
            <i
              className={`fa-solid ${menuOpen ? "fa-xmark" : "fa-bars"} text-[14px]`}
            />
          </button>
        </div>
      </div>

      {/* Mobile sheet menu - drops below the pill, matches its glass. */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="sm:hidden pointer-events-auto w-full max-w-[1200px] mt-2 px-3"
          >
            <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-[0_2px_24px_var(--shadow-soft)] overflow-hidden">
              <Link
                href="/features"
                onClick={() => setMenuOpen(false)}
                className="px-5 py-3.5 text-[14px] text-white/80 hover:text-white hover:bg-white/[0.04] border-b border-[var(--rule)] transition"
              >
                features
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMenuOpen(false)}
                className="px-5 py-3.5 text-[14px] text-white/80 hover:text-white hover:bg-white/[0.04] border-b border-[var(--rule)] transition"
              >
                pricing
              </Link>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="px-5 py-3.5 text-[14px] font-medium text-teal-300 hover:bg-teal-500/[0.08] transition inline-flex items-center justify-between"
              >
                sign in
                <i className="fa-solid fa-chevron-right text-[11px]" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// Footer - plain, no glass card. Soft hairline rules to match the app.
export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12 grid grid-cols-2 md:grid-cols-12 gap-y-8 gap-x-6">
        <div className="md:col-span-5 flex flex-col gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <CuequillLogo className="h-5 w-auto" />
            <span className="font-semibold tracking-tight text-[13.5px]">
              Cuequill
            </span>
          </Link>
          <p className="max-w-[30ch] text-[13px] text-white/55 leading-relaxed">
            A trading journal that remembers for you. Built for discretionary
            US options traders.
          </p>
        </div>

        <FooterCol
          title="Product"
          links={[
            { label: "Overview", href: "/" },
            { label: "Features", href: "/features" },
            { label: "Pricing", href: "/pricing" },
            { label: "Sign in", href: "/login" },
          ]}
        />
        <FooterCol
          title="Inside"
          links={[
            { label: "The day view", href: "/#day" },
            { label: "Quill AI", href: "/#quill" },
            { label: "Numbers", href: "/#numbers" },
            { label: "IBKR sync", href: "/#ibkr" },
          ]}
        />
        <FooterCol
          title="Contact"
          links={[{ label: "hi@cuequill.app", href: "mailto:hi@cuequill.app" }]}
        />
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-4 flex items-center justify-between text-[10.5px] tracking-[0.1em] text-white/35">
          <span>© {new Date().getFullYear()} Cuequill</span>
          <span>Invite-only</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="md:col-span-2">
      <h3 className="text-[10.5px] tracking-[0.1em] text-white/40 mb-3 font-medium">
        {title}
      </h3>
      <ul className="flex flex-col gap-1.5 text-[12.5px]">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-white/65 hover:text-white transition"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// FAQ row - glass accordion item to match the app. Meant to live inside
// a rounded glass card with `divide-y divide-white/[0.07]`.
export function FaqRow({
  q,
  a,
  index,
}: {
  q: string;
  a: string;
  index: number;
}) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer hover:bg-white/[0.02] transition"
        aria-expanded={open}
      >
        <span className="text-[14px] font-medium text-white/90">{q}</span>
        <i
          className={`fa-solid fa-chevron-down text-[11px] text-white/45 transition-transform duration-200 shrink-0 ${
            open ? "-rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-[13px] text-white/55 leading-relaxed">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Section kicker - glass pill with a teal dot, matching the chips used
// across the signed-in app. (Replaced the old serif Roman-numeral mark.)
export function SectionMark({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10.5px] tracking-[0.1em] text-white/55">
      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
      {label}
    </span>
  );
}
