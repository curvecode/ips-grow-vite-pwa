/**
 * Daily Buy Tracking Model
 * Shared type definitions for tracking daily purchases
 */

export interface DailyBuy {
  id: string;
  date: Date | string;
  amount: number;
  type: BuyType;
  description?: string;
  price?: number;
  quantity?: number;
  image?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type BuyType =
  | "food"
  | "beverage"
  | "snack"
  | "groceries"
  | "restaurant"
  | "coffee"
  | "other";

export interface DailyBuySummary {
  date: Date | string;
  totalAmount: number;
  totalPrice: number;
  items: DailyBuy[];
  typeBreakdown: Record<BuyType, number>;
}

export interface DailyBuyFilters {
  startDate?: Date | string;
  endDate?: Date | string;
  type?: BuyType;
  minAmount?: number;
  maxAmount?: number;
}
