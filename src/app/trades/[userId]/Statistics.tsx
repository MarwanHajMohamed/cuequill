"use client";

import CustomizeButton from "@/components/CustomizeButton";
import Bar from "@/app/dashboard/components/charts/Bar";
import Pie from "@/app/dashboard/components/charts/Pie";
import { TAG_KIND_BY_LABEL } from "@/app/data/tradeTags";
import { Trade } from "@/app/types/Trades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import EquityCurve from "./EquityCurve";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { motion, AnimatePresence } from "framer-motion";
import ProGate from "@/components/ProGate";

import { fmtMoneyCompact, fmtMoneySignedCompact } from "@/lib/helpers/fmt";
type StatsVisibility = {
  netPL: boolean;
  profitFactor: boolean;
  winRate: boolean;
  avgRR: boolean;
  winStreak: boolean;
  equityCurve: boolean;
  tagStats: boolean;
  filteredStats: boolean;
  totalStats: boolean;
  monthlyStats: boolean;
};

const DEFAULT_VISIBILITY: StatsVisibility = {
  netPL: true,
  profitFactor: true,
  winRate: true,
  avgRR: true,
  winStreak: true,
  equityCurve: true,
  tagStats: true,
  filteredStats: true,
  totalStats: true,
  monthlyStats: true,
};

const TILE_OPTIONS: Array<{ key: keyof StatsVisibility; label: string }> = [
  { key: "netPL", label: "Net P&L" },
  { key: "profitFactor", label: "Profit factor" },
  { key: "winRate", label: "Win rate" },
  { key: "avgRR", label: "Avg R:R" },
  { key: "winStreak", label: "Best win streak" },
];

const SECTION_OPTIONS: Array<{ key: keyof StatsVisibility; label: string }> = [
  { key: "equityCurve", label: "Equity curve" },
  { key: "tagStats", label: "Performance by tag" },
  { key: "filteredStats", label: "Filter insights" },
  { key: "totalStats", label: "Performance breakdown" },
  { key: "monthlyStats", label: "Monthly stats" },
];

// ─── Reorderable layout (Customize mode) ──────────────────────────────
// Top-level stats sections, in default order. Reordering only rearranges
// these blocks vertically; within the summary block the tiles reorder too.
const STATS_SECTIONS: Array<{ id: string; label: string }> = [
  { id: "summary", label: "Summary tiles" },
  { id: "equityCurve", label: "Equity curve" },
  { id: "quickGlance", label: "Top / worst" },
  { id: "tagStats", label: "Performance by tag" },
  { id: "filterInsights", label: "Filter insights" },
  { id: "breakdown", label: "Performance breakdown" },
  { id: "monthly", label: "Monthly stats" },
];
const DEFAULT_SECTION_ORDER = STATS_SECTIONS.map((s) => s.id);
const DEFAULT_TILE_ORDER = TILE_OPTIONS.map((t) => String(t.key));

// Keep the saved order but drop unknown ids and append any new ones, so a
// stale localStorage value can never hide or duplicate a block.
function sanitizeOrder(raw: unknown, allowed: string[]): string[] {
  const set = new Set(allowed);
  const seen = new Set<string>();
  const out: string[] = [];
  if (Array.isArray(raw)) {
    for (const x of raw) {
      if (typeof x === "string" && set.has(x) && !seen.has(x)) {
        seen.add(x);
        out.push(x);
      }
    }
  }
  for (const x of allowed) if (!seen.has(x)) out.push(x);
  return out;
}

