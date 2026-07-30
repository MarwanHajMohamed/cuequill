"use client";

import React from "react";
import { Trade } from "@/app/types/Trades";
import TradeShareCard, { CARD_W, CARD_H } from "@/components/TradeShareCard";
import ShareImageModal from "@/components/ShareImageModal";
import { useCardSkinPrefs } from "@/hooks/useCardSkinPrefs";

// Previews the shareable trade card and lets the user save/share it as a
// PNG, with a skin picker. Thin wrapper over the generic ShareImageModal.
export default function TradeShareModal({
  trade,
  onClose,
}: {
  trade: Trade;
  onClose: () => void;
}) {
  const { level, cardSkin, persist } = useCardSkinPrefs();
  const fileName = `${(trade.symbol || "trade").toLowerCase()}-cuequill.png`;

  return (
    <ShareImageModal
      cardW={CARD_W}
      cardH={CARD_H}
      fileName={fileName}
      shareTitle={`${trade.symbol} trade`}
      shareText={`My ${trade.symbol} ${trade.option} trade — Cuequill`}
      renderCard={(ref, skin) => (
        <TradeShareCard ref={ref} trade={trade} skin={skin} />
      )}
      skinnable
      userLevel={level}
      initialSkin={cardSkin}
      onSkinChange={persist}
      onClose={onClose}
    />
  );
}
