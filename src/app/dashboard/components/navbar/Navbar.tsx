"use client";

import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export default function Navbar() {
  const [open, setOpen] = useState<boolean>(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [simulated] = useLocalStorage<boolean>("simulated", false);

  const handleRoute = (path: string) => {
    router.push(path);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <div className="fixed top-0 left-0 right-0 flex justify-center z-50">
      {simulated && (
        <div className="border absolute top-[82px] backdrop-blur-xs w-[80%] max-w-[1300px] border-t-0 text-center text-xs p-[3px] border-red-500 bg-red-500/20">
          Simulated trading
        </div>
      )}
      <div
        className="flex justify-between items-center w-full max-w-[1500px] 
        mt-6 m-10 p-4 px-5 bg-white/3 backdrop-blur-xs rounded-full border border-white/10"
      >
        {/* Left Side */}
        <div>
          <i
            className="fa-solid fa-house cursor-pointer transition duration-100 hover:text-teal-500"
            onClick={() => handleRoute("/dashboard")}
          ></i>
        </div>
        {/* Middle */}
        <div className="flex gap-10">
          <div
            className="cursor-pointer transition duration-100 hover:text-teal-500"
            onClick={() => handleRoute("/affirmations")}
          >
            Affirmations
          </div>
          <div
            className="cursor-pointer transition duration-100 hover:text-teal-500"
            onClick={() => handleRoute("/strategies")}
          >
            Strategies
          </div>
          <div
            className="cursor-pointer transition duration-100 hover:text-teal-500"
            onClick={() => handleRoute("/rules")}
          >
            Rules
          </div>
          <div
            className="cursor-pointer transition duration-100 hover:text-teal-500"
            onClick={() => handleRoute("/stocks")}
          >
            Stocks/ETFs
          </div>
        </div>
        {/* Right Side */}
        <div ref={dropdownRef}>
          <div>
            <i
              className="fa-solid fa-user cursor-pointer transition duration-100 hover:text-teal-500"
              onClick={() => setOpen(!open)}
            ></i>
          </div>
          <div
            className={`absolute bottom-[-35px] right-3 bg-white text-black p-3 rounded-sm ${
              open ? "block" : "hidden"
            }`}
          >
            <div
              className="cursor-pointer transition duration-50 hover:text-teal-500"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Logout
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
