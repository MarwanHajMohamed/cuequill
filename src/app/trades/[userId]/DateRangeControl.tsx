"use client";
import React, { useEffect, useMemo, useState } from "react";

/**
 * Quick date-range picker for the trades page. Presets call back via
 * setStartDate / setEndDate with `yyyy-MM-dd` strings (matching the
 * native <input type="date"> format). "All" clears both. "Custom"
 * exposes the From/To inputs so the user can pick exact dates.
 *
 * Auto-detects the active preset by comparing the current values
 * against each preset's range, so the chip stays highlighted even
 * after a hard refresh.
 */

type Props = {
  startDate: string;
  endDate: string;
  setStartDate: (d: string) => void;
  setEndDate: (d: string) => void;
  /** Compact (sidebar) variant stacks vertically; default is horizontal. */
  variant?: "row" | "stacked";
};

const toIso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const startOfWeek = (d: Date) => {
  // ISO week: Monday start.
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
};

const subDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() - n);
  return x;
};

type Preset = {
  key: string;
  label: string;
  compute: () => { start: string; end: string };
};

const buildPresets = (): Preset[] => [
  {
    key: "all",
    label: "All",
    compute: () => ({ start: "", end: "" }),
  },
  {
    key: "today",
    label: "Today",
    compute: () => {
      const today = toIso(new Date());
      return { start: today, end: today };
    },
  },
  {
    key: "wtd",
    label: "WTD",
    compute: () => ({
      start: toIso(startOfWeek(new Date())),
      end: toIso(new Date()),
    }),
  },
  {
    key: "mtd",
    label: "MTD",
    compute: () => {
      const now = new Date();
      return {
        start: toIso(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: toIso(now),
      };
    },
  },
  {
    key: "ytd",
    label: "YTD",
    compute: () => {
      const now = new Date();
      return {
        start: toIso(new Date(now.getFullYear(), 0, 1)),
        end: toIso(now),
      };
    },
  },
  {
    key: "30d",
    label: "Last 30d",
    compute: () => ({
      start: toIso(subDays(new Date(), 30)),
      end: toIso(new Date()),
    }),
  },
  {
    key: "lastMonth",
    label: "Last month",
    compute: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month
      return { start: toIso(start), end: toIso(end) };
    },
  },
];

export function DateRangeControl({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  variant = "row",
}: Props) {
  const presets = useMemo(buildPresets, []);
  const [showCustom, setShowCustom] = useState(false);
  // Track which preset the user most recently clicked. Used to break
  // ties when two presets compute the same range (e.g. WTD and MTD on
  // the first week of a month that started on a Monday) — without this,
  // the iteration order always wins and clicking MTD looks like WTD.
  const [lastClicked, setLastClicked] = useState<string | null>(null);

  const apply = (p: Preset) => {
    const { start, end } = p.compute();
    setStartDate(start);
    setEndDate(end);
    setLastClicked(p.key);
    setShowCustom(p.key === "all" ? false : showCustom);
  };

  // Match current state against a preset so the chip highlights stay
  // accurate (e.g., page reload). If the last-clicked preset still
  // matches, prefer it so ties (WTD == MTD) resolve in the user's favor.
  const activeKey = useMemo(() => {
    if (!startDate && !endDate) return "all";
    if (lastClicked) {
      const p = presets.find((q) => q.key === lastClicked);
      if (p) {
        const { start, end } = p.compute();
        if (start === startDate && end === endDate) return lastClicked;
      }
    }
    for (const p of presets) {
      if (p.key === "all") continue;
      const { start, end } = p.compute();
      if (start === startDate && end === endDate) return p.key;
    }
    return "custom";
  }, [startDate, endDate, presets, lastClicked]);

  // If the user manually edits the dates and the last-clicked preset no
  // longer matches, clear the memo so the next preset click takes effect.
  useEffect(() => {
    if (!lastClicked) return;
    const p = presets.find((q) => q.key === lastClicked);
    if (!p) {
      setLastClicked(null);
      return;
    }
    const { start, end } = p.compute();
    if (start !== startDate || end !== endDate) setLastClicked(null);
  }, [startDate, endDate, presets, lastClicked]);

  // If the active match becomes "custom" (e.g. user typed a date), open
  // the inputs automatically.
  useEffect(() => {
    if (activeKey === "custom") setShowCustom(true);
  }, [activeKey]);

  const chipBase =
    "text-[11px] xl:text-xs px-2.5 py-1 rounded-full border transition cursor-pointer whitespace-nowrap";
  const chipActive = "bg-blue-500/20 border-blue-500 text-white";
  const chipInactive =
    "bg-transparent border-white/10 text-white/60 hover:border-white/30 hover:text-white";

  const customActive = activeKey === "custom" || showCustom;

  return (
    <div className={`flex flex-col gap-2 ${variant === "row" ? "" : ""}`}>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => apply(p)}
            className={`${chipBase} ${
              activeKey === p.key ? chipActive : chipInactive
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom((s) => !s)}
          className={`${chipBase} ${
            customActive ? chipActive : chipInactive
          } flex items-center gap-1`}
        >
          <i className="fa-solid fa-calendar text-[10px]"></i>
          Custom
        </button>
      </div>

      {showCustom && (
        <div
          className={`${
            variant === "row" ? "flex gap-2" : "flex flex-col gap-2"
          }`}
        >
          <DateField
            label="From"
            value={startDate}
            onChange={(v) => setStartDate(v)}
          />
          <DateField
            label="To"
            value={endDate}
            min={startDate}
            onChange={(v) => setEndDate(v)}
          />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="text-[10px] xl:text-xs text-white/40 hover:text-white px-2 py-1 cursor-pointer self-center mb-0.5"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
}) {
  return (
    <div className="flex flex-col">
      <label className="block text-[10px] xl:text-xs text-white/40 mb-0.5">
        {label}
      </label>
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="p-1 text-xs xl:text-sm text-white bg-[#1A1A1D] rounded border border-white/10 focus:border-white/30 focus:outline-none"
      />
    </div>
  );
}
