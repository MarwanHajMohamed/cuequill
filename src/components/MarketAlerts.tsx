"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useFedDates } from "@/hooks/useFedDates";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useEarnings } from "@/hooks/useEarnings";

// Top-of-page alerts a trader wants to see the moment they open the app:
//   • "Earnings today" — a watchlist ticker reports today.
//   • "FOMC this week" — an FOMC meeting falls in the current Mon–Sun week.
// Each is dismissible and, once dismissed, stays hidden for the day / week
// (localStorage-keyed) so it doesn't nag on every navigation.

const EARN_KEY = "cuequill:alert-earnings-day";
const FOMC_KEY = "cuequill:alert-fomc-week";

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// Monday-start week bounds for a given date, as yyyy-MM-dd keys.
function weekBounds(d: Date): { start: string; end: string } {
  const mondayOffset = (d.getDay() + 6) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: iso(start), end: iso(end) };
}

export default function MarketAlerts() {
  const { status } = useSession();
  const authed = status === "authenticated";
  const fedDates = useFedDates();
  const { data: watchlist = [] } = useWatchlist();
  const { data: earnings = [] } = useEarnings(authed ? watchlist : []);

  const today = iso(new Date());
  const week = useMemo(() => weekBounds(new Date()), []);

  const [mounted, setMounted] = useState(false);
  const [dismissEarn, setDismissEarn] = useState(false);
  const [dismissFomc, setDismissFomc] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissEarn(localStorage.getItem(EARN_KEY) === today);
      setDismissFomc(localStorage.getItem(FOMC_KEY) === week.start);
    } catch {
      /* ignore */
    }
  }, [today, week.start]);

  const earningsToday = useMemo(
    () =>
      authed
        ? Array.from(
            new Set(
              earnings.filter((e) => e.date === today).map((e) => e.symbol),
            ),
          )
        : [],
    [earnings, today, authed],
  );

  const fomcThisWeek = useMemo(() => {
    if (!authed) return false;
    for (const d of fedDates.meetings) {
      if (d >= week.start && d <= week.end) return true;
    }
    return false;
  }, [fedDates, week, authed]);

  const showEarnings = mounted && earningsToday.length > 0 && !dismissEarn;
  const showFomc = mounted && fomcThisWeek && !dismissFomc;

  const closeEarnings = () => {
    try {
      localStorage.setItem(EARN_KEY, today);
    } catch {
      /* ignore */
    }
    setDismissEarn(true);
  };
  const closeFomc = () => {
    try {
      localStorage.setItem(FOMC_KEY, week.start);
    } catch {
      /* ignore */
    }
    setDismissFomc(true);
  };

  const earningsLabel =
    earningsToday.length <= 3
      ? earningsToday.join(", ")
      : `${earningsToday.slice(0, 3).join(", ")} +${earningsToday.length - 3}`;

  return (
    <div className="market-alerts-bar fixed left-0 right-0 z-[45] top-[70px] md:top-5 px-4 md:px-6 flex flex-col items-stretch gap-2 pointer-events-none">
      <AnimatePresence>
        {showFomc && (
          <AlertPill
            key="fomc"
            href="/calendar"
            icon="fa-landmark"
            iconClass="text-purple-300"
            text="FOMC this week"
            onClose={closeFomc}
          />
        )}
        {showEarnings && (
          <AlertPill
            key="earnings"
            href="/earnings"
            icon="fa-bullhorn"
            iconClass="text-teal-300"
            text={`Earnings today: ${earningsLabel}`}
            onClose={closeEarnings}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AlertPill({
  href,
  icon,
  iconClass,
  text,
  onClose,
}: {
  href: string;
  icon: string;
  iconClass: string;
  text: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ y: -16, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -16, opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className="pointer-events-auto w-full flex items-center justify-between gap-2.5 pl-4 pr-2 py-2.5 rounded-2xl bg-[var(--surface)] border border-white/12 shadow-[0_12px_40px_var(--shadow)] backdrop-blur-md"
    >
      <Link
        href={href}
        className="inline-flex items-center gap-2.5 min-w-0 flex-1 group"
      >
        <i className={`fa-solid ${icon} text-[12px] shrink-0 ${iconClass}`} />
        <span className="text-[12.5px] font-medium text-white/85 truncate group-hover:text-white transition">
          {text}
        </span>
      </Link>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="shrink-0 w-6 h-6 rounded-full inline-flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
      >
        <i className="fa-solid fa-xmark text-[11px]" />
      </button>
    </motion.div>
  );
}
