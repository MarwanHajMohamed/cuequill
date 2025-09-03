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
        className="w-[200px] h-[100px] bg-[#1c1c22] flex items-center justify-center 
        rounded-lg border-1 border-white/10 cursor-pointer transition duration-100 hover:border-white/60"
        onClick={() => handleRoute(path)}
      >
        <div className="text-center">{title}</div>
      </div>
    );
  };

  return (
    <div className="p-10 flex flex-col items-center h-[100vh] justify-center">
      <div className="grid grid-cols-3 gap-5">
        {strategies.map((strategy, index) => {
          return (
            <Card
              title={strategy.title}
              path={`/strategies/${strategy.slug}`}
              key={index}
            />
          );
        })}
      </div>
    </div>
  );
}

export default withAuth(page);
