"use client";

import React, { useEffect, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { Trade } from "@/app/types/Trades";
import TradeShareCard from "@/components/TradeShareCard";

// Modal that previews the shareable trade card and lets the user save it
// as a PNG or share it via the native share sheet (which, on mobile,
// offers "Save to Photos"). The card is captured at 3× for a crisp
// ~1080px-wide image.

export default function TradeShareModal({
  trade,
  onClose,
}: {
  trade: Trade;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    // Feature-detect file sharing (mobile Safari/Chrome). Guarded because
    // navigator.canShare with files throws/returns false on desktop.
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

  const fileName = `${(trade.symbol || "trade").toLowerCase()}-cuequill.png`;

  const capture = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    // pixelRatio 3 → the 360px card exports at ~1080px wide.
    return toBlob(cardRef.current, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: "#0c0c11",
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
        await navigator.share({
          files: [file],
          title: `${trade.symbol} trade`,
          text: `My ${trade.symbol} ${trade.option} trade — journaled with Cuequill`,
        });
      } else {
        await handleSave();
      }
    } catch (e) {
      // A user cancelling the share sheet throws AbortError — not an error.
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
        className="w-full max-w-sm flex flex-col items-center gap-4 my-auto"
      >
        {/* Live preview — the exact node that gets captured. */}
        <TradeShareCard ref={cardRef} trade={trade} />

        {error && (
          <div className="w-full rounded-xl border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-[12.5px] text-red-300 text-center">
            {error}
          </div>
        )}

        <div className="w-full flex items-center gap-2">
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
