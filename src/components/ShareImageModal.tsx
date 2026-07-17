"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toBlob } from "html-to-image";

// Generic "preview a fixed-size card and save/share it as a PNG" modal.
// The card is rendered at its natural size, scaled down to fit the preview,
// and captured unscaled at 3× for a crisp image. Used for both trade and
// monthly share cards.
export default function ShareImageModal({
  cardW,
  cardH,
  fileName,
  shareTitle,
  shareText,
  renderCard,
  onClose,
}: {
  cardW: number;
  cardH: number;
  fileName: string;
  shareTitle: string;
  shareText: string;
  renderCard: (ref: React.Ref<HTMLDivElement>) => React.ReactNode;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);

  useLayoutEffect(() => {
    const fit = () => {
      const avail = measureRef.current?.clientWidth ?? cardW;
      setScale(Math.min(1, avail / cardW));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [cardW]);

  useEffect(() => {
    try {
      const testFile = new File([""], "t.png", { type: "image/png" });
      setCanShareFiles(
        typeof navigator !== "undefined" &&
          !!navigator.canShare &&
          navigator.canShare({ files: [testFile] }),
      );
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const capture = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    return toBlob(cardRef.current, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: "#0b0b0f",
      width: cardW,
      height: cardH,
      skipFonts: true,
    });
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const blob = await capture();
      if (!blob) throw new Error("capture failed");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't generate the image. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    setBusy(true);
    setError(null);
    try {
      const blob = await capture();
      if (!blob) throw new Error("capture failed");
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: shareTitle, text: shareText });
      } else {
        await handleSave();
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        setError("Couldn't share the image. Try saving instead.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl flex flex-col items-center gap-4 my-auto"
      >
        <div ref={measureRef} className="w-full">
          <div style={{ width: cardW * scale, height: cardH * scale, margin: "0 auto" }}>
            <div
              style={{
                width: cardW,
                height: cardH,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              {renderCard(cardRef)}
            </div>
          </div>
        </div>

        {error && (
          <div className="w-full max-w-md rounded-xl border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-[12.5px] text-red-300 text-center">
            {error}
          </div>
        )}

        <div className="w-full max-w-md flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white transition text-[13px] font-medium cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-white/15 bg-white/[0.04] text-white/85 hover:bg-white/[0.08] hover:text-white transition text-[13px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-download text-[12px]" />
            {busy ? "Working…" : "Save image"}
          </button>
          {canShareFiles && (
            <button
              type="button"
              onClick={handleShare}
              disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition text-[13px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fa-solid fa-share-nodes text-[12px]" />
              Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
