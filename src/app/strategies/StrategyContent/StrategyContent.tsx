"use client";

import React, { useState } from "react";
import { ContentBlock } from "../../../../data/strategies";

interface Props {
  blocks: ContentBlock[];
}

export default function StrategyContent({ blocks }: Props) {
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});

  const handleImageLoad = (idx: number) => {
    setLoadedImages((prev) => ({ ...prev, [idx]: true }));
  };

  return (
    <div className="flex flex-col gap-5 mb-[30px]">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "text":
            return <p key={idx}>{block.content}</p>;

          case "image":
            return (
              <div key={idx} className="">
                {!loadedImages[idx] && <div className=""></div>}
                <img
                  src={block.src}
                  alt={block.alt || ""}
                  onLoad={() => handleImageLoad(idx)}
                  style={{ display: loadedImages[idx] ? "block" : "none" }}
                />
              </div>
            );

          case "chart":
            return (
              <div key={idx}>
                <h3>Chart</h3>
                <img src={block.src} alt={block.alt || ""} className="" />
              </div>
            );

          case "video":
            return (
              <video key={idx} controls>
                <source src={block.src} />
              </video>
            );

          case "list":
            return (
              <ul key={idx}>
                {block.items.map((item, i) => (
                  <li key={i} className="list-disc ml-8">
                    {item}
                  </li>
                ))}
              </ul>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
