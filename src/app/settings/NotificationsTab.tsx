"use client";

import React, { useEffect, useState } from "react";

// Notification preferences. Only one toggle today; the layout is
// built as a repeatable Toggle row so adding more (weekly summary,
// sync failure, etc.) is a paste-in.

type Prefs = {
  emailAffirmationsReminder: boolean;
};

export default function NotificationsTab() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        });
      } catch {
        if (!cancelled) setError("Couldn't load preferences.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPref = async (key: keyof Prefs, value: boolean) => {
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

  return (
    <div className="p-5 md:p-7 flex flex-col gap-6">
      <div>
        <div className="text-[11px] tracking-[0.08em] text-white/45 font-medium mb-1">
          EMAIL
        </div>
        <div className="text-[14px] text-white/60">
          We only send what you ask for. Turn anything off any time.
        </div>
      </div>

      <div className="flex flex-col gap-2 max-w-2xl">
        <Toggle
          title="Morning affirmations reminder"
          description="Every day at 8am your local time, if you haven't read all your affirmations for the day, we'll send you a quick reminder."
          checked={prefs?.emailAffirmationsReminder ?? true}
          disabled={!prefs || saving}
          onChange={(v) => setPref("emailAffirmationsReminder", v)}
        />
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
