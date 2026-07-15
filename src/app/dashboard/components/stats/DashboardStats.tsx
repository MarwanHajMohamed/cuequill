"use client";

import React, { useMemo, useState } from "react";
import { useTrades } from "@/hooks/useTrades";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Trade } from "@/app/types/Trades";
import { tradeNetPL } from "@/lib/helpers/tradeNet";
import { fmtMoneySignedCompact } from "@/lib/helpers/fmt";
import { CARD_CLASS } from "../DashboardCard";
import { usePersistedField } from "../../usePersistedLayout";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Stats ────────────────────────────────────────────────────────────
type Summary = { count: number; netPL: number; winRate: number };

const isClosed = (t: Trade) => t.status === "WIN" || t.status === "LOSS";

const summarize = (trades: Trade[]): Summary => {
  const closed = trades.filter(isClosed);
  const wins = closed.filter((t) => t.status === "WIN").length;
  return {
    count: closed.length,
    netPL: closed.reduce((s, t) => s + tradeNetPL(t), 0),
    winRate: closed.length > 0 ? (wins / closed.length) * 100 : 0,
  };
};

const exitDate = (t: Trade): Date => new Date(t.dateClosed || t.dateBought);
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const startOfWeek = (d: Date) => {
  const x = startOfDay(d);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
};
const startOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);

type GlanceStats = {
  today: Summary;
  week: Summary;
  month: Summary;
  year: Summary;
  allTime: Summary;
  streakKind: "WIN" | "LOSS" | null;
  streakLen: number;
  openCount: number;
  topStrategy: { label: string; net: number; n: number } | null;
  avgWin: number;
  avgLoss: number;
  winCount: number;
  lossCount: number;
  profitFactor: number | null;
};

// ─── Tile shell ───────────────────────────────────────────────────────
function StatTile({
  label,
  value,
  sub,
  tone = "neutral",
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "good" | "bad" | "neutral";
  highlight?: boolean;
}) {
  const color =
    tone === "good"
      ? "text-green-500"
      : tone === "bad"
        ? "text-red-500"
        : "text-white";
  return (
    <div
      className={`h-full w-full border rounded-lg p-3 md:p-4 flex flex-col gap-1 min-w-0 ${
        highlight ? "border-white/20 bg-white/5" : "border-[var(--hairline)]"
      }`}
    >
      <div className="text-[10px] md:text-xs text-white/50 tracking-wide truncate">
        {label}
      </div>
      <div className={`text-base md:text-2xl font-normal truncate ${color}`}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px] md:text-xs text-white/50 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {sub}
        </div>
      )}
    </div>
  );
}

// A period tile ("Today" / "This week" …) as a StatTile.
function periodTile(label: string, s: Summary, highlight = false) {
  const positive = s.netPL >= 0;
  return (
    <StatTile
      label={label}
      highlight={highlight}
      tone={s.count === 0 ? "neutral" : positive ? "good" : "bad"}
      value={
        s.count === 0
          ? "-"
          : `${positive ? "+" : "−"}$${Math.abs(s.netPL).toFixed(2)}`
      }
      sub={
        <>
          <span>
            {s.count} trade{s.count === 1 ? "" : "s"}
          </span>
          {s.count > 0 && (
            <>
              <span className="text-white/20">·</span>
              <span>{s.winRate.toFixed(0)}% win rate</span>
            </>
          )}
        </>
      }
    />
  );
}

// ─── Tile registry ────────────────────────────────────────────────────
export type GlanceTileId =
  | "today"
  | "week"
  | "month"
  | "year"
  | "allTimePL"
  | "winRate"
  | "streak"
  | "openPositions"
  | "topStrategy"
  | "avgWin"
  | "avgLoss"
  | "profitFactor"
  | "totalTrades";

type GlanceTileDef = {
  id: GlanceTileId;
  title: string;
  render: (s: GlanceStats) => React.ReactNode;
};

