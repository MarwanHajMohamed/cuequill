export type GoalPeriod = "daily" | "monthly";

export interface Goal {
  _id: string;
  userId: string;
  goal: string;
  date: string;
  complete: boolean;
  period?: GoalPeriod;
  createdAt: string | number | Date;
}
