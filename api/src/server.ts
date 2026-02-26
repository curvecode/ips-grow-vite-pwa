import express, { type Express } from "express";
import cors from "cors";
import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import dailyBuysRouter from "./routes/dailyBuys";
import { getInterestHistorySummary, getInterestRates } from "./interestRates";

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration - allow requests from UI on localhost (any port)
app.use(
  cors({
    origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/, /\.onrender\.com$/],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Auth-Type"],
    exposedHeaders: ["X-Data-Source", "X-Last-Crawl-At", "X-Selected-Term", "X-Selected-Source"],
  })
);

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set("trust proxy", true);

// Health check endpoint (no auth/rate limit required)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/interest-rates", (req, res) => {
  const termRaw = Number.parseInt(`${req.query.term ?? "12"}`, 10);
  const sourceRaw = typeof req.query.source === "string" ? req.query.source : "thebank";

  const result = getInterestRates(termRaw, sourceRaw);

  res.setHeader("X-Data-Source", result.dataSource);
  res.setHeader("X-Selected-Term", `${result.selectedTerm}`);
  res.setHeader("X-Selected-Source", result.selectedSource);
  if (result.lastCrawlAt) {
    res.setHeader("X-Last-Crawl-At", result.lastCrawlAt);
  }

  res.json(result.data);
});

app.get("/api/history/summary", (req, res) => {
  const sourceRaw = typeof req.query.source === "string" ? req.query.source : "thebank";
  const result = getInterestHistorySummary(sourceRaw);
  res.json(result);
});

// Apply rate limiting and auth middleware to all API routes
app.use("/api", rateLimitMiddleware, authMiddleware);

// API routes
app.use("/api/daily-buys", dailyBuysRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Not found",
    path: req.path,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 API endpoint: http://localhost:${PORT}/api/daily-buys`);
});

