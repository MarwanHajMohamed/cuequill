"use client";

import React, { useState } from "react";
import { format } from "date-fns";

type TradeEventType = "WIN" | "LOSS" | "OPEN";

type StrategyList =
  | "Moving Average 40"
  | "Normal Fall & Hard Fall"
  | "Bearish Channel Break"
  | "Normal Bullish Gap"
  | "Bearish Gap Uptrend"
  | "Hard Floor"
  | "The First Uptrend Gap"
  | "First Red Opening Candle"
  | "Gap Floor Break"
  | "Model of 4 Steps"
  | "Hanger in Daily";

type TradeModalProps = {
  date: Date;
  onClose: () => void;
  onSave: (trade: {
    date: string;
    status: TradeEventType;
    symbol?: string;
    spotPrice?: number | null;
    contractPrice?: number | null;
    qty?: number | null;
    strike?: number | null;
    dateBought?: string;
    dateExpiry?: string;
    closingSpotPrice?: number | null;
    closingContractPrice?: number | null;
    profitLoss?: number | null;
    notes?: string;
  }) => void;
  initialTrade?: {
    _id?: string;
    symbol?: string;
    spotPrice?: number | null;
    contractPrice?: number | null;
    qty?: number | null;
    strike?: number | null;
    dateBought?: string;
    expiryDate?: string;
    status?: TradeEventType;
    strategy?: StrategyList;
    closingSpotPrice?: number | null;
    closingContractPrice?: number | null;
    profitLoss?: number | null;
    notes?: string;
    option?: "CALL" | "PUT" | null;
  };
  onDelete?: (_id: string) => void;
};

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

function FormInput({ label, name, placeholder, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label htmlFor={name} className="block text-sm mb-1">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        placeholder={placeholder}
        {...props}
        className={`w-full p-2 text-white bg-[#1A1A1D] rounded ${
          props.className || ""
        }`}
      />
    </div>
  );
}

