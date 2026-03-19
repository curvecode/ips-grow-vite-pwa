import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { DailyBuy } from "../../common/daily-buy.model";

const DATA_FILE = join(process.cwd(), "data", "daily-buys.json");
const DATA_DIR = join(process.cwd(), "data");

/**
 * Ensure data directory exists
 */
function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Read daily buys from JSON file
 */
export function readDailyBuys(): DailyBuy[] {
  ensureDataDir();

  if (!existsSync(DATA_FILE)) {
    return [];
  }

  try {
    const data = readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading daily buys:", error);
    return [];
  }
}

/**
 * Write daily buys to JSON file
 */
export function writeDailyBuys(entries: DailyBuy[]): void {
  ensureDataDir();

  try {
    writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing daily buys:", error);
    throw new Error("Failed to save daily buys");
  }
}

/**
 * Add new daily buy entries
 */
export function addDailyBuys(newEntries: DailyBuy[]): DailyBuy[] {
  const existing = readDailyBuys();
  const existingIds = new Set(existing.map((e) => e.id));
  const uniqueNewEntries = newEntries.filter((e) => !existingIds.has(e.id));
  const updated = [...existing, ...uniqueNewEntries];
  writeDailyBuys(updated);
  return updated;
}

/**
 * Delete a daily buy entry by ID
 */
export function deleteDailyBuy(id: string): DailyBuy[] {
  const existing = readDailyBuys();
  const updated = existing.filter((entry) => entry.id !== id);
  writeDailyBuys(updated);
  return updated;
}

/**
 * Update an existing daily buy entry
 */
export function updateDailyBuy(updatedEntry: DailyBuy): DailyBuy {
  const existing = readDailyBuys();
  const index = existing.findIndex((entry) => entry.id === updatedEntry.id);

  if (index === -1) {
    throw new Error(`Entry with ID ${updatedEntry.id} not found`);
  }

  existing[index] = {
    ...existing[index],
    ...updatedEntry,
    updatedAt: new Date().toISOString(),
  };

  writeDailyBuys(existing);
  return existing[index];
}
