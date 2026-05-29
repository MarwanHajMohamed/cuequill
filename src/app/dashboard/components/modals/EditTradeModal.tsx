"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { TradeEventType, StrategyList, Trade } from "@/app/types/Trades";
import { TRADE_TAG_OPTIONS } from "@/app/data/tradeTags";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/useToast";
import { useScrollLock } from "@/hooks/useScrollLock";
import { handleSave } from "./helpers";

type TradeModalProps = {
  date: Date;
  onClose: () => void;
  onSave: (trade: Trade) => void;
  initialTrade?: Partial<Trade>;
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
        className={`w-full p-2 text-base text-white bg-[#1A1A1D] rounded ${
          props.className || ""
        }`}
      />
    </div>
  );
}

export default function EditTradeModal({
  date,
  onClose,
  onSave,
  initialTrade,
  onDelete,
}: TradeModalProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [symbol, setSymbol] = useState<string>(initialTrade?.symbol ?? "");
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
  const [dateClosed, setDateClosed] = useState<string>(
    initialTrade?.dateClosed
      ? format(new Date(initialTrade.dateClosed), "yyyy-MM-dd")
      : format(date, "yyyy-MM-dd")
  );
  const [status, setStatus] = useState<TradeEventType>(
    initialTrade?.status ?? "OPEN"
  );
  const [strategy, setStrategy] = useState<StrategyList>(
    initialTrade?.strategy ?? "Moving Average 40"
  );
  const [closingContractPrice, setClosingContractPrice] = useState<
    number | null
  >(initialTrade?.closingContractPrice ?? null);
  const [fees, setFees] = useState<number | null>(initialTrade?.fees ?? null);
  const [selectedOption, setSelectedOption] = useState<"CALL" | "PUT" | null>(
    initialTrade?.option ?? null
  );
  const [notes, setNotes] = useState<string>(initialTrade?.notes ?? "");
  const [tags, setTags] = useState<string[]>(initialTrade?.tags ?? []);

  const toggleTag = (label: string) => {
    setTags((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
    );
  };
  const [simulated, setSimulated] = useState<boolean>(
    initialTrade?.simulated || false
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [delModal, setDelModal] = useState<boolean>(false);

  const toast = useToast();

  useScrollLock();

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
    "Other",
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/70 flex md:items-center md:justify-center items-stretch justify-stretch z-50">
        <div className="relative flex flex-col gap-3 md:gap-4 bg-[#0F0F17] md:p-6 p-4 pt-5 md:rounded-xl md:w-[90%] md:max-w-lg w-full text-white md:max-h-[90vh] h-full md:h-auto overflow-y-auto text-sm md:text-base">
          <div
            className={`md:absolute md:top-[-40px] md:left-0 md:w-[100%] border border-red-500/50 text-red-500 text-center p-1 rounded bg-red-700/10 ${
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
              setSymbol(e.target.value.toUpperCase());
              setErrorMessage("");
            }}
            placeholder="Symbol"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="w-full p-2 text-base text-white bg-[#1A1A1D] rounded uppercase placeholder:normal-case"
          />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
            <div>
              <FormInput
                label="Contract Price"
                name="contractPrice"
                placeholder="Contract"
                type="number"
                value={isNaN(contractPrice!) ? "" : contractPrice ?? ""}
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
                value={isNaN(qty!) ? "" : qty ?? ""}
                onChange={(e) => {
                  setQty(parseFloat(e.target.value));
                  setErrorMessage("");
                }}
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <FormInput
                label="Strike"
                name="strike"
                placeholder="Strike"
                type="number"
                value={isNaN(strike!) ? "" : strike ?? ""}
                onChange={(e) => {
                  setStrike(parseFloat(e.target.value));
                  setErrorMessage("");
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:gap-4">
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
            className="w-full p-2 text-base bg-[#2b2b2f] text-white rounded"
          >
            {strategies.map((strategy, index) => {
              return (
                <option value={strategy} key={index}>
                  {strategy}
                </option>
              );
            })}
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as TradeEventType);
              setErrorMessage("");
            }}
            className="w-full p-2 text-base bg-[#2b2b2f] text-white rounded"
          >
            <option value="OPEN">Open</option>
            <option value="WIN">Win</option>
            <option value="LOSS">Loss</option>
          </select>

          {(status === "WIN" || status === "LOSS") && (
            <>
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                <div>
                  <label
                    htmlFor="closingContractPrice"
                    className="block text-sm mb-1"
                  >
                    Closing Contract
                  </label>
                  <input
                    name="closingContractPrice"
                    type="number"
                    value={
                      isNaN(closingContractPrice!)
                        ? ""
                        : closingContractPrice ?? ""
                    }
                    onChange={(e) => {
                      setClosingContractPrice(parseFloat(e.target.value));
                      setErrorMessage("");
                    }}
                    placeholder="Closing Contract"
                    className="w-full p-2 text-base text-white bg-[#1A1A1D] rounded"
                  />
                </div>
                <div>
                  <FormInput
                    label="Date Closed"
                    name="expiryDate"
                    type="date"
                    value={dateClosed ?? ""}
                    onChange={(e) => {
                      setDateClosed(e.target.value);
                      setErrorMessage("");
                    }}
                    min={dateBought}
                    max={expiryDate}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="fees" className="block text-sm mb-1">
                  Fees / Commissions{" "}
                  <span className="text-white/40 text-xs">(optional)</span>
                </label>
                <input
                  name="fees"
                  type="number"
                  step="0.01"
                  value={isNaN(fees!) ? "" : fees ?? ""}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setFees(isNaN(v) ? null : v);
                  }}
                  placeholder="Total round-trip fees (e.g. 2.10)"
                  className="w-full p-2 text-base text-white bg-[#1A1A1D] rounded"
                />
              </div>
            </>
          )}

          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            className="w-full p-2 text-base text-white bg-[#1A1A1D] rounded"
          />

          <div>
            <label className="block text-sm mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {TRADE_TAG_OPTIONS.map(({ label, kind }) => {
                const selected = tags.includes(label);
                const selectedClasses =
                  kind === "mistake"
                    ? "bg-red-500/20 border-red-500/50 text-red-300"
                    : "bg-green-500/20 border-green-500/50 text-green-300";
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleTag(label)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition cursor-pointer ${
                      selected
                        ? selectedClasses
                        : "border-white/15 text-white/60 hover:bg-white/5"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={simulated}
              onChange={(e) => setSimulated(e.target.checked)}
              className="
              appearance-none h-5 w-5 rounded border border-gray-400 checked:bg-red-500/60 checked:border-red-500 
            "
              id="simulated"
            />
            <label htmlFor="simulated">Simulated</label>
          </div>

          <div
            className={`flex justify-between ${!initialTrade && "justify-end"}`}
          >
            {onDelete && initialTrade?._id && (
              <button
                className="px-4 py-2 bg-red-700 transition duration-100 ease-in-out rounded hover:bg-red-800 cursor-pointer"
                onClick={() => setDelModal(true)}
              >
                Delete
              </button>
            )}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#16151C] transition duration-100 ease-in-out rounded hover:bg-[#121217] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleSave(
                    setErrorMessage,
                    date,
                    selectedOption,
                    userId as string,
                    symbol,
                    contractPrice,
                    qty,
                    strike,
                    dateBought,
                    expiryDate,
                    status,
                    closingContractPrice,
                    strategy,
                    dateClosed,
                    notes,
                    tags,
                    simulated,
                    toast,
                    onSave,
                    initialTrade!,
                    fees
                  )
                }
                className="px-4 py-2 bg-blue-600 transition duration-100 rounded hover:bg-blue-700 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
      {onDelete && initialTrade?._id && delModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-51">
          <div className="flex flex-col gap-4 bg-[#0F0F17] items-center p-6 rounded-xl w-[90%] max-w-lg text-white">
            <div>Are you sure you want to delete this trade?</div>
            <div className="flex gap-3">
              <button
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 cursor-pointer"
                onClick={() => setDelModal(false)}
              >
                No
              </button>
              <button
                className="px-4 py-2 bg-[#16151C] transition duration-200 ease-in-out rounded hover:bg-gray-700 cursor-pointer"
                onClick={() => {
                  onDelete(initialTrade._id!);
                  toast(`Trade deleted successfully!`);
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
