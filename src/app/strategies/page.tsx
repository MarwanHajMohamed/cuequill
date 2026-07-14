"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { withAuth } from "@/lib/withAuth";
import { useIsPro } from "@/hooks/useIsPro";
import { useStrategies, type StrategyDoc } from "@/hooks/useStrategies";
import { SchematicPreview } from "@/components/SchematicEditor";
import { FREE_STRATEGY_LIMIT } from "@/lib/strategyConstants";

type Direction = "CALL" | "PUT";

const directionStyle = {
  CALL: {
    color: "text-green-400",
    accent: "from-green-500/30 to-emerald-500/0",
    chip: "bg-green-500/10 text-green-300 border-green-500/25",
    icon: "fa-arrow-trend-up",
  },
  PUT: {
    color: "text-red-400",
    accent: "from-red-500/30 to-orange-500/0",
    chip: "bg-red-500/10 text-red-300 border-red-500/25",
    icon: "fa-arrow-trend-down",
  },
} as const;

function Page() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isPro } = useIsPro();
  const { data: strategies = [], isLoading } = useStrategies();
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const calls = useMemo(
    () => strategies.filter((s) => s.direction === "CALL"),
    [strategies],
  );
  const puts = useMemo(
    () => strategies.filter((s) => s.direction === "PUT"),
    [strategies],
  );

  const atFreeCap = !isPro && strategies.length >= FREE_STRATEGY_LIMIT;

  const handleCreate = async (direction: Direction) => {
    setCreating(true);
    setCreateErr(null);
    try {
      const name = `New ${direction === "CALL" ? "Call" : "Put"} Strategy`;
      const res = await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, direction }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateErr(data.error ?? "Failed to create strategy");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["strategies"] });
      // Open a freshly created strategy straight in edit mode.
      router.push(`/strategies/${data.strategy._id}?edit=1`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center min-h-screen pb-16">
      {/* Aurora */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(40% 50% at 25% 0%, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0) 75%), radial-gradient(40% 50% at 75% 0%, rgba(239,68,68,0.10) 0%, rgba(239,68,68,0) 75%)",
        }}
      />

      <div className="w-full max-w-[1500px] mt-30 md:mt-10 px-5 md:px-10">
        {/* Header */}
        <div className="mt-8 md:mt-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-[28px] md:text-[34px] font-medium tracking-[-0.02em] text-white">
              Your strategies
            </h1>
            <p className="mt-1.5 text-[13px] text-white/55 leading-relaxed">
              Custom setups, drawn how you see them. Sketch the pattern in the
              built-in canvas and link it to trades.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isPro && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] text-white/65">
                {strategies.length} / {FREE_STRATEGY_LIMIT}
              </span>
            )}
          </div>
        </div>

        {createErr && (
          <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/[0.06] p-3 text-[12.5px] text-red-300 flex items-start gap-2">
            <i className="fa-solid fa-circle-exclamation mt-0.5" />
            <div>
              {createErr}
              {atFreeCap && (
                <>
                  {" "}
                  <Link
                    href="/pricing"
                    className="underline text-red-200 hover:text-white"
                  >
                    Upgrade to Pro
                  </Link>
                  {" for unlimited."}
                </>
              )}
            </div>
          </div>
        )}

        {/* Columns */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <Column
            direction="CALL"
            items={calls}
            loading={isLoading}
            canCreate={!atFreeCap}
            creating={creating}
            onCreate={() => handleCreate("CALL")}
          />
          <Column
            direction="PUT"
            items={puts}
            loading={isLoading}
            canCreate={!atFreeCap}
            creating={creating}
            onCreate={() => handleCreate("PUT")}
          />
        </div>
      </div>
    </div>
  );
}

function Column({
  direction,
  items,
  loading,
  canCreate,
  creating,
  onCreate,
}: {
  direction: Direction;
  items: StrategyDoc[];
  loading: boolean;
  canCreate: boolean;
  creating: boolean;
  onCreate: () => void;
}) {
  const style = directionStyle[direction];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className={`text-xl md:text-2xl font-semibold ${style.color}`}>
          {direction}
        </h2>
        <button
          type="button"
          onClick={onCreate}
          disabled={!canCreate || creating}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold tracking-[0.04em] border transition ${
            canCreate && !creating
              ? "border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white cursor-pointer"
              : "border-white/8 bg-white/[0.02] text-white/30 cursor-not-allowed"
          }`}
        >
          <i className="fa-solid fa-plus text-[9px]" />
          New
        </button>
      </div>
      <div className="flex flex-col gap-2.5">
        {loading && items.length === 0 && (
          <div className="text-[12.5px] text-white/40 px-1">Loading…</div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-[12.5px] text-white/40 px-1 italic">
            No {direction} strategies yet.
          </div>
        )}
        {items.map((s, i) => (
          <StrategyCard
            key={s._id}
            strategy={s}
            direction={direction}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

function StrategyCard({
  strategy,
  direction,
  index,
}: {
  strategy: StrategyDoc;
  direction: Direction;
  index: number;
}) {
  const style = directionStyle[direction];
  const tfLine = strategy.timeframes.join(" · ");
  const hasSchematic = strategy.schematic.elements.length > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
    >
      <Link
        href={`/strategies/${strategy._id}`}
        prefetch
        className="group relative block rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition overflow-hidden"
      >
        <div className="flex gap-4 px-5 py-4 items-center">
          <div
            className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${style.chip}`}
          >
            <i className={`fa-solid ${style.icon} text-[13px]`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] md:text-[15px] font-medium tracking-tight truncate">
              {strategy.name}
            </div>
            <div className="text-[11px] text-white/45 mt-0.5 truncate">
              {tfLine || "No timeframe"}
              {strategy.tags.length > 0 && ` · ${strategy.tags.join(", ")}`}
            </div>
          </div>
          {hasSchematic && (
            <div className="hidden md:block shrink-0 w-24 h-14 rounded border border-white/10 overflow-hidden">
              <SchematicPreview
                schematic={strategy.schematic}
                className="w-full h-full"
              />
            </div>
          )}
          <i className="fa-solid fa-chevron-right text-[12px] text-white/40 group-hover:text-white/80 group-hover:translate-x-0.5 transition" />
        </div>
      </Link>
    </motion.div>
  );
}

export default withAuth(Page);
