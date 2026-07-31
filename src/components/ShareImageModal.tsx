"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { CARD_SKINS, skinById, type CardSkin } from "@/lib/cardSkins";
import { useScrollLock } from "@/hooks/useScrollLock";

// Generic "preview a fixed-size card and save/share it as a PNG" modal.
// The card is rendered at its natural size, scaled down to fit the preview,
// and captured unscaled at 3× for a crisp image. Used for the trade,
// monthly and achievement share cards.
//
// When `skinnable` is set, a skin picker is shown: the selected CardSkin is
// passed into renderCard so the preview + capture repaint live. Skins above
// the viewer's level are locked; `onSkinChange` lets the caller remember the
// choice as the user's default.
export default function ShareImageModal({
  cardW,
  cardH,
  fileName,
  shareTitle,
  shareText,
  renderCard,
  onClose,
  skinnable = false,
  userLevel = 1,
  initialSkin = "midnight",
  onSkinChange,
}: {
  cardW: number;
  cardH: number;
  fileName: string;
  shareTitle: string;
  shareText: string;
  renderCard: (ref: React.Ref<HTMLDivElement>, skin: CardSkin) => React.ReactNode;
  onClose: () => void;
  skinnable?: boolean;
  userLevel?: number;
  initialSkin?: string;
  onSkinChange?: (id: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [skinId, setSkinId] = useState(initialSkin);
  const skin = skinById(skinId);

  useScrollLock();

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
      // Transparent outside the card's rounded corners so light skins
      // (e.g. Paper) don't get dark corner wedges.
      backgroundColor: undefined,
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
              {renderCard(cardRef, skin)}
            </div>
          </div>
        </div>

        {skinnable && (
          <div className="w-full max-w-md flex items-center gap-2 flex-wrap justify-center">
            {CARD_SKINS.map((s) => {
              const locked = s.minLevel > userLevel;
              const active = skinId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    if (locked) return;
                    setSkinId(s.id);
                    onSkinChange?.(s.id);
                  }}
                  title={
                    locked ? `${s.label} — unlocks at level ${s.minLevel}` : s.label
                  }
                  aria-label={
                    locked
                      ? `${s.label} — unlocks at level ${s.minLevel}`
                      : s.label
                  }
                  className={`relative w-8 h-8 rounded-full border transition ${
                    locked
                      ? "opacity-40 cursor-not-allowed border-[#ffffff26]"
                      : active
                        ? "border-[#ffffff] ring-2 ring-[#ffffff66] cursor-pointer"
                        : "border-[#ffffff26] hover:border-[#ffffff66] cursor-pointer"
                  }`}
                  style={{
                    backgroundImage: `linear-gradient(to bottom right, ${s.swatchFrom}, ${s.swatchTo})`,
                  }}
                >
                  {locked && (
                    <i className="fa-solid fa-lock absolute inset-0 m-auto w-fit h-fit text-[9px] text-[#ffffffe6]" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <div className="w-full max-w-md rounded-xl border border-[#ef444440] bg-[#ef44440f] px-3 py-2 text-[12.5px] text-[#fca5a5] text-center">
            {error}
          </div>
        )}

        {/* The modal always sits on a dark scrim, so these use literal
            light/teal colours instead of white/teal tokens (which the light
            theme would remap to dark, making them vanish here). */}
        <div className="w-full max-w-md flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[#ffffff26] bg-[#ffffff0d] text-[#ffffffcc] hover:bg-[#ffffff17] hover:text-[#ffffff] transition text-[13px] font-medium cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[#ffffff26] bg-[#ffffff0d] text-[#ffffffd9] hover:bg-[#ffffff17] hover:text-[#ffffff] transition text-[13px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fa-solid fa-download text-[12px]" />
            {busy ? "Working…" : "Save image"}
          </button>
          {canShareFiles && (
            <button
              type="button"
              onClick={handleShare}
              disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#14b8a633] text-[#5eead4] border border-[#14b8a64d] hover:bg-[#14b8a64d] transition text-[13px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
