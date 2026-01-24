import { Page } from '@playwright/test';

/**
 * Helper functions for Playwright tests
 */

/**
 * Clear all localStorage data
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
  });
}

/**
 * Create a test entry in localStorage
 */
export async function createTestEntry(
  page: Page,
  entry: {
    id?: string;
    date: string;
    type: string;
    quantity: number;
    price?: number;
    description?: string;
  }
): Promise<void> {
  await page.evaluate((entryData) => {
    const entries = JSON.parse(localStorage.getItem('dailyBuyEntries') || '[]');
    entries.push({
      id: entryData.id || crypto.randomUUID(),
      date: entryData.date,
      type: entryData.type,
      amount: 0,
      quantity: entryData.quantity,
      price: entryData.price,
      description: entryData.description,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem('dailyBuyEntries', JSON.stringify(entries));
  }, entry);
}

/**
 * Get all entries from localStorage
 */
export async function getEntriesFromStorage(page: Page): Promise<any[]> {
  return await page.evaluate(() => {
    const stored = localStorage.getItem('dailyBuyEntries');
    return stored ? JSON.parse(stored) : [];
  });
}

/**
 * Wait for page to be fully loaded and initialized
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Wait for the app container to be visible
  await page.waitForSelector('.app-container', { state: 'visible' });
  // Wait a bit more for any async initialization
  await page.waitForTimeout(500);
}

