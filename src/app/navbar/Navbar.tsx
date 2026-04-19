"use client";

import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { motion, AnimatePresence } from "framer-motion";
import TimezoneDisplay from "@/helpers/TimezoneDisplay";

export default function Navbar() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const dropdownRef = useRef<HTMLDivElement>(null);
  const guideDropdownRef = useRef<HTMLDivElement>(null);

  const [simulated] = useLocalStorage<boolean>("simulated", false);

  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState(false);
  const [openSidebar, setOpenSidebar] = useState(false);
  const [openGuide, setOpenGuide] = useState(false);

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
    { name: "fa-solid fa-house", slug: "dashboard", side: "LEFT" },
    { name: "Trades", slug: `trades/${userId}`, side: "MIDDLE" },
    { name: "Calendar", slug: "calendar", side: "MIDDLE" },
    { name: "Goals", slug: "goals", side: "MIDDLE" },
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

  /* ---------------- TIME ---------------- */

  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const newTime = new Date(
        new Date().toLocaleString("en-US", {
          timeZone: "America/New_York",
        })
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

  const SidebarItem = ({ icon, label, slug }: any) => (
    <div
      onClick={() => handleNavClick(slug)}
      className="flex items-center gap-2 border p-3 rounded-lg border-[#323232] cursor-pointer"
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
        <AnimatePresence>
          {openSidebar && (
            <motion.div
              className="md:hidden fixed inset-0 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Overlay */}
              <div
                className="absolute inset-0 bg-black/70"
                onClick={() => {
                  setOpenSidebar(false);
                  setOpenGuide(false);
                }}
              />

              {/* Sidebar */}
              <motion.div
                initial={{ x: -250 }}
                animate={{ x: 0 }}
                exit={{ x: -250 }}
                transition={{ duration: 0.3 }}
                className="absolute left-0 top-0 h-full w-[250px] bg-[#0E0E10] p-5 text-sm"
              >
                {/* Close */}
                <div
                  onClick={() => setOpenSidebar(false)}
                  className="absolute top-5 right-5 border p-2 w-8 h-8 flex items-center justify-center flex items-center rounded border-[#323232] cursor-pointer"
                >
                  ✕
                </div>

                {/* Links */}
                <div className="flex flex-col gap-3 mt-10">
                  {sidebarItems.map((item, i) => (
                    <SidebarItem key={i} {...item} />
                  ))}

                  {/* Guide */}
                  <div>
                    <div
                      onClick={() => setOpenGuide((p) => !p)}
                      className="flex justify-between border p-3 rounded-lg border-[#323232] cursor-pointer"
                    >
                      Guide
                      <span
                        className={`transition ${
                          openGuide ? "rotate-180" : ""
                        }`}
                      >
                        ⌄
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
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TOP BAR */}
        <div className="md:hidden flex justify-between w-full p-5 bg-[#0E0E10] border-b border-[#232323] items-center">
          <div
            onClick={() => setOpenSidebar(true)}
            className="border p-2 flex items-center rounded border-[#323232] cursor-pointer"
          >
            <i className="fa-solid fa-bars text-xl"></i>{" "}
          </div>

          <div className="text-xs">
            Market:{" "}
            <span className={marketOpen ? "text-green-500" : "text-red-500"}>
              {marketOpen ? "Open" : "Closed"}
            </span>
          </div>

          <div className="flex flex-col items-end text-[10px]">
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
          {/* LEFT */}
          {navItems
            .filter((i) => i.side === "LEFT")
            .map((item, i) => (
              <i
                key={i}
                className={`${item.name} cursor-pointer`}
                onClick={() => handleRoute(item.slug!)}
              />
            ))}

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
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 2 }}
                        transition={{ duration: 0.3 }}
                        className="absolute left-0 top-8 flex flex-col bg-white text-black rounded-md 
                  border border-black/10 shadow-md min-w-[140px] z-50"
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
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 2 }}
                  transition={{ duration: 0.3 }}
                  className="absolute -left-[120px] top-8 flex flex-col bg-white text-black rounded-md 
                            border border-black/10 shadow-md min-w-[140px] z-50"
                >
                  <div
                    className="flex items-center gap-1 p-2 px-4 cursor-pointer hover:bg-black/10 transition duration-100"
                    onClick={() => {
                      handleRoute("settings");
                      setOpen(false);
                    }}
                  >
                    <i className="fa-solid fa-gear"></i>
                    <div>Settings</div>
                  </div>
                  <div
                    className="flex items-center gap-1 p-2 px-4 cursor-pointer hover:bg-black/10 transition duration-100"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <i className="fa-solid fa-right-from-bracket"></i>
                    Logout
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
