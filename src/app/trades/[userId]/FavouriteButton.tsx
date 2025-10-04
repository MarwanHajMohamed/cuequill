"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { QueryClient } from "@tanstack/react-query";
import { handleFavourite } from "@/handlers/tradeHandlers";

type FavouriteButtonProps = {
  tradeId: string;
  userId: string;
  isFavourite: boolean;
  queryClient: QueryClient;
};

export function FavouriteButton({
  tradeId,
  userId,
  isFavourite,
  queryClient,
}: FavouriteButtonProps) {
  const [count, setCount] = useState(0);
  const [showParticles, setShowParticles] = useState(false);

  const handleClick = async () => {
    if (!isFavourite) {
      setCount((c) => c + 1);
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 600);
    }

    await handleFavourite(tradeId, userId, !isFavourite, queryClient);
  };

  return (
    <div className="relative inline-flex">
      <i
        className={`fa-${isFavourite ? "solid" : "regular"} fa-star 
                    ${
                      isFavourite
                        ? "text-yellow-300 hover:text-yellow-500"
                        : "text-white/30 hover:text-white/100"
                    } 
                    cursor-pointer text-xl transition duration-100`}
        onClick={handleClick}
      ></i>

      {showParticles &&
        [...Array(10)].map((_, i) => (
          <motion.span
            key={`${count}-${i}`}
            className="z-10 absolute top-1/2 left-1/2 w-1 h-1 rounded-full bg-yellow-400"
            initial={{ opacity: 1, x: "-50%", y: "-50%", scale: 1 }}
            animate={{
              opacity: 0,
              x: (Math.random() - 0.5) * 60,
              y: (Math.random() - 0.5) * 60,
              scale: 0.5,
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
    </div>
  );
}
