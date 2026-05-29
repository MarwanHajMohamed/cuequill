export type TradeEventType = "WIN" | "LOSS" | "OPEN";

export type StrategyList =
  | "All"
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
  | "Hanger in Daily"
  | "Other";

export interface Trade {
  _id?: string;
  userID?: string;
  date?: string;
  status: TradeEventType;
  symbol: string;
  contractPrice: number;
  qty: number;
  strike: number;
  dateBought: string;
  expiryDate: string;
  dateClosed: string;
  option: "CALL" | "PUT";
  strategy: StrategyList;
  closingContractPrice?: number | null;
  profitLoss?: number | null;
  // Total commission/fees for the trade (entry + exit legs, in USD).
  // Subtracted from profitLoss when displaying net P/L.
  fees?: number | null;
  notes?: string;
  tags?: string[];
  simulated: boolean;
  favourite: boolean;
}
