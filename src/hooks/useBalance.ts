"use client";

import { BalanceEvent } from "@/app/types/Transactions";
import { useEffect, useState } from "react";

export function useBalance(userId: string) {
  const [data, setData] = useState<BalanceEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchBalance = async () => {
      try {
        const res = await fetch(`/api/transactions?userId=${userId}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Failed to fetch balance:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [userId]);

  return { data, loading };
}
