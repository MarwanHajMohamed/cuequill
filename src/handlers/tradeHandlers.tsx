import { Trade } from "@/app/types/Trades";
import { QueryClient } from "@tanstack/react-query";

// Persist a new or edited trade. Returns true only when the request actually
// succeeds, so the caller can toast success/failure based on the real result.
// The modal is closed (and edit state cleared) only on success — a failed save
// keeps the form open so the user can retry.
export const handleSaveTrade = async (
  trade: Trade,
  userId: string,
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
  queryClient: QueryClient,
  setEditingTrade?: React.Dispatch<React.SetStateAction<Trade | null>>
): Promise<boolean> => {
  try {
    const res = trade._id
      ? // UPDATE EXISTING TRADE
        await fetch(`/api/trades/${trade._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(trade),
        })
      : // CREATE NEW TRADE
        await fetch("/api/trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...trade, userId }),
        });

    if (!res.ok) return false;

    await queryClient.invalidateQueries({ queryKey: ["trades", userId] });
    // Trade-based challenges progress with every save — refresh them live.
    queryClient.invalidateQueries({ queryKey: ["challenges"] });
    setIsModalOpen(false);
    if (setEditingTrade) setEditingTrade(null);
    return true;
  } catch {
    return false;
  }
};

export const handleDeleteTrade = async (
  tradeId: string | undefined,
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
    queryClient.invalidateQueries({ queryKey: ["challenges"] });

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
    queryClient.invalidateQueries({ queryKey: ["challenges"] });
  } catch (err) {
    console.error("Error deleting trades:", err);
  }
};

export const handleSaveNotes = async (
  newNotes: string,
  tradeId: string | undefined,
  userId: string,
  queryClient: QueryClient
) => {
  await fetch(`/api/trades/${tradeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes: newNotes }),
  });

  await queryClient.invalidateQueries({ queryKey: ["trades", userId] });
  // Note-based challenges (journalling) update as notes are added.
  queryClient.invalidateQueries({ queryKey: ["challenges"] });
};

export const handleFavourite = async (
  tradeId: string | undefined,
  userId: string,
  favourite: boolean,
  queryClient: QueryClient
) => {
  if (!tradeId) return;

  try {
    await fetch(`/api/trades/${tradeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favourite }),
    });

    await queryClient.invalidateQueries({ queryKey: ["trades", userId] });
  } catch (err) {
    console.error("Failed to toggle favourite", err);
  }
};
