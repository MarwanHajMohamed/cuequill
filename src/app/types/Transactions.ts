export type BalanceEvent = {
  date: Date;
  amount: number;
  type: "TRADE" | "DEPOSIT" | "WITHDRAW";
};
