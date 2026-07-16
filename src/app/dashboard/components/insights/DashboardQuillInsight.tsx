"use client";

import React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useIsPro } from "@/hooks/useIsPro";
import { useDashboardInsight } from "@/hooks/useDashboardInsight";
import { CARD_CLASS_BASE } from "../DashboardCard";

export default function DashboardQuillInsight() {
  const { isPro, loading: proLoading } = useIsPro();
  const { data, isLoading, error, refresh } = useDashboardInsight(isPro);

  const generatedAt = data?.generatedAt ? new Date(data.generatedAt) : null;

  return (
    <section className={`${CARD_CLASS_BASE} flex flex-col gap-3 h-full`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm md:text-base font-semibold inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/25 text-[10px] tracking-[0.08em] font-medium">
            <i className="fa-solid fa-wand-magic-sparkles text-[9px]" />
            QuillAI
          </span>
          Insight of the day
        </h2>
        {isPro && (
          <button
            type="button"
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending || isLoading}
            title="Regenerate"
            aria-label="Regenerate insight"
            className="shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition cursor-pointer disabled:opacity-40"
          >
            <i
              className={`fa-solid fa-arrows-rotate text-[12px] ${
                refresh.isPending ? "fa-spin" : ""
              }`}
            />
          </button>
        )}
      </div>

      {/* Non-Pro: a gentle upsell rather than a hard lock. */}
      {!isPro ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-4">
          <i className="fa-solid fa-lock text-white/25 text-lg" />
          <p className="text-[13px] text-white/50 max-w-[30ch]">
            Daily AI insights from your own trades are a Pro feature.
          </p>
          <Link
            href="/pricing"
            className="text-[12px] font-medium text-teal-300 hover:text-teal-200 transition"
          >
            Upgrade to Pro <i className="fa-solid fa-arrow-right text-[10px]" />
          </Link>
        </div>
      ) : isLoading || proLoading ? (
        <div className="flex-1 flex flex-col gap-2 py-1">
          <div className="h-3.5 rounded bg-white/[0.06] animate-pulse w-[92%]" />
          <div className="h-3.5 rounded bg-white/[0.06] animate-pulse w-[78%]" />
          <div className="h-3.5 rounded bg-white/[0.06] animate-pulse w-[60%]" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-4">
          <p className="text-[13px] text-white/45">
            {(error as Error).message}
          </p>
          <button
            type="button"
            onClick={() => refresh.mutate()}
            className="text-[12px] font-medium text-teal-300 hover:text-teal-200 transition cursor-pointer"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <p className="flex-1 text-[13.5px] md:text-sm leading-relaxed text-white/85">
            {data?.insight}
          </p>
          <div className="flex items-center justify-between gap-2 mt-auto pt-1">
            <Link
              href="/chat"
              className="text-[12px] font-medium text-teal-300 hover:text-teal-200 transition"
            >
              Ask Quill <i className="fa-solid fa-arrow-right text-[10px]" />
            </Link>
            {generatedAt && (
              <span className="text-[10px] text-white/30">
                {formatDistanceToNow(generatedAt, { addSuffix: true })}
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
