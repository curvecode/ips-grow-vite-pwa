import type { Response, NextFunction } from "express";
import type { RequestWithAuth, RateLimitStore } from "../types";

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_MINUTE = 60; // 60 requests per minute per session

const rateLimitStore: RateLimitStore = {};

/**
 * Generate or get session ID from request
 */
function getSessionId(req: RequestWithAuth): string {
  // Use IP address + user agent as session identifier
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";
  return `${ip}-${userAgent}`;
}

/**
 * Rate limiting middleware - per minute per session
 */
export function rateLimitMiddleware(
  req: RequestWithAuth,
  res: Response,
  next: NextFunction
) {
  const sessionId = getSessionId(req);
  req.sessionId = sessionId;

  const now = Date.now();
  const sessionData = rateLimitStore[sessionId];

  // Initialize or reset if window expired
  if (!sessionData || now > sessionData.resetTime) {
    rateLimitStore[sessionId] = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
    return next();
  }

  // Increment count
  sessionData.count++;

  // Check if limit exceeded
  if (sessionData.count > MAX_REQUESTS_PER_MINUTE) {
    const resetTime = new Date(sessionData.resetTime).toISOString();
    return res.status(429).json({
      error: "Too Many Requests",
      message: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_MINUTE} requests per minute.`,
      retryAfter: Math.ceil((sessionData.resetTime - now) / 1000),
      resetTime,
    });
  }

  // Add rate limit headers
  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS_PER_MINUTE);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, MAX_REQUESTS_PER_MINUTE - sessionData.count));
  res.setHeader("X-RateLimit-Reset", new Date(sessionData.resetTime).toISOString());

  next();
}

/**
 * Clean up expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((sessionId) => {
    if (rateLimitStore[sessionId].resetTime < now) {
      delete rateLimitStore[sessionId];
    }
  });
}, RATE_LIMIT_WINDOW);

