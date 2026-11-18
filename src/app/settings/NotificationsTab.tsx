"use client";

import React, { useEffect, useState } from "react";
import {
  isNativePush,
  getPushPermission,
  enablePush,
  type PushPermission,
} from "@/lib/push/client";

// Notification preferences - email (opt-out) and, inside the iOS app, native
// push (opt-in). Push toggles only appear when running in the native shell,
// since web/PWA can't receive them.

type Prefs = {
  emailAffirmationsReminder: boolean;
  pushEconReminder: boolean;
  pushJournalReminder: boolean;
};

export default function NotificationsTab() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Native push state.
  const [native, setNative] = useState(false);
  const [permission, setPermission] = useState<PushPermission>("unsupported");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/user/notifications");
        const d = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(d.error ?? "Couldn't load preferences.");
          return;
        }
        setPrefs({
          emailAffirmationsReminder: d.emailAffirmationsReminder !== false,
          pushEconReminder: d.pushEconReminder === true,
          pushJournalReminder: d.pushJournalReminder === true,
        });
      } catch {
        if (!cancelled) setError("Couldn't load preferences.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const isNative = await isNativePush();
      if (cancelled) return;
      setNative(isNative);
      if (isNative) setPermission(await getPushPermission());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const savePref = async (key: keyof Prefs, value: boolean) => {
    if (!prefs) return;
    const prev = prefs[key];
    setPrefs({ ...prefs, [key]: value });
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/user/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setPrefs({ ...prefs, [key]: prev });
        setError(d.error ?? "Couldn't save.");
      }
    } catch {
      setPrefs({ ...prefs, [key]: prev });
      setError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // Flipping a push toggle on needs OS permission first. If it isn't granted,
  // prompt (or send the user to iOS Settings if they've denied it).
  const setPushPref = async (
    key: "pushEconReminder" | "pushJournalReminder",
    value: boolean,
  ) => {
    if (value && permission !== "granted") {
      setError(null);
      const result = await enablePush();
      setPermission(result);
      if (result !== "granted") {
        setError(
          result === "denied"
            ? "Notifications are turned off for Cuequill. Enable them in iOS Settings → Cuequill → Notifications."
            : "Couldn't enable notifications. Try again.",
        );
        return;
      }
    }
    await savePref(key, value);
  };

  const enableFromButton = async () => {
    setError(null);
    const result = await enablePush();
    setPermission(result);
    if (result === "denied") {
      setError(
        "Notifications are turned off for Cuequill. Enable them in iOS Settings → Cuequill → Notifications.",
      );
    }
  };

  return (
    <div className="p-5 md:p-7 flex flex-col gap-8">
      {/* Push (native app only) */}
      {native && (
        <div className="flex flex-col gap-3">
          <div className="text-[11px] tracking-[0.08em] text-white/45 font-medium">
            Push
          </div>

          {permission !== "granted" ? (
            <div className="flex flex-col gap-3 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[13px] text-white/70 leading-snug">
                Turn on notifications to get a heads-up before market-moving
                events and a nudge to log your trades.
              </div>
              <button
                type="button"
                onClick={enableFromButton}
                className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 transition font-semibold text-[13px] cursor-pointer"
              >
                <i className="fa-solid fa-bell text-[11px]" />
                Enable notifications
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-w-2xl">
              <Toggle
                title="Economic events"
                description="A heads-up the day before FOMC, CPI, PPI and PCE releases."
                checked={prefs?.pushEconReminder ?? false}
                disabled={!prefs || saving}
                onChange={(v) => setPushPref("pushEconReminder", v)}
              />
              <Toggle
                title="Journaling reminder"
                description="An end-of-day nudge to log the day's trades."
                checked={prefs?.pushJournalReminder ?? false}
                disabled={!prefs || saving}
                onChange={(v) => setPushPref("pushJournalReminder", v)}
              />
            </div>
          )}
        </div>
      )}

      {/* Email */}
      <div className="flex flex-col gap-3">
        <div className="text-[11px] tracking-[0.08em] text-white/45 font-medium">
          Email
        </div>
        <div className="flex flex-col gap-2 max-w-2xl">
          <Toggle
            title="Affirmations"
            description="Receive a notification to read your affirmations if you haven't already."
            checked={prefs?.emailAffirmationsReminder ?? true}
            disabled={!prefs || saving}
            onChange={(v) => savePref("emailAffirmationsReminder", v)}
          />
        </div>
      </div>

      {error && (
        <div className="text-[12px] text-red-300 inline-flex items-center gap-1.5">
          <i className="fa-solid fa-triangle-exclamation text-[10px]" />
          {error}
        </div>
      )}
    </div>
  );
}

function Toggle({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`w-full flex items-start gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold">{title}</div>
        <div className="mt-1 text-[12.5px] text-white/55 leading-snug">
          {description}
        </div>
      </div>
      <span
        aria-hidden
        className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? "bg-teal-500/60" : "bg-white/10"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
