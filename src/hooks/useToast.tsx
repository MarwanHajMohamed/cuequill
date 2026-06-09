"use client";

import { Trade } from "@/app/types/Trades";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

type ToastContextType = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const notifiedTrades = useRef<Set<string>>(new Set());

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  }, []);

  useEffect(() => {
    async function fetchTrades() {
      const res = await fetch("/api/trades");
      const data = await res.json();
      setTrades(data);
    }
    fetchTrades();
  }, []);

  useEffect(() => {
    if (!trades.length) return;

    const interval = setInterval(() => {
      const nowUK = new Date(
        new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })
      );
      const currentHour = nowUK.getHours();

      if (currentHour >= 21) {
        trades.forEach((trade) => {
          const expiry = new Date(trade.expiryDate);
          const isSameDay =
            expiry.toLocaleDateString("en-GB") ===
            nowUK.toLocaleDateString("en-GB");

          if (isSameDay && !notifiedTrades.current.has(trade._id!)) {
            showToast(`⚠️ Trade ${trade.symbol} is expiring today!`);
            notifiedTrades.current.add(trade._id!);
          }
        });
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [trades, showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <div className="fixed bottom-5 right-5 z-50 max-w-[calc(100vw-2.5rem)]">
          <Toast message={message} onClose={() => setMessage(null)} />
        </div>
      )}
    </ToastContext.Provider>
  );
}

type ToastTone = "success" | "warning" | "error";

// The toast API only carries a message string, so infer the tone from its
// content: warnings flag (⚠️ / "expiring"), failures read "fail"/"error",
// everything else is treated as a success confirmation.
function toneFor(message: string): ToastTone {
  const m = message.toLowerCase();
  if (message.includes("⚠️") || m.includes("expiring") || m.includes("warn"))
    return "warning";
  if (m.includes("fail") || m.includes("error") || m.includes("unable"))
    return "error";
  return "success";
}

const TONE_STYLES: Record<
  ToastTone,
  { icon: string; accent: string; ring: string; iconColor: string }
> = {
  success: {
    icon: "fa-solid fa-circle-check",
    accent: "from-teal-400 to-emerald-500",
    ring: "ring-teal-400/20",
    iconColor: "text-teal-300",
  },
  warning: {
    icon: "fa-solid fa-triangle-exclamation",
    accent: "from-amber-300 to-amber-500",
    ring: "ring-amber-400/20",
    iconColor: "text-amber-300",
  },
  error: {
    icon: "fa-solid fa-circle-xmark",
    accent: "from-rose-400 to-red-500",
    ring: "ring-rose-400/20",
    iconColor: "text-rose-300",
  },
};

function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  const tone = toneFor(message);
  const s = TONE_STYLES[tone];
  // Strip a leading emoji + spaces (e.g. the "⚠️ " prefix) since the icon
  // now conveys the tone visually.
  const text = message.replace(/^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}️]+\s*/u, "");

  return (
    <div
      role="status"
      className={`animate-toast-in flex items-stretch gap-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-900/80 shadow-xl shadow-black/40 ring-1 backdrop-blur-md ${s.ring}`}
    >
      {/* Accent bar */}
      <div className={`w-1 shrink-0 bg-gradient-to-b ${s.accent}`} />

      <div className="flex items-center gap-3 px-3.5 py-3">
        <i className={`${s.icon} ${s.iconColor} text-[15px]`} />
        <span className="text-[13.5px] font-medium leading-snug text-white/90">
          {text}
        </span>
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="ml-1 shrink-0 text-white/30 transition hover:text-white/70 cursor-pointer"
        >
          <i className="fa-solid fa-xmark text-[12px]" />
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider");
  }
  return context.showToast;
}
