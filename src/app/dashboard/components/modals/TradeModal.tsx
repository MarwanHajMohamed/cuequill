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
  // When set, ViewTradeModal shows a top-left chevron that returns
  // to whichever parent surface opened this one (e.g. DayTradesModal)
  // instead of closing the whole stack.
  onBack?: () => void;
};

export default function TradeModal({
  date,
  onClose,
  onSave,
  initialTrade,
  onDelete,
  onBack,
}: TradeModalProps) {
  // For existing trades (those with an _id, regardless of WIN/LOSS/OPEN
  // status) start in View mode - users see the summary first, click Edit
  // to switch. New trades (no _id) open straight into the editor.
  const openedInView = !!initialTrade?._id;
  const [editing, setEditing] = useState<boolean>(!openedInView);
  // First mount uses the default (slide-up) entrance so the View
  // card feels like it's arriving from wherever the user clicked.
  // After a return trip from Edit, the entrance switches to
  // slide-from-top so it reads as "going back one step" — same
  // metaphor as a nav stack pop.
  const [viewEnterFrom, setViewEnterFrom] = useState<"bottom" | "top">(
    "bottom",
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
          onCancel={
            openedInView
              ? () => {
                  setViewEnterFrom("top");
                  setEditing(false);
                }
              : undefined
          }
        />
      ) : (
        <ViewTradeModal
          onClose={onClose}
          initialTrade={initialTrade!}
          onEdit={() => {
            // Next time we come back to View, slide from the top.
            setViewEnterFrom("top");
            setEditing(true);
          }}
          onDelete={onDelete}
          onBack={onBack}
          enterFrom={viewEnterFrom}
        />
      )}
    </div>
  );
}
