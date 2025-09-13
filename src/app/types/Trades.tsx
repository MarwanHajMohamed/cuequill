export type TradeEventType = "WIN" | "LOSS" | "OPEN";

export type StrategyList =
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

export interface Trade {
  _id?: string;
  userID?: string;
  date: string;
  status: TradeEventType;
  symbol: string;
  spotPrice: number;
  contractPrice: number;
  qty: number;
  strike: number;
  dateBought: string;
  expiryDate: string;
  dateClosed: string;
  option: "CALL" | "PUT";
  strategy: StrategyList;
  closingSpotPrice?: number | null;
  closingContractPrice?: number | null;
  profitLoss?: number | null;
  notes?: string;
  simulated: boolean;
}
