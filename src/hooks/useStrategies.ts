"use client";

import { useQuery } from "@tanstack/react-query";
import type { SchematicElement } from "@/lib/models/Strategy";

export type StrategyDirection = "CALL" | "PUT";

export type Schematic = {
  width: number;
  height: number;
  elements: SchematicElement[];
};

export type StrategyDoc = {
  _id: string;
  userId: string;
  name: string;
  direction: StrategyDirection;
  timeframes: string[];
  description: string;
  tags: string[];
  schematic: Schematic;
  createdAt: string;
  updatedAt: string;
};

async function fetchStrategies(): Promise<StrategyDoc[]> {
  const res = await fetch("/api/strategies");
  if (!res.ok) throw new Error("Failed to load strategies");
  const data = await res.json();
  return data.strategies as StrategyDoc[];
}

export function useStrategies() {
  return useQuery({
    queryKey: ["strategies"],
    queryFn: fetchStrategies,
    staleTime: 30_000,
  });
}

export async function fetchStrategy(id: string): Promise<StrategyDoc> {
  const res = await fetch(`/api/strategies/${id}`);
  if (!res.ok) throw new Error("Failed to load strategy");
  const data = await res.json();
  return data.strategy as StrategyDoc;
}
