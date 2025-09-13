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
        <div className="fixed bottom-5 right-5 bg-green-600/40 border border-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slide-in">
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider");
  }
  return context.showToast;
}
