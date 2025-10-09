"use client";

import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type NavItemsType = {
  name: string;
  slug?: string;
  side: "LEFT" | "MIDDLE" | "RIGHT";
  dropdown?: { name: string; slug: string }[];
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const guideDropdownRef = useRef<HTMLDivElement>(null);

  const [simulated] = useLocalStorage<boolean>("simulated", false);
  const [dropdown, setDropdown] = useState<null | boolean>(false);

  const { data: session } = useSession();
  const userId = session?.user?.id;

  const navItems: NavItemsType[] = [
    { name: "fa-solid fa-house", slug: "dashboard", side: "LEFT" },
    { name: "Trades", slug: "trades/" + userId, side: "MIDDLE" },
    { name: "Calendar", slug: "calendar", side: "MIDDLE" },
    { name: "Affirmations", slug: "affirmations", side: "MIDDLE" },
    {
      name: "Guide",
      side: "MIDDLE",
      dropdown: [
        { name: "Strategies", slug: "strategies" },
        { name: "Rules", slug: "rules" },
        { name: "Stocks/ETFs", slug: "stocks" },
      ],
    },
    // { name: "Community", slug: "community", side: "MIDDLE" },
    { name: "fa-solid fa-user", slug: "", side: "RIGHT" },
  ];

  const handleRoute = (slug: string) => {
    if (slug) router.push(`/${slug}`);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        guideDropdownRef.current &&
        !guideDropdownRef.current.contains(target)
      ) {
        setOpen(false);
        setDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 flex justify-center z-50">
      {simulated && (
        <div className="border-3 absolute top-0 w-screen h-screen text-center text-xs border-red-500 pointer-events-none" />
      )}

      <div className="flex justify-between items-center w-full max-w-[1500px] mt-6 mx-10 p-4 px-5 bg-white/3 backdrop-blur-xs rounded-full border border-white/10">
        {/* Left */}
        {navItems
          .filter((item) => item.side === "LEFT")
          .map((item, i) => (
            <i
              key={i}
              className={`${item.name} cursor-pointer transition duration-100 hover:text-teal-500`}
              onClick={() => item.slug && handleRoute(item.slug)}
            />
          ))}

        {/* Middle */}
        <div className="flex gap-10">
          {navItems
            .filter((item) => item.side === "MIDDLE")
            .map((item, i) => (
              <div
                key={i}
                ref={item.dropdown ? guideDropdownRef : null}
                className={`relative cursor-pointer transition duration-100 hover:text-teal-500`}
                onClick={() => {
                  item.slug && handleRoute(item.slug);
                  item.dropdown && setDropdown(!dropdown);
                }}
              >
                <div>
                  {item.name}
                  {item.dropdown && (
                    <i className="fa-solid fa-chevron-down ml-1"></i>
                  )}
                </div>
                {item.dropdown && dropdown && (
                  <div
                    className="absolute left-0 top-8 flex flex-col bg-white text-black rounded-md 
                  border border-black/10 shadow-md min-w-[140px] z-50"
                  >
                    {item.dropdown.map((subItem, j) => (
                      <div
                        key={j}
                        className="p-2 px-4 cursor-pointer hover:bg-black/10 transition duration-100"
                        onClick={() => handleRoute(subItem.slug)}
                      >
                        {subItem.name}
                      </div>
                    ))}
                  </div>
                )}
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
            <div
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