// Lightweight drag-reorder. CSS `order` positions the items, so on each
// pointer move we read the live rects (in visual order) and recompute
// where the dragged item should sit — a pure function of pointer position,
// so it can't oscillate. Order state is derived from the DOM each move, so
// a stale closure can't fight it. Persists via setOrder (localStorage).
function beginReorder(
  e: React.PointerEvent,
  id: string,
  container: HTMLElement | null,
  axis: "x" | "y",
  attr: string,
  setOrder: (o: string[]) => void,
) {
  e.preventDefault();
  e.stopPropagation();
  if (!container) return;
  const move = (ev: PointerEvent) => {
    const els = Array.from(
      container.querySelectorAll<HTMLElement>(`[${attr}]`),
    );
    const items = els
      .map((el) => ({
        id: el.getAttribute(attr)!,
        rect: el.getBoundingClientRect(),
      }))
      .sort((a, b) =>
        axis === "y" ? a.rect.top - b.rect.top : a.rect.left - b.rect.left,
      );
    const pos = axis === "y" ? ev.clientY : ev.clientX;
    let target = 0;
    for (const it of items) {
      if (it.id === id) continue;
      const mid =
        axis === "y"
          ? (it.rect.top + it.rect.bottom) / 2
          : (it.rect.left + it.rect.right) / 2;
      if (pos > mid) target++;
    }
    const currentIds = items.map((it) => it.id);
    const without = currentIds.filter((x) => x !== id);
    const next = [...without.slice(0, target), id, ...without.slice(target)];
    if (next.join("|") !== currentIds.join("|")) setOrder(next);
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

// A drag handle shown in reorder mode. Grip + label; the whole thing is
// the grab target.
function DragHandle({
  label,
  onPointerDown,
  className = "",
}: {
  label?: string;
  onPointerDown: (e: React.PointerEvent) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-dashed border-white/25 bg-[var(--surface-2,#1a1a1a)]/80 px-2 py-1 text-[11px] font-medium text-white/70 cursor-grab active:cursor-grabbing touch-none shadow ${className}`}
      aria-label={label ? `Drag ${label}` : "Drag to reorder"}
    >
      <i className="fa-solid fa-grip-vertical text-[11px]" />
      {label}
    </button>
  );
}

const CustomizeMenu = ({
  visibility,
  setVisibility,
}: {
  visibility: StatsVisibility;
  setVisibility: (v: StatsVisibility) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggle = (key: keyof StatsVisibility) => {
    setVisibility({ ...visibility, [key]: !visibility[key] });
  };

  const resetAll = () => {
    const all: StatsVisibility = { ...visibility };
    for (const { key } of [...TILE_OPTIONS, ...SECTION_OPTIONS]) {
      all[key] = true;
    }
    setVisibility(all);
  };

  const renderRow = ({
    key,
    label,
  }: {
    key: keyof StatsVisibility;
    label: string;
  }) => {
    const on = visibility[key];
    return (
      <button
        key={key}
        type="button"
        onClick={() => toggle(key)}
        title={on ? "Hide" : "Show"}
        className="group flex items-center gap-2.5 w-full text-left px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition cursor-pointer"
      >
        <span
          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
            on
              ? "bg-teal-500/20 border-teal-500/40 text-teal-300"
              : "border-white/15 text-transparent"
          }`}
        >
          <i className="fa-solid fa-check text-[9px]" />
        </span>
        <span
          className={`text-[13px] ${on ? "text-white/85" : "text-white/40"}`}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <div ref={ref} className="relative">
      <CustomizeButton
        onClick={() => setOpen((o) => !o)}
        active={open}
        ariaExpanded={open}
        title="Customize stats"
      />
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="customize-backdrop"
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
            <motion.div
              key="customize-panel"
              className="absolute right-0 top-full mt-2 z-50 w-72 origin-top-right rounded-xl border border-white/10 bg-[var(--surface)] shadow-[0_20px_80px_var(--shadow)] p-2"
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-[11px] tracking-[0.08em] text-white/40 font-medium">
                  Summary tiles
                </span>
                <button
                  onClick={resetAll}
                  className="text-[11px] text-teal-300/80 hover:text-teal-300 transition cursor-pointer"
                >
                  Reset
                </button>
              </div>
              <div className="flex flex-col">{TILE_OPTIONS.map(renderRow)}</div>
              <div className="px-2 pt-3 pb-1">
                <span className="text-[11px] tracking-[0.08em] text-white/40 font-medium">
                  Sections
                </span>
              </div>
              <div className="flex flex-col">
                {SECTION_OPTIONS.map(renderRow)}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const MiniDonut = ({
  greenPct,
  size = 40,
}: {
  greenPct: number;
  size?: number;
}) => {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(100, greenPct));
  const dash = (safe / 100) * c;
  return (
    <svg
      width={size}
      height={size}
      style={{ transform: "rotate(-90deg)" }}
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#dc2626"
        strokeWidth="5"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#16a34a"
        strokeWidth="5"
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="butt"
      />
    </svg>
  );
};

const InfoTooltip = ({ text }: { text: string }) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    left: number;
    top: number;
    placed: boolean;
  }>({ left: 0, top: 0, placed: false });
  const ref = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const visible = open || hovered;

  // Portalling requires document - guard for SSR.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on outside click (mobile/tap mode).
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Position with `position: fixed` against the viewport so the tooltip
  // can never push the page width - even when the anchor icon is at the
  // right edge of the screen. Tries above the icon first; flips below
  // when there's not enough room. Clamps left to keep at least 8px
  // between the tooltip and each viewport edge.
  useLayoutEffect(() => {
    if (!visible) {
      setCoords((c) => (c.placed ? { left: 0, top: 0, placed: false } : c));
      return;
    }
    const update = () => {
      const iconNode = ref.current;
      const tipNode = tipRef.current;
      if (!iconNode || !tipNode) return;
      const iconRect = iconNode.getBoundingClientRect();
      const tipRect = tipNode.getBoundingClientRect();
      const margin = 8;
      const viewportW =
        document.documentElement.clientWidth || window.innerWidth;
      const viewportH =
        document.documentElement.clientHeight || window.innerHeight;

      let left = iconRect.left + iconRect.width / 2 - tipRect.width / 2;
      if (left < margin) left = margin;
      const maxLeft = viewportW - margin - tipRect.width;
      if (left > maxLeft) left = maxLeft;

      // Prefer above; fall back below if we'd overflow the top.
      const above = iconRect.top - tipRect.height - 8;
      const below = iconRect.bottom + 8;
      let top = above;
      if (above < margin) top = below;
      // If below would also overflow, pin to top margin.
      if (top + tipRect.height > viewportH - margin) {
        top = Math.max(margin, viewportH - margin - tipRect.height);
      }

      setCoords({ left, top, placed: true });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [visible]);

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="cursor-pointer p-1.5 -m-1.5 leading-none"
        aria-label="More info"
      >
        <i className="fa-solid fa-circle-info text-sm md:text-xs text-white/40 hover:text-white/70 transition-colors" />
      </button>
      {/* Portalled to <body> so a `backdrop-filter` / `transform` /
          `filter` ancestor doesn't turn our `position: fixed` into an
          absolute one relative to the card. Always rendered so we can
          measure it; visibility is gated on `coords.placed` so the user
          never sees a frame at (0, 0). */}
      {mounted &&
        createPortal(
          <span
            ref={tipRef}
            style={{
              position: "fixed",
              left: coords.left,
              top: coords.top,
              maxWidth: "min(12rem, calc(100vw - 16px))",
              visibility: visible && coords.placed ? "visible" : "hidden",
              pointerEvents: "none",
            }}
            className="bg-[var(--surface)] border border-white/10 text-white/80 text-[11px] rounded-md px-2.5 py-2
                       whitespace-normal w-48 z-[999] leading-snug shadow-md normal-case tracking-normal font-normal"
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
};

const SummaryTile = ({
  label,
  info,
  className = "",
  children,
  style,
  dataId,
  handle,
}: {
  label: string;
  info?: string;
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  dataId?: string;
  handle?: React.ReactNode;
}) => (
  <div
    data-tile-id={dataId}
    style={style}
    className={`relative rounded-xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-3 md:p-4 flex flex-col gap-1.5 md:gap-2 min-w-0 ${className}`}
  >
    {handle}
    <div className="text-[10px] md:text-[11px] tracking-[0.08em] text-white/45 font-medium flex items-center justify-between gap-1.5">
      <span className="truncate">{label}</span>
      {info && <InfoTooltip text={info} />}
    </div>
    <div className="flex items-center justify-between gap-2">{children}</div>
  </div>
);

const SectionHeader = ({
  title,
  info,
  right,
}: {
  title: string;
  info?: string;
  right?: React.ReactNode;
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-2 flex-wrap min-w-0">
      <h3 className="text-lg md:text-2xl font-semibold tracking-tight">
        <span className="bg-gradient-to-r from-teal-300 to-emerald-400 bg-clip-text text-transparent">
          {title}
        </span>
      </h3>
      {info && <InfoTooltip text={info} />}
    </div>
    {right}
  </div>
);

// ─── Small display primitives for the breakdown sections ──────────────
function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

function VerdictPill({
  tone,
  label,
}: {
  tone: "good" | "bad" | "neutral";
  label: string;
}) {
  const styles =
    tone === "good"
      ? "bg-green-500/10 text-green-300 border-green-500/25"
      : tone === "bad"
        ? "bg-red-500/10 text-red-300 border-red-500/25"
        : "bg-white/[0.04] text-white/60 border-white/10";
  const icon = tone === "good" ? "✓" : tone === "bad" ? "✗" : "≈";
  return (
    <span
      className={`text-[11px] px-2 py-1 rounded-full border flex items-center gap-1 ${styles}`}
    >
      <span>{icon}</span>
      {label}
    </span>
  );
}

function CompareCard({
  label,
  value,
  baseline,
  delta,
  deltaUnit,
  higherIsBetter,
  info,
}: {
  label: string;
  value: string;
  baseline: string;
  delta: number;
  deltaUnit: string;
  higherIsBetter: boolean;
  info?: string;
}) {
  const isPositiveDirection = delta > 0;
  const isNegativeDirection = delta < 0;
  const noDelta = Math.abs(delta) < 0.005;
  const isGood = higherIsBetter ? isPositiveDirection : isNegativeDirection;
  const isBad = higherIsBetter ? isNegativeDirection : isPositiveDirection;
  const tone = noDelta
    ? "text-white/40"
    : isGood
      ? "text-green-500"
      : isBad
        ? "text-red-500"
        : "text-white/40";
  const arrow = noDelta ? "·" : delta > 0 ? "↑" : "↓";
  const formatted = (() => {
    const a = Math.abs(delta);
    if (deltaUnit === "$") return `${fmtMoneyCompact(a)}`;
    if (deltaUnit === "pp") return `${a.toFixed(1)} pp`;
    return a.toFixed(2);
  })();

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-3 md:p-4 flex flex-col gap-1.5 md:gap-2 min-w-0 basis-[100px] md:basis-[200px] grow md:max-w-[280px]">
      <div className="flex items-center justify-between gap-1 text-[10px] md:text-[11px] text-white/45 tracking-[0.08em] font-medium">
        <span className="truncate">{label}</span>
        {info && <InfoTooltip text={info} />}
      </div>
      <div className="text-sm md:text-xl font-semibold text-white truncate tabular-nums">
        {value}
      </div>
      <div className={`text-[10px] md:text-[11px] tabular-nums ${tone}`}>
        {formatted}
      </div>
      <div className="text-[10px] text-white/30">vs {baseline}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
  info,
}: {
  label: string;
  value: string;
  tone: "good" | "bad" | "neutral";
  info?: string;
}) {
  const valueColor =
    tone === "good"
      ? "text-green-400"
      : tone === "bad"
        ? "text-red-400"
        : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-3 md:p-4 flex flex-col gap-1.5 md:gap-2 min-w-0">
      <div className="flex items-center justify-between gap-1 text-[10px] md:text-[11px] text-white/45 tracking-[0.08em] font-medium">
        <span className="truncate">{label}</span>
        {info && <InfoTooltip text={info} />}
      </div>
      <div
        className={`text-sm md:text-xl font-semibold truncate tabular-nums ${valueColor}`}
      >
        {value}
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  sub,
  tone,
  icon,
  info,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "good" | "bad" | "neutral";
  icon: string;
  info?: string;
}) {
  const valueColor =
    tone === "good"
      ? "text-green-400"
      : tone === "bad"
        ? "text-red-400"
        : "text-white";
  const chip =
    tone === "good"
      ? "bg-green-500/10 text-green-300 border-green-500/25"
      : tone === "bad"
        ? "bg-red-500/10 text-red-300 border-red-500/25"
        : "bg-white/[0.04] text-white/60 border-white/10";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-3 md:p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center ${chip}`}
          >
            <i className={`fa-solid ${icon} text-[11px]`} />
          </div>
          <span className="text-[10px] md:text-[11px] tracking-[0.08em] text-white/45 font-medium truncate">
            {label}
          </span>
        </div>
        {info && <InfoTooltip text={info} />}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <div
          className={`text-base md:text-xl font-semibold tabular-nums truncate ${valueColor}`}
        >
          {value}
        </div>
        {sub && <div className="text-[11px] text-white/40 truncate">{sub}</div>}
      </div>
    </div>
  );
}

type BreakdownRow = {
  label: string;
  n: number;
  winRate: number;
  netPL: number;
  expectancy: number;
};

function BreakdownTable({
  title,
  rows,
  info,
}: {
  title: string;
  rows: BreakdownRow[];
  info?: string;
}) {
  // Largest absolute net P/L for the inline bar widths.
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.netPL)), 1);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] tracking-[0.1em] text-white/45 font-medium">
        <span>{title}</span>
        {info && <InfoTooltip text={info} />}
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md overflow-x-auto md:overflow-hidden">
        <table className="w-full min-w-[480px] md:min-w-0 text-xs md:text-sm">
          <thead>
            <tr className="text-white/40 bg-white/[0.02] border-b border-white/[0.06]">
              <th className="text-left font-medium py-2.5 px-3 text-[10px] tracking-[0.08em]">
                Label
              </th>
              <th className="text-right font-medium py-2.5 px-3 text-[10px] tracking-[0.08em]">
                N
              </th>
              <th className="text-right font-medium py-2.5 px-3 text-[10px] tracking-[0.08em]">
                Win %
              </th>
              <th className="text-right font-medium py-2.5 px-3 text-[10px] tracking-[0.08em]">
                Net
              </th>
              <th className="text-right font-medium py-2.5 px-3 text-[10px] tracking-[0.08em]">
                Avg
              </th>
              <th className="w-1/4 text-left font-normal py-2.5 px-3 hidden md:table-cell"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isProfit = r.netPL >= 0;
              const widthPct = (Math.abs(r.netPL) / maxAbs) * 100;
              return (
                <tr
                  key={r.label}
                  className="border-t border-white/[0.06] hover:bg-white/[0.02] transition"
                >
                  <td className="py-2.5 px-3 truncate max-w-[180px] text-white/85">
                    {r.label}
                  </td>
                  <td className="py-2.5 px-3 text-right text-white/55 tabular-nums">
                    {r.n}
                  </td>
                  <td className="py-2.5 px-3 text-right text-white/55 tabular-nums">
                    {r.winRate.toFixed(0)}%
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-medium tabular-nums ${
                      isProfit ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {isProfit ? "+" : "−"}${Math.abs(r.netPL).toFixed(2)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right tabular-nums ${
                      r.expectancy >= 0
                        ? "text-green-400/80"
                        : "text-red-400/80"
                    }`}
                  >
                    {r.expectancy >= 0 ? "+" : "−"}$
                    {Math.abs(r.expectancy).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 hidden md:table-cell">
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isProfit ? "bg-green-500/60" : "bg-red-500/60"
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Statistics({
  data,
  filteredData,
  option,
  strategy,
  status,
  symbol = "All",
  isFavourite = false,
}: {
  data: Trade[];
  filteredData: Trade[];
  option: string;
  strategy: string;
  status: string;
  symbol?: string;
  isFavourite?: boolean;
}) {
  // DATA STATS
  const closedData = data.filter((t) => t.status !== "OPEN");
  const closedFilteredData = filteredData.filter((t) => t.status !== "OPEN");

  const biggestWin = closedData.length
    ? closedData.reduce((max: Trade, trade: Trade) => {
        return tradeNetPL(trade) > tradeNetPL(max) ? trade : max;
      })
    : null;

  const biggestLoss = closedData.length
    ? closedData.reduce((max: Trade, trade: Trade) => {
        return tradeNetPL(max) > tradeNetPL(trade) ? trade : max;
      })
    : null;

  // Top summary tiles follow the active filters so the headline KPIs
  // match the Filter Insights table. The Filter Insights section itself
  // still shows the all-time baseline separately for delta comparison.
  const total = filteredData.length;
  const wins = filteredData.filter((trade) => trade.status === "WIN").length;

  const winRate = total > 0 ? (wins / total) * 100 : 0;

  const netProfit = closedFilteredData.reduce(
    (acc: number, trade: Trade) => acc + tradeNetPL(trade),
    0,
  );

  const calcLongestWinStreak = (trades: Trade[]): number => {
    // Streaks reflect the chronological order trades were realized, so
    // sort by exit date (dateClosed), falling back to entry date if not set.
    const sorted = [...trades]
      .filter((t) => t.status !== "OPEN")
      .sort(
        (a, b) =>
          new Date(a.dateClosed || a.dateBought).getTime() -
          new Date(b.dateClosed || b.dateBought).getTime(),
      );

    let longest = 0;
    let current = 0;
    for (const t of sorted) {
      if (t.status === "WIN") {
        current++;
        if (current > longest) longest = current;
      } else {
        current = 0;
      }
    }
    return longest;
  };

  const longestWinStreak = calcLongestWinStreak(filteredData);
  const longestFilteredWinStreak = calcLongestWinStreak(filteredData);

  // SUMMARY-TILE METRICS. Computed against the FILTERED dataset so the
  // headline tiles narrow with the page's Filters component. NET P/L
  // (gross minus fees) is used throughout.
  const grossWins = closedFilteredData
    .filter((t) => tradeNetPL(t) > 0)
    .reduce((sum, t) => sum + tradeNetPL(t), 0);

  const grossLosses = closedFilteredData
    .filter((t) => tradeNetPL(t) < 0)
    .reduce((sum, t) => sum + Math.abs(tradeNetPL(t)), 0);

  const profitFactor =
    grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

  const winCount = closedFilteredData.filter((t) => t.status === "WIN").length;
  const lossCount = closedFilteredData.filter(
    (t) => t.status === "LOSS",
  ).length;
  const concludedCount = winCount + lossCount;
  const winRatePct = concludedCount > 0 ? (winCount / concludedCount) * 100 : 0;

  const avgWin = winCount > 0 ? grossWins / winCount : 0;
  const avgLossAmt = lossCount > 0 ? grossLosses / lossCount : 0;
  const avgRR =
    avgLossAmt > 0 ? avgWin / avgLossAmt : avgWin > 0 ? Infinity : 0;

  const pfDonutPct =
    grossWins + grossLosses > 0
      ? (grossWins / (grossWins + grossLosses)) * 100
      : 0;

  const [visibility, setVisibility] = useLocalStorage<StatsVisibility>(
    "cuequill:stats-visibility",
    DEFAULT_VISIBILITY,
  );

  // Reorder (Customize) mode + saved section/tile order. CSS `order` on
  // each block does the actual repositioning, driven by these arrays.
  const [reordering, setReordering] = useState(false);
  const [sectionOrderRaw, setSectionOrder] = useLocalStorage<string[]>(
    "cuequill:stats-section-order",
    DEFAULT_SECTION_ORDER,
  );
  const [tileOrderRaw, setTileOrder] = useLocalStorage<string[]>(
    "cuequill:stats-tile-order",
    DEFAULT_TILE_ORDER,
  );
  const sectionOrder = useMemo(
    () => sanitizeOrder(sectionOrderRaw, DEFAULT_SECTION_ORDER),
    [sectionOrderRaw],
  );
  const tileOrder = useMemo(
    () => sanitizeOrder(tileOrderRaw, DEFAULT_TILE_ORDER),
    [tileOrderRaw],
  );
  const secOrder = (id: string) => sectionOrder.indexOf(id);
  const tileStyleOrder = (id: string) => tileOrder.indexOf(id);
  // Roots for the drag helper to measure siblings against.
  const sectionsRootRef = useRef<HTMLDivElement>(null);
  const tilesRootRef = useRef<HTMLDivElement>(null);

  // Small corner grip shown on each summary tile in reorder mode.
  const tileHandle = (id: string) =>
    reordering ? (
      <button
        type="button"
        onPointerDown={(e) =>
          beginReorder(
            e,
            id,
            tilesRootRef.current,
            "x",
            "data-tile-id",
            setTileOrder,
          )
        }
        className="absolute -top-2 -right-2 z-10 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--surface-2,#222)] border border-white/15 text-white/60 cursor-grab active:cursor-grabbing touch-none shadow"
        aria-label="Drag tile"
      >
        <i className="fa-solid fa-grip-vertical text-[9px]" />
      </button>
    ) : undefined;

  const anyTileVisible =
    visibility.netPL ||
    visibility.profitFactor ||
    visibility.winRate ||
    visibility.avgRR ||
    visibility.winStreak;

  // Performance by tag - for every tag that's been used at least once across
  // closed trades, compute trade count, total P/L, average P/L, and win rate.
  type TagStat = {
    label: string;
    count: number;
    totalPL: number;
    avgPL: number;
    winRate: number;
    kind: "mistake" | "good" | "other";
  };
  const tagStats: TagStat[] = useMemo(() => {
    const closed = data.filter(
      (t) => t.status === "WIN" || t.status === "LOSS",
    );
    const byTag = new Map<
      string,
      { count: number; totalPL: number; wins: number }
    >();
    for (const t of closed) {
      for (const tag of t.tags ?? []) {
        const prev = byTag.get(tag) ?? { count: 0, totalPL: 0, wins: 0 };
        prev.count += 1;
        prev.totalPL += tradeNetPL(t);
        if (t.status === "WIN") prev.wins += 1;
        byTag.set(tag, prev);
      }
    }
    return Array.from(byTag.entries())
      .map(([label, v]) => ({
        label,
        count: v.count,
        totalPL: v.totalPL,
        avgPL: v.count > 0 ? v.totalPL / v.count : 0,
        winRate: v.count > 0 ? (v.wins / v.count) * 100 : 0,
        kind: (TAG_KIND_BY_LABEL[label] ?? "other") as
          | "mistake"
          | "good"
          | "other",
      }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const strategyCounts: Record<string, number> = {};
  const optionCounts: Record<string, number> = {};
  const symbolCounts: Record<string, number> = {};

  data.forEach((trade) => {
    strategyCounts[trade.strategy] = (strategyCounts[trade.strategy] || 0) + 1;
    optionCounts[trade.option] = (optionCounts[trade.option] || 0) + 1;
    symbolCounts[trade.symbol] = (symbolCounts[trade.symbol] || 0) + 1;
  });

  const mostUsedStrat = Object.entries(strategyCounts).reduce((a, b) =>
    b[1] > a[1] ? b : a,
  )[0];

  const mostUsedOption = Object.entries(optionCounts).reduce((a, b) =>
    b[1] > a[1] ? b : a,
  )[0];

  const mostUsedSymbol = Object.entries(symbolCounts).reduce((a, b) =>
    b[1] > a[1] ? b : a,
  )[0];

  // ─── Performance Breakdown helpers ───────────────────────────────────
  // `summarize` collapses any subset of trades into a row of metrics. Used
  // for filter-vs-baseline comparisons and for per-category breakdowns
  // (strategy, symbol, day-of-week, CALL/PUT).
  const summarize = (subset: Trade[]) => {
    const closed = subset.filter(
      (t) => t.status === "WIN" || t.status === "LOSS",
    );
    const winsArr = closed.filter((t) => t.status === "WIN");
    const lossesArr = closed.filter((t) => t.status === "LOSS");
    const grossW = winsArr.reduce((s, t) => s + tradeNetPL(t), 0);
    const grossL = lossesArr.reduce((s, t) => s + Math.abs(tradeNetPL(t)), 0);
    const n = closed.length;
    return {
      n,
      wins: winsArr.length,
      losses: lossesArr.length,
      winRate: n > 0 ? (winsArr.length / n) * 100 : 0,
      netPL: grossW - grossL,
      avgWin: winsArr.length > 0 ? grossW / winsArr.length : 0,
      avgLoss: lossesArr.length > 0 ? grossL / lossesArr.length : 0,
      expectancy: n > 0 ? (grossW - grossL) / n : 0,
      profitFactor: grossL > 0 ? grossW / grossL : grossW > 0 ? Infinity : 0,
    };
  };

  const filteredSummary = summarize(filteredData);
  const totalSummary = summarize(data);

  // Per-category breakdowns. These operate on the FILTERED dataset so the
  // breakdown views narrow with the page's Filters component - by Symbol,
  // by Strategy, by CALL/PUT, streaks, and best/worst day all reflect the
  // currently-selected slice.
  const breakdown = (key: "strategy" | "symbol" | "option") => {
    const map = new Map<string, Trade[]>();
    for (const t of filteredData.filter((x) => x.status !== "OPEN")) {
      const k = String(t[key] ?? "-");
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return Array.from(map.entries())
      .map(([label, ts]) => ({ label, ...summarize(ts) }))
      .sort((a, b) => b.n - a.n);
  };
  const byStrategy = breakdown("strategy");
  const bySymbol = breakdown("symbol");
  const byOption = breakdown("option");

  // Streaks + drawdown - also follow the filter, so e.g. enabling a
  // "Strategy: MA40" filter shows the longest win streak within MA40 only.
  const closedByExit = [...filteredData]
    .filter((t) => t.status !== "OPEN")
    .sort(
      (a, b) =>
        new Date(a.dateClosed || a.dateBought).getTime() -
        new Date(b.dateClosed || b.dateBought).getTime(),
    );
  let curStreakLen = 0;
  let curStreakKind: "WIN" | "LOSS" | null = null;
  for (let i = closedByExit.length - 1; i >= 0; i--) {
    const t = closedByExit[i];
    if (curStreakKind === null) {
      curStreakKind = t.status === "WIN" ? "WIN" : "LOSS";
      curStreakLen = 1;
    } else if (t.status === curStreakKind) {
      curStreakLen++;
    } else {
      break;
    }
  }
  let longestLossStreak = 0;
  let runL = 0;
  for (const t of closedByExit) {
    if (t.status === "LOSS") {
      runL++;
      if (runL > longestLossStreak) longestLossStreak = runL;
    } else runL = 0;
  }
  // Longest WIN streak across the filtered subset (own computation rather
  // than the page-level `longestWinStreak`, which is all-time).
  let longestWinStreakFiltered = 0;
  let runW = 0;
  for (const t of closedByExit) {
    if (t.status === "WIN") {
      runW++;
      if (runW > longestWinStreakFiltered) longestWinStreakFiltered = runW;
    } else runW = 0;
  }
  let cum = 0;
  let peak = 0;
  let maxDD = 0;
  for (const t of closedByExit) {
    cum += tradeNetPL(t);
    if (cum > peak) peak = cum;
    if (cum - peak < maxDD) maxDD = cum - peak;
  }

  // Best / worst trading day (by net P/L) - same filtered dataset
  const dayMap = new Map<string, number>();
  for (const t of filteredData.filter((x) => x.status !== "OPEN")) {
    const d = t.dateClosed
      ? new Date(t.dateClosed).toISOString().split("T")[0]
      : new Date(t.dateBought).toISOString().split("T")[0];
    dayMap.set(d, (dayMap.get(d) ?? 0) + tradeNetPL(t));
  }
  let bestDayStr = "";
  let bestDayPL = -Infinity;
  let worstDayStr = "";
  let worstDayPL = Infinity;
  for (const [d, pl] of dayMap) {
    if (pl > bestDayPL) {
      bestDayPL = pl;
      bestDayStr = d;
    }
    if (pl < worstDayPL) {
      worstDayPL = pl;
      worstDayStr = d;
    }
  }
  if (dayMap.size === 0) {
    bestDayPL = 0;
    worstDayPL = 0;
  }
  const profitableDays = Array.from(dayMap.values()).filter(
    (v) => v > 0,
  ).length;
  const consistencyPct =
    dayMap.size > 0 ? (profitableDays / dayMap.size) * 100 : 0;

  // Active filter chips for context
  const activeFilters: Array<{
    label: string;
    tone: "neutral" | "good" | "bad";
  }> = [];
  if (status !== "All")
    activeFilters.push({
      label: `Status: ${status}`,
      tone: status === "Win" ? "good" : "bad",
    });
  if (strategy !== "All")
    activeFilters.push({ label: `Strategy: ${strategy}`, tone: "neutral" });
  if (symbol !== "All")
    activeFilters.push({ label: `Symbol: ${symbol}`, tone: "neutral" });
  if (option !== "All")
    activeFilters.push({
      label: `Option: ${option}`,
      tone: option === "CALL" ? "good" : "bad",
    });
  if (isFavourite)
    activeFilters.push({ label: "Favourites only", tone: "neutral" });

  // Filter verdict
  const verdict = (() => {
    if (filteredSummary.n < 5)
      return { tone: "neutral" as const, label: "Need more trades" };
    const delta = filteredSummary.expectancy - totalSummary.expectancy;
    if (delta > 1)
      return { tone: "good" as const, label: "Outperforms baseline" };
    if (delta < -1)
      return { tone: "bad" as const, label: "Underperforms baseline" };
    return { tone: "neutral" as const, label: "Similar to baseline" };
  })();

  // MONTHLY DATA STATS
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const [date, setDate] = useState({
    monthIndex: new Date().getMonth(),
    year: new Date().getFullYear(),
  });
  // +1 when stepping forward in time, -1 when stepping back - drives
  // the slide direction of the month-detail panel.
  const [monthDir, setMonthDir] = useState<1 | -1>(1);

  const handlePrevMonth = () => {
    setMonthDir(-1);
    setDate((prev) => {
      const newMonth = prev.monthIndex === 0 ? 11 : prev.monthIndex - 1;
      const newYear = prev.monthIndex === 0 ? prev.year - 1 : prev.year;
      return { monthIndex: newMonth, year: newYear };
    });
  };

  const handleNextMonth = () => {
    setMonthDir(1);
    setDate((prev) => {
      const newMonth = prev.monthIndex === 11 ? 0 : prev.monthIndex + 1;
      const newYear = prev.monthIndex === 11 ? prev.year + 1 : prev.year;
      return { monthIndex: newMonth, year: newYear };
    });
  };

  // ── Mobile swipe for the monthly section ───────────────────────────
  // Same pattern as the calendar's AnimatedCalendar / WeekView swipe:
  // lock to horizontal once the user moves >10px on the x-axis, then
  // fire prev/next on release if the threshold is crossed. Vertical
  // scroll is unaffected because we set touch-action: pan-y.
  const monthSwipe = useRef<{
    x: number;
    y: number;
    mode: "idle" | "h" | "v";
  } | null>(null);

  const onMonthTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    monthSwipe.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      mode: "idle",
    };
  };

  const onMonthTouchMove = (e: React.TouchEvent) => {
    const s = monthSwipe.current;
    if (!s) return;
    const dx = e.touches[0].clientX - s.x;
    const dy = e.touches[0].clientY - s.y;
    if (s.mode === "idle") {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) s.mode = "v";
      else if (Math.abs(dx) > 10) s.mode = "h";
    }
  };

  const onMonthTouchEnd = (e: React.TouchEvent) => {
    const s = monthSwipe.current;
    monthSwipe.current = null;
    if (!s || s.mode !== "h") return;
    const dx = e.changedTouches[0].clientX - s.x;
    if (Math.abs(dx) < 60) return;
    if (dx < 0) handleNextMonth();
    else handlePrevMonth();
  };

  const currentMonth = months[date.monthIndex];
  const { year } = date;

  // Statistics-per-month browses by month independently of the page's
  // date-range filter - otherwise picking MTD/WTD would empty out every
  // other month. Other filters (status, strategy, symbol, option,
  // favourite) still apply so the breakdown stays meaningful.
  const dataIgnoringDateRange = useMemo(() => {
    return data.filter((trade) => {
      if (status === "Win" && trade.status !== "WIN") return false;
      if (status === "Loss" && trade.status !== "LOSS") return false;
      if (strategy !== "All" && trade.strategy !== strategy) return false;
      if (symbol !== "All" && trade.symbol !== symbol) return false;
      if (option !== "All" && trade.option !== option) return false;
      if (isFavourite && trade.favourite === false) return false;
      return true;
    });
  }, [data, status, strategy, symbol, option, isFavourite]);

  // Closed trades attribute to the month they were EXITED (matches broker
  // P/L accounting); open trades stay on their entry month.
  const monthlyData = dataIgnoringDateRange.filter((trade) => {
    const isClosed = trade.status === "WIN" || trade.status === "LOSS";
    const dateStr =
      isClosed && trade.dateClosed ? trade.dateClosed : trade.dateBought;
    const tradeDate = new Date(dateStr);
    return (
      tradeDate.getMonth() === date.monthIndex &&
      tradeDate.getFullYear() === date.year
    );
  });

  const monthlyWins = monthlyData.filter((t) => t.status === "WIN").length;
  const monthlyWinRate = monthlyData.length
    ? (monthlyWins / monthlyData.length) * 100
    : 0;

  const closedMonthlyData = monthlyData.filter((t) => t.status !== "OPEN");

  const calcBiggestMonthlyWin = () => {
    if (status === "Loss") return <span>-</span>;

    if (closedMonthlyData.length > 0) {
      const biggestMonthlyWin = closedMonthlyData.reduce(
        (max: Trade, trade: Trade) =>
          tradeNetPL(trade) > tradeNetPL(max) ? trade : max,
      );
      return (
        <span className="text-green-500">
          {fmtMoneyCompact(tradeNetPL(biggestMonthlyWin))}
        </span>
      );
    }
  };

  const calcBiggestMonthlyLoss = () => {
    if (status === "Win") return <span>-</span>;

    if (closedMonthlyData.length > 0) {
      const biggestMonthlyLoss = closedMonthlyData.reduce(
        (max: Trade, trade: Trade) =>
          tradeNetPL(max) > tradeNetPL(trade) ? trade : max,
      );
      return (
        <span className="text-red-500">
          {fmtMoneyCompact(tradeNetPL(biggestMonthlyLoss))}
        </span>
      );
    }
  };

  const netProfitMonthly = closedMonthlyData.reduce(
    (acc: number, trade: Trade) => acc + tradeNetPL(trade),
    0,
  );

  return (
    <div
      ref={sectionsRootRef}
      className="mt-10 flex flex-col md:items-start w-full max-w-[1500px]"
    >
      {/* Customize toolbar — Rearrange (drag order) + Customize (show/hide).
          The toolbar keeps order -1 so it always stays on top of the
          CSS-ordered sections below. */}
      <div className="flex justify-end w-full mb-4 gap-2" style={{ order: -1 }}>
        <CustomizeButton
          icon={reordering ? "fa-check" : "fa-up-down-left-right"}
          label={reordering ? "Done" : "Rearrange"}
          active={reordering}
          onClick={() => setReordering((v) => !v)}
          title="Drag to reorder sections and tiles"
        />
        <CustomizeMenu visibility={visibility} setVisibility={setVisibility} />
      </div>

      {/* Summary tiles - at-a-glance, all-time */}
      {anyTileVisible && (
        <div
          ref={tilesRootRef}
          data-sec-id="summary"
          style={{ order: secOrder("summary") }}
          className={`relative flex flex-wrap justify-center gap-2 md:gap-3 w-full mb-10 ${
            reordering
              ? "rounded-2xl outline outline-1 outline-dashed outline-white/15 outline-offset-4"
              : ""
          }`}
        >
          {reordering && (
            <div className="absolute -top-3 left-2 z-10">
              <DragHandle
                label="Summary tiles"
                onPointerDown={(e) =>
                  beginReorder(
                    e,
                    "summary",
                    sectionsRootRef.current,
                    "y",
                    "data-sec-id",
                    setSectionOrder,
                  )
                }
              />
            </div>
          )}
          {visibility.netPL && (
            <SummaryTile
              label="Net P&L"
              info="Total profit/loss across all closed trades."
              className="basis-[100px] md:basis-[200px] grow max-w-[280px]"
              dataId="netPL"
              style={{ order: tileStyleOrder("netPL") }}
              handle={tileHandle("netPL")}
            >
              <div
                className={`text-sm md:text-2xl font-semibold tabular-nums truncate ${
                  netProfit >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {netProfit >= 0 ? "" : "−"}${Math.abs(netProfit).toFixed(2)}
              </div>
            </SummaryTile>
          )}

          {visibility.profitFactor && (
            <SummaryTile
              label="Profit factor"
              info="Gross wins ÷ gross losses. Above 1.0 = profitable; above 2.0 = strong system."
              className="basis-[100px] md:basis-[200px] grow max-w-[280px]"
              dataId="profitFactor"
              style={{ order: tileStyleOrder("profitFactor") }}
              handle={tileHandle("profitFactor")}
            >
              <div
                className={`text-sm md:text-2xl font-semibold tabular-nums truncate ${
                  profitFactor >= 1 ? "text-green-400" : "text-red-400"
                }`}
              >
                {profitFactor === Infinity
                  ? "∞"
                  : profitFactor > 0
                    ? profitFactor.toFixed(2)
                    : "-"}
              </div>
              <div className="hidden md:block">
                <MiniDonut greenPct={pfDonutPct} />
              </div>
            </SummaryTile>
          )}

          {visibility.winRate && (
            <SummaryTile
              label="Win rate"
              info="Percentage of closed trades that ended as wins."
              className="basis-[100px] md:basis-[200px] grow max-w-[280px]"
              dataId="winRate"
              style={{ order: tileStyleOrder("winRate") }}
              handle={tileHandle("winRate")}
            >
              <div className="text-sm md:text-2xl font-semibold tabular-nums truncate">
                {concludedCount > 0 ? `${winRatePct.toFixed(0)}%` : "-"}
              </div>
              <div className="hidden md:block">
                <MiniDonut greenPct={winRatePct} />
              </div>
            </SummaryTile>
          )}

          {visibility.avgRR && (
            <SummaryTile
              label="Avg R:R"
              info="Average winner size ÷ average loser size. Above 1R means your wins are bigger than your losses on average."
              className="basis-[100px] md:basis-[200px] grow max-w-[280px]"
              dataId="avgRR"
              style={{ order: tileStyleOrder("avgRR") }}
              handle={tileHandle("avgRR")}
            >
              <div
                className={`text-sm md:text-2xl font-semibold tabular-nums truncate ${
                  avgRR === Infinity || avgRR >= 1
                    ? "text-green-400"
                    : avgRR > 0
                      ? "text-red-400"
                      : ""
                }`}
              >
                {avgRR === Infinity
                  ? "∞"
                  : avgRR > 0
                    ? `${avgRR.toFixed(2)}R`
                    : "-"}
              </div>
            </SummaryTile>
          )}

          {visibility.winStreak && (
            <SummaryTile
              label="Best win streak"
              info="Longest run of consecutive winning trades in your history (open trades are skipped, losses break the streak)."
              className="basis-[100px] md:basis-[200px] grow max-w-[280px]"
              dataId="winStreak"
              style={{ order: tileStyleOrder("winStreak") }}
              handle={tileHandle("winStreak")}
            >
              <div
                className={`text-sm md:text-2xl font-semibold tabular-nums truncate ${
                  longestWinStreak > 0 ? "text-green-400" : ""
                }`}
              >
                {longestWinStreak > 0 ? longestWinStreak : "-"}
              </div>
            </SummaryTile>
          )}
        </div>
      )}

      {/* Equity curve */}
      {visibility.equityCurve && (
        <div
          data-sec-id="equityCurve"
          style={{ order: secOrder("equityCurve") }}
          className={`relative w-full mb-10 ${
            reordering
              ? "rounded-2xl outline outline-1 outline-dashed outline-white/15 outline-offset-4"
              : ""
          }`}
        >
          {reordering && (
            <div className="absolute -top-3 left-2 z-10">
              <DragHandle
                label="Equity curve"
                onPointerDown={(e) =>
                  beginReorder(
                    e,
                    "equityCurve",
                    sectionsRootRef.current,
                    "y",
                    "data-sec-id",
                    setSectionOrder,
                  )
                }
              />
            </div>
          )}
          <EquityCurve trades={data} />
        </div>
      )}

      {/* Quick-glance top/worst boxes. Sit under the equity curve so
          the eye moves from "how am I doing overall" → "what's
          driving it". Uses the same filtered breakdowns as the
          detailed tables further down, so the two views agree. */}
      {(bySymbol.length > 0 || byStrategy.length > 0) &&
        (() => {
          const topSymbol = bySymbol.reduce<(typeof bySymbol)[number] | null>(
            (best, r) => (!best || r.netPL > best.netPL ? r : best),
            null,
          );
          const worstSymbol = bySymbol.reduce<(typeof bySymbol)[number] | null>(
            (worst, r) => (!worst || r.netPL < worst.netPL ? r : worst),
            null,
          );
          const topStrategy = byStrategy.reduce<
            (typeof byStrategy)[number] | null
          >((best, r) => (!best || r.netPL > best.netPL ? r : best), null);
          const worstStrategy = byStrategy.reduce<
            (typeof byStrategy)[number] | null
          >((worst, r) => (!worst || r.netPL < worst.netPL ? r : worst), null);
          const cards = [
            { title: "Top symbol", row: topSymbol, tone: "good" as const },
            {
              title: "Worst symbol",
              row: worstSymbol,
              tone: "bad" as const,
            },
            {
              title: "Top strategy",
              row: topStrategy,
              tone: "good" as const,
            },
            {
              title: "Worst strategy",
              row: worstStrategy,
              tone: "bad" as const,
            },
          ].filter((c) => c.row);
          if (cards.length === 0) return null;
          return (
            <div
              data-sec-id="quickGlance"
              style={{ order: secOrder("quickGlance") }}
              className={`relative w-full mb-10 grid grid-cols-2 md:grid-cols-4 gap-3 ${
                reordering
                  ? "rounded-2xl outline outline-1 outline-dashed outline-white/15 outline-offset-4"
                  : ""
              }`}
            >
              {reordering && (
                <div className="absolute -top-3 left-2 z-10 col-span-2 md:col-span-4">
                  <DragHandle
                    label="Top / worst"
                    onPointerDown={(e) =>
                      beginReorder(
                        e,
                        "quickGlance",
                        sectionsRootRef.current,
                        "y",
                        "data-sec-id",
                        setSectionOrder,
                      )
                    }
                  />
                </div>
              )}
              {cards.map((c) => {
                const r = c.row!;
                const positive = r.netPL >= 0;
                // Colour by actual outcome, not by which slot the
                // card lives in — a "worst" that's still net-positive
                // shouldn't wear red.
                const numberClass = positive
                  ? "text-green-400"
                  : "text-red-400";
                return (
                  <div
                    key={c.title}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-3 md:p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="text-[11px] text-white/45 font-medium">
                        {c.title}
                      </div>
                      <div className="text-[15px] md:text-base font-semibold truncate">
                        {r.label}
                      </div>
                      <div
                        className={`text-lg md:text-xl font-bold tabular-nums ${numberClass}`}
                      >
                        {fmtMoneySignedCompact(r.netPL)}
                      </div>
                      <div className="text-[11px] text-white/40 tabular-nums">
                        {r.n} trade{r.n === 1 ? "" : "s"}
                      </div>
                    </div>
                    <MiniDonut
                      greenPct={
                        r.wins + r.losses > 0
                          ? (r.wins / (r.wins + r.losses)) * 100
                          : 0
                      }
                    />
                  </div>
                );
              })}
            </div>
          );
        })()}

      {/* Performance by tag */}
      {visibility.tagStats && tagStats.length > 0 && (
        <div
          data-sec-id="tagStats"
          style={{ order: secOrder("tagStats") }}
          className={`relative w-full mb-10 flex flex-col gap-4 md:gap-5 ${
            reordering
              ? "rounded-2xl outline outline-1 outline-dashed outline-white/15 outline-offset-4"
              : ""
          }`}
        >
          {reordering && (
            <div className="absolute -top-3 left-2 z-10">
              <DragHandle
                label="Performance by tag"
                onPointerDown={(e) =>
                  beginReorder(
                    e,
                    "tagStats",
                    sectionsRootRef.current,
                    "y",
                    "data-sec-id",
                    setSectionOrder,
                  )
                }
              />
            </div>
          )}
          <SectionHeader
            title="Performance by tag"
            info="Net P/L grouped by the tags you've added to your trades. Highlights which mistakes are costing the most and which patterns are paying off."
          />
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-3 md:p-4 overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-[10px] tracking-[0.08em] text-white/40 border-b border-white/[0.06]">
                  <th className="text-left py-2.5 pr-3 font-medium">Tag</th>
                  <th className="text-right py-2.5 px-3 font-medium">Trades</th>
                  <th className="text-right py-2.5 px-3 font-medium">
                    Win rate
                  </th>
                  <th className="text-right py-2.5 px-3 font-medium">
                    Avg P/L
                  </th>
                  <th className="text-right py-2.5 pl-3 font-medium">
                    Total P/L
                  </th>
                </tr>
              </thead>
              <tbody>
                {tagStats.map((s) => (
                  <tr
                    key={s.label}
                    className="border-t border-white/[0.06] hover:bg-white/[0.02] transition"
                  >
                    <td className="py-2.5 pr-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs border ${
                          s.kind === "mistake"
                            ? "bg-red-500/10 border-red-500/25 text-red-300"
                            : s.kind === "good"
                              ? "bg-green-500/10 border-green-500/25 text-green-300"
                              : "border-white/15 text-white/70"
                        }`}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td className="text-right py-2.5 px-3 text-white/55 tabular-nums">
                      {s.count}
                    </td>
                    <td className="text-right py-2.5 px-3 text-white/55 tabular-nums">
                      {s.winRate.toFixed(0)}%
                    </td>
                    <td
                      className={`text-right py-2.5 px-3 font-medium tabular-nums ${
                        s.avgPL >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {s.avgPL >= 0 ? "+" : "−"}${Math.abs(s.avgPL).toFixed(2)}
                    </td>
                    <td
                      className={`text-right py-2.5 pl-3 font-medium tabular-nums ${
                        s.totalPL >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {s.totalPL >= 0 ? "+" : "−"}$
                      {Math.abs(s.totalPL).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Filter Insights ─────────────────────────────────────────── */}
      {visibility.filteredStats && (
        <div
          data-sec-id="filterInsights"
          style={{ order: secOrder("filterInsights") }}
          className={`relative w-full mt-8 md:mt-16 mb-2 flex flex-col gap-4 md:gap-5 ${
            reordering
              ? "rounded-2xl outline outline-1 outline-dashed outline-white/15 outline-offset-4"
              : ""
          }`}
        >
          {reordering && (
            <div className="absolute -top-3 left-2 z-10">
              <DragHandle
                label="Filter insights"
                onPointerDown={(e) =>
                  beginReorder(
                    e,
                    "filterInsights",
                    sectionsRootRef.current,
                    "y",
                    "data-sec-id",
                    setSectionOrder,
                  )
                }
              />
            </div>
          )}
          <SectionHeader
            title="Filter insights"
            info="Compares the trades currently matching your filters against your all-time baseline. Use it to ask: 'Is this subset of trades actually better than my average?'"
            right={
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/40 tabular-nums">
                  {filteredSummary.n} closed
                  {data.length > 0 && (
                    <>
                      {" "}
                      ·{" "}
                      {(
                        (filteredSummary.n / Math.max(1, closedData.length)) *
                        100
                      ).toFixed(0)}
                      %
                    </>
                  )}
                </span>
                <VerdictPill tone={verdict.tone} label={verdict.label} />
              </div>
            }
          />

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeFilters.map((f) => (
                <span
                  key={f.label}
                  className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-[0.08em] border ${
                    f.tone === "good"
                      ? "bg-green-500/10 text-green-300 border-green-500/25"
                      : f.tone === "bad"
                        ? "bg-red-500/10 text-red-300 border-red-500/25"
                        : "bg-white/[0.04] text-white/60 border-white/10"
                  }`}
                >
                  {f.label}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 md:gap-3">
            <CompareCard
              label="Win rate"
              value={`${filteredSummary.winRate.toFixed(1)}%`}
              baseline={`${totalSummary.winRate.toFixed(1)}%`}
              delta={filteredSummary.winRate - totalSummary.winRate}
              deltaUnit="pp"
              higherIsBetter
              info="Percentage of closed trades in this filter that were winners. The delta compares against your overall win rate across all trades."
            />
            <CompareCard
              label="Expectancy"
              value={`${fmtMoneyCompact(filteredSummary.expectancy)}`}
              baseline={`${fmtMoneyCompact(totalSummary.expectancy)}`}
              delta={filteredSummary.expectancy - totalSummary.expectancy}
              deltaUnit="$"
              higherIsBetter
              info="Average net profit per trade in this filter. Positive = the filter is profitable on average."
            />
            <CompareCard
              label="Avg Win"
              value={`${fmtMoneyCompact(filteredSummary.avgWin)}`}
              baseline={`${fmtMoneyCompact(totalSummary.avgWin)}`}
              delta={filteredSummary.avgWin - totalSummary.avgWin}
              deltaUnit="$"
              higherIsBetter
              info="Average net profit on the winning trades inside this filter."
            />
            <CompareCard
              label="Avg Loss"
              value={`${fmtMoneyCompact(filteredSummary.avgLoss)}`}
              baseline={`${fmtMoneyCompact(totalSummary.avgLoss)}`}
              delta={filteredSummary.avgLoss - totalSummary.avgLoss}
              deltaUnit="$"
              higherIsBetter={false}
              info="Average net loss on the losing trades inside this filter. Smaller is better - a downward arrow is good here."
            />
            <CompareCard
              label="Profit Factor"
              value={
                filteredSummary.profitFactor === Infinity
                  ? "∞"
                  : filteredSummary.profitFactor.toFixed(2)
              }
              baseline={
                totalSummary.profitFactor === Infinity
                  ? "∞"
                  : totalSummary.profitFactor.toFixed(2)
              }
              delta={
                (filteredSummary.profitFactor === Infinity
                  ? 99
                  : filteredSummary.profitFactor) -
                (totalSummary.profitFactor === Infinity
                  ? 99
                  : totalSummary.profitFactor)
              }
              deltaUnit=""
              higherIsBetter
              info="Gross wins ÷ gross losses. Above 1.0 = profitable; above 2.0 = strong system."
            />
          </div>
        </div>
      )}

      {/* ── Performance Breakdown ───────────────────────────────────── */}
      {visibility.totalStats && (
        <div
          data-sec-id="breakdown"
          style={{ order: secOrder("breakdown") }}
          className={`relative w-full mt-8 md:mt-16 mb-2 flex flex-col gap-4 md:gap-5 ${
            reordering
              ? "rounded-2xl outline outline-1 outline-dashed outline-white/15 outline-offset-4"
              : ""
          }`}
        >
          {reordering && (
            <div className="absolute -top-3 left-2 z-10">
              <DragHandle
                label="Performance breakdown"
                onPointerDown={(e) =>
                  beginReorder(
                    e,
                    "breakdown",
                    sectionsRootRef.current,
                    "y",
                    "data-sec-id",
                    setSectionOrder,
                  )
                }
              />
            </div>
          )}
          <SectionHeader
            title="Performance breakdown"
            info="A bird's-eye view of where your edge is across your entire trading history - split by direction, strategy, symbol, streaks, and best/worst day."
          />

          {/* CALL vs PUT */}
          <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] tracking-[0.1em] text-white/45 font-medium">
            <span>CALL vs PUT</span>
            <InfoTooltip text="Side-by-side breakdown of how your CALLs and PUTs each perform. Compare net P/L, win rate, and average per trade to spot directional edge or bias." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(["CALL", "PUT"] as const).map((opt) => {
              const sub = byOption.find((b) => b.label === opt);
              if (!sub) return null;
              const isCall = opt === "CALL";
              const chip = isCall
                ? "bg-green-500/10 text-green-300 border-green-500/25"
                : "bg-red-500/10 text-red-300 border-red-500/25";
              return (
                <div
                  key={opt}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-4 md:p-5 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-[0.08em] ${chip}`}
                      >
                        <i
                          className={`fa-solid ${
                            isCall ? "fa-arrow-trend-up" : "fa-arrow-trend-down"
                          } text-[9px]`}
                        />
                        {opt}
                      </span>
                    </div>
                    <span className="text-[11px] text-white/40 tabular-nums">
                      {sub.n} trade{sub.n === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span
                      className={`text-2xl md:text-3xl font-semibold tracking-tight tabular-nums truncate ${
                        sub.netPL >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {fmtMoneySignedCompact(sub.netPL)}
                    </span>
                    <span className="text-xs text-white/50 tabular-nums">
                      {sub.winRate.toFixed(1)}% win rate
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/45 tabular-nums">
                    <span>
                      Avg{" "}
                      <span className="text-white/70">
                        {fmtMoneyCompact(sub.expectancy)}
                      </span>
                      /trade
                    </span>
                    <span>
                      W avg{" "}
                      <span className="text-green-400/80">
                        {fmtMoneyCompact(sub.avgWin)}
                      </span>
                    </span>
                    <span>
                      L avg{" "}
                      <span className="text-red-400/80">
                        {fmtMoneyCompact(sub.avgLoss)}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* By Strategy + By Symbol — Pro-only. Wrapped together so a
              single upgrade card spans both tables. */}
          {(byStrategy.length > 0 || bySymbol.length > 0) && (
            <ProGate
              feature="Per-strategy & per-symbol stats"
              description="See net P/L and win rate broken down by setup and ticker. Available on Pro."
            >
              {byStrategy.length > 0 && (
                <BreakdownTable
                  title="By strategy"
                  rows={byStrategy.slice(0, 8)}
                  info="Net P/L and win rate for each strategy, ranked by trade count. Highlights which setups consistently make money and which are net losers."
                />
              )}

              {bySymbol.length > 0 && (
                <BreakdownTable
                  title="By symbol"
                  rows={bySymbol.slice(0, 8)}
                  info="Net P/L by ticker. The horizontal bar's width is relative to your biggest mover, green for profit and red for loss."
                />
              )}
            </ProGate>
          )}

          {/* Streaks & Risk */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            <MetricTile
              label="Current streak"
              value={
                curStreakKind === null
                  ? "-"
                  : `${curStreakLen} ${
                      curStreakKind === "WIN"
                        ? curStreakLen === 1
                          ? "win"
                          : "wins"
                        : curStreakLen === 1
                          ? "loss"
                          : "losses"
                    }`
              }
              sub={curStreakKind === null ? undefined : "in a row"}
              tone={
                curStreakKind === "WIN"
                  ? "good"
                  : curStreakKind === "LOSS"
                    ? "bad"
                    : "neutral"
              }
              icon="fa-bolt"
              info="Your active streak - how many consecutive winners or losers your most recent trades are. A long loss streak can be a tilt warning."
            />
            <MetricTile
              label="Best streak"
              value={
                longestWinStreakFiltered > 0
                  ? `${longestWinStreakFiltered}`
                  : "-"
              }
              sub={
                longestWinStreakFiltered > 0 ? `consecutive wins` : undefined
              }
              tone="good"
              icon="fa-trophy"
              info="Most consecutive winning trades inside the current filter. Open trades are ignored."
            />
            <MetricTile
              label="Worst streak"
              value={longestLossStreak > 0 ? `${longestLossStreak}` : "-"}
              sub={longestLossStreak > 0 ? "consecutive losses" : undefined}
              tone="bad"
              icon="fa-circle-minus"
              info="Most consecutive losing trades. Useful for sizing - your risk per trade should survive a streak this long."
            />
            <MetricTile
              label="Max drawdown"
              value={maxDD < 0 ? `${fmtMoneyCompact(maxDD)}` : "$0.00"}
              sub="peak to trough"
              tone="bad"
              icon="fa-arrow-trend-down"
              info="Largest peak-to-trough decline in cumulative net P/L. Measures the worst point you'd have been at, in dollars from your equity peak."
            />
          </div>

          {/* Best / Worst day + consistency */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
            <MetricTile
              label="Best day"
              value={bestDayStr ? `+${fmtMoneyCompact(bestDayPL)}` : "-"}
              sub={bestDayStr ? formatShortDate(bestDayStr) : undefined}
              tone="good"
              icon="fa-sun"
              info="Single calendar day with the highest net P/L across all your trades closed that day."
            />
            <MetricTile
              label="Worst day"
              value={
                worstDayStr ? `−${fmtMoneyCompact(Math.abs(worstDayPL))}` : "-"
              }
              sub={worstDayStr ? formatShortDate(worstDayStr) : undefined}
              tone="bad"
              icon="fa-cloud-bolt"
              info="Single calendar day with the largest net loss. Compare to your daily max-loss rule."
            />
            <MetricTile
              label="Profitable days"
              value={dayMap.size > 0 ? `${consistencyPct.toFixed(0)}%` : "-"}
              sub={
                dayMap.size > 0
                  ? `${profitableDays} of ${dayMap.size} days green`
                  : undefined
              }
              tone={consistencyPct >= 50 ? "good" : "bad"}
              icon="fa-calendar-check"
              info="Percentage of trading days that ended net positive. A high number with a low avg-win signals consistency; low + big avg-win signals lumpy P/L."
            />
          </div>
        </div>
      )}

      {/* Monthly Section */}
      {visibility.monthlyStats &&
        (() => {
          const monthSummary = summarize(monthlyData);
          const closedMonthly = monthlyData.filter((t) => t.status !== "OPEN");
          const monthDayMap = new Map<string, number>();
          for (const t of closedMonthly) {
            const d = t.dateClosed
              ? new Date(t.dateClosed).toISOString().split("T")[0]
              : new Date(t.dateBought).toISOString().split("T")[0];
            monthDayMap.set(d, (monthDayMap.get(d) ?? 0) + tradeNetPL(t));
          }
          const tradedDays = monthDayMap.size;
          const greenDays = Array.from(monthDayMap.values()).filter(
            (v) => v > 0,
          ).length;
          const redDays = tradedDays - greenDays;
          const dayValues = Array.from(monthDayMap.values());
          const monthBestDay = dayValues.length ? Math.max(...dayValues) : 0;
          const monthWorstDay = dayValues.length ? Math.min(...dayValues) : 0;
          const monthBiggestWin = closedMonthly.length
            ? Math.max(...closedMonthly.map((t) => tradeNetPL(t)))
            : 0;
          const monthBiggestLoss = closedMonthly.length
            ? Math.min(...closedMonthly.map((t) => tradeNetPL(t)))
            : 0;
          const monthVerdict =
            monthSummary.n === 0
              ? { tone: "neutral" as const, label: "No trades" }
              : monthSummary.netPL > 0
                ? { tone: "good" as const, label: "Profitable month" }
                : monthSummary.netPL < 0
                  ? { tone: "bad" as const, label: "Losing month" }
                  : { tone: "neutral" as const, label: "Break-even" };

          // Per-trading-day bars for the strip. Walks all weekdays of the
          // month, marking each with its net P/L (or null for untraded).
          const daysInMonth = new Date(year, date.monthIndex + 1, 0).getDate();
          const dailyBars: Array<{
            day: number;
            pl: number | null;
            isWeekend: boolean;
          }> = [];
          for (let d = 1; d <= daysInMonth; d++) {
            const iso = `${year}-${String(date.monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const weekday = new Date(year, date.monthIndex, d).getDay();
            const isWeekend = weekday === 0 || weekday === 6;
            const pl = monthDayMap.has(iso) ? monthDayMap.get(iso)! : null;
            dailyBars.push({ day: d, pl, isWeekend });
          }
          const maxAbsDayPL = Math.max(
            Math.abs(monthBestDay),
            Math.abs(monthWorstDay),
            1,
          );

          const isCurrentMonth =
            date.monthIndex === new Date().getMonth() &&
            date.year === new Date().getFullYear();
          const jumpToToday = () => {
            const now = new Date();
            setMonthDir(
              now.getFullYear() * 12 + now.getMonth() >
                year * 12 + date.monthIndex
                ? 1
                : -1,
            );
            setDate({ monthIndex: now.getMonth(), year: now.getFullYear() });
          };

          return (
            <div
              data-sec-id="monthly"
              style={{ order: secOrder("monthly") }}
              className={`relative w-full mt-8 md:mt-16 mb-2 flex flex-col gap-4 md:gap-5 ${
                reordering
                  ? "rounded-2xl outline outline-1 outline-dashed outline-white/15 outline-offset-4"
                  : ""
              }`}
            >
              {reordering && (
                <div className="absolute -top-3 left-2 z-10">
                  <DragHandle
                    label="Monthly stats"
                    onPointerDown={(e) =>
                      beginReorder(
                        e,
                        "monthly",
                        sectionsRootRef.current,
                        "y",
                        "data-sec-id",
                        setSectionOrder,
                      )
                    }
                  />
                </div>
              )}
              {/* Header */}
              <SectionHeader
                title="Statistics per month"
                right={
                  <VerdictPill
                    tone={monthVerdict.tone}
                    label={monthVerdict.label}
                  />
                }
              />

              {/* Month navigator - pill controls + jump-to-today */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white hover:border-white/20 transition cursor-pointer"
                >
                  <i className="fa-solid fa-chevron-left text-[11px]" />
                </button>
                <div className="flex flex-col md:items-start gap-0.5">
                  <div className="text-base md:text-xl font-semibold tracking-tight tabular-nums">
                    {currentMonth} {year}
                  </div>
                  {!isCurrentMonth && (
                    <button
                      onClick={jumpToToday}
                      className="text-[11px] text-teal-300/80 hover:text-teal-300 transition cursor-pointer"
                    >
                      Jump to today
                    </button>
                  )}
                  {isCurrentMonth && (
                    <div className="text-[11px] text-white/40">This month</div>
                  )}
                </div>
                <button
                  onClick={handleNextMonth}
                  aria-label="Next month"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white hover:border-white/20 transition cursor-pointer"
                >
                  <i className="fa-solid fa-chevron-right text-[11px]" />
                </button>
              </div>

              <div
                onTouchStart={onMonthTouchStart}
                onTouchMove={onMonthTouchMove}
                onTouchEnd={onMonthTouchEnd}
                style={{ touchAction: "pan-y" }}
              >
                <AnimatePresence mode="wait" initial={false} custom={monthDir}>
                  <motion.div
                    key={`${year}-${date.monthIndex}`}
                    custom={monthDir}
                    variants={{
                      enter: (dir: number) => ({
                        opacity: 0,
                        x: dir > 0 ? 32 : -32,
                      }),
                      center: { opacity: 1, x: 0 },
                      exit: (dir: number) => ({
                        opacity: 0,
                        x: dir > 0 ? -32 : 32,
                      }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="flex flex-col gap-4 md:gap-5"
                  >
                    {monthlyData.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-10 text-center">
                        <div className="text-white/30 text-3xl mb-3">
                          <i className="fa-regular fa-calendar-xmark" />
                        </div>
                        <div className="text-sm text-white/55">
                          No trades for {currentMonth} {year}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Hero card - net P/L + headline metrics */}
                        <div
                          className={`relative overflow-hidden rounded-2xl border md:backdrop-blur-md p-5 md:p-6 ${
                            monthSummary.netPL >= 0
                              ? "border-green-500/20 bg-gradient-to-br from-green-500/[0.06] via-white/[0.03] to-white/[0.02]"
                              : "border-red-500/20 bg-gradient-to-br from-red-500/[0.06] via-white/[0.03] to-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="text-[10px] md:text-[11px] tracking-[0.1em] text-white/45 font-medium flex items-center gap-1.5">
                                Net P/L
                                <InfoTooltip text="Total realized profit/loss for trades closed this month, after fees." />
                              </div>
                              <div
                                className={`text-3xl md:text-5xl font-semibold tracking-tight tabular-nums truncate ${
                                  monthSummary.netPL >= 0
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}
                              >
                                {monthSummary.netPL >= 0 ? "+" : "−"}$
                                {Math.abs(monthSummary.netPL).toFixed(2)}
                              </div>
                              <div className="text-[12px] text-white/50">
                                {monthSummary.n} trade
                                {monthSummary.n === 1 ? "" : "s"} ·{" "}
                                {monthSummary.winRate.toFixed(0)}% win rate ·{" "}
                                <span
                                  className={
                                    monthSummary.expectancy >= 0
                                      ? "text-green-400/85"
                                      : "text-red-400/85"
                                  }
                                >
                                  {monthSummary.expectancy >= 0 ? "+" : "−"}$
                                  {Math.abs(monthSummary.expectancy).toFixed(2)}
                                  /trade
                                </span>
                              </div>
                            </div>
                            {tradedDays > 0 && (
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col items-end">
                                  <div className="text-[10px] tracking-[0.08em] text-white/40">
                                    Days traded
                                  </div>
                                  <div className="text-xl md:text-2xl font-semibold tabular-nums">
                                    {tradedDays}
                                  </div>
                                  <div className="text-[11px] text-white/50">
                                    <span className="text-green-400/85">
                                      {greenDays} green
                                    </span>
                                    {" · "}
                                    <span className="text-red-400/85">
                                      {redDays} red
                                    </span>
                                  </div>
                                </div>
                                <MiniDonut
                                  greenPct={
                                    tradedDays > 0
                                      ? (greenDays / tradedDays) * 100
                                      : 0
                                  }
                                  size={48}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Daily P/L strip */}
                        {tradedDays > 0 && (
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] md:backdrop-blur-md p-4 md:p-5">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-[10px] md:text-[11px] tracking-[0.1em] text-white/45 font-medium flex items-center gap-1.5">
                                Daily P/L
                                <InfoTooltip text="Each bar is one calendar day's net P/L. Greyed = weekend, faint dash = no trades that day." />
                              </div>
                              <div className="text-[11px] text-white/40 flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 rounded-sm bg-green-500/70" />
                                  Win
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 rounded-sm bg-red-500/70" />
                                  Loss
                                </span>
                              </div>
                            </div>
                            <div className="flex items-end gap-[2px] md:gap-[3px] h-20 md:h-24">
                              {dailyBars.map((b) => {
                                if (b.pl === null) {
                                  return (
                                    <div
                                      key={b.day}
                                      title={`${currentMonth} ${b.day}: no trades`}
                                      className={`flex-1 self-center h-px ${
                                        b.isWeekend
                                          ? "bg-white/[0.04]"
                                          : "bg-white/10"
                                      }`}
                                    />
                                  );
                                }
                                const heightPct =
                                  (Math.abs(b.pl) / maxAbsDayPL) * 100;
                                const isProfit = b.pl >= 0;
                                return (
                                  <div
                                    key={b.day}
                                    title={`${currentMonth} ${b.day}: ${
                                      isProfit ? "+" : "−"
                                    }$${Math.abs(b.pl).toFixed(2)}`}
                                    className="flex-1 flex items-end justify-center min-w-0 h-full"
                                  >
                                    <div
                                      style={{
                                        height: `${Math.max(heightPct, 4)}%`,
                                      }}
                                      className={`w-full rounded-sm transition ${
                                        isProfit
                                          ? "bg-green-500/65 hover:bg-green-500/85"
                                          : "bg-red-500/65 hover:bg-red-500/85"
                                      }`}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex justify-between text-[10px] text-white/35 mt-2 tabular-nums">
                              <span>1</span>
                              <span>{Math.ceil(daysInMonth / 2)}</span>
                              <span>{daysInMonth}</span>
                            </div>
                          </div>
                        )}

                        {/* Detail tiles - extremes */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                          <MetricTile
                            label="Biggest win"
                            value={
                              monthBiggestWin > 0
                                ? `+${fmtMoneyCompact(monthBiggestWin)}`
                                : "-"
                            }
                            tone="good"
                            icon="fa-arrow-trend-up"
                            info="Largest single winning trade closed this month."
                          />
                          <MetricTile
                            label="Worst loss"
                            value={
                              monthBiggestLoss < 0
                                ? `−${fmtMoneyCompact(Math.abs(monthBiggestLoss))}`
                                : "-"
                            }
                            tone="bad"
                            icon="fa-arrow-trend-down"
                            info="Largest single losing trade closed this month."
                          />
                          <MetricTile
                            label="Best day"
                            value={
                              monthBestDay > 0
                                ? `+${fmtMoneyCompact(monthBestDay)}`
                                : "-"
                            }
                            tone="good"
                            icon="fa-sun"
                            info="Best single calendar day this month - sum of all trades closed that day."
                          />
                          <MetricTile
                            label="Worst day"
                            value={
                              monthWorstDay < 0
                                ? `−${fmtMoneyCompact(Math.abs(monthWorstDay))}`
                                : "-"
                            }
                            tone="bad"
                            icon="fa-cloud-bolt"
                            info="Worst single calendar day this month."
                          />
                        </div>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
