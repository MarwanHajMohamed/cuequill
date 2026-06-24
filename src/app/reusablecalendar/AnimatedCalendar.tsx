// components/AnimatedCalendar.tsx

"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Calendar, { OnArgs } from "react-calendar";
import { format } from "date-fns";

// react-calendar's grid container differs per view; the swipe / slide /
// zoom logic targets whichever one is currently mounted.
const GRID_SELECTOR =
  ".react-calendar__month-view__days, .react-calendar__year-view__months, .react-calendar__decade-view__years, .react-calendar__century-view__decades";
const VIEW_ORDER = ["month", "year", "decade", "century"];

export type AnimatedCalendarHandle = {
  goToToday: () => void;
};

interface AnimatedCalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  tileContent?: ({
    date,
    view,
  }: {
    date: Date;
    view: string;
  }) => React.ReactNode;
  tileClassName?: ({
    date,
    view,
  }: {
    date: Date;
    view: string;
  }) => string | null | undefined;
  className?: string;
  /** Render the built-in Today button inside the calendar. Defaults to true. */
  showTodayButton?: boolean;
  /**
   * Whether to show days that spill in from the previous/next month to fill
   * the calendar grid. Defaults to true (react-calendar's default).
   */
  showNeighboringMonth?: boolean;
  /** Fires whenever the displayed month changes (first of that month). */
  onMonthChange?: (date: Date) => void;
  /**
   * Fires whenever the user drills up to year/decade or back down to
   * month view. Values: "month" | "year" | "decade" | "century".
   */
  onViewChange?: (view: string) => void;
}

const AnimatedCalendar = forwardRef<
  AnimatedCalendarHandle,
  AnimatedCalendarProps
