export interface Goal {
  _id: string;
  userId: string;
  goal: string;
  date: string;
  complete: boolean;
  createdAt: string | number | Date;
}
