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
  const [editing, setEditing] = useState<boolean>(
    initialTrade?.status === "WIN" || initialTrade?.status === "LOSS"
      ? false
      : true
  );

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
