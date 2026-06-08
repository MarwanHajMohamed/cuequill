"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

type Prefs = {
  marketOpen: boolean;
  marketClose: boolean;
  eodReminder: boolean;
  fedWarning: boolean;
  affirmations: boolean;
  affirmationsTime: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "busy"; message: string }
  | { kind: "ok"; message: string }
  | { kind: "err"; message: string };

// Convert the base64-url VAPID public key into the Uint8Array format
// PushManager.subscribe expects.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const PREF_ROWS: {
  key: keyof Omit<Prefs, "affirmationsTime">;
  title: string;
  body: string;
}[] = [
  {
    key: "marketOpen",
    title: "Market open",
    body: "9:30 AM ET, weekdays. Reminder to wait out the first 30 minutes.",
  },
  {
    key: "marketClose",
    title: "Market close",
    body: "4:00 PM ET, weekdays. Time to journal and review.",
  },
  {
    key: "eodReminder",
    title: "End-of-day journal",
    body: "4:15 PM ET. Capture any trades you took today.",
  },
  {
    key: "fedWarning",
    title: "Fed day warning",
    body: "8:30 AM ET on FOMC meeting days — sit it out per the rules.",
  },
  {
    key: "affirmations",
    title: "Morning affirmations",
    body: "Daily nudge to read your affirmations.",
  },
];

