"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

type Usage = {
  messagesToday: number;
  dailyLimit: number;
  tokensThisMonth: number;
  monthlyTokenLimit: number;
};

async function fetchUsage(): Promise<Usage> {
  const res = await fetch("/api/chat/usage", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load usage");
  return (await res.json()) as Usage;
}

// Compact number formatting: 1234 → "1.2K", 2_500_000 → "2.5M".
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return `${n}`;
}

function Bar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const tone =
    pct >= 90
      ? "bg-red-400"
      : pct >= 70
        ? "bg-amber-400"
        : "bg-teal-400";
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
      <div
        className={`h-full rounded-full ${tone} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function ChatUsage({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["chatUsage"],
    queryFn: fetchUsage,
    staleTime: 15_000,
  });

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  if (!data) return null;

  const nearDaily =
    data.dailyLimit > 0 && data.messagesToday / data.dailyLimit >= 0.9;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Quill AI usage"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border backdrop-blur text-[12px] font-medium cursor-pointer transition ${
          nearDaily
            ? "border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20"
            : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white"
        }`}
      >
        <i className="fa-solid fa-gauge-high text-[11px]" />
        {data.messagesToday}/{data.dailyLimit}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-64 rounded-xl border border-white/10 bg-[var(--surface-2)]/95 backdrop-blur-md p-4 shadow-[0_24px_60px_var(--shadow)]">
          <div className="text-[11px] tracking-[0.08em] text-white/45 font-medium mb-3">
            QUILL AI USAGE
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between text-[12.5px] mb-1.5">
              <span className="text-white/70">Messages today</span>
              <span className="text-white/90 tabular-nums">
                {data.messagesToday} / {data.dailyLimit}
              </span>
            </div>
            <Bar used={data.messagesToday} limit={data.dailyLimit} />
            <div className="mt-1.5 text-[10.5px] text-white/40">
              Resets at midnight UTC.
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[12.5px] mb-1.5">
              <span className="text-white/70">Tokens this month</span>
              <span className="text-white/90 tabular-nums">
                {compact(data.tokensThisMonth)} / {compact(data.monthlyTokenLimit)}
              </span>
            </div>
            <Bar used={data.tokensThisMonth} limit={data.monthlyTokenLimit} />
            <div className="mt-1.5 text-[10.5px] text-white/40">
              Resets on the 1st of the month.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
