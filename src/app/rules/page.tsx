"use client";

import { withAuth } from "@/lib/withAuth";
import React from "react";

function page() {
  return (
    <div className="flex justify-center">
      <div className="md:m-10 mx-5 md:mt-30 mt-30 w-[100%] max-w-[1500px] mb-5">
        <div>
          <h1 className="text-teal-500 md:text-xl">
            Timeframes and when to trade
          </h1>
          <ul className="list-disc ml-5 text-xs gap-2 flex flex-col md:text-base">
            <li>The market opens at 9:30am US time, and closes at 4:00pm.</li>
            <li>
              Never trade between the 9:30am and 10:00am, as they are volatile
              candles.
            </li>
            <li>
              Premarket is a very good indicator to sell stocks but not buy.
            </li>
            <li>
              Sell PUTs at 9:30am, as the price usually opens low and rallies.
            </li>
            <li>
              Stocks close at 4:00pm, so the last time you can trade is at
              3:59pm.
            </li>
            <li>
              SPY and QQQ are the only two stocks in which you can trade up to
              4:14pm, and then they close at 4:15pm.
            </li>
            <li>
              Any orders after closing times will be purchased the following day
              at 9:30am.
            </li>
            <li>Markets close on the weekends (Saturday and Sunday)</li>
          </ul>
        </div>
        <div>
          <h1 className="text-teal-500 md:text-xl mt-5">Rules</h1>
          <ol className="list-decimal ml-5 text-xs gap-2 flex flex-col md:text-base">
            <li>Start with small amount to invest.</li>
            <li>
              For each trade, invest 10% of your portfolio.
              <ul className="list-disc ml-5">
                <li>Eg. Portfolio = $500</li>
                <li>Trades = %50 per trade</li>
              </ul>
            </li>
            <li>Invest 2-4 times per week.</li>
            <li>Respect the timeframes.</li>
            <li>Only buy from candles that have been fulfilled.</li>
            <li>Do not exit on a loss.</li>
            <li>Do not invest on Federal Reserve Meeting days.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default withAuth(page);
