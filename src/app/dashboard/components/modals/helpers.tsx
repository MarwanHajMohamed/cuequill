import { Trade, TradeEventType } from "@/app/types/Trades";
import { format } from "date-fns";

// Field keys we mark invalid. Mirrors the input keys used in
// EditTradeModal so the modal can highlight individual inputs instead
// of showing a single banner message.
export type InvalidField =
  | "option"
  | "symbol"
  | "contractPrice"
  | "qty"
  | "strike"
  | "dateBought"
  | "expiryDate"
  | "closingContractPrice";

// Returns every field that is missing or malformed - the modal
// highlights each one in red instead of surfacing a single message.
const validate = (
  selectedOption: "CALL" | "PUT" | null,
  symbol: string,
  contractPrice: number | null,
  qty: number | null,
  strike: number | null,
  dateBought: string,
  expiryDate: string,
  status: TradeEventType,
  closingContractPrice: number | null,
): Set<InvalidField> => {
  const invalid = new Set<InvalidField>();
  if (selectedOption === null) invalid.add("option");
  if (symbol === "") invalid.add("symbol");
  if (contractPrice === null || Number.isNaN(contractPrice))
    invalid.add("contractPrice");
  if (qty === null || Number.isNaN(qty)) invalid.add("qty");
  // Strike is optional — some instruments (futures spreads, complex
  // multi-leg orders) don't have a single meaningful strike.
  if (dateBought === "") invalid.add("dateBought");
  if (expiryDate === "") invalid.add("expiryDate");
  if (
    (status === "WIN" || status === "LOSS") &&
    (closingContractPrice === null || Number.isNaN(closingContractPrice))
  ) {
    invalid.add("closingContractPrice");
  }
  return invalid;
};

// Validate the form and, when valid, build the Trade payload. Returns the
// built trade, or null when validation fails (invalid fields are highlighted
// via setInvalidFields). Persistence + the success/failure toast are handled
// by the caller once the network request actually resolves — this function no
// longer fires a toast, so "saved" can never be shown before the save lands.
export const handleSave = (
  setInvalidFields: React.Dispatch<React.SetStateAction<Set<InvalidField>>>,
  date: Date,
  selectedOption: "CALL" | "PUT" | null,
  userId: string,
  symbol: string,
  contractPrice: number | null,
  qty: number | null,
  strike: number | null,
  dateBought: string,
  expiryDate: string,
  status: TradeEventType,
  closingContractPrice: number | null,
  strategy: string,
  dateClosed: string,
  notes: string,
  tags: string[],
  simulated: boolean,
  initialTrade: Partial<Trade> | null,
  fees?: number | null,
): Trade | null => {
  const invalid = validate(
    selectedOption,
    symbol,
    contractPrice,
    qty,
    strike,
    dateBought,
    expiryDate,
    status,
    closingContractPrice,
  );
  if (invalid.size > 0) {
    setInvalidFields(invalid);
    return null;
  }
  // Clear any prior highlights now that the form passes validation.
  setInvalidFields(new Set());

  const formattedDate = format(date, "yyyy-MM-dd");

  let profitLoss = 0;

  if (closingContractPrice !== null && contractPrice !== null && qty !== null) {
    profitLoss = Number(
      ((closingContractPrice - contractPrice) * 100 * qty).toFixed(2)
    );
  }

  const tradeData: Trade = {
    _id: initialTrade?._id,
    userID: userId,
    date: formattedDate,
    status,
    symbol,
    contractPrice: contractPrice ?? 0,
    qty: qty ?? 0,
    strike: strike ?? 0,
    dateBought,
    expiryDate,
    dateClosed,
    option: selectedOption!,
    strategy,
    closingContractPrice:
      status === "WIN" || status === "LOSS" ? closingContractPrice : null,
    profitLoss: status === "WIN" || status === "LOSS" ? profitLoss : null,
    fees: status === "WIN" || status === "LOSS" ? fees ?? null : null,
    notes,
    tags,
    simulated,
    favourite: false,
  };

  return tradeData;
};
