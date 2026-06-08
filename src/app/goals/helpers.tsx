import { Goal, GoalPeriod } from "../types/Goal";
import { Trade } from "../types/Trades";
import { tradeNetPL } from "@/lib/helpers/tradeNet";

export const handleAddGoal = async (
  goal: string,
  userId: string,
  period: GoalPeriod,
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>
): Promise<boolean> => {
  const newGoal = { goal, userId, complete: false, period };
  try {
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newGoal),
    });
    if (!res.ok) throw new Error("Failed to create goal");
    const createdGoal = await res.json();
    setGoals((prev) => [createdGoal, ...prev]);
    return true;
  } catch (error) {
    console.error("Error adding goal:", error);
    return false;
  }
};

export const handleSaveEdit = async (
  id: string,
  tempGoalValue: string,
  setTempGoalValue: React.Dispatch<React.SetStateAction<string>>,
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>,
  setEditingGoalId: React.Dispatch<React.SetStateAction<string | null>>
) => {
  try {
    const res = await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: tempGoalValue }),
    });

    if (!res.ok) throw new Error("Failed to update goal");

    const updated = await res.json();
    setGoals((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));

    setEditingGoalId(null);
    setTempGoalValue("");
  } catch (error) {
    console.error("Error editing goal:", error);
  }
};

export const handleDeleteGoal = async (
  id: string,
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>
) => {
  // Optimistic delete — remove from the list right away and capture the
  // removed item so we can restore it if the server call fails.
  let removed: Goal | undefined;
  setGoals((prev) => {
    removed = prev.find((g) => g._id === id);
    return prev.filter((g) => g._id !== id);
  });

  try {
    const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete goal");
  } catch (error) {
    console.error("Error deleting goal:", error);
    if (removed) {
      const r = removed;
      setGoals((prev) => [r, ...prev]);
    }
  }
};

export const handleToggleComplete = async (
  id: string,
  newValue: boolean,
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>
) => {
  // Optimistic flip — update the UI immediately, then send the patch in
  // the background. Roll back the local change if the server rejects it.
  setGoals((prev) =>
    prev.map((g) => (g._id === id ? { ...g, complete: newValue } : g))
  );

  try {
    const res = await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complete: newValue }),
    });
    if (!res.ok) throw new Error("Failed to toggle goal");
  } catch (error) {
    console.error("Error toggling goal:", error);
    setGoals((prev) =>
      prev.map((g) => (g._id === id ? { ...g, complete: !newValue } : g))
    );
  }
};

export const fetchProfit = async (
  month: number,
  year: number,
  userId: string,
  simulated: boolean
) => {
  try {
    const res = await fetch(
      `/api/trades?userId=${userId}&month=${month}&year=${year}&simulated=${simulated}`
    );

    if (!res.ok) throw new Error("Failed to fetch trades");

    const data = await res.json();

    const totalProfit = data.reduce(
      (acc: number, trade: Trade) => acc + tradeNetPL(trade),
      0
    );

    return totalProfit;
  } catch (error) {
    console.error("Error fetching last month's profit:", error);
    return 0;
  }
};
