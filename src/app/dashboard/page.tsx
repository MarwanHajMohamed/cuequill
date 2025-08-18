import React from "react";
import Time from "./components/Time";
import TradeCalendar from "./components/TradeCalendar";
import TradeStrategies from "./components/TradeStrategies";

export default function Page() {
  const userId = "68935cd4dd45fa2028f00caa";

  return (
    <div className="flex flex-col items-center">
      <Time />
      <div className="bg-[#0F0F17] w-[100%] flex flex-col items-center">
        <TradeCalendar userId={userId} />
        <TradeStrategies userId={userId} />
      </div>
    </div>
  );
}