>(function AnimatedCalendar(
  {
    value,
    onChange,
    tileContent,
    tileClassName,
    className = "custom-calendar_full-view",
    showTodayButton = true,
    showNeighboringMonth = true,
    onMonthChange,
    onViewChange,
  },
  ref
) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{
    x: number;
    y: number;
    mode: "idle" | "horizontal" | "vertical";
  } | null>(null);
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());
  // Mirror react-calendar's current view so swipe steps and the drill
  // zoom-animation know whether we're on months, years, or decades.
  const [view, setView] = useState<string>("month");
  const prevViewIdx = useRef<number | null>(null);

  // Notify the parent of every month change (including initial mount).
  useEffect(() => {
    onMonthChange?.(
      new Date(activeStartDate.getFullYear(), activeStartDate.getMonth(), 1),
    );
  }, [activeStartDate, onMonthChange]);

  // Safety net for the days-grid animation below. The animation mutates
  // inline opacity / transform / pointer-events on a DOM ref and relies on
  // requestAnimationFrame to restore them after setActiveStartDate commits.
  // rAF doesn't fire while the tab is backgrounded, and rapid prev/next or
  // drill-up/down can leave restores queued against a stale element. Either
  // way the grid can be left at opacity 0 / translated off-screen / pointer-
  // events none, which on the dashboard reads as "all white tiles". This
  // effect waits past the longest animation (about 440ms total) and forces
  // any lingering inline styles back to neutral so the broken state always
  // self-heals on the next month commit without a page refresh.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const grids = calendarRef.current?.querySelectorAll(GRID_SELECTOR);
      grids?.forEach((g) => {
        const el = g as HTMLElement;
        el.style.transition = "";
        el.style.transform = "";
        el.style.opacity = "";
        el.style.pointerEvents = "";
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [activeStartDate, view]);

  // The active grid for the current view (days / months / years / decades).
  const getDaysEl = () =>
    (calendarRef.current?.querySelector(
      GRID_SELECTOR
    ) as HTMLElement | null) ?? null;

  // How far one swipe/arrow step moves, by view.
  const stepDate = (base: Date, dir: "next" | "prev"): Date => {
    const delta = dir === "next" ? 1 : -1;
    const y = base.getFullYear();
    const m = base.getMonth();
    if (view === "year") return new Date(y + delta, m, 1);
    if (view === "decade") return new Date(y + delta * 10, m, 1);
    if (view === "century") return new Date(y + delta * 100, m, 1);
    return new Date(y, m + delta, 1);
  };

  // Drill zoom: when the view changes (month↔year↔decade), the new grid
  // eases in from a scale — out (bigger → settle) when zooming to a
  // broader view, in (smaller → settle) when drilling down. useLayoutEffect
  // hides it before paint so there's no flash.
  useLayoutEffect(() => {
    const idx = VIEW_ORDER.indexOf(view);
    const prev = prevViewIdx.current;
    prevViewIdx.current = idx;
    if (prev === null || prev === idx) return;
    const grid = getDaysEl();
    if (!grid) return;
    const zoomOut = idx > prev; // broader scope = pull back
    grid.style.transition = "none";
    grid.style.opacity = "0";
    grid.style.transform = `scale(${zoomOut ? 1.08 : 0.92})`;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const g = getDaysEl() ?? grid;
        g.style.transition = "transform 0.26s ease, opacity 0.26s ease";
        g.style.opacity = "1";
        g.style.transform = "scale(1)";
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [view]);

  // Finger-following swipe: drag the days grid in real time, then either snap
  // back (small swipe) or slide off and switch month (large swipe).
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      mode: "idle",
    };
    const days = getDaysEl();
    if (days) days.style.transition = "none";
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const start = touchStart.current;
    if (!start) return;
    const dx = e.touches[0].clientX - start.x;
    const dy = e.touches[0].clientY - start.y;

    if (start.mode === "idle") {
      // Decide direction once we've moved enough to disambiguate.
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        start.mode = "vertical";
        return;
      }
      if (Math.abs(dx) > 10) {
        start.mode = "horizontal";
      }
    }

    if (start.mode === "horizontal") {
      const days = getDaysEl();
      if (days) {
        // Subtract the 10px disambiguation threshold so the grid feels like
        // it locks onto the finger at the moment swipe is detected.
        const tx = dx - (dx > 0 ? 10 : -10);
        days.style.transform = `translateX(${tx}px)`;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const days = getDaysEl();
    if (!days) return;

    if (start.mode !== "horizontal") {
      // No follow-through happened - make sure we leave a clean state.
      days.style.transition = "transform 0.18s ease";
      days.style.transform = "";
      return;
    }

    const dx = e.changedTouches[0].clientX - start.x;
    const width = days.getBoundingClientRect().width || 1;
    const threshold = Math.min(80, width * 0.25);

    if (Math.abs(dx) > threshold) {
      commitSwipe(dx < 0 ? "next" : "prev");
    } else {
      // Cancel - snap back to 0.
      days.style.transition = "transform 0.18s ease";
      days.style.transform = "translateX(0)";
    }
  };

  const commitSwipe = (dir: "next" | "prev") => {
    const days = getDaysEl();
    if (!days) return;
    const width = days.getBoundingClientRect().width || 1;

    days.style.pointerEvents = "none";
    days.style.transition = "transform 0.18s ease, opacity 0.18s ease";
    days.style.transform = `translateX(${dir === "next" ? -width : width}px)`;
    days.style.opacity = "0";

    setTimeout(() => {
      // Jump to the opposite side (still invisible), swap to the new month,
      // then animate back to zero so the new month slides in.
      days.style.transition = "none";
      days.style.transform = `translateX(${dir === "next" ? width : -width}px)`;
      days.style.opacity = "0";

      setActiveStartDate(stepDate(activeStartDate, dir));

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const after = getDaysEl();
          if (!after) return;
          after.style.transition = "transform 0.18s ease, opacity 0.18s ease";
          after.style.transform = "translateX(0)";
          after.style.opacity = "1";
          after.style.pointerEvents = "";
        });
      });
    }, 180);
  };

  const goToToday = () => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonth = new Date(
      activeStartDate.getFullYear(),
      activeStartDate.getMonth(),
      1
    );
    if (target.getTime() === currentMonth.getTime()) return;

    // Reuse the next/prev animation by feeding the existing handler.
    handleActiveStartDateChange({
      action: target > currentMonth ? "next" : "prev",
      activeStartDate: target,
      value: now,
      view: "month",
    } as OnArgs);
  };

  useImperativeHandle(ref, () => ({ goToToday }));

  const handleActiveStartDateChange = ({
    action,
    activeStartDate: newDate,
    view,
  }: OnArgs) => {
    // Surface drill-up / drill-down so the parent can hide views that
    // only make sense for the day grid (e.g. week-summary sidebar).
    if (action === "drillUp" || action === "drillDown") {
      onViewChange?.(view);
    }
    if (!newDate) return;

    // No animation for drillDown/drillUp/onChange - just update the date
    if (action !== "next" && action !== "prev") {
      setActiveStartDate(newDate);
      return;
    }

    const dir = action === "next" ? "left" : "right";
    // Whichever grid is mounted for the current view (days/months/years).
    const days = getDaysEl();

    // If there's no grid visible, just update.
    if (!days) {
      setActiveStartDate(newDate);
      return;
    }

    days.style.pointerEvents = "none";
    days.style.transition = "transform 0.22s ease, opacity 0.22s ease";
    days.style.transform = `translateX(${dir === "left" ? "-50px" : "50px"})`;
    days.style.opacity = "0";

    setTimeout(() => {
      days.style.transition = "none";
      days.style.transform = `translateX(${dir === "left" ? "50px" : "-50px"})`;
      days.style.opacity = "0";
      setActiveStartDate(newDate);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Re-query in case react-calendar replaced the grid node during
          // the commit triggered by setActiveStartDate. Styling a stale
          // (detached) element leaves the visible grid stuck at opacity 0.
          const after = getDaysEl() ?? days;
          after.style.transition = "transform 0.22s ease, opacity 0.22s ease";
          after.style.transform = "translateX(0)";
          after.style.opacity = "1";
          after.style.pointerEvents = "";
        });
      });
    }, 220);
  };

  return (
    <div
      ref={calendarRef}
      className="overflow-hidden h-full flex flex-col"
      style={{ touchAction: "pan-y" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {showTodayButton && (
        <div className="flex justify-end mb-1">
          <button
            onClick={goToToday}
            className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/5 text-white/70 hover:text-white cursor-pointer transition"
          >
            Today
          </button>
        </div>
      )}
      <Calendar
        onChange={(val) => onChange(val as Date)}
        value={value}
        tileContent={tileContent}
        tileClassName={tileClassName}
        calendarType="iso8601"
        formatShortWeekday={(_, date) => format(date, "EEE")}
        formatMonthYear={(_, date) => format(date, "LLLL yyyy")}
        next2Label={null}
        prev2Label={null}
        showNeighboringMonth={showNeighboringMonth}
        activeStartDate={activeStartDate}
        onActiveStartDateChange={handleActiveStartDateChange}
        onViewChange={({ view }) => {
          setView(view);
          onViewChange?.(view);
        }}
        className={className}
      />
    </div>
  );
});

export default AnimatedCalendar;
