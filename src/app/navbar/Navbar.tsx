"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useTransition,
} from "react";
import { signOut, useSession } from "next-auth/react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  animate as motionAnimate,
  PanInfo,
} from "framer-motion";
import TimezoneDisplay from "@/helpers/TimezoneDisplay";
import ThemeToggle from "@/components/ThemeToggle";
import { isMarketOpenAt } from "@/lib/marketHolidays";

const CuequillLogo = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="16 25 30 52"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    aria-label="Cuequill"
  >
    <path
      d="M31 27.2C37 39.8 43.5 61.2 40.5 62.6C37.5 64 31 75.2 31 75.2C31 75.2 24.5 64.5 21.5 62.6C18.5 60.7 25 39.8 31 27.2Z"
      fill="currentColor"
    />
    <path
      d="M31 47V75"
      style={{ stroke: "var(--background)" }}
      strokeWidth="1.32"
      strokeLinecap="round"
    />
    <path
      d="M31 54.56C31.8616 54.56 32.56 53.8616 32.56 53C32.56 52.1384 31.8616 51.44 31 51.44C30.1384 51.44 29.44 52.1384 29.44 53C29.44 53.8616 30.1384 54.56 31 54.56Z"
      style={{ fill: "var(--background)" }}
    />
  </svg>
);

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  // Optimistic path: updates immediately on click so the active-route
  // pill slides before the next page actually mounts.
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  // isNavPending drives the thin top progress bar while React is busy
  // rendering the next route.
  const [isNavPending, startTransition] = useTransition();
  const activePath = pendingPath ?? pathname;
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const userFullName = session?.user
    ? `${session.user.firstname ?? ""} ${session.user.surname ?? ""}`.trim()
    : "";
  const userInitial =
    userFullName[0]?.toUpperCase() ??
    session?.user?.email?.[0]?.toUpperCase() ??
    "U";

  const dropdownRef = useRef<HTMLDivElement>(null);
  const guideDropdownRef = useRef<HTMLDivElement>(null);
  // Persistent pill: one element whose position/width is animated via
  // refs rather than framer's layoutId. layoutId measures via
  // getBoundingClientRect across renders, which misreads the
  // "from" position when the document scroll resets to top during a
  // route change inside a fixed parent - making the pill fly up from
  // below the viewport. Direct measurement avoids that entirely.
  // The pill spans the whole desktop bar so it can slide between the
  // brand on the left and the nav items in the middle.
  const desktopBarRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const [pill, setPill] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [pillReady, setPillReady] = useState(false);

  // Bottom tab bar - its own pill so the sliding indicator can move
  // between tabs independent of the desktop bar.
  const bottomBarRef = useRef<HTMLDivElement>(null);
  const bottomTabRefs = useRef<Record<string, HTMLElement | null>>({});
  const [bottomPill, setBottomPill] = useState<{ x: number; w: number } | null>(
    null,
  );
  const [bottomPillReady, setBottomPillReady] = useState(false);
  // Positions of every bottom tab - used to power the drag-snap
  // behaviour. Keyed by tab slug; "__more__" for the More button.
  const [tabPositions, setTabPositions] = useState<
    Record<string, { x: number; w: number }>
  >({});
  // Motion values so the pill follows the finger during a drag and we
  // can read the live position in onDragEnd to snap to the nearest tab.
  const pillX = useMotionValue(0);
  const pillWidth = useMotionValue(0);
  const PILL_SPRING = { type: "spring" as const, stiffness: 380, damping: 32 };

  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState(false);
  // Mobile "More" bottom sheet replaces the old slide-in side drawer.
  const [openMore, setOpenMore] = useState(false);
  const [simulated, setSimulated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("simulated") === "true";
    }
    return false;
  });

  useEffect(() => {
    const stored = localStorage.getItem("simulated");
    if (stored !== null) {
      setSimulated(stored === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("simulated", String(simulated));
  }, [simulated]);

  /* ---------------- HELPERS ---------------- */

  // Build the href Next.js will navigate to. "/" is dashboard; bare
  // slugs get a leading slash.
  const hrefFor = (slug: string) => (slug === "/" ? "/dashboard" : `/${slug}`);

  const navigate = (slug: string) => {
    const href = hrefFor(slug);
    // Update the optimistic active path synchronously so the pill
    // animates the moment the click registers.
    setPendingPath(href);
    startTransition(() => {
      router.push(href);
    });
  };

  // Clear the optimistic path once the real pathname catches up.
  useEffect(() => {
    if (pendingPath && pathname === pendingPath) setPendingPath(null);
  }, [pathname, pendingPath]);

  const handleRoute = (slug: string) => navigate(slug);

  const handleNavClick = (slug: string) => {
    navigate(slug);
    setOpenMore(false);
  };

  // Active-route detection. Slugs may include a userId segment (e.g.
  // `trades/abc123`); compare against the first path segment.
  const isActive = (slug: string) => {
    const base = slug.split("/")[0];
    if (!base) return activePath === "/" || activePath === "/dashboard";
    return activePath === `/${base}` || activePath.startsWith(`/${base}/`);
  };

  /* ---------------- DATA ---------------- */

  // Bottom navigation tabs on mobile - the four most-used routes.
  // Everything else lives behind the "More" tab.
  const bottomTabs = [
    { icon: "fa-solid fa-house", label: "Home", slug: "/" },
    {
      icon: "fa-solid fa-chart-column",
      label: "Trades",
      slug: `trades/${userId}`,
    },
    { icon: "fa-solid fa-calendar-days", label: "Calendar", slug: "calendar" },
    {
      icon: "fa-solid fa-wand-magic-sparkles",
      label: "Quill AI",
      slug: "chat",
    },
  ];

  // Secondary destinations shown in the bottom-sheet "More" menu.
  // Quill AI (chat) lives in the bottom tab bar, so it's not repeated here.
  const moreItems = [
    {
      icon: "fa-regular fa-circle-check",
      label: "Affirmations",
      slug: "affirmations",
    },
    { icon: "fa-solid fa-bezier-curve", label: "Strategies", slug: "strategies" },
    { icon: "fa-solid fa-coins", label: "Stocks & ETFs", slug: "stocks" },
    {
      icon: "fa-regular fa-calendar-days",
      label: "Earnings",
      slug: "earnings",
    },
    { icon: "fa-solid fa-list-check", label: "Rules", slug: "rules" },
    { icon: "fa-solid fa-tag", label: "Plans & pricing", slug: "pricing" },
    { icon: "fa-solid fa-gear", label: "Settings", slug: "settings" },
  ];

  const guideItems = [
    { label: "Strategies", slug: "strategies" },
    { label: "Stocks/ETFs", slug: "stocks" },
    { label: "Earnings", slug: "earnings" },
    { label: "Rules", slug: "rules" },
  ];

  const navItems = [
    { name: "Trades", slug: `trades/${userId}` },
    { name: "Calendar", slug: "calendar" },
    { name: "Quill AI", slug: "chat" },
    { name: "Affirmations", slug: "affirmations" },
  ];

  const guideActive = guideItems.some((g) => isActive(g.slug));

  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      const clickedOutsideUser =
        dropdownRef.current && !dropdownRef.current.contains(target);

      const clickedOutsideGuide =
        guideDropdownRef.current && !guideDropdownRef.current.contains(target);

      if (clickedOutsideUser) setOpen(false);
      if (clickedOutsideGuide) setDropdown(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (openMore) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [openMore]);

  // Which key in itemRefs is currently active? Computed from activePath
  // so the measurement effect re-runs as soon as a click optimistically
  // updates pendingPath.
  const activeKey = (() => {
    if (isActive("/")) return "__brand__";
    const hit = navItems.find((n) => isActive(n.slug));
    if (hit) return hit.slug;
    if (guideActive) return "__guide__";
    return null;
  })();

  useLayoutEffect(() => {
    const measure = () => {
      if (!desktopBarRef.current || !activeKey) return;
      const el = itemRefs.current[activeKey];
      if (!el) return;
      const parent = desktopBarRef.current.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      setPill({
        x: rect.left - parent.left,
        y: rect.top - parent.top,
        w: rect.width,
        h: rect.height,
      });
      setPillReady(true);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (desktopBarRef.current) ro.observe(desktopBarRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeKey]);

  // Which mobile bottom tab is currently active. The More tab claims
  // the indicator both when the sheet is open and when you're on any
  // route that lives inside the sheet (Affirmations/Strategies/etc.).
  const activeBottomKey = (() => {
    if (openMore) return "__more__";
    const hit = bottomTabs.find((t) => isActive(t.slug));
    if (hit) return hit.slug;
    if (moreItems.some((m) => isActive(m.slug))) return "__more__";
    return null;
  })();

  useLayoutEffect(() => {
    const measure = () => {
      if (!bottomBarRef.current) return;
      const parent = bottomBarRef.current.getBoundingClientRect();
      // Capture every tab's position - we need all of them to compute
      // drag constraints and snap targets in onDragEnd.
      const next: Record<string, { x: number; w: number }> = {};
      Object.entries(bottomTabRefs.current).forEach(([key, el]) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0) return;
        next[key] = { x: r.left - parent.left, w: r.width };
      });
      if (Object.keys(next).length > 0) setTabPositions(next);

      if (!activeBottomKey) return;
      const active = next[activeBottomKey];
      if (!active) return;
      setBottomPill(active);
      setBottomPillReady(true);
    };
    measure();
    // Defer one more measurement to the next frame in case layout
    // shifts after first paint (font load, hydration). Without this,
    // a freshly-loaded page can show the pill at width 0 or not at
    // all until the user interacts.
    const raf = requestAnimationFrame(measure);
    // Re-measure once webfonts / Font Awesome finish loading - they
    // change tab widths and would otherwise leave the pill stranded.
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => measure()).catch(() => {});
    }
    const ro = new ResizeObserver(measure);
    if (bottomBarRef.current) ro.observe(bottomBarRef.current);
    // Observing each tab catches per-icon width shifts when Font
    // Awesome hydrates.
    Object.values(bottomTabRefs.current).forEach((el) => {
      if (el) ro.observe(el);
    });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeBottomKey]);

  // Mirror bottomPill state into motion values so the pill animates
  // smoothly on tab change but is still draggable via direct
  // motion-value updates.
  useEffect(() => {
    if (!bottomPill) return;
    if (!bottomPillReady) {
      pillX.set(bottomPill.x);
      pillWidth.set(bottomPill.w);
      return;
    }
    const a = motionAnimate(pillX, bottomPill.x, PILL_SPRING);
    const b = motionAnimate(pillWidth, bottomPill.w, PILL_SPRING);
    return () => {
      a.stop();
      b.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bottomPill]);

  // Drag-end: snap the pill to the closest tab and navigate there if
  // it's different from the current one. Same tab → snap back.
  const handlePillDragEnd = (_: unknown, info: PanInfo) => {
    void info;
    const allKeys = [...bottomTabs.map((t) => t.slug), "__more__"];
    const currentX = pillX.get();
    const currentW = pillWidth.get();
    const center = currentX + currentW / 2;
    let closest: string | null = null;
    let bestDist = Infinity;
    allKeys.forEach((key) => {
      const pos = tabPositions[key];
      if (!pos) return;
      const tabCenter = pos.x + pos.w / 2;
      const d = Math.abs(tabCenter - center);
      if (d < bestDist) {
        bestDist = d;
        closest = key;
      }
    });
    const target: string | null = closest;
    if (!target) return;
    if (target === "__more__") {
      const pos = tabPositions["__more__"];
      if (pos) {
        motionAnimate(pillX, pos.x, PILL_SPRING);
        motionAnimate(pillWidth, pos.w, PILL_SPRING);
      }
      setOpenMore(true);
      return;
    }
    if (target !== activeBottomKey) {
      // navigate() will update activeBottomKey → useLayoutEffect →
      // bottomPill change → useEffect above animates the motion values
      // to the new tab.
      navigate(target);
      return;
    }
    // Same tab - snap pill back to its anchor.
    if (bottomPill) {
      motionAnimate(pillX, bottomPill.x, PILL_SPRING);
      motionAnimate(pillWidth, bottomPill.w, PILL_SPRING);
    }
  };

  /* ---------------- TIME ---------------- */

  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const newTime = new Date(
        new Date().toLocaleString("en-US", {
          timeZone: "America/New_York",
        }),
      );
      setCurrentTime(newTime);
    };

    updateTime();

    const timeout = setTimeout(() => {
      updateTime();
      const interval = setInterval(updateTime, 60000);
      return () => clearInterval(interval);
    }, 60000);

    return () => clearTimeout(timeout);
  }, []);

  if (!currentTime) return null;

  // Holiday-aware NYSE session check - returns false on full-day
  // closures (Juneteenth, etc.) and after the 1pm ET early close.
  const marketOpen = isMarketOpenAt(currentTime);

  /* ---------------- UI ---------------- */

  return (
    <>
      {/* Glossy scroll-blend behind the top nav. Page content blurs and
          fades up into the background colour through a progressive-blur
          scrim (mask fades the blur out toward the bottom edge), so the
          floating bar reads as one seamless surface with the page. Sits
          below the bar (z-40) and ignores pointer events. */}
      <div
        aria-hidden
        className="fixed top-0 inset-x-0 z-40 pointer-events-none"
        style={{
          height: "calc(env(safe-area-inset-top) + 96px)",
          background:
            "linear-gradient(to bottom, rgb(var(--bg-rgb)) 0%, rgb(var(--bg-rgb) / 0.55) 42%, rgb(var(--bg-rgb) / 0) 100%)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          maskImage:
            "linear-gradient(to bottom, black 0%, black 52%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, black 52%, transparent 100%)",
        }}
      />

      {/* TIME */}
      <div className="fixed left-1/2 top-1 text-[10px] z-50 -translate-x-1/2 hidden md:flex">
        <TimezoneDisplay showWeekDay showMonth showYear showDay />
      </div>

      <div
        className="fixed top-0 left-0 right-0 z-50 flex justify-center"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {simulated && (
          <div className="absolute top-0 w-screen h-screen border-2 border-red-500 pointer-events-none" />
        )}

        {/* -------- MOBILE NAV -------- */}


        {/* MOBILE TOP - no chrome. Just the brand mark on the left and
            the market-status pill on the right, floating over the page. */}
        <div className="md:hidden flex justify-between items-center w-full px-4 mt-3 pointer-events-none">
          <Link
            href="/dashboard"
            prefetch
            onClick={(e) => {
              e.preventDefault();
              navigate("dashboard");
            }}
            className="pointer-events-auto flex items-center gap-2"
          >
            <CuequillLogo className="h-6 w-auto" />
            <span className="text-[14px] font-semibold tracking-tight">
              Cuequill
            </span>
          </Link>

          <div
            className={`pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              marketOpen
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            <span className="relative flex w-1.5 h-1.5">
              {marketOpen && (
                <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
              )}
              <span
                className={`relative inline-flex w-1.5 h-1.5 rounded-full ${
                  marketOpen ? "bg-green-400" : "bg-red-400"
                }`}
              />
            </span>
            <span>{marketOpen ? "Open" : "Closed"}</span>
          </div>
        </div>

        {/* Top navigation progress bar - appears the instant a tab is
            tapped and stays until the next route renders, so the user
            gets immediate feedback even before the destination page
            paints. */}
        <AnimatePresence>
          {isNavPending && (
            <motion.div
              key="nav-progress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-0 h-[2px] overflow-hidden pointer-events-none"
              style={{ marginTop: "env(safe-area-inset-top)" }}
            >
              <motion.div
                className="h-full w-1/3 rounded-full bg-gradient-to-r from-teal-400/0 via-teal-400 to-emerald-400/0"
                initial={{ x: "-100%" }}
                animate={{ x: "300%" }}
                transition={{
                  duration: 0.9,
                  ease: "easeInOut",
                  repeat: Infinity,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>



        {/* -------- DESKTOP NAV -------- */}
        <div
          ref={desktopBarRef}
          className="relative hidden md:flex justify-between items-center w-full max-w-[1500px] mt-6 mx-10 py-2 pl-3 pr-2 bg-white/[0.03] backdrop-blur-md rounded-full border border-white/10 shadow-[0_2px_24px_var(--shadow-soft)]"
        >
          {/* Sliding active pill - single element spanning the whole
              desktop bar so it can move between brand, nav items, and
              Guide. */}
          {pill && activeKey && (
            <motion.span
              className="absolute rounded-full bg-white/10 border border-white/10 pointer-events-none"
              initial={false}
              animate={{ x: pill.x, y: pill.y, width: pill.w, height: pill.h }}
              transition={
                pillReady
                  ? { type: "spring", stiffness: 380, damping: 30 }
                  : { duration: 0 }
              }
              style={{ left: 0, top: 0 }}
            />
          )}

          {/* LEFT - brand */}
          <Link
            ref={(el) => {
              itemRefs.current["__brand__"] = el;
            }}
            href="/dashboard"
            prefetch
            onClick={(e) => {
              e.preventDefault();
              navigate("dashboard");
            }}
            className="relative cursor-pointer flex items-center gap-2 pl-2 pr-3 py-1 rounded-full hover:bg-white/5 transition"
            aria-label="Cuequill - dashboard"
          >
            <CuequillLogo className="relative h-7 w-auto" />
            <span className="relative text-[14px] font-semibold tracking-tight hidden lg:inline">
              Cuequill
            </span>
          </Link>

          {/* MIDDLE - pill nav with sliding active indicator */}
          <div className="relative flex items-center gap-1 text-[13.5px] font-medium">
            {navItems.map((item) => {
              const active = isActive(item.slug);
              return (
                <Link
                  key={item.name}
                  ref={(el) => {
                    itemRefs.current[item.slug] = el;
                  }}
                  href={hrefFor(item.slug)}
                  prefetch
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.slug);
                  }}
                  className={`relative px-4 py-2 rounded-full cursor-pointer transition-colors ${
                    active
                      ? "text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <span className="relative">{item.name}</span>
                </Link>
              );
            })}

            {/* Guide dropdown */}
            <div
              ref={guideDropdownRef}
              className="relative"
            >
              <button
                ref={(el) => {
                  itemRefs.current["__guide__"] = el;
                }}
                onClick={() => setDropdown((d) => !d)}
                className={`relative px-4 py-2 rounded-full cursor-pointer transition-colors flex items-center gap-1.5 ${
                  guideActive ? "text-white" : "text-white/60 hover:text-white"
                }`}
              >
                <span className="relative">Guide</span>
                <i
                  className={`relative fa-solid fa-chevron-down text-[9px] transition-transform duration-200 ${
                    dropdown ? "-rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {dropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-[calc(100%+8px)] flex flex-col bg-[var(--surface-2)]/95 backdrop-blur-md rounded-xl border border-white/10 shadow-xl min-w-[160px] z-50 p-1"
                  >
                    {guideItems.map((subItem) => {
                      const sub = isActive(subItem.slug);
                      return (
                        <Link
                          key={subItem.slug}
                          href={hrefFor(subItem.slug)}
                          prefetch
                          className={`px-3 py-2 text-left text-[13px] rounded-lg cursor-pointer transition ${
                            sub
                              ? "bg-white/8 text-white"
                              : "text-white/70 hover:bg-white/5 hover:text-white"
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(subItem.slug);
                            setDropdown(false);
                          }}
                        >
                          {subItem.label}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT - market status + user */}
          <div className="flex items-center gap-2">
            {/* Market status pill */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border ${
                marketOpen
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}
              title={marketOpen ? "US market open" : "US market closed"}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  marketOpen ? "bg-green-400 animate-pulse" : "bg-red-400"
                }`}
              />
              <span className="hidden lg:inline">
                {marketOpen ? "Open" : "Closed"}
              </span>
            </div>

            {/* User avatar */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setOpen((o) => !o)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500/80 to-emerald-600/80 border border-white/15 flex items-center justify-center text-[13px] font-semibold text-white cursor-pointer hover:brightness-110 transition"
                aria-label="Account menu"
              >
                {userInitial}
              </button>

              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-[calc(100%+8px)] flex flex-col bg-[var(--surface-2)]/95 backdrop-blur-md rounded-xl border border-white/10 shadow-xl min-w-[240px] z-50 overflow-hidden"
                  >
                    {/* Identity header */}
                    {session?.user && (
                      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500/80 to-emerald-600/80 border border-white/15 flex items-center justify-center text-[13px] font-semibold">
                          {userInitial}
                        </div>
                        <div className="min-w-0 flex-1">
                          {userFullName && (
                            <div className="text-[13px] font-medium truncate">
                              {userFullName}
                            </div>
                          )}
                          {session.user.email && (
                            <div className="text-[11px] text-white/50 truncate">
                              {session.user.email}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="p-1">
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-[13px] rounded-lg cursor-pointer text-white/80 hover:bg-white/5 hover:text-white transition"
                        onClick={() => {
                          handleRoute("pricing");
                          setOpen(false);
                        }}
                      >
                        <i className="fa-solid fa-tag w-4 text-center text-white/60" />
                        <span>Plans &amp; pricing</span>
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-[13px] rounded-lg cursor-pointer text-white/80 hover:bg-white/5 hover:text-white transition"
                        onClick={() => {
                          handleRoute("settings");
                          setOpen(false);
                        }}
                      >
                        <i className="fa-solid fa-gear w-4 text-center text-white/60" />
                        <span>Settings</span>
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-[13px] rounded-lg cursor-pointer text-white/80 hover:bg-white/5 hover:text-white transition"
                        onClick={() => signOut({ callbackUrl: "/" })}
                      >
                        <i className="fa-solid fa-right-from-bracket w-4 text-center text-white/60" />
                        <span>Logout</span>
                      </button>
                    </div>

                    <div className="p-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[12px] text-white/60">
                        Appearance
                      </span>
                      <ThemeToggle />
                    </div>

                    <div className="p-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[12px] text-white/60">
                        Simulated trading
                      </span>
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={simulated}
                          onChange={(e) => {
                            setSimulated(e.target.checked);
                            window.location.reload();
                          }}
                          className="sr-only peer"
                        />
                        <div
                          className="relative w-9 h-5 bg-white/10 rounded-full peer
                            peer-checked:after:translate-x-full
                            after:content-[''] after:absolute after:top-[2px]
                            after:start-[2px] after:bg-white after:rounded-full
                            after:h-4 after:w-4 after:transition-all
                            peer-checked:bg-teal-500"
                        />
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM-ANCHORED NAV - kept OUT of the fixed top-0 container
          above. iOS WebKit mishandles position:fixed nested inside
          another position:fixed (the inner one scrolls away with the
          page), so these render at the fragment root as their own
          fixed layers pinned to the viewport bottom. */}
        {/* Glossy scroll-blend behind the mobile tab bar - mirror of the
            top scrim so content melts down into the floating bar. */}
        <div
          aria-hidden
          className="md:hidden fixed bottom-0 inset-x-0 z-40 pointer-events-none"
          style={{
            height: "calc(env(safe-area-inset-bottom) + 100px)",
            background:
              "linear-gradient(to top, rgb(var(--bg-rgb)) 0%, rgb(var(--bg-rgb) / 0.55) 42%, rgb(var(--bg-rgb) / 0) 100%)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            maskImage:
              "linear-gradient(to top, black 0%, black 52%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to top, black 0%, black 52%, transparent 100%)",
          }}
        />
        {/* "More" sheet backdrop */}
        <div
          onClick={() => setOpenMore(false)}
          className={`md:hidden fixed inset-0 bg-black/70 z-40 transition-opacity duration-300 ${
            openMore
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        />

        {/* MOBILE BOTTOM TAB BAR - floating glass pill with a sliding
            active indicator. */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-50 flex justify-center pointer-events-none"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div
            ref={bottomBarRef}
            className="pointer-events-auto relative flex items-stretch w-[calc(100%-24px)] max-w-[440px] mx-3 mb-3 px-1.5 py-1 bg-white/[0.06] backdrop-blur-xl border border-white/15 rounded-full shadow-[0_8px_32px_var(--shadow)]"
          >
            {/* Single sliding indicator pill - measured from each tab's
                offsetLeft / width relative to the bar. Draggable: hold
                and slide it across to another tab and it snaps + jumps
                you there. */}
            {bottomPill && activeBottomKey && (
              <motion.span
                aria-hidden
                className="absolute top-1 bottom-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 shadow-[0_2px_10px_var(--shadow-soft)] cursor-grab active:cursor-grabbing"
                style={{
                  left: 0,
                  x: pillX,
                  width: pillWidth,
                  touchAction: "pan-y",
                }}
                drag="x"
                dragMomentum={false}
                dragElastic={0.06}
                dragConstraints={{
                  left:
                    Object.values(tabPositions).reduce(
                      (min, p) => Math.min(min, p.x),
                      Infinity,
                    ) || 0,
                  right:
                    Object.values(tabPositions).reduce(
                      (max, p) => Math.max(max, p.x),
                      0,
                    ) || 0,
                }}
                onDragEnd={handlePillDragEnd}
              />
            )}

            {bottomTabs.map((tab) => {
              const active = isActive(tab.slug);
              return (
                <Link
                  key={tab.slug}
                  ref={(el) => {
                    bottomTabRefs.current[tab.slug] = el;
                  }}
                  href={hrefFor(tab.slug)}
                  prefetch
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(tab.slug);
                  }}
                  className="relative flex flex-col items-center justify-center flex-1 py-2 cursor-pointer"
                >
                  <i
                    className={`relative ${tab.icon} text-[15px] transition-colors ${
                      active ? "text-teal-300" : "text-white/55"
                    }`}
                  />
                  <span
                    className={`relative text-[10px] mt-0.5 transition-colors ${
                      active ? "text-teal-300" : "text-white/55"
                    }`}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            })}

            <button
              type="button"
              ref={(el) => {
                bottomTabRefs.current["__more__"] = el;
              }}
              onClick={() => setOpenMore((v) => !v)}
              className="relative flex flex-col items-center justify-center flex-1 py-2 cursor-pointer"
            >
              <i
                className={`relative fa-solid fa-ellipsis text-[15px] transition-colors ${
                  activeBottomKey === "__more__"
                    ? "text-teal-300"
                    : "text-white/55"
                }`}
              />
              <span
                className={`relative text-[10px] mt-0.5 transition-colors ${
                  activeBottomKey === "__more__"
                    ? "text-teal-300"
                    : "text-white/55"
                }`}
              >
                More
              </span>
            </button>
          </div>
        </nav>

        {/* MOBILE "More" BOTTOM SHEET */}
        <AnimatePresence>
          {openMore && (
            <motion.div
              key="more-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[var(--surface-2)] border-t border-white/10 rounded-t-3xl shadow-[0_-12px_40px_var(--shadow)]"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              {/* Grab handle */}
              <div className="flex justify-center pt-2">
                <span className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              <div className="px-4 pt-3 pb-4 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium">
                  More
                </span>
                <button
                  aria-label="Close"
                  onClick={() => setOpenMore(false)}
                  className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition"
                >
                  <i className="fa-solid fa-xmark text-[13px]" />
                </button>
              </div>

              <div className="px-3 pb-3 grid grid-cols-1 gap-1">
                {moreItems.map((item) => {
                  const active = isActive(item.slug);
                  return (
                    <Link
                      key={item.slug}
                      href={hrefFor(item.slug)}
                      prefetch
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavClick(item.slug);
                      }}
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition ${
                        active
                          ? "bg-teal-500/10 text-white"
                          : "text-white/80 hover:bg-white/5"
                      }`}
                    >
                      <i
                        className={`${item.icon} w-5 text-center text-[15px] ${active ? "text-teal-300" : "text-white/55"}`}
                      />
                      <span className="text-[14px] font-medium">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="mx-4 mb-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[13px] text-white/85 font-medium">
                    Appearance
                  </span>
                  <span className="text-[11px] text-white/45">
                    Light or dark theme
                  </span>
                </div>
                <ThemeToggle />
              </div>

              <div className="mx-4 mb-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[13px] text-white/85 font-medium">
                    Simulated trading
                  </span>
                  <span className="text-[11px] text-white/45">
                    Use paper-trade data
                  </span>
                </div>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulated}
                    onChange={(e) => {
                      setSimulated(e.target.checked);
                      window.location.reload();
                    }}
                    className="sr-only peer"
                  />
                  <div
                    className="relative w-10 h-5 bg-white/10 rounded-full peer
                      peer-checked:after:translate-x-full
                      after:content-[''] after:absolute after:top-[2px]
                      after:start-[2px] after:bg-white after:rounded-full
                      after:h-4 after:w-4 after:transition-all
                      peer-checked:bg-teal-500"
                  />
                </label>
              </div>

              <div className="px-3 pb-4">
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-300 border border-red-500/25 hover:bg-red-500/20 transition text-[13px] font-medium"
                >
                  <i className="fa-solid fa-right-from-bracket text-[12px]" />
                  Logout
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </>
  );
}