export default function NotificationsTab() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({
    marketOpen: false,
    marketClose: false,
    eodReminder: false,
    fedWarning: false,
    affirmations: false,
    affirmationsTime: "08:00",
  });
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    setPermission(Notification.permission);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
    fetch("/api/push/prefs")
      .then((r) => r.json())
      .then((data) => {
        if (data?.prefs) setPrefs((p) => ({ ...p, ...data.prefs }));
      })
      .catch(() => {});
  }, []);

  const savePrefs = useCallback(async (next: Partial<Prefs>) => {
    setStatus({ kind: "busy", message: "Saving…" });
    const res = await fetch("/api/push/prefs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) {
      setStatus({ kind: "err", message: "Couldn't save" });
      return;
    }
    setStatus({ kind: "ok", message: "Saved" });
    window.setTimeout(() => setStatus({ kind: "idle" }), 1500);
  }, []);

  const enable = async () => {
    if (!supported) return;
    setStatus({ kind: "busy", message: "Requesting permission…" });
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setStatus({ kind: "err", message: "Permission denied" });
        return;
      }
      const vapidRes = await fetch("/api/push/vapid").then((r) => r.json());
      const vapidKey: string = vapidRes?.key;
      if (!vapidKey) {
        setStatus({
          kind: "err",
          message: "VAPID key not configured on the server",
        });
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        }));

      const subJson = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
          },
        }),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setSubscribed(true);
      setStatus({ kind: "ok", message: "Notifications enabled" });
      window.setTimeout(() => setStatus({ kind: "idle" }), 1800);
    } catch (err) {
      console.warn(err);
      setStatus({
        kind: "err",
        message: "Couldn't enable notifications. Try again.",
      });
    }
  };

  const disable = async () => {
    setStatus({ kind: "busy", message: "Disabling…" });
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setStatus({ kind: "ok", message: "Disabled" });
      window.setTimeout(() => setStatus({ kind: "idle" }), 1500);
    } catch {
      setStatus({ kind: "err", message: "Couldn't disable" });
    }
  };

  const sendTest = async () => {
    setStatus({ kind: "busy", message: "Sending test…" });
    const res = await fetch("/api/push/test", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus({ kind: "err", message: data?.error ?? "Test failed" });
      return;
    }
    setStatus({
      kind: "ok",
      message: `Sent (${data.delivered} delivered)`,
    });
    window.setTimeout(() => setStatus({ kind: "idle" }), 2000);
  };

  const togglePref = (key: keyof Prefs) => async (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof prefs[key] !== "boolean") return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await savePrefs({ [key]: next[key] } as Partial<Prefs>);
  };

  const setAffirmationsTime = async (v: string) => {
    const next = { ...prefs, affirmationsTime: v };
    setPrefs(next);
    await savePrefs({ affirmationsTime: v });
  };

  const headerStatus = useMemo(() => {
    if (!supported) return "Not supported on this device";
    if (permission === "denied") return "Blocked by browser settings";
    if (!subscribed) return "Off";
    return "On";
  }, [supported, permission, subscribed]);

  const headerColor =
    !supported || permission === "denied"
      ? "text-red-300"
      : subscribed
        ? "text-green-300"
        : "text-white/55";

  return (
    <div className="p-5 md:p-7 flex flex-col gap-6">
      {/* Intro */}
      <section className="flex flex-col gap-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-teal-400/80 font-medium">
          Notifications
        </div>
        <p className="text-[13px] md:text-[14px] text-white/70 leading-relaxed">
          Push reminders for market open, end-of-day journaling, Fed days,
          and your morning affirmations. Delivered via the installed PWA
          on iOS / Android / desktop.
        </p>
      </section>

      {/* Status / toggle */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-col">
          <div className="text-[11px] uppercase tracking-[0.15em] text-white/45 font-medium">
            Push on this device
          </div>
          <div className={`text-[14px] font-medium ${headerColor}`}>
            {headerStatus}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {subscribed ? (
            <>
              <button
                onClick={sendTest}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.06] hover:text-white transition text-[12px] font-medium cursor-pointer"
              >
                <i className="fa-solid fa-paper-plane text-[10px]" />
                Send test
              </button>
              <button
                onClick={disable}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/25 hover:bg-red-500/20 transition text-[12px] font-medium cursor-pointer"
              >
                Disable
              </button>
            </>
          ) : (
            <button
              onClick={enable}
              disabled={!supported || permission === "denied"}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-medium transition ${
                !supported || permission === "denied"
                  ? "bg-white/[0.02] text-white/30 border-white/10 cursor-not-allowed"
                  : "bg-teal-500/15 text-teal-300 border-teal-500/25 hover:bg-teal-500/25 cursor-pointer"
              }`}
            >
              <i className="fa-solid fa-bell text-[10px]" />
              Enable
            </button>
          )}
        </div>
      </section>

      {permission === "denied" && (
        <div className="text-[12px] text-red-300/80 bg-red-500/[0.06] border border-red-500/20 rounded-xl px-3 py-2">
          Browser permission is blocked. Re-enable it in your browser&apos;s
          site settings and reload.
        </div>
      )}

      {/* Per-type prefs */}
      <section className="flex flex-col gap-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-medium">
          What to send
        </div>
        <div className="flex flex-col gap-2">
          {PREF_ROWS.map((row) => {
            const active = prefs[row.key] as boolean;
            return (
              <div
                key={row.key}
                className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition ${
                  active
                    ? "bg-teal-500/[0.06] border-teal-500/25"
                    : "bg-white/[0.02] border-white/10"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-white">
                    {row.title}
                  </div>
                  <div className="text-[12px] text-white/55 leading-relaxed mt-0.5">
                    {row.body}
                  </div>
                  {row.key === "affirmations" && active && (
                    <label className="flex items-center gap-2 mt-2 text-[12px] text-white/65">
                      <span>at</span>
                      <input
                        type="time"
                        value={prefs.affirmationsTime}
                        onChange={(e) => setAffirmationsTime(e.target.value)}
                        className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/10 text-white text-[12px] focus:outline-none focus:border-white/25"
                      />
                      <span className="text-white/45 text-[11px]">
                        your local time
                      </span>
                    </label>
                  )}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={active}
                  onClick={togglePref(row.key)}
                  className={`shrink-0 relative w-10 h-5 rounded-full transition ${
                    active ? "bg-teal-500" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`absolute top-[2px] w-4 h-4 bg-white rounded-full transition-all ${
                      active ? "left-[22px]" : "left-[2px]"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {status.kind !== "idle" && (
        <div
          className={`text-[12px] px-3 py-2 rounded-xl border ${
            status.kind === "err"
              ? "bg-red-500/10 text-red-300 border-red-500/25"
              : status.kind === "ok"
                ? "bg-green-500/10 text-green-300 border-green-500/25"
                : "bg-white/[0.03] text-white/65 border-white/10"
          }`}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}
