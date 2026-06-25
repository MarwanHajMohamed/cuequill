"use client";

import { motion } from "framer-motion";
import React from "react";

// Shared visual primitives so every page's loading state reads as a
// single design - animated gradient skeletons in the brand teal/white
// palette, plus a focal-point spinner for inline use.

export function Skeleton({
  className = "",
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0.4 }}
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{
        duration: 1.4,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
      className={`rounded-lg bg-white/[0.06] ${className}`}
    />
  );
}

export function Spinner({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 rounded-full border-2 border-white/10"
        style={{ borderTopColor: "#5eead4" }}
      />
      <motion.span
        className="absolute inset-0 rounded-full border-2 border-transparent"
        style={{ borderTopColor: "#5eead4" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      />
    </span>
  );
}

// The Cuequill quill mark - feather in currentColor, spine/nib punched
// out in the background colour so it reads on either theme.
function BrandQuill({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="16 25 30 52"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      aria-hidden
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
}

// Full-page loader: the brand mark gently breathing inside a rotating
// teal arc. Used by withAuth and the marketing pages while the session
// resolves - on-brand instead of a generic spinner.
export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-screen gap-5 px-5">
      <span
        className="relative inline-flex items-center justify-center"
        role="status"
        aria-label="Loading"
        style={{ width: 64, height: 64 }}
      >
        {/* Faint base ring */}
        <span className="absolute inset-0 rounded-full border border-white/[0.08]" />
        {/* Rotating teal arc */}
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{ borderTopColor: "#5eead4" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
        />
        {/* Soft teal glow + breathing quill */}
        <motion.span
          aria-hidden
          className="absolute inset-2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(45,212,191,0.30) 0%, rgba(45,212,191,0) 70%)",
          }}
          animate={{ scale: [0.85, 1.1, 0.85], opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="relative text-teal-300"
          animate={{ y: [0, -2.5, 0], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <BrandQuill className="h-8 w-auto" />
        </motion.span>
      </span>
      {label && (
        <div className="text-[12px] tracking-[0.18em] text-white/40 font-medium">
          {label}
        </div>
      )}
    </div>
  );
}

// Skeleton block for hero areas - eyebrow + title bar.
export function HeroSkeleton() {
  return (
    <div className="flex flex-col gap-3 mb-6">
      <Skeleton className="h-3 w-24" delay={0} />
      <Skeleton className="h-9 md:h-12 w-60 md:w-80" delay={0.05} />
    </div>
  );
}

// Skeleton for a table card - header row + N body rows.
export function TableSkeleton({
  rows = 8,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-3">
      <div className="flex gap-3 px-2 py-2 border-b border-white/[0.06]">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" delay={i * 0.03} />
        ))}
      </div>
      <div className="flex flex-col">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="flex gap-3 px-2 py-3 border-t border-white/[0.04]"
          >
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className="h-3.5 flex-1"
                delay={r * 0.04 + c * 0.02}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
