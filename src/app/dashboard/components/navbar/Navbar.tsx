"use client";

import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type NavItemsType = {
  name: string;
  slug: string;
  side: "LEFT" | "MIDDLE" | "RIGHT";
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [simulated] = useLocalStorage<boolean>("simulated", false);

  const navItems: NavItemsType[] = [
    { name: "fa-solid fa-house", slug: "dashboard", side: "LEFT" },
    { name: "Affirmations", slug: "affirmations", side: "MIDDLE" },
    { name: "Strategies", slug: "strategies", side: "MIDDLE" },
    { name: "Rules", slug: "rules", side: "MIDDLE" },
    { name: "Stocks/ETFs", slug: "stocks", side: "MIDDLE" },
    { name: "Community", slug: "community", side: "MIDDLE" },
    { name: "fa-solid fa-user", slug: "", side: "RIGHT" },
  ];

  const handleRoute = (slug: string) => {
    if (slug) router.push(`/${slug}`);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 flex justify-center z-50">
      {simulated && (
        <div className="border absolute top-[82px] backdrop-blur-xs w-[80%] max-w-[1300px] border-t-0 text-center text-xs p-[3px] border-red-500 bg-red-500/20">
          Simulated trading
        </div>
      )}

      <div className="flex justify-between items-center w-full max-w-[1500px] mt-6 m-10 p-4 px-5 bg-white/3 backdrop-blur-xs rounded-full border border-white/10">
        {/* Left */}
        {navItems
          .filter((item) => item.side === "LEFT")
          .map((item, i) => (
            <i
              key={i}
              className={`${item.name} cursor-pointer transition duration-100 hover:text-teal-500`}
              onClick={() => handleRoute(item.slug)}
            />
          ))}

        {/* Middle */}
        <div className="flex gap-10">
          {navItems
            .filter((item) => item.side === "MIDDLE")
            .map((item, i) => (
              <div
                key={i}
                className="cursor-pointer transition duration-100 hover:text-teal-500"
                onClick={() => handleRoute(item.slug)}
              >
                {item.name}
              </div>
            ))}
        </div>

        {/* Right */}
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

          {open && (
            <div className="absolute bottom-[-100px] flex flex-col right-[-5px] bg-white text-black rounded-sm">
              <div
                className="flex items-center gap-2 cursor-pointer hover:bg-black/10 transition duration-100 border-b border-black/20 hover:border-black/20 p-3"
                onClick={() => {
                  handleRoute("settings");
                  setOpen(false);
                }}
              >
                <i className="fa-solid fa-gear"></i>
                <div>Settings</div>
              </div>
              <div
                className="flex items-center gap-2 cursor-pointer hover:bg-black/10 transition duration-100 border-b border-black/20 hover:border-black/20 p-3"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
