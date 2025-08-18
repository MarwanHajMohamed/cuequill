"use client";

import React, { useState } from "react";
import { format } from "date-fns";

type TradeEventType = "WIN" | "LOSS" | "OPEN";

type TradeModalProps = {
  date: Date;
  onClose: () => void;
  onSave: (trade: {
    date: string;
    status: TradeEventType;
    symbol?: string;
    spotPrice?: number;
    contractPrice?: number;
    qty?: number;
    strike?: number;
    dateBought?: string;
    dateExpiry?: string;
    closingSpotPrice?: number;
    closingContractPrice?: number;
  }) => void;
};

export default function TradeModal({ date, onClose, onSave }: TradeModalProps) {
  const [symbol, setSymbol] = useState("");
  const [spotPrice, setSpotPrice] = useState<number>();
  const [contractPrice, setContractPrice] = useState<number>();
  const [qty, setQty] = useState<number>();
  const [strike, setStrike] = useState<number>();
  const [dateBought, setDateBought] = useState(
    date ? format(date, "yyyy-MM-dd") : ""
  );
  const [dateExpiry, setDateExpiry] = useState(
    date ? format(date, "yyyy-MM-dd") : ""
  );
  const [status, setStatus] = useState<TradeEventType>("OPEN");
  const [strategy, setStrategy] = useState("");
  const [closingSpotPrice, setClosingSpotPrice] = useState<number>();
  const [closingContractPrice, setClosingContractPrice] = useState<number>();
  const [selectedOption, setSelectedOption] = useState<"CALL" | "PUT" | null>(
    null
  );

  const handleSave = () => {
    const formattedDate = format(date, "yyyy-MM-dd");

    const tradeData = {
      date: formattedDate,
      status,
      symbol,
      spotPrice,
      contractPrice,
      qty,
      strike,
      dateBought,
      expiryDate: dateExpiry,
      option: selectedOption,
      userID: "68935cd4dd45fa2028f00caa",
      strategy,
      closingSpotPrice:
        status === "WIN" || status === "LOSS" ? closingSpotPrice : 0,
      closingContractPrice:
        status === "WIN" || status === "LOSS" ? closingContractPrice : 0,
    };

    onSave(tradeData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="flex flex-col gap-4 bg-[#0F0F17] p-6 rounded-xl w-[90%] max-w-lg text-white">
        <div className="flex gap-4">
          <button
            onClick={() => setSelectedOption("CALL")}
            className={`w-1/2 cursor-pointer border rounded py-1 transition duration-100 ease-in-out
          ${
            selectedOption === "CALL"
              ? "bg-green-700 text-white border-green-700"
              : "text-green-500 border-green-500 hover:bg-green-700/30"
          }
        `}
          >
            CALL
          </button>

          <button
            onClick={() => setSelectedOption("PUT")}
            className={`w-1/2 cursor-pointer border rounded py-1 transition duration-100 ease-in-out
          ${
            selectedOption === "PUT"
              ? "bg-red-700 text-white border-red-700"
              : "text-red-500 border-red-500 hover:bg-red-700/30"
          }
        `}
          >
            PUT
          </button>
        </div>

        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Symbol"
          className="w-full p-2 text-white bg-[#1A1A1D] rounded"
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="spotPrice" className="block text-sm">
              Spot Price
            </label>
            <input
              name="spotPrice"
              type="number"
              value={spotPrice}
              onChange={(e) => setSpotPrice(parseFloat(e.target.value))}
              placeholder="Spot"
              className="w-full p-2 text-white bg-[#1A1A1D] rounded"
            />
          </div>
          <div>
            <label htmlFor="contractPrice" className="block text-sm">
              Contract Price
            </label>
            <input
              name="contractPrice"
              type="number"
              value={contractPrice}
              onChange={(e) => setContractPrice(parseFloat(e.target.value))}
              placeholder="Contract"
              className="w-full p-2 text-white bg-[#1A1A1D] rounded"
            />
          </div>
          <div>
            <label htmlFor="qty" className="block text-sm">
              Qty
            </label>
            <input
              name="qty"
              type="number"
              value={qty}
              onChange={(e) => setQty(parseFloat(e.target.value))}
              placeholder="Qty"
              className="w-full p-2 text-white bg-[#1A1A1D] rounded"
            />
          </div>
          <div>
            <label htmlFor="strike" className="block text-sm">
              Strike
            </label>
            <input
              name="strike"
              type="number"
              value={strike}
              onChange={(e) => setStrike(parseFloat(e.target.value))}
              placeholder="Strike"
              className="w-full p-2 text-white bg-[#1A1A1D] rounded"
            />
          </div>
          <div>
            <label htmlFor="dateBought" className="block text-sm">
              Date Bought
            </label>
            <input
              name="dateBought"
              type="date"
              value={dateBought}
              onChange={(e) => setDateBought(e.target.value)}
              className="w-full p-2 text-white bg-[#1A1A1D] rounded disabled:opacity-25"
            />
          </div>
          <div>
            <label htmlFor="dateExpiry" className="block text-sm">
              Expiry Date
            </label>
            <input
              name="dateExpiry"
              type="date"
              min={dateBought}
              value={dateExpiry}
              onChange={(e) => setDateExpiry(e.target.value)}
              className="w-full p-2 text-white bg-[#1A1A1D] rounded"
            />
          </div>
        </div>

        <input
          type="text"
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          placeholder="Strategy"
          className="w-full p-2 text-white bg-[#1A1A1D] rounded"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TradeEventType)}
          className="w-full p-2 bg-[#2b2b2f] text-white rounded"
        >
          <option value="OPEN">Open</option>
          <option value="WIN">Win</option>
          <option value="LOSS">Loss</option>
        </select>

        {(status === "WIN" || status === "LOSS") && (
          <div className="flex gap-2 mb-4">
            <div>
              <label htmlFor="closingSpotPrice">Closing Spot Price</label>
              <input
                name="closingSpotPrice"
                type="number"
                value={closingSpotPrice}
                onChange={(e) =>
                  setClosingSpotPrice(parseFloat(e.target.value))
                }
                placeholder="Closing Spot"
                className="w-full p-2 text-white bg-[#1A1A1D] rounded"
              />
            </div>
            <div>
              <label htmlFor="closingContractPrice">
                Closing Contract Price
              </label>
              <input
                name="closingContractPrice"
                type="number"
                value={closingContractPrice}
                onChange={(e) =>
                  setClosingContractPrice(parseFloat(e.target.value))
                }
                placeholder="Closing Contract"
                className="w-full p-2 text-white bg-[#1A1A1D] rounded"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#16151C] transition duration-200 ease-in-out rounded hover:bg-gray-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
