"use client";

import { useEffect, useState } from "react";
import { ContentBlock } from "../../../../data/strategies";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  blocks: ContentBlock[];
}

export default function StrategyContent({ blocks }: Props) {
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [fileType, setFileType] = useState<
    "Successful" | "Unsuccessful" | null
  >(null);

  const [showModal, setShowModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImages, setCurrentImages] = useState<string[]>([]);

  const handleImageLoad = (idx: number) => {
    setLoadedImages((prev) => ({ ...prev, [idx]: true }));
  };

  const openModal = (images: string[], index: number) => {
    setCurrentImages(images);
    setCurrentImageIndex(index);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!showModal) return;
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showModal, currentImages]);

  const [direction, setDirection] = useState(0);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 600 : -600,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      zIndex: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -600 : 600,
      opacity: 0,
      zIndex: 0,
    }),
  };

  const nextImage = () => {
    setDirection(1);
    setCurrentImageIndex((prev) => (prev + 1) % currentImages.length);
  };

  const prevImage = () => {
    setDirection(-1);
    setCurrentImageIndex(
      (prev) => (prev - 1 + currentImages.length) % currentImages.length
    );
  };

  return (
    <div className="flex flex-col gap-5 mb-[30px]">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "text":
            return (
              <p key={idx} className="text-sm md:text-base">
                {block.content}
              </p>
            );

          case "file":
            return (
              <div key={idx} className="relative">
                <div
                  className={`border border-white/20 rounded-full absolute w-8 h-8 flex 
                items-center justify-center bg-[#0e0e10] cursor-pointer ${
                  fileType !== null ? "block" : "hidden"
                } transition duration-100 hover:border-white/70`}
                  onClick={() => setFileType(null)}
                >
                  <i className="fa-solid fa-arrow-left"></i>
                </div>

                <div
                  className={`flex gap-5 ${
                    fileType === null ? "block" : "hidden"
                  }`}
                >
                  <button
                    className="flex flex-col items-center gap-1 cursor-pointer"
                    onClick={() => setFileType("Successful")}
                  >
                    <i className="fa-solid fa-folder md:text-7xl text-6xl text-yellow-400 transition duration-100 hover:text-yellow-500"></i>
                    <div className="text-xs md:text-sm">Successful</div>
                  </button>
                  <button
                    className="flex flex-col items-center gap-1 cursor-pointer"
                    onClick={() => setFileType("Unsuccessful")}
                  >
                    <i className="fa-solid fa-folder md:text-7xl text-6xl text-yellow-400 transition duration-100 hover:text-yellow-500"></i>
                    <div className="text-xs md:text-sm">Unsuccessful</div>
                  </button>
                </div>

                {fileType && (
                  <div className="flex gap-5 mt-12 flex-wrap">
                    {block.items
                      .filter((item) => item.type === fileType)
                      .map((item, i, filteredItems) => (
                        <img
                          key={i}
                          src={item.src}
                          className="w-40 rounded-lg border border-white/10 cursor-pointer transition duration-100 hover:border-white/100"
                          alt=""
                          onClick={() =>
                            openModal(
                              filteredItems.map((img) => img.src),
                              i
                            )
                          }
                        />
                      ))}
                  </div>
                )}
              </div>
            );

          case "image":
            return (
              <div key={idx}>
                {!loadedImages[idx] && <div className=""></div>}
                <img
                  src={block.src}
                  alt={block.alt || ""}
                  onLoad={() => handleImageLoad(idx)}
                  style={{ display: loadedImages[idx] ? "block" : "none" }}
                  className="cursor-pointer"
                  onClick={() => openModal([block.src], 0)}
                />
              </div>
            );

          case "chart":
            return (
              <div key={idx}>
                <h3>Chart</h3>
                <img src={block.src} alt={block.alt || ""} />
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
                  <li
                    key={i}
                    className="list-disc md:ml-8 ml-4 text-sm md:text-base"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            );

          default:
            return null;
        }
      })}

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={closeModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="relative max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.img
                  key={currentImages[currentImageIndex]}
                  src={currentImages[currentImageIndex]}
                  alt=""
                  className="max-w-full max-h-[90vh] rounded-lg"
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "tween" },
                    opacity: { duration: 0.1 },
                  }}
                />
              </AnimatePresence>

              <button
                className="absolute top-2 right-2 text-white text-3xl cursor-pointer"
                onClick={closeModal}
              >
                &times;
              </button>

              {currentImages.length > 1 && (
                <>
                  <button
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 
              text-3xl text-white px-3 py-1 bg-black/50 rounded-full cursor-pointer
              border border-white/0 transition duration-100 hover:border-white"
                    onClick={prevImage}
                  >
                    &lt;
                  </button>
                  <button
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 
              text-3xl text-white px-3 py-1 bg-black/50 rounded-full cursor-pointer
              border border-white/0 transition duration-100 hover:border-white"
                    onClick={nextImage}
                  >
                    &gt;
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
