"use client";

import React, { useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { fmtMoneySignedCompact } from "@/lib/helpers/fmt";
import { TAG_KIND_BY_LABEL } from "@/app/data/tradeTags";
import { Trade } from "@/app/types/Trades";
import { CARD_CLASS } from "../DashboardCard";

// Mistake leaderboard: the mistake-tagged trades dragging P/L down the
// most, so the trader can see which recurring error costs them.

const isClosed = (t: Trade) => t.status === "WIN" || t.status === "LOSS";

type TagDrag = { label: string; count: number; total: number };

export default function DashboardMistakes({ userId }: { userId: string }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades, isLoading } = useTrades(userId, simulated);

  const top = useMemo<TagDrag[]>(() => {
    if (!trades) return [];
    const map = new Map<string, { count: number; total: number }>();
    for (const t of trades.filter(isClosed)) {
      for (const tag of t.tags ?? []) {
        if (TAG_KIND_BY_LABEL[tag] !== "mistake") continue;
        const prev = map.get(tag) ?? { count: 0, total: 0 };
        prev.count += 1;
        prev.total += tradeNetPL(t);
        map.set(tag, prev);
      }
    }
    return Array.from(map.entries())
      .map(([label, v]) => ({ label, count: v.count, total: v.total }))
      .sort((a, b) => a.total - b.total)
      .slice(0, 3);
  }, [trades]);

  if (isLoading || !trades) return null;

  const totalDrag = top.reduce((s, r) => s + (r.total < 0 ? r.total : 0), 0);
  const maxDrag = Math.max(...top.map((r) => Math.abs(r.total)), 1);

  return (
    <section className={`${CARD_CLASS} flex flex-col gap-3 h-full`}>
      <div className="text-sm md:text-base font-semibold">
        Mistake leaderboard
      </div>
      {top.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[12px] text-white/40 text-center py-6">
          No mistake tags on closed trades yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {totalDrag < 0 && (
            <div className="text-[11px] text-white/55">
              Top 3 tags account for{" "}
              <span className="text-red-400 font-normal tabular-nums">
                {fmtMoneySignedCompact(totalDrag)}
              </span>{" "}
              of drag.
            </div>
          )}
          <div className="flex flex-col gap-2">
            {top.map((r, i) => {
              const width = (Math.abs(r.total) / maxDrag) * 100;
              return (
                <div key={r.label} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-[11px] text-white/40 tabular-nums w-3">
                        {i + 1}
                      </span>
                      <span className="text-[12.5px] md:text-[13px] text-white/85 truncate">
                        {r.label}
                      </span>
                      <span className="text-[10px] text-white/40 tabular-nums">
                        × {r.count}
                      </span>
                    </div>
                    <span
                      className={`text-[12.5px] tabular-nums font-normal whitespace-nowrap ${
                        r.total < 0 ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {r.total >= 0 ? "+" : "−"}${Math.abs(r.total).toFixed(0)}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        r.total < 0 ? "bg-red-500/60" : "bg-green-500/60"
                      }`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
