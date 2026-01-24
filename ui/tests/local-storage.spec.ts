import { test, expect } from '@playwright/test';

test.describe('Local Storage Integration', () => {
  test.beforeEach(async ({ page, context }) => {
    // Intercept API calls to prevent loading data from API
    await page.route('**/api/**', route => route.abort());
    await page.route('**/health', route => route.abort());
    
    // Clear all storage before each test
    await context.clearCookies();
    await page.goto('/');
    
    // Wait for app to initialize
    await page.waitForSelector('.app-container', { state: 'visible' });
    await page.waitForTimeout(1000); // Wait for API calls to complete (they'll fail)
    
    // Clear localStorage after app initialization
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    // Wait for app to be ready
    await page.waitForSelector('.app-container', { state: 'visible' });
    await page.waitForTimeout(300);
  });

  test('should persist entries in localStorage', async ({ page }) => {
    // Ensure localStorage is completely empty before starting
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForSelector('.app-container', { state: 'visible' });
    await page.waitForTimeout(300);
    
    // Add an entry with a unique description
    const uniqueDescription = `Persisted entry ${Date.now()}`;
    await page.fill('input[name="date"]', '2024-01-15T10:30');
    await page.selectOption('select[name="type"]', 'food');
    await page.fill('input[name="quantity"]', '2');
    await page.fill('input[name="price"]', '10.50');
    await page.fill('textarea[name="description"]', uniqueDescription);
    
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await expect(page.locator('h1')).toHaveText('Daily Buys');
    await page.waitForTimeout(300);
    
    // Check that entry is in localStorage
    const entries = await page.evaluate(() => {
      const stored = localStorage.getItem('dailyBuyEntries');
      return stored ? JSON.parse(stored) : [];
    });
    
    // Find our specific entry
    const testEntry = entries.find((e: any) => e.description === uniqueDescription);
    expect(testEntry).toBeDefined();
    expect(testEntry.type).toBe('food');
    expect(testEntry.quantity).toBe(2);
    expect(testEntry.price).toBe(10.50);
    expect(testEntry.description).toBe(uniqueDescription);
  });

  test('should load entries from localStorage on page load', async ({ page }) => {
    // Clear localStorage first
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    // Pre-populate localStorage with only our test entry
    await page.evaluate(() => {
      const testEntries = [
        {
          id: 'test-1',
          date: '2024-01-15T10:30:00.000Z',
          type: 'food',
          amount: 0,
          quantity: 2,
          price: 10.50,
          description: 'Pre-loaded entry',
          createdAt: '2024-01-15T10:30:00.000Z',
        },
      ];
      localStorage.setItem('dailyBuyEntries', JSON.stringify(testEntries));
    });
    
    // Reload page
    await page.reload();
    await page.waitForSelector('.app-container', { state: 'visible' });
    
    // Navigate to list page
    await page.click('button[data-page="list"]');
    
    // Wait for list to load
    await page.waitForSelector('.entry-item, .empty-state', { state: 'visible' });
    
    // Entry should be displayed - find by description to be specific
    const entryWithDescription = page.locator('.entry-item').filter({ hasText: 'Pre-loaded entry' });
    await expect(entryWithDescription).toBeVisible();
    await expect(entryWithDescription.locator('.entry-description')).toHaveText('Pre-loaded entry');
  });

  test('should handle multiple entries in localStorage', async ({ page }) => {
    // Clear localStorage first
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForSelector('.app-container', { state: 'visible' });
    await page.waitForTimeout(300);
    
    // Use unique prefix to avoid conflicts with other tests
    const uniquePrefix = `MultiTest-${Date.now()}`;
    
    // Add multiple entries with unique descriptions to track them
    for (let i = 1; i <= 3; i++) {
      await page.fill('input[name="date"]', `2024-01-${15 + i}T10:30`);
      await page.selectOption('select[name="type"]', 'food');
      await page.fill('input[name="quantity"]', i.toString());
      await page.fill('input[name="price"]', (i * 10).toString());
      await page.fill('textarea[name="description"]', `${uniquePrefix} entry ${i}`);
      
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      await expect(page.locator('h1')).toHaveText('Daily Buys');
      await page.waitForTimeout(200);
      
      // Navigate back to add page for next entry
      if (i < 3) {
        await page.click('button[data-page="add"]');
        await expect(page.locator('h1')).toHaveText('Add Entry');
        await page.waitForTimeout(200);
      }
    }
    
    // Check all entries are in localStorage
    const entries = await page.evaluate(() => {
      const stored = localStorage.getItem('dailyBuyEntries');
      return stored ? JSON.parse(stored) : [];
    });
    
    // Filter to only our test entries using the unique prefix
    const testEntries = entries.filter((e: any) => 
      e.description && e.description.startsWith(uniquePrefix)
    );
    expect(testEntries).toHaveLength(3);
  });

  test('should remove entry from localStorage when deleted', async ({ page }) => {
    await page.goto('/');
    
    // Clear localStorage first
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForSelector('.app-container', { state: 'visible' });
    
    // Add an entry with unique description
    await page.fill('input[name="date"]', '2024-01-15T10:30');
    await page.selectOption('select[name="type"]', 'food');
    await page.fill('input[name="quantity"]', '1');
    await page.fill('textarea[name="description"]', 'Entry to delete');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await expect(page.locator('h1')).toHaveText('Daily Buys');
    await page.waitForSelector('.entry-item', { state: 'visible' });
    
    // Get entry count before delete
    const entriesBeforeDelete = await page.evaluate(() => {
      const stored = localStorage.getItem('dailyBuyEntries');
      return stored ? JSON.parse(stored) : [];
    });
    const initialCount = entriesBeforeDelete.length;
    expect(initialCount).toBeGreaterThan(0);
    
    // Find the entry we just created and delete it
    const entryToDelete = page.locator('.entry-item').filter({ hasText: 'Entry to delete' });
    const deleteButton = entryToDelete.locator('.delete-btn');
    
    // Set up dialog handler for confirmation
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    
    await deleteButton.click();
    
    // Wait for deletion to complete
    await page.waitForTimeout(500);
    
    // Check entry is removed from localStorage
    const entriesAfterDelete = await page.evaluate(() => {
      const stored = localStorage.getItem('dailyBuyEntries');
      return stored ? JSON.parse(stored) : [];
    });
    
    // Should have one less entry
    expect(entriesAfterDelete.length).toBe(initialCount - 1);
    
    // Verify our specific entry is gone
    const deletedEntry = entriesAfterDelete.find((e: any) => e.description === 'Entry to delete');
    expect(deletedEntry).toBeUndefined();
  });

  test('should handle empty localStorage gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Ensure localStorage is completely empty
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    await page.reload();
    await page.waitForSelector('.app-container', { state: 'visible' });
    await page.waitForTimeout(300);
    
    // Navigate to list page
    await page.click('button[data-page="list"]');
    
    // Wait for either empty state or entries to appear
    await page.waitForSelector('.empty-state, .entry-item', { state: 'visible', timeout: 5000 });
    
    // Should show empty state (check that empty state exists and entries don't)
    const emptyState = page.locator('.empty-state');
    const entryItems = page.locator('.entry-item');
    
    // Either empty state is visible, or there are no entries
    const emptyStateVisible = await emptyState.isVisible().catch(() => false);
    const entryCount = await entryItems.count();
    
    expect(emptyStateVisible || entryCount === 0).toBeTruthy();
    
    // If empty state is visible, verify its content
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
      await expect(page.locator('.empty-text')).toHaveText('No entries yet');
    }
  });
});

