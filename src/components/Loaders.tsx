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

export function PageLoader({
  label,
}: {
  label?: string;
}) {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-screen gap-4 px-5">
      <Spinner size={32} />
      {label && (
        <div className="text-[12px] uppercase tracking-[0.18em] text-white/40 font-medium">
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
