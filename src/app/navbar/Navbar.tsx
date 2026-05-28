"use client";

import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
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
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const dropdownRef = useRef<HTMLDivElement>(null);
  const guideDropdownRef = useRef<HTMLDivElement>(null);

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

  const handleRoute = (slug: string) => {
    if (slug) router.push(`/${slug}`);
  };

  const handleNavClick = (slug: string) => {
    handleRoute(slug);
    setOpenSidebar(false);
    setOpenGuide(false);
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
    { icon: "fa-solid fa-chart-line", label: "Charts", slug: "charts" },
    { icon: "fa-solid fa-newspaper", label: "News", slug: "news" },
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
    { name: "Trades", slug: `trades/${userId}`, side: "MIDDLE" },
    { name: "Calendar", slug: "calendar", side: "MIDDLE" },
    { name: "Charts", slug: "charts", side: "MIDDLE" },
    { name: "News", slug: "news", side: "MIDDLE" },
    { name: "Affirmations", slug: "affirmations", side: "MIDDLE" },
    {
      name: "Guide",
      side: "MIDDLE",
      isDropdown: true,
      dropdown: guideItems,
    },
    { name: "fa-solid fa-user", side: "RIGHT" },
  ];

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

  /* ---------------- COMPONENTS ---------------- */

  const SidebarItem = ({
    icon,
    label,
    slug,
  }: {
    icon: string;
    label: string;
    slug: string;
  }) => (
    <div
      onClick={() => handleNavClick(slug)}
      className="flex items-center gap-5 p-3 rounded-lg cursor-pointer font-bold text-base"
    >
      <i className={icon}></i>
      <div>{label}</div>
    </div>
  );

  /* ---------------- UI ---------------- */

  return (
    <>
      {/* TIME */}
      <div className="fixed left-1/2 top-1 text-[10px] z-50 -translate-x-1/2 hidden md:flex">
        <TimezoneDisplay showWeekDay showMonth showYear showDay />
      </div>

      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center">
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
          className={`md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
            openSidebar
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        />

        {/* Sidebar */}
        <div
          className={`md:hidden fixed top-0 left-0 h-full w-[250px] bg-[#111113] border-r border-white/10 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
            openSidebar ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
            <CuequillLogo className="h-7 w-auto" />
            <button
              onClick={() => setOpenSidebar(false)}
              className="text-white hover:text-white transition duration-100 p-1 px-3 rounded-md"
            >
              <i className="fa-solid fa-xmark text-base" />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col justify-between h-full px-5 py-5 text-sm overflow-y-auto">
            <div className="flex flex-col gap-3">
              {sidebarItems.map((item, i) => (
                <SidebarItem key={i} {...item} />
              ))}

              {/* Guide */}
              <div>
                <div
                  onClick={() => setOpenGuide((p) => !p)}
                  className="flex justify-between p-3 rounded-lg cursor-pointer items-center font-bold text-base"
                >
                  <div className="flex items-center gap-5">
                    <i className="fa-solid fa-book"></i>
                    <span>Guide</span>
                  </div>
                  <span
                    className={`transition ${openGuide ? "rotate-180" : ""}`}
                  >
                    <i className="fa-solid fa-chevron-down"></i>
                  </span>
                </div>

                <AnimatePresence>
                  {openGuide && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden ml-4 mt-2 gap-2 flex flex-col"
                    >
                      {guideItems.map((item, i) => (
                        <div
                          key={i}
                          onClick={() => handleNavClick(item.slug)}
                          className="cursor-pointer py-1 border-b border-[#323232]"
                        >
                          {item.label}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-2">
              <div>
                <label className="inline-flex items-center cursor-pointer flex gap-2">
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
                    className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                            peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 
                            peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full 
                            peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                            after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                            after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 
                            dark:peer-checked:bg-blue-600"
                  />
                  <span className="text-xs md:text-sm">Simulated trading</span>
                </label>
              </div>
              <div className="-mx-5 px-5 py-4 border-t border-white/10">
                <div
                  className="flex items-center gap-3 p-2 px-0 cursor-pointer hover:bg-black/10 transition duration-100"
                  onClick={() => handleNavClick("settings")}
                >
                  <i className="fa-solid fa-gear"></i>
                  <span>Settings</span>
                </div>
                <div
                  className="flex items-center gap-3 p-2 px-0 cursor-pointer hover:bg-black/10 transition duration-100"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <i className="fa-solid fa-right-from-bracket"></i>
                  <span>Logout</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TOP BAR */}
        <div className="md:hidden flex justify-between w-full p-5 bg-[#0E0E10] border-b border-[#232323] items-center">
          <div className="w-full">
            <div
              onClick={() => setOpenSidebar(true)}
              className="p-2 w-9 h-9 flex items-center rounded border-[#323232] cursor-pointer"
            >
              <i className="fa-solid fa-bars text-xl"></i>{" "}
            </div>
          </div>

          <div className="text-xs text-center w-full">
            Market:{" "}
            <span className={marketOpen ? "text-green-500" : "text-red-500"}>
              {marketOpen ? "Open" : "Closed"}
            </span>
          </div>

          <div className="flex flex-col items-end text-[10px] w-full">
            <TimezoneDisplay
              showHours={false}
              showMinutes={false}
              showSeconds={false}
              showDay
              showMonth
              showWeekDay
              showYear
              monthFormat="2-digit"
              yearFormat="2-digit"
              weekDayFormat="short"
            />
            <TimezoneDisplay />
          </div>
        </div>

        {/* -------- DESKTOP NAV -------- */}
        <div className="hidden md:flex justify-between items-center w-full max-w-[1500px] mt-6 mx-10 p-4 px-5 bg-white/3 backdrop-blur-xs rounded-full border border-white/10">
          {/* LEFT — brand */}
          <div
            onClick={() => handleRoute("dashboard")}
            className="cursor-pointer"
            aria-label="Cuequill — dashboard"
          >
            <CuequillLogo className="h-8 w-auto" />
          </div>

          {/* MIDDLE */}
          <div className="flex gap-10">
            {navItems
              .filter((i) => i.side === "MIDDLE")
              .map((item, i) => (
                <div
                  ref={item.isDropdown ? guideDropdownRef : null}
                  key={i}
                  className="relative cursor-pointer"
                  onClick={() => {
                    if (item.slug) handleRoute(item.slug);
                    if (item.isDropdown) setDropdown(!dropdown);
                  }}
                >
                  {item.name}
                  {item.isDropdown && (
                    <i
                      className={`fa-solid fa-chevron-down ml-1 transition duration-200 ${
                        dropdown && "-rotate-180"
                      }`}
                    ></i>
                  )}

                  <AnimatePresence>
                    {item.dropdown && dropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -2 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 top-8 flex flex-col bg-[#1A191D] rounded-lg 
                        border border-[#212121] shadow-md min-w-[140px] z-50"
                      >
                        {item.dropdown.map((subItem, j) => (
                          <div
                            key={j}
                            className="p-2 px-4 cursor-pointer hover:bg-black/10 transition duration-100"
                            onClick={() => handleRoute(subItem.slug)}
                          >
                            {subItem.label}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
          </div>

          {/* RIGHT */}
          <div ref={dropdownRef} className="relative">
            {navItems
              .filter((item) => item.side === "RIGHT")
              .map((item, i) => (
                <i
                  key={i}
                  className={`${item.name} cursor-pointer transition duration-100 hover:text-teal-500`}
                  onClick={() => setOpen((o) => !o)}
                />
              ))}

            {/* MODAL */}
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="absolute -left-[220px] top-8 flex flex-col bg-[#1A191D] rounded-lg 
                            border border-[#212121] shadow-md min-w-[240px] z-50 gap-2 py-3"
                >
                  <div>
                    <div
                      className="flex items-center gap-3 p-2 px-4 cursor-pointer hover:bg-black/10 transition duration-100"
                      onClick={() => {
                        handleRoute("settings");
                        setOpen(false);
                      }}
                    >
                      <i className="fa-solid fa-gear"></i>
                      <div>Settings</div>
                    </div>
                    <div
                      className="flex items-center gap-3 p-2 px-4 cursor-pointer hover:bg-black/10 transition duration-100"
                      onClick={() => signOut({ callbackUrl: "/" })}
                    >
                      <i className="fa-solid fa-right-from-bracket"></i>
                      Logout
                    </div>
                  </div>
                  <hr className="mx-3 py-1 text-white/10" />
                  <div className="px-3">
                    <label className="inline-flex items-center cursor-pointer flex gap-2">
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
                        className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                            peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 
                            peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full 
                            peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                            after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                            after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 
                            dark:peer-checked:bg-blue-600"
                      />
                      <span className="text-xs md:text-sm">
                        Simulated trading
                      </span>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
