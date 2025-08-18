"use client";

import React from "react";
import TradeList from "./TradeList";
import StrategiesList from "./StrategiesList";

export default function TradeStrategies({ userId }: { userId: string }) {
  return (
    <div className="flex justify-between w-[100%] max-w-350">
      <TradeList userId={userId} />
      <StrategiesList userId={userId} />
    </div>
  );
}
