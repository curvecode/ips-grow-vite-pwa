export type BuyType =
  | "food"
  | "beverage"
  | "snack"
  | "groceries"
  | "restaurant"
  | "coffee"
  | "other";

export interface DailyBuy {
  id: string;
  date: Date | string;
  amount: number;
  type: BuyType;
  description?: string;
  price?: number;
  quantity?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
