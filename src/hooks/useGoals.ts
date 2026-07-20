"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  GoalKind,
  GoalMetric,
  GoalTimeframe,
  GoalDirection,
  TaskRecurrence,
} from "@/lib/goals";

export type Goal = {
  id: string;
  kind: GoalKind;
  title: string;
  metric: GoalMetric | null;
  target: number | null;
  timeframe: GoalTimeframe | null;
  direction: GoalDirection;
  recurrence: TaskRecurrence;
  customDays: number | null;
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
  recurrence?: TaskRecurrence;
  customDays?: number;
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

  // Optimistic: patch the cached goal immediately so the checkbox (or any
  // edit) flips instantly, then reconcile with the server — which owns the
  // metric recomputation — in the background.
  const update = useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<NewGoal> & { done?: boolean }) => {
      const res = await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to update goal");
      return res.json();
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: ["goals"] });
      const prev = qc.getQueryData<Goal[]>(["goals"]);
      if (prev) {
        qc.setQueryData<Goal[]>(
          ["goals"],
          prev.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        );
      }
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["goals"], ctx.prev);
    },
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete goal");
      return res.json();
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["goals"] });
      const prev = qc.getQueryData<Goal[]>(["goals"]);
      if (prev) {
        qc.setQueryData<Goal[]>(
          ["goals"],
          prev.filter((g) => g.id !== id),
        );
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["goals"], ctx.prev);
    },
    onSettled: invalidate,
  });

  return { create, update, remove };
}
