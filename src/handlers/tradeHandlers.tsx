import { Trade } from "@/app/types/Trades";
import { QueryClient } from "@tanstack/react-query";

export const handleSaveTrade = async (
  trade: Trade,
  userId: string,
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
  queryClient: QueryClient,
  setEditingTrade?: React.Dispatch<React.SetStateAction<Trade | null>>
) => {
  if (trade._id) {
    // UPDATE EXISTING TRADE
    await fetch(`/api/trades/${trade._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trade),
    });
  } else {
    // CREATE NEW TRADE
    await fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...trade, userId }),
    });
  }

  await queryClient.invalidateQueries({ queryKey: ["trades", userId] });
  setIsModalOpen(false);

  if (setEditingTrade) setEditingTrade(null);
};

export const handleDeleteTrade = async (
  tradeId: string,
  userId: string,
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setEditingTrade: React.Dispatch<React.SetStateAction<Trade | null>>,
  queryClient: QueryClient
) => {
  try {
    await fetch(`/api/trades/${tradeId}`, {
      method: "DELETE",
    });

    await queryClient.invalidateQueries({ queryKey: ["trades", userId] });

    setIsModalOpen(false);
    setEditingTrade(null);
  } catch (err) {
    console.error("Failed to delete trade", err);
  }
};

export const handleDeleteAllTrades = async (
  userId: string,
  simulated: boolean,
  setDelAllModal: React.Dispatch<React.SetStateAction<boolean>>,
  toast: (message: string) => void,
  queryClient: QueryClient
) => {
  try {
    const res = await fetch(`/api/trades`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, simulated }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to delete trades");
    }

    const result = await res.json();
    setDelAllModal(false);

    toast(result.message);
    queryClient.invalidateQueries({ queryKey: ["trades", userId] });
  } catch (err) {
    console.error("Error deleting trades:", err);
  }
};

export const handleSaveNotes = async (
  newNotes: string,
  tradeId: string,
  userId: string,
  queryClient: QueryClient
) => {
  await fetch(`/api/trades/${tradeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes: newNotes }),
  });

  await queryClient.invalidateQueries({ queryKey: ["trades", userId] });
};