export default function TradeModal({
  date,
  onClose,
  onSave,
  initialTrade,
  onDelete,
}: TradeModalProps) {
  const [symbol, setSymbol] = useState<string>(initialTrade?.symbol ?? "");
  const [spotPrice, setSpotPrice] = useState<number | null>(
    initialTrade?.spotPrice ?? null
  );

  const [contractPrice, setContractPrice] = useState<number | null>(
    initialTrade?.contractPrice ?? null
  );

  const [qty, setQty] = useState<number | null>(initialTrade?.qty ?? null);
  const [strike, setStrike] = useState<number | null>(
    initialTrade?.strike ?? null
  );

  const [dateBought, setDateBought] = useState<string>(
    initialTrade?.dateBought
      ? format(new Date(initialTrade.dateBought), "yyyy-MM-dd")
      : format(date, "yyyy-MM-dd")
  );

  const [expiryDate, setExpiryDate] = useState<string>(
    initialTrade?.expiryDate
      ? format(new Date(initialTrade.expiryDate), "yyyy-MM-dd")
      : format(date, "yyyy-MM-dd")
  );

  const [status, setStatus] = useState<TradeEventType>(
    initialTrade?.status ?? "OPEN"
  );

  const [strategy, setStrategy] = useState<StrategyList>(
    initialTrade?.strategy ?? "Moving Average 40"
  );

  const [closingSpotPrice, setClosingSpotPrice] = useState<number | null>(
    initialTrade?.closingSpotPrice ?? null
  );

  const [closingContractPrice, setClosingContractPrice] = useState<
    number | null
  >(initialTrade?.closingContractPrice ?? null);

  const [selectedOption, setSelectedOption] = useState<"CALL" | "PUT" | null>(
    initialTrade?.option ?? null
  );

  const [profitLoss, setProfitLoss] = useState<number | null>(
    initialTrade?.profitLoss ?? null
  );

  const [notes, setNotes] = useState<string>(initialTrade?.notes ?? "");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const strategies: StrategyList[] = [
    "Moving Average 40",
    "Normal Fall & Hard Fall",
    "Bearish Channel Break",
    "Normal Bullish Gap",
    "Bearish Gap Uptrend",
    "Hard Floor",
    "The First Uptrend Gap",
    "First Red Opening Candle",
    "Gap Floor Break",
    "Model of 4 Steps",
    "Hanger in Daily",
  ];

  const validate = (): string => {
    if (selectedOption === null) {
      return "Select an option";
    } else if (symbol === "") {
      return "Enter a symbol";
    } else if (spotPrice === null || Number.isNaN(spotPrice)) {
      return "Fill out the spot price";
    } else if (contractPrice === null || Number.isNaN(contractPrice)) {
      return "Fill out the contract price";
    } else if (qty === null || Number.isNaN(qty)) {
      return "Fill out the quantity";
    } else if (strike === null || Number.isNaN(strike)) {
      return "Fill out the strike";
    } else if (dateBought === "") {
      return "Fill out the buy date";
    } else if (expiryDate === "") {
      return "Fill out the expiry date";
    } else if (
      (status === "WIN" && closingSpotPrice === null) ||
      (status === "LOSS" && closingSpotPrice === null) ||
      (status === "WIN" && Number.isNaN(closingSpotPrice)) ||
      (status === "LOSS" && Number.isNaN(closingSpotPrice))
    ) {
      return "Fill out the closing spot price";
    } else if (
      (status === "WIN" && closingContractPrice === null) ||
      (status === "LOSS" && closingContractPrice === null) ||
      (status === "WIN" && Number.isNaN(closingContractPrice)) ||
      (status === "LOSS" && Number.isNaN(closingContractPrice))
    ) {
      return "Fill out the closing contract price";
    } else if (
      (status === "WIN" && profitLoss === null) ||
      (status === "LOSS" && profitLoss === null) ||
      (status === "WIN" && Number.isNaN(profitLoss)) ||
      (status === "LOSS" && Number.isNaN(profitLoss))
    ) {
      return "Fill out the P/L";
    } else {
      return "";
    }
  };

  const handleSave = () => {
    const error: string = validate();
    if (error) {
      setErrorMessage(error);
      return;
    }

    const formattedDate = format(date, "yyyy-MM-dd");

    const tradeData = {
      _id: initialTrade?._id,
      date: formattedDate,
      status,
      symbol,
      spotPrice,
      contractPrice,
      qty,
      strike,
      dateBought,
      expiryDate: expiryDate,
      option: selectedOption,
      userID: "68935cd4dd45fa2028f00caa",
      strategy,
      closingSpotPrice:
        status === "WIN" || status === "LOSS" ? closingSpotPrice : 0,
      closingContractPrice:
        status === "WIN" || status === "LOSS" ? closingContractPrice : 0,
      profitLoss: status === "WIN" || status === "LOSS" ? profitLoss : 0,
      notes,
    };

    onSave(tradeData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="relative flex flex-col gap-4 bg-[#0F0F17] p-6 rounded-xl w-[90%] max-w-lg text-white">
        <div
          className={`absolute top-[-40px] left-0 w-[100%] border-1 border-red-500/50 text-red-500 text-center p-1 rounded bg-red-700/10 ${
            errorMessage === "" ? "hidden" : "shake"
          }`}
        >
          {errorMessage}
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setSelectedOption("CALL");
              setErrorMessage("");
            }}
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
            onClick={() => {
              setSelectedOption("PUT");
              setErrorMessage("");
            }}
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
          onChange={(e) => {
            setSymbol(e.target.value);
            setErrorMessage("");
          }}
          placeholder="Symbol"
          className="w-full p-2 text-white bg-[#1A1A1D] rounded"
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <FormInput
              label="Spot Price"
              name="spotPrice"
              placeholder="Spot"
              type="number"
              value={spotPrice ?? ""}
              onChange={(e) => {
                setSpotPrice(parseFloat(e.target.value));
                setErrorMessage("");
              }}
            />
          </div>
          <div>
            <FormInput
              label="Contract Price"
              name="contractPrice"
              placeholder="Contract"
              type="number"
              value={contractPrice ?? ""}
              onChange={(e) => {
                setContractPrice(parseFloat(e.target.value));
                setErrorMessage("");
              }}
            />
          </div>
          <div>
            <FormInput
              label="Qty"
              name="qty"
              placeholder="Qty"
              type="number"
              value={qty ?? ""}
              onChange={(e) => {
                setQty(parseFloat(e.target.value));
                setErrorMessage("");
              }}
            />
          </div>
          <div>
            <FormInput
              label="Strike"
              name="strike"
              placeholder="Strike"
              type="number"
              value={strike ?? ""}
              onChange={(e) => {
                setStrike(parseFloat(e.target.value));
                setErrorMessage("");
              }}
            />
          </div>
          <div>
            <FormInput
              label="Date Bought"
              name="dateBought"
              type="date"
              value={dateBought ?? ""}
              onChange={(e) => {
                setDateBought(e.target.value);
                setErrorMessage("");
              }}
            />
          </div>
          <div>
            <FormInput
              label="Expiry Date"
              name="expiryDate"
              type="date"
              value={expiryDate ?? ""}
              onChange={(e) => {
                setExpiryDate(e.target.value);
                setErrorMessage("");
              }}
              min={dateBought}
            />
          </div>
        </div>

        <select
          value={strategy}
          onChange={(e) => {
            setStrategy(e.target.value as StrategyList);
            setErrorMessage("");
          }}
          className="w-full p-2 bg-[#2b2b2f] text-white rounded"
        >
          {strategies.map((strategy) => {
            return <option value={strategy}>{strategy}</option>;
          })}
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as TradeEventType);
            setErrorMessage("");
          }}
          className="w-full p-2 bg-[#2b2b2f] text-white rounded"
        >
          <option value="OPEN">Open</option>
          <option value="WIN">Win</option>
          <option value="LOSS">Loss</option>
        </select>

        {(status === "WIN" || status === "LOSS") && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="closingSpotPrice" className="text-sm">
                Closing Spot
              </label>
              <input
                name="closingSpotPrice"
                type="number"
                value={closingSpotPrice!}
                onChange={(e) => {
                  setClosingSpotPrice(parseFloat(e.target.value));
                  setErrorMessage("");
                }}
                placeholder="Closing Spot"
                className="w-full p-2 text-white bg-[#1A1A1D] rounded"
              />
            </div>
            <div>
              <label htmlFor="closingContractPrice" className="text-sm">
                Closing Contract
              </label>
              <input
                name="closingContractPrice"
                type="number"
                value={closingContractPrice!}
                onChange={(e) => {
                  setClosingContractPrice(parseFloat(e.target.value));
                  setErrorMessage("");
                }}
                placeholder="Closing Contract"
                className="w-full p-2 text-white bg-[#1A1A1D] rounded"
              />
            </div>
            <div>
              <label htmlFor="profitLoss" className="text-sm">
                P/L
              </label>
              <input
                name="profitLoss"
                type="number"
                value={profitLoss!}
                onChange={(e) => {
                  setProfitLoss(parseFloat(e.target.value));
                  setErrorMessage("");
                }}
                placeholder="P/L"
                className="w-full p-2 text-white bg-[#1A1A1D] rounded"
              />
            </div>
          </div>
        )}

        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          className="w-full p-2 text-white bg-[#1A1A1D] rounded"
        />

        <div
          className={`flex justify-between ${!initialTrade && "justify-end"}`}
        >
          {onDelete && initialTrade?._id && (
            <button
              className="px-4 py-2 bg-red-700 transition duration-200 ease-in-out rounded hover:bg-red-500 cursor-pointer"
              onClick={() => onDelete(initialTrade._id!)}
            >
              Delete
            </button>
          )}

          <div className="flex gap-2">
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
    </div>
  );
}
