"use client";

import { useRouter } from "next/navigation";
import React from "react";

export default function Navbar() {
  const router = useRouter();

  const handleRoute = (path: string) => {
    router.push(path);
  };

  return (
    <div className="fixed top-0 left-0 right-0 flex justify-center z-50">
      <div
        className="flex justify-between items-center w-full max-w-[1500px] 
        mt-6 m-10 p-4 px-5 bg-white/3 backdrop-blur-sm rounded-full border border-white/10"
      >
        {/* Left Side */}
        <div className="">
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
        <div>
          <i className="fa-solid fa-user cursor-pointer transition duration-100 hover:text-teal-500"></i>
        </div>
      </div>
    </div>
  );
}
