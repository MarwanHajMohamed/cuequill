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
import { motion, AnimatePresence } from "framer-motion";
import TimezoneDisplay from "@/helpers/TimezoneDisplay";

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
      fill="#FAFAFA"
    />
    <path
      d="M31 47V75"
      stroke="#0F172A"
      strokeWidth="1.32"
      strokeLinecap="round"
    />
    <path
      d="M31 54.56C31.8616 54.56 32.56 53.8616 32.56 53C32.56 52.1384 31.8616 51.44 31 51.44C30.1384 51.44 29.44 52.1384 29.44 53C29.44 53.8616 30.1384 54.56 31 54.56Z"
      fill="#0F172A"
    />
  </svg>
);

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  // Optimistic path: updates immediately on click so the active-route
  // pill slides before the next page actually mounts.
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [, startTransition] = useTransition();
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
  // route change inside a fixed parent — making the pill fly up from
  // below the viewport. Direct measurement avoids that entirely.
  // The pill spans the whole desktop bar so it can slide between the
  // brand on the left and the nav items in the middle.
  const desktopBarRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const [pill, setPill] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [pillReady, setPillReady] = useState(false);

  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState(false);
  const [openSidebar, setOpenSidebar] = useState(false);
  const [openGuide, setOpenGuide] = useState(false);
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
    setOpenSidebar(false);
    setOpenGuide(false);
  };

  // Active-route detection. Slugs may include a userId segment (e.g.
  // `trades/abc123`); compare against the first path segment.
  const isActive = (slug: string) => {
    const base = slug.split("/")[0];
    if (!base) return activePath === "/" || activePath === "/dashboard";
    return activePath === `/${base}` || activePath.startsWith(`/${base}/`);
  };

  /* ---------------- DATA ---------------- */

  const sidebarItems = [
    { icon: "fa-solid fa-house", label: "Dashboard", slug: "/" },
    {
      icon: "fa-solid fa-chart-column",
      label: "Trades",
      slug: `trades/${userId}`,
    },
    { icon: "fa-solid fa-calendar-days", label: "Calendar", slug: "calendar" },
    { icon: "fa-solid fa-bullseye", label: "Goals", slug: "goals" },
    {
      icon: "fa-regular fa-circle-check",
      label: "Affirmations",
      slug: "affirmations",
    },
  ];

  const guideItems = [
    { label: "Strategies", slug: "strategies" },
    { label: "Stocks/ETFs", slug: "stocks" },
    { label: "Rules", slug: "rules" },
  ];

  const navItems = [
    { name: "Trades", slug: `trades/${userId}` },
    { name: "Calendar", slug: "calendar" },
    { name: "Goals", slug: "goals" },
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
    if (openSidebar) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [openSidebar]);

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

  const day = currentTime.getDay();
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();

  const marketOpen =
    day >= 1 &&
    day <= 5 &&
    (hours > 9 || (hours === 9 && minutes >= 30)) &&
    hours < 16;

  /* ---------------- UI ---------------- */

  return (
    <>
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

        {/* Backdrop */}
        <div
          onClick={() => {
            setOpenSidebar(false);
            setOpenGuide(false);
          }}
          className={`md:hidden fixed inset-0 bg-black/70 z-40 transition-opacity duration-300 ${
            openSidebar
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        />

        {/* Sidebar */}
        <div
          className={`md:hidden fixed top-0 left-0 h-full w-[270px] bg-gradient-to-b from-[#141418] to-[#0E0E10] border-r border-white/10 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
            openSidebar ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <CuequillLogo className="h-7 w-auto" />
              <span className="text-[15px] font-semibold tracking-tight">
                Cuequill
              </span>
            </div>
            <button
              onClick={() => setOpenSidebar(false)}
              className="text-white/70 hover:text-white transition duration-100 w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/5"
            >
              <i className="fa-solid fa-xmark text-base" />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col justify-between h-full px-3 py-5 text-sm overflow-y-auto">
            <div className="flex flex-col gap-1">
              {sidebarItems.map((item, i) => {
                const active = isActive(item.slug);
                return (
                  <Link
                    key={i}
                    href={hrefFor(item.slug)}
                    prefetch
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(item.slug);
                    }}
                    className={`relative flex items-center gap-4 px-3 py-2.5 rounded-lg cursor-pointer font-medium text-[14px] transition ${
                      active
                        ? "bg-white/8 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-teal-400" />
                    )}
                    <i
                      className={`${item.icon} w-4 text-center ${active ? "text-teal-400" : ""}`}
                    ></i>
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Guide */}
              <div>
                <div
                  onClick={() => setOpenGuide((p) => !p)}
                  className={`flex justify-between px-3 py-2.5 rounded-lg cursor-pointer items-center font-medium text-[14px] transition ${
                    guideActive
                      ? "bg-white/8 text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <i
                      className={`fa-solid fa-book w-4 text-center ${guideActive ? "text-teal-400" : ""}`}
                    ></i>
                    <span>Guide</span>
                  </div>
                  <i
                    className={`fa-solid fa-chevron-down text-[10px] transition ${openGuide ? "rotate-180" : ""}`}
                  />
                </div>

                <AnimatePresence>
                  {openGuide && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden ml-9 mt-1 flex flex-col"
                    >
                      {guideItems.map((item, i) => {
                        const sub = isActive(item.slug);
                        return (
                          <Link
                            key={i}
                            href={hrefFor(item.slug)}
                            prefetch
                            onClick={(e) => {
                              e.preventDefault();
                              handleNavClick(item.slug);
                            }}
                            className={`cursor-pointer py-1.5 text-[13px] transition ${
                              sub
                                ? "text-teal-400"
                                : "text-white/60 hover:text-white"
                            }`}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3">
              <div className="px-3 py-2 rounded-lg bg-white/5 flex items-center justify-between">
                <span className="text-[12px] text-white/60">Simulated</span>
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
              <div className="-mx-3 px-3 pt-3 border-t border-white/10 flex flex-col gap-1">
                <div
                  className="flex items-center gap-4 px-3 py-2 rounded-lg cursor-pointer text-white/70 hover:bg-white/5 hover:text-white transition"
                  onClick={() => handleNavClick("settings")}
                >
                  <i className="fa-solid fa-gear w-4 text-center" />
                  <span className="text-[14px]">Settings</span>
                </div>
                <div
                  className="flex items-center gap-4 px-3 py-2 rounded-lg cursor-pointer text-white/70 hover:bg-white/5 hover:text-white transition"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <i className="fa-solid fa-right-from-bracket w-4 text-center" />
                  <span className="text-[14px]">Logout</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE TOP BAR — glass pill, matches desktop nav language.
            Backdrop-blur omitted on mobile: it forces GPU composite of
            everything beneath the bar on every frame, which is the main
            cause of laggy navigation on phones. The solid #131318 reads
            close enough at this opacity. */}
        <div className="md:hidden flex justify-between items-center w-full mx-3 mt-3 px-3 py-2 bg-[#13131a]/95 rounded-full border border-white/10 shadow-[0_2px_24px_rgba(0,0,0,0.25)]">
          <button
            onClick={() => setOpenSidebar(true)}
            aria-label="Open menu"
            className="w-9 h-9 flex items-center justify-center rounded-full text-white/80 hover:bg-white/5 hover:text-white transition cursor-pointer"
          >
            <i className="fa-solid fa-bars text-base" />
          </button>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
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

          <div className="flex flex-col items-end text-[10px] leading-tight text-white/60">
            <TimezoneDisplay
              showHours={false}
              showMinutes={false}
              showSeconds={false}
              showDay
              showMonth
              showWeekDay
              weekDayFormat="short"
            />
            <TimezoneDisplay />
          </div>
        </div>

        {/* -------- DESKTOP NAV -------- */}
        <div
          ref={desktopBarRef}
          className="relative hidden md:flex justify-between items-center w-full max-w-[1500px] mt-6 mx-10 py-2 pl-3 pr-2 bg-white/[0.03] backdrop-blur-md rounded-full border border-white/10 shadow-[0_2px_24px_rgba(0,0,0,0.25)]"
        >
          {/* Sliding active pill — single element spanning the whole
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

          {/* LEFT — brand */}
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
            aria-label="Cuequill — dashboard"
          >
            <CuequillLogo className="relative h-7 w-auto" />
            <span className="relative text-[14px] font-semibold tracking-tight hidden lg:inline">
              Cuequill
            </span>
          </Link>

          {/* MIDDLE — pill nav with sliding active indicator */}
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
                    className="absolute left-0 top-[calc(100%+8px)] flex flex-col bg-[#15141A]/95 backdrop-blur-md rounded-xl border border-white/10 shadow-xl min-w-[160px] z-50 p-1"
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

          {/* RIGHT — market status + user */}
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
                    className="absolute right-0 top-[calc(100%+8px)] flex flex-col bg-[#15141A]/95 backdrop-blur-md rounded-xl border border-white/10 shadow-xl min-w-[240px] z-50 overflow-hidden"
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
    </>
  );
}
