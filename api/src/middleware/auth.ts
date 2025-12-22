import type { Request, Response, NextFunction } from "express";
import type { RequestWithAuth } from "../types";

/**
 * Middleware to verify authentication header
 * Expects 'X-Auth-Type' header with value 'authenticated' or 'anonymous'
 */
export function authMiddleware(
  req: RequestWithAuth,
  res: Response,
  next: NextFunction
) {
  const authType = req.headers["x-auth-type"] as string;

  if (!authType) {
    return res.status(400).json({
      error: "Missing X-Auth-Type header",
      message: "Please provide X-Auth-Type header with value 'authenticated' or 'anonymous'",
    });
  }

  if (authType !== "authenticated" && authType !== "anonymous") {
    return res.status(400).json({
      error: "Invalid X-Auth-Type header",
      message: "X-Auth-Type must be either 'authenticated' or 'anonymous'",
    });
  }

  req.authType = authType as "authenticated" | "anonymous";
  next();
}

