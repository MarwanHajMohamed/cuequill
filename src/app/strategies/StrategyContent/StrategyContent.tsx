"use client";

import { useEffect, useState } from "react";
import { ContentBlock } from "../../../../data/strategies";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  blocks: ContentBlock[];
}

const isHeading = (text: string) => /:\s*$/.test(text);

export default function StrategyContent({ blocks }: Props) {
  const [fileType, setFileType] = useState<
    "Successful" | "Unsuccessful"
  >("Successful");

  const [showModal, setShowModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [direction, setDirection] = useState(0);

  const openModal = (images: string[], index: number) => {
    setCurrentImages(images);
    setCurrentImageIndex(index);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const nextImage = () => {
    setDirection(1);
    setCurrentImageIndex((prev) => (prev + 1) % currentImages.length);
  };

  const prevImage = () => {
    setDirection(-1);
    setCurrentImageIndex(
      (prev) => (prev - 1 + currentImages.length) % currentImages.length,
    );
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!showModal) return;
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, currentImages]);

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 400 : -400,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1, zIndex: 1 },
    exit: (dir: number) => ({
      x: dir > 0 ? -400 : 400,
      opacity: 0,
      zIndex: 0,
    }),
  };

  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "text": {
            const heading = isHeading(block.content);
            if (heading) {
              const label = block.content.replace(/:\s*$/, "");
              return (
                <div
                  key={idx}
                  className="text-[11px] uppercase tracking-[0.18em] text-teal-400/80 font-medium mt-2 first:mt-0"
                >
                  {label}
                </div>
              );
            }
            return (
              <p
                key={idx}
                className="text-[14px] md:text-[15px] text-white/75 leading-relaxed"
              >
                {block.content}
              </p>
            );
          }

          case "list":
            return (
              <ul key={idx} className="flex flex-col gap-2">
                {block.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-[13.5px] md:text-[14.5px] text-white/75 leading-relaxed"
                  >
                    <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-400/70" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );

          case "file": {
            const successful = block.items.filter(
              (i) => i.type === "Successful",
            );
            const unsuccessful = block.items.filter(
              (i) => i.type === "Unsuccessful",
            );
            const active =
              fileType === "Successful" ? successful : unsuccessful;
            return (
              <div key={idx} className="flex flex-col gap-4">
                {/* Tab toggle */}
                <div className="inline-flex self-start rounded-full border border-white/10 bg-white/[0.03] p-1">
                  <button
                    onClick={() => setFileType("Successful")}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition flex items-center gap-1.5 ${
                      fileType === "Successful"
                        ? "bg-green-500/15 text-green-300 border border-green-500/25"
                        : "text-white/55 hover:text-white"
                    }`}
                  >
                    <i className="fa-solid fa-check text-[10px]" />
                    Successful
                    <span className="text-[10px] text-white/40 tabular-nums">
                      {successful.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setFileType("Unsuccessful")}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition flex items-center gap-1.5 ${
                      fileType === "Unsuccessful"
                        ? "bg-red-500/15 text-red-300 border border-red-500/25"
                        : "text-white/55 hover:text-white"
                    }`}
                  >
                    <i className="fa-solid fa-xmark text-[10px]" />
                    Unsuccessful
                    <span className="text-[10px] text-white/40 tabular-nums">
                      {unsuccessful.length}
                    </span>
                  </button>
                </div>

                {/* Image grid */}
                {active.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {active.map((item, i) => (
                      <button
                        key={i}
                        onClick={() =>
                          openModal(
                            active.map((img) => img.src),
                            i,
                          )
                        }
                        className="group relative rounded-lg overflow-hidden border border-white/10 bg-white/[0.02] hover:border-white/30 transition aspect-[4/3]"
                      >
                        <img
                          src={item.src}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover transition group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition" />
                        <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <i className="fa-solid fa-expand text-[10px] text-white/90" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[13px] text-white/40 py-6 text-center border border-dashed border-white/10 rounded-lg">
                    No {fileType.toLowerCase()} charts yet.
                  </div>
                )}
              </div>
            );
          }

          case "image":
            return (
              <button
                key={idx}
                onClick={() => openModal([block.src], 0)}
                className="group rounded-xl overflow-hidden border border-white/10 bg-white/[0.02] hover:border-white/30 transition"
              >
                <img
                  src={block.src}
                  alt={block.alt || ""}
                  className="w-full h-auto block transition group-hover:scale-[1.005]"
                />
              </button>
            );

          case "chart":
            return (
              <div
                key={idx}
                className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.02]"
              >
                <img
                  src={block.src}
                  alt={block.alt || ""}
                  className="w-full h-auto block"
                />
              </div>
            );

          case "video":
            return (
              <video
                key={idx}
                controls
                className="w-full rounded-xl border border-white/10 bg-black"
              >
                <source src={block.src} />
              </video>
            );

          default:
            return null;
        }
      })}

      {/* Lightbox */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={closeModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="relative max-w-[92vw] max-h-[92vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.img
                  key={currentImages[currentImageIndex]}
                  src={currentImages[currentImageIndex]}
                  alt=""
                  className="max-w-full max-h-[92vh] rounded-xl shadow-[0_20px_80px_rgba(0,0,0,0.6)]"
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "tween", duration: 0.2 },
                    opacity: { duration: 0.12 },
                  }}
                />
              </AnimatePresence>

              <button
                aria-label="Close"
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/85 hover:text-white hover:bg-black/80 transition flex items-center justify-center"
                onClick={closeModal}
              >
                <i className="fa-solid fa-xmark text-[14px]" />
              </button>

              {currentImages.length > 1 && (
                <>
                  <button
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/85 hover:text-white hover:bg-black/80 transition flex items-center justify-center"
                    onClick={prevImage}
                  >
                    <i className="fa-solid fa-chevron-left text-[14px]" />
                  </button>
                  <button
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/85 hover:text-white hover:bg-black/80 transition flex items-center justify-center"
                    onClick={nextImage}
                  >
                    <i className="fa-solid fa-chevron-right text-[14px]" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] text-white/70 tabular-nums">
                    {currentImageIndex + 1} / {currentImages.length}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
