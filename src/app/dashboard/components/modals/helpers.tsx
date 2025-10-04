import { StrategyList, Trade, TradeEventType } from "@/app/types/Trades";
import { format } from "date-fns";

const validate = (
  selectedOption: "CALL" | "PUT" | null,
  symbol: string,
  contractPrice: number | null,
  qty: number | null,
  strike: number | null,
  dateBought: string,
  expiryDate: string,
  status: TradeEventType,
  closingContractPrice: number | null
): string => {
  if (selectedOption === null) {
    return "Select an option";
  } else if (symbol === "") {
    return "Enter a symbol";
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
    (status === "WIN" && closingContractPrice === null) ||
    (status === "LOSS" && closingContractPrice === null) ||
    (status === "WIN" && Number.isNaN(closingContractPrice)) ||
    (status === "LOSS" && Number.isNaN(closingContractPrice))
  ) {
    return "Fill out the closing contract price";
  } else {
    return "";
  }
};

export const handleSave = (
  setErrorMessage: React.Dispatch<React.SetStateAction<string>>,
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
  strategy: StrategyList,
  dateClosed: string,
  notes: string,
  simulated: boolean,
  toast: (message: string) => void,
  onSave: (trade: Trade) => void,
  initialTrade: Partial<Trade> | null
) => {
  const error: string = validate(
    selectedOption,
    symbol,
    contractPrice,
    qty,
    strike,
    dateBought,
    expiryDate,
    status,
    closingContractPrice
  );
  if (error) {
    setErrorMessage(error);
    return;
  }

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
    notes,
    simulated,
    favourite: false,
  };

  if (tradeData._id) {
    toast(`Trade ${tradeData.symbol} updated successfully!`);
  } else {
    toast(`Trade ${tradeData.symbol} added successfully!`);
  }

  onSave(tradeData);
};
