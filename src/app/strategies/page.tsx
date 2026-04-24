"use client";

import React from "react";
import { strategies } from "../../../data/strategies";
import { useRouter } from "next/navigation";
import { withAuth } from "@/lib/withAuth";

function page() {
  const Card = ({ title, path }: { title: string; path: string }) => {
    const router = useRouter();

    const handleRoute = (path: string) => {
      router.push(path);
    };
    return (
      <div
        className="w-[100%] h-[50px] bg-[#16151C] flex items-center px-3 justify-between
        rounded-lg border-1 border-white/10 cursor-pointer transition duration-100 hover:border-white/60"
        onClick={() => handleRoute(path)}
      >
        <div className="text-center text-sm md:text-base">{title}</div>
        <i className="fa-solid fa-chevron-right"></i>
      </div>
    );
  };

  return (
    <div className="md:p-10 p-5 flex flex-col items-center h-[100vh] justify-center mb-10 md:mb-0">
      <div className="md:grid md:grid-cols-2 gap-5 w-full max-w-[900px] flex flex-col mt-30 md:mt-0">
        <div className="flex flex-col gap-2 md:gap-4">
          <div className="text-green-500 md:text-xl text-base md:text-center font-bold">
            CALL
          </div>
          {strategies
            .filter((s) => s.options === "CALL")
            .map((s, index) => {
              return (
                <Card
                  title={s.title}
                  path={`/strategies/${s.slug}`}
                  key={index}
                />
              );
            })}
        </div>
        <div className="flex flex-col gap-2 md:gap-4">
          <div className="text-red-500 md:text-xl text-base md:text-center font-bold">
            PUT
          </div>
          {strategies
            .filter((s) => s.options === "PUT")
            .map((s, index) => {
              return (
                <Card
                  title={s.title}
                  path={`/strategies/${s.slug}`}
                  key={index}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}

export default withAuth(page);
