"use client";

import React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { useAccent } from "@/hooks/useAccent";
import { useProfile, type Profile } from "@/hooks/useProfile";
import { AVATAR_COLORS, avatarGradient } from "@/lib/avatarColors";
import { AVATAR_FRAMES } from "@/lib/avatarFrames";
import { ACCENTS } from "@/lib/accents";

// Appearance preferences: theme (device-local) plus the cosmetic pickers
// (avatar colour/frame, accent pack). Each cosmetic saves immediately —
// optimistically to the profile cache, then through the profile API.
export default function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const { previewAccent } = useAccent();
  const { data: profile } = useProfile();
  const qc = useQueryClient();

  const level = profile?.level ?? 1;
  const avatarColor = profile?.avatarColor ?? "teal";
  const avatarFrame = profile?.avatarFrame ?? "none";
  const accentColor = profile?.accentColor ?? "teal";

  // Optimistically update the cached profile, then persist through the API.
  const persist = (body: Partial<Profile>) => {
    qc.setQueryData<Profile>(["profile"], (old) =>
      old ? { ...old, ...body } : old,
    );
    fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(() => qc.invalidateQueries({ queryKey: ["profile"] }))
      .catch(() => qc.invalidateQueries({ queryKey: ["profile"] }));
  };

  return (
    <div className="p-5 md:p-7 flex flex-col gap-7">
      {/* Theme */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] tracking-[0.08em] text-white/45 font-medium">
          Theme
        </span>
        <p className="text-[12px] text-white/45 leading-relaxed max-w-md">
          Choose light or dark. Applies instantly and is remembered on this
          device.
        </p>
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1 w-fit mt-1">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium capitalize transition cursor-pointer ${
                theme === t
                  ? "bg-white/10 text-white border border-white/15"
                  : "text-white/55 hover:text-white"
              }`}
            >
              <i
                className={`fa-solid ${t === "dark" ? "fa-moon" : "fa-sun"} text-[11px]`}
              />
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Avatar colour */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] tracking-[0.08em] text-white/45 font-medium">
          Avatar colour
        </span>
        <div className="flex items-center gap-2.5 flex-wrap">
          {AVATAR_COLORS.map((c) => {
            const locked = c.minLevel > level;
            return (
              <button
                key={c.id}
                type="button"
                disabled={locked}
                onClick={() => !locked && persist({ avatarColor: c.id })}
                title={locked ? `Unlocks at level ${c.minLevel}` : c.label}
                aria-label={
                  locked ? `${c.label} — unlocks at level ${c.minLevel}` : c.label
                }
                className={`relative w-9 h-9 rounded-full bg-gradient-to-br ${c.gradient} border transition ${
                  locked
                    ? "opacity-40 cursor-not-allowed border-white/15"
                    : avatarColor === c.id
                      ? "border-white ring-2 ring-white/40 cursor-pointer"
                      : "border-white/15 hover:border-white/40 cursor-pointer"
                }`}
              >
                {locked && (
                  <i className="fa-solid fa-lock absolute inset-0 m-auto w-fit h-fit text-[10px] text-white/90" />
                )}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] text-white/40">
          More colours unlock as you level up in{" "}
          <Link
            href="/challenges"
            className="text-teal-300 hover:text-teal-200 underline-offset-4 hover:underline"
          >
            challenges
          </Link>
          .
        </span>
      </div>

      {/* Avatar frame */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] tracking-[0.08em] text-white/45 font-medium">
          Avatar frame
        </span>
        <div className="flex items-center gap-2.5 flex-wrap">
          {AVATAR_FRAMES.map((f) => {
            const locked = f.minLevel > level;
            const active = avatarFrame === f.id;
            return (
              <button
                key={f.id}
                type="button"
                disabled={locked}
                onClick={() => !locked && persist({ avatarFrame: f.id })}
                title={locked ? `Unlocks at level ${f.minLevel}` : f.label}
                aria-label={
                  locked ? `${f.label} — unlocks at level ${f.minLevel}` : f.label
                }
                className={`relative w-10 h-10 rounded-full flex items-center justify-center border transition ${
                  locked
                    ? "opacity-40 cursor-not-allowed border-white/10"
                    : active
                      ? "border-white/40 cursor-pointer"
                      : "border-white/10 hover:border-white/30 cursor-pointer"
                }`}
              >
                {/* Mini avatar preview using the selected colour + this frame. */}
                <span
                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarGradient(
                    avatarColor,
                  )} ${f.ring}`}
                />
                {locked && (
                  <i className="fa-solid fa-lock absolute inset-0 m-auto w-fit h-fit text-[10px] text-white/90" />
                )}
                {active && !locked && (
                  <i className="fa-solid fa-check absolute -top-1 -right-1 text-[9px] text-teal-300 bg-[var(--surface)] rounded-full w-4 h-4 flex items-center justify-center border border-teal-500/40" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent pack — recolours the whole app; applies live on click. */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] tracking-[0.08em] text-white/45 font-medium">
          Accent colour
        </span>
        <div className="flex items-center gap-2.5 flex-wrap">
          {ACCENTS.map((a) => {
            const locked = a.minLevel > level;
            const active = accentColor === a.id;
            return (
              <button
                key={a.id}
                type="button"
                disabled={locked}
                onClick={() => {
                  if (locked) return;
                  previewAccent(a.id); // instant repaint
                  persist({ accentColor: a.id });
                }}
                title={locked ? `Unlocks at level ${a.minLevel}` : a.label}
                aria-label={
                  locked ? `${a.label} — unlocks at level ${a.minLevel}` : a.label
                }
                className={`relative w-9 h-9 rounded-full bg-gradient-to-br ${a.swatch} border transition ${
                  locked
                    ? "opacity-40 cursor-not-allowed border-white/15"
                    : active
                      ? "border-white ring-2 ring-white/40 cursor-pointer"
                      : "border-white/15 hover:border-white/40 cursor-pointer"
                }`}
              >
                {locked && (
                  <i className="fa-solid fa-lock absolute inset-0 m-auto w-fit h-fit text-[10px] text-white/90" />
                )}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] text-white/40">
          Repaints buttons, links and highlights across the app. More packs
          unlock as you level up in{" "}
          <Link
            href="/challenges"
            className="text-teal-300 hover:text-teal-200 underline-offset-4 hover:underline"
          >
            challenges
          </Link>
          .
        </span>
      </div>
    </div>
  );
}
