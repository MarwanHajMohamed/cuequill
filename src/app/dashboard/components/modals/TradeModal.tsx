"use client";

import React, { useState } from "react";
import EditTradeModal from "./EditTradeModal";
import { Trade } from "@/app/types/Trades";
import ViewTradeModal from "./ViewTradeModal";

type TradeModalProps = {
  date?: Date;
  onClose: () => void;
  onSave?: (trade: Trade) => void;
  initialTrade?: Partial<Trade>;
  onDelete?: (_id: string) => void;
};

export default function TradeModal({
  date,
  onClose,
  onSave,
  initialTrade,
  onDelete,
}: TradeModalProps) {
  // For existing trades (those with an _id, regardless of WIN/LOSS/OPEN
  // status) start in View mode — users see the summary first, click Edit
  // to switch. New trades (no _id) open straight into the editor.
  const [editing, setEditing] = useState<boolean>(!initialTrade?._id);

  return (
    <div>
      {editing ? (
        <EditTradeModal
          date={date!}
          onClose={onClose}
          onSave={onSave!}
          initialTrade={initialTrade}
          onDelete={onDelete}
        />
      ) : (
        <ViewTradeModal
          onClose={onClose}
          initialTrade={initialTrade!}
          onEdit={() => setEditing(true)}
        />
      )}
    </div>
  );
}