const GLANCE_TILES: GlanceTileDef[] = [
  {
    id: "today",
    title: "Today",
    render: (s) => periodTile("Today", s.today, true),
  },
  {
    id: "week",
    title: "This week",
    render: (s) => periodTile("This week", s.week),
  },
  {
    id: "month",
    title: "This month",
    render: (s) => periodTile("This month", s.month),
  },
  {
    id: "year",
    title: "This year",
    render: (s) => periodTile("This year", s.year),
  },
  {
    id: "allTimePL",
    title: "All-time net P/L",
    render: (s) => (
      <StatTile
        label="All-time net P/L"
        value={
          s.allTime.count === 0 ? "-" : fmtMoneySignedCompact(s.allTime.netPL)
        }
        tone={
          s.allTime.count === 0
            ? "neutral"
            : s.allTime.netPL >= 0
              ? "good"
              : "bad"
        }
      />
    ),
  },
  {
    id: "winRate",
    title: "Win rate",
    render: (s) => (
      <StatTile
        label="Win rate (all-time)"
        value={s.allTime.count === 0 ? "-" : `${s.allTime.winRate.toFixed(0)}%`}
      />
    ),
  },
  {
    id: "streak",
    title: "Current streak",
    render: (s) => (
      <StatTile
        label="Current streak"
        value={
          s.streakKind === null
            ? "-"
            : `${s.streakKind === "WIN" ? "W" : "L"} × ${s.streakLen}`
        }
        tone={
          s.streakKind === "WIN"
            ? "good"
            : s.streakKind === "LOSS"
              ? "bad"
              : "neutral"
        }
      />
    ),
  },
  {
    id: "openPositions",
    title: "Open positions",
    render: (s) => (
      <StatTile
        label="Open positions"
        value={s.openCount > 0 ? `${s.openCount}` : "-"}
      />
    ),
  },
  {
    id: "topStrategy",
    title: "Top strategy MTD",
    render: (s) => (
      <StatTile
        label="Top strategy MTD"
        value={
          s.topStrategy && s.topStrategy.n > 0 ? (
            <span className="flex items-center gap-1.5 truncate">
              <span className="truncate">{s.topStrategy.label}</span>
              <span
                className={`text-[10px] md:text-xs ${
                  s.topStrategy.net >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {s.topStrategy.net >= 0 ? "+" : "−"}$
                {Math.abs(s.topStrategy.net).toFixed(0)}
              </span>
            </span>
          ) : (
            "-"
          )
        }
      />
    ),
  },
  {
    id: "avgWin",
    title: "Average win",
    render: (s) => (
      <StatTile
        label="Average win"
        value={s.winCount > 0 ? `+$${s.avgWin.toFixed(0)}` : "-"}
        tone={s.winCount > 0 ? "good" : "neutral"}
      />
    ),
  },
  {
    id: "avgLoss",
    title: "Average loss",
    render: (s) => (
      <StatTile
        label="Average loss"
        value={s.lossCount > 0 ? `−$${s.avgLoss.toFixed(0)}` : "-"}
        tone={s.lossCount > 0 ? "bad" : "neutral"}
      />
    ),
  },
  {
    id: "profitFactor",
    title: "Profit factor",
    render: (s) => (
      <StatTile
        label="Profit factor"
        value={
          s.profitFactor === null
            ? s.winCount > 0
              ? "∞"
              : "-"
            : s.profitFactor.toFixed(2)
        }
        tone={
          s.profitFactor === null
            ? s.winCount > 0
              ? "good"
              : "neutral"
            : s.profitFactor >= 1
              ? "good"
              : "bad"
        }
      />
    ),
  },
  {
    id: "totalTrades",
    title: "Total trades",
    render: (s) => (
      <StatTile label="Total closed trades" value={`${s.allTime.count}`} />
    ),
  },
];

const GLANCE_MAP = Object.fromEntries(
  GLANCE_TILES.map((t) => [t.id, t]),
) as Record<GlanceTileId, GlanceTileDef>;

const DEFAULT_GLANCE: GlanceTileId[] = [
  "today",
  "week",
  "month",
  "allTimePL",
  "streak",
  "openPositions",
  "topStrategy",
];

const ALL_GLANCE_IDS = new Set<GlanceTileId>(GLANCE_TILES.map((t) => t.id));

function sanitizeGlanceTiles(raw: unknown): GlanceTileId[] {
  if (!Array.isArray(raw)) return [...DEFAULT_GLANCE];
  const seen = new Set<GlanceTileId>();
  const out: GlanceTileId[] = [];
  for (const id of raw) {
    if (
      ALL_GLANCE_IDS.has(id as GlanceTileId) &&
      !seen.has(id as GlanceTileId)
    ) {
      seen.add(id as GlanceTileId);
      out.push(id as GlanceTileId);
    }
  }
  return out;
}

const GLANCE_KEY = "cuequill:dashboard-glance-tiles-v1";

// ─── Component ────────────────────────────────────────────────────────
export default function DashboardStats({ userId }: { userId: string }) {
  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const { data: trades, isLoading } = useTrades(userId, simulated);

  const [tiles, persistTiles] = usePersistedField<GlanceTileId[]>(
    GLANCE_KEY,
    "glanceTiles",
    DEFAULT_GLANCE,
    sanitizeGlanceTiles,
  );
  const [editing, setEditing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const stats = useMemo<GlanceStats | null>(() => {
    if (!trades) return null;
    const now = new Date();
    const closed = trades.filter(isClosed);
    const open = trades.filter((t) => t.status === "OPEN");

    const today = summarize(
      closed.filter((t) => exitDate(t) >= startOfDay(now)),
    );
    const week = summarize(
      closed.filter((t) => exitDate(t) >= startOfWeek(now)),
    );
    const monthStart = startOfMonth(now);
    const month = summarize(closed.filter((t) => exitDate(t) >= monthStart));
    const year = summarize(
      closed.filter((t) => exitDate(t) >= startOfYear(now)),
    );
    const allTime = summarize(closed);

    // Current streak — newest first.
    const closedSorted = [...closed].sort(
      (a, b) => exitDate(b).getTime() - exitDate(a).getTime(),
    );
    let streakKind: "WIN" | "LOSS" | null = null;
    let streakLen = 0;
    for (const t of closedSorted) {
      if (streakKind === null) {
        streakKind = t.status === "WIN" ? "WIN" : "LOSS";
        streakLen = 1;
      } else if (t.status === streakKind) streakLen++;
      else break;
    }

    // Top strategy this month.
    const stratByMonth = new Map<string, { net: number; n: number }>();
    for (const t of closed.filter((c) => exitDate(c) >= monthStart)) {
      const k = t.strategy ?? "-";
      const prev = stratByMonth.get(k) ?? { net: 0, n: 0 };
      prev.net += tradeNetPL(t);
      prev.n += 1;
      stratByMonth.set(k, prev);
    }
    let topStrategy: { label: string; net: number; n: number } | null = null;
    for (const [label, v] of stratByMonth) {
      if (!topStrategy || v.net > topStrategy.net)
        topStrategy = { label, net: v.net, n: v.n };
    }

    const wins = closed.filter((t) => t.status === "WIN");
    const losses = closed.filter((t) => t.status === "LOSS");
    const grossProfit = wins.reduce((s, t) => s + tradeNetPL(t), 0);
    const grossLoss = -losses.reduce((s, t) => s + tradeNetPL(t), 0);

    return {
      today,
      week,
      month,
      year,
      allTime,
      streakKind,
      streakLen,
      openCount: open.length,
      topStrategy,
      avgWin: wins.length > 0 ? grossProfit / wins.length : 0,
      avgLoss: losses.length > 0 ? grossLoss / losses.length : 0,
      winCount: wins.length,
      lossCount: losses.length,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
    };
  }, [trades]);

  if (isLoading || !trades) {
    return (
      <div className={`${CARD_CLASS} text-white/40 text-sm py-16 text-center`}>
        Loading dashboard stats…
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className={`${CARD_CLASS} text-center text-white/40 text-sm py-16`}>
        You haven&apos;t made any trades yet. Add one to see your dashboard.
      </div>
    );
  }

  const s = stats!;
  const disabledTiles = GLANCE_TILES.filter((t) => !tiles.includes(t.id));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = tiles.indexOf(active.id as GlanceTileId);
    const to = tiles.indexOf(over.id as GlanceTileId);
    if (from === -1 || to === -1) return;
    persistTiles(arrayMove(tiles, from, to));
  };

  return (
    <section className={`${CARD_CLASS} flex flex-col gap-4 h-full`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm md:text-base font-semibold">At a glance</h2>
        <div className="flex items-center gap-1.5">
          {editing && (
            <div className="relative">
              <button
                onClick={() => setAddOpen((o) => !o)}
                disabled={disabledTiles.length === 0}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md border border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <i className="fa-solid fa-plus text-[10px]" />
                Add
              </button>
              {addOpen && disabledTiles.length > 0 && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setAddOpen(false)}
                  />
                  <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-52 rounded-xl border border-white/10 bg-[var(--surface-2,#1a1a1a)] backdrop-blur-md shadow-xl p-1.5 max-h-72 overflow-y-auto">
                    <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-white/40">
                      Add a tile
                    </div>
                    {disabledTiles.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          persistTiles([...tiles, t.id]);
                          setAddOpen(false);
                        }}
                        className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] text-white/80 hover:bg-white/[0.06] transition cursor-pointer"
                      >
                        <i className="fa-solid fa-plus text-[10px] text-white/40" />
                        {t.title}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <button
            onClick={() => {
              setEditing((v) => !v);
              setAddOpen(false);
            }}
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md border transition cursor-pointer ${
              editing
                ? "border-teal-400/40 bg-teal-500/15 text-teal-200"
                : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
            }`}
            title="Customize tiles"
          >
            <i
              className={`fa-solid ${editing ? "fa-check" : "fa-sliders"} text-[10px]`}
            />
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </div>

      {tiles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[12px] text-white/40 text-center py-6">
          No tiles.{" "}
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="ml-1 text-teal-300 hover:text-teal-200 cursor-pointer"
            >
              Add some
            </button>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={tiles} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {tiles.map((id) => (
                <SortableTile
                  key={id}
                  id={id}
                  editing={editing}
                  onRemove={() => persistTiles(tiles.filter((x) => x !== id))}
                >
                  {GLANCE_MAP[id].render(s)}
                </SortableTile>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

function SortableTile({
  id,
  editing,
  onRemove,
  children,
}: {
  id: GlanceTileId;
  editing: boolean;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editing });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Sizing lives on the wrapper so the tile fills it; tiles wrap in a
  // flex row and grow to share the width.
  const wrapper = "min-w-0 basis-[150px] md:basis-[190px] grow";

  if (!editing) {
    return (
      <div ref={setNodeRef} style={style} className={wrapper}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${wrapper} ${isDragging ? "opacity-60 z-10" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="h-full cursor-grab active:cursor-grabbing touch-none rounded-lg outline outline-1 outline-dashed outline-white/20 outline-offset-2"
      >
        {children}
      </div>
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--surface-2,#222)] border border-white/15 text-white/60 hover:text-red-300 hover:border-red-400/40 transition cursor-pointer shadow"
        aria-label="Remove tile"
        title="Remove tile"
      >
        <i className="fa-solid fa-xmark text-[10px]" />
      </button>
    </div>
  );
}
