"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  GoalKind,
  GoalMetric,
  GoalTimeframe,
  GoalDirection,
} from "@/lib/goals";

export type Goal = {
  id: string;
  kind: GoalKind;
  title: string;
  metric: GoalMetric | null;
  target: number | null;
  timeframe: GoalTimeframe | null;
  direction: GoalDirection;
  done: boolean;
  createdAt: string;
  // computed for metric goals
  current: number | null;
  progress: number;
  achieved: boolean;
  over: boolean;
};

export type NewGoal = {
  kind: GoalKind;
  title?: string;
  metric?: GoalMetric;
  target?: number;
  timeframe?: GoalTimeframe;
  direction?: GoalDirection;
};

async function fetchGoals(): Promise<Goal[]> {
  const res = await fetch("/api/goals", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load goals");
  return (await res.json()).goals as Goal[];
}

export function useGoals() {
  return useQuery({ queryKey: ["goals"], queryFn: fetchGoals, staleTime: 15_000 });
}

export function useGoalMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["goals"] });

  const create = useMutation({
    mutationFn: async (g: NewGoal) => {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(g),
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      }
      return res.json();
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<NewGoal> & { done?: boolean }) => {
      const res = await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to update goal");
      return res.json();
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete goal");
      return res.json();
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
