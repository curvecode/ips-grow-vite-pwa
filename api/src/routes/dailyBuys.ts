import { Router, type Request, type Response } from "express";
import { readDailyBuys, addDailyBuys, deleteDailyBuy } from "../storage";
import type { DailyBuy } from "../models/dailyBuy";
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
router.post("/", (req: RequestWithAuth, res: Response): void => {
  try {
    const body = req.body;
    
    // Validate request body
    if (!body) {
      res.status(400).json({
        success: false,
        error: "Request body is required",
      });
      return;
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
      res.status(400).json({
        success: false,
        error: "At least one entry is required",
      });
      return;
    }

    // Validate each entry
    for (const entry of entriesToAdd) {
      if (!entry.id || !entry.date || !entry.type) {
        res.status(400).json({
          success: false,
          error: "Invalid entry: id, date, and type are required",
          entry,
        });
        return;
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

/**
 * DELETE /api/daily-buys/:id
 * Delete a daily buy entry by ID
 */
router.delete("/:id", (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: "Entry ID is required",
      });
      return;
    }

    const allEntries = deleteDailyBuy(id);

    res.json({
      success: true,
      message: `Successfully deleted entry ${id}`,
      totalCount: allEntries.length,
    });
  } catch (error) {
    console.error("Error deleting daily buy:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete daily buy",
    });
  }
});

export default router;

