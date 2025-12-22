import type { DailyBuy } from "@common/daily-buy.model";

export interface RequestWithAuth extends Express.Request {
  authType?: "authenticated" | "anonymous";
  sessionId?: string;
}

export interface RateLimitStore {
  [sessionId: string]: {
    count: number;
    resetTime: number;
  };
}

export type DailyBuyData = DailyBuy[];

