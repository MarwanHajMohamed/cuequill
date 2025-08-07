import React from "react";
import Time from "./components/Time";
import TradeCalendar from "./components/TradeCalendar";

export default function Page() {
  const userId = "68935cd4dd45fa2028f00caa";

  return (
    <div className="flex flex-col">
      <Time />
      <TradeCalendar userId={userId} />
    </div>
  );
}
