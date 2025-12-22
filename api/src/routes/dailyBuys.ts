import { Router, type Request, Response } from "express";
import { readDailyBuys, addDailyBuys } from "../storage";
import type { DailyBuy } from "../../common/daily-buy.model";
import type { RequestWithAuth } from "../types";

const router = Router();

/**
 * GET /api/daily-buys
 * Get all daily buy entries
 */
router.get("/", (req: Request, res: Response) => {
  try {
    const entries = readDailyBuys();
    res.json({
      success: true,
      data: entries,
      count: entries.length,
    });
  } catch (error) {
    console.error("Error fetching daily buys:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch daily buys",
    });
  }
});

/**
 * POST /api/daily-buys
 * Add one or more daily buy entries
 * Body: DailyBuy | DailyBuy[]
 */
router.post("/", (req: RequestWithAuth, res: Response) => {
  try {
    const body = req.body;
    
    // Validate request body
    if (!body) {
      return res.status(400).json({
        success: false,
        error: "Request body is required",
      });
    }

    // Handle both single entry and array of entries
    let entriesToAdd: DailyBuy[];
    
    if (Array.isArray(body)) {
      entriesToAdd = body;
    } else {
      entriesToAdd = [body];
    }

    // Validate entries
    if (entriesToAdd.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one entry is required",
      });
    }

    // Validate each entry
    for (const entry of entriesToAdd) {
      if (!entry.id || !entry.date || !entry.type) {
        return res.status(400).json({
          success: false,
          error: "Invalid entry: id, date, and type are required",
          entry,
        });
      }
    }

    // Add timestamps if not present
    const now = new Date().toISOString();
    const processedEntries: DailyBuy[] = entriesToAdd.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt || now,
      updatedAt: now,
    }));

    // Save to storage
    const allEntries = addDailyBuys(processedEntries);

    res.status(201).json({
      success: true,
      data: processedEntries,
      count: processedEntries.length,
      totalCount: allEntries.length,
      message: `Successfully added ${processedEntries.length} entry(ies)`,
    });
  } catch (error) {
    console.error("Error adding daily buys:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add daily buys",
    });
  }
});

export default router;

