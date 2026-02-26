import type { Request } from "express";
import type { DailyBuy } from "./models/dailyBuy";

export interface RequestWithAuth extends Request {
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

