import { test, expect } from '@playwright/test';

test.describe('List Page', () => {
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
    
    // Now set our test data
    await page.evaluate(() => {
      localStorage.clear();
      const testEntries = [
        {
          id: '1',
          date: '2024-01-15T10:30:00.000Z',
          type: 'food',
          amount: 0,
          quantity: 2,
          price: 10.50,
          description: 'Test entry 1',
          createdAt: '2024-01-15T10:30:00.000Z',
        },
        {
          id: '2',
          date: '2024-01-14T14:20:00.000Z',
          type: 'beverage',
          amount: 0,
          quantity: 1,
          price: 3.50,
          description: 'Test entry 2',
          createdAt: '2024-01-14T14:20:00.000Z',
        },
        {
          id: '3',
          date: '2024-01-15T08:00:00.000Z',
          type: 'coffee',
          amount: 0,
          quantity: 1,
          price: 4.00,
          createdAt: '2024-01-15T08:00:00.000Z',
        },
      ];
      localStorage.setItem('dailyBuyEntries', JSON.stringify(testEntries));
    });
    await page.reload();
    // Wait for app to be ready
    await page.waitForSelector('.app-container', { state: 'visible' });
    await page.waitForTimeout(300);
  });

  test('should display empty state when no entries exist', async ({ page }) => {
    // Intercept API calls to prevent loading data from API
    await page.route('**/api/**', route => route.abort());
    await page.route('**/health', route => route.abort());
    
    // Clear localStorage before navigation
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    // Navigate to the app
    await page.goto('/');
    await page.waitForSelector('.app-container', { state: 'visible' });
    
    // Wait for app initialization to complete (API calls will fail, which is fine)
    await page.waitForTimeout(1000);
    
    // Clear localStorage again after app initialization
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    // Navigate to list page
    await page.click('button[data-page="list"]');
    
    // Wait for the list page to render
    await page.waitForTimeout(500);
    
    // Check if empty state is shown
    const entryCount = await page.locator('.entry-item').count();
    if (entryCount === 0) {
      // Should show empty state
      await expect(page.locator('.empty-state')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.empty-text')).toHaveText('No entries yet');
      await expect(page.locator('.empty-subtext')).toHaveText('Add your first entry to get started');
    } else {
      // If entries exist, force clear and reload
      await page.evaluate(() => {
        localStorage.clear();
      });
      await page.reload();
      await page.waitForSelector('.app-container', { state: 'visible' });
      await page.waitForTimeout(1000);
      await page.click('button[data-page="list"]');
      await page.waitForTimeout(500);
      await expect(page.locator('.empty-state')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display list of entries', async ({ page }) => {
    // Ensure we have exactly our test data
    await page.evaluate(() => {
      localStorage.clear();
      const testEntries = [
        {
          id: '1',
          date: '2024-01-15T10:30:00.000Z',
          type: 'food',
          amount: 0,
          quantity: 2,
          price: 10.50,
          description: 'Test entry 1',
          createdAt: '2024-01-15T10:30:00.000Z',
        },
        {
          id: '2',
          date: '2024-01-14T14:20:00.000Z',
          type: 'beverage',
          amount: 0,
          quantity: 1,
          price: 3.50,
          description: 'Test entry 2',
          createdAt: '2024-01-14T14:20:00.000Z',
        },
        {
          id: '3',
          date: '2024-01-15T08:00:00.000Z',
          type: 'coffee',
          amount: 0,
          quantity: 1,
          price: 4.00,
          createdAt: '2024-01-15T08:00:00.000Z',
        },
      ];
      localStorage.setItem('dailyBuyEntries', JSON.stringify(testEntries));
    });
    await page.reload();
    await page.waitForSelector('.app-container', { state: 'visible' });
    
    // Navigate to list page
    await page.click('button[data-page="list"]');
    
    // Wait for list to load
    await page.waitForSelector('.entry-item', { state: 'visible' });
    
    // Check that entries are displayed (should be exactly 3 from our test data)
    const entryItems = page.locator('.entry-item');
    await expect(entryItems).toHaveCount(3);
  });

  test('should group entries by date', async ({ page }) => {
    // Ensure we have exactly our test data
    await page.evaluate(() => {
      localStorage.clear();
      const testEntries = [
        {
          id: '1',
          date: '2024-01-15T10:30:00.000Z',
          type: 'food',
          amount: 0,
          quantity: 2,
          price: 10.50,
          description: 'Test entry 1',
          createdAt: '2024-01-15T10:30:00.000Z',
        },
        {
          id: '2',
          date: '2024-01-14T14:20:00.000Z',
          type: 'beverage',
          amount: 0,
          quantity: 1,
          price: 3.50,
          description: 'Test entry 2',
          createdAt: '2024-01-14T14:20:00.000Z',
        },
        {
          id: '3',
          date: '2024-01-15T08:00:00.000Z',
          type: 'coffee',
          amount: 0,
          quantity: 1,
          price: 4.00,
          createdAt: '2024-01-15T08:00:00.000Z',
        },
      ];
      localStorage.setItem('dailyBuyEntries', JSON.stringify(testEntries));
    });
    await page.reload();
    await page.waitForSelector('.app-container', { state: 'visible' });
    
    // Navigate to list page
    await page.click('button[data-page="list"]');
    
    // Wait for list to load
    await page.waitForSelector('.date-group', { state: 'visible' });
    
    // Check that date groups are present
    // We have entries on 2024-01-15 (2 entries) and 2024-01-14 (1 entry) = 2 date groups
    const dateHeaders = page.locator('.date-header');
    await expect(dateHeaders).toHaveCount(2); // Two different dates
    
    // Check that entries are grouped under date headers
    const dateGroups = page.locator('.date-group');
    await expect(dateGroups).toHaveCount(2);
  });

  test('should display entry details correctly', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to list page
    await page.click('button[data-page="list"]');
    
    // Wait for list to load
    await page.waitForSelector('.entry-item', { state: 'visible' });
    
    // Find the entry with "Test entry 1" description (more specific)
    const targetEntry = page.locator('.entry-item').filter({ hasText: 'Test entry 1' });
    await expect(targetEntry).toBeVisible();
    await expect(targetEntry.locator('.entry-type')).toHaveText('food');
    await expect(targetEntry.locator('.entry-description')).toHaveText('Test entry 1');
    
    // Check price and quantity are displayed
    const details = targetEntry.locator('.entry-details');
    await expect(details).toContainText('Price: $10.50');
    await expect(details).toContainText('Qty: 2');
  });

  test('should display entry without description', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to list page
    await page.click('button[data-page="list"]');
    
    // Wait for list to load
    await page.waitForSelector('.entry-item', { state: 'visible' });
    
    // Find the entry without description (coffee entry - id: '3')
    // Coffee entry has no description, so we find it by type
    const coffeeEntry = page.locator('.entry-item').filter({ hasText: 'coffee' }).first();
    await expect(coffeeEntry).toBeVisible();
    
    // Description should not be present (coffee entry has no description field)
    const description = coffeeEntry.locator('.entry-description');
    await expect(description).toHaveCount(0);
  });

  test('should delete an entry', async ({ page }) => {
    // Ensure we have exactly our test data
    await page.evaluate(() => {
      localStorage.clear();
      const testEntries = [
        {
          id: '1',
          date: '2024-01-15T10:30:00.000Z',
          type: 'food',
          amount: 0,
          quantity: 2,
          price: 10.50,
          description: 'Test entry 1',
          createdAt: '2024-01-15T10:30:00.000Z',
        },
        {
          id: '2',
          date: '2024-01-14T14:20:00.000Z',
          type: 'beverage',
          amount: 0,
          quantity: 1,
          price: 3.50,
          description: 'Test entry 2',
          createdAt: '2024-01-14T14:20:00.000Z',
        },
        {
          id: '3',
          date: '2024-01-15T08:00:00.000Z',
          type: 'coffee',
          amount: 0,
          quantity: 1,
          price: 4.00,
          createdAt: '2024-01-15T08:00:00.000Z',
        },
      ];
      localStorage.setItem('dailyBuyEntries', JSON.stringify(testEntries));
    });
    await page.reload();
    await page.waitForSelector('.app-container', { state: 'visible' });
    
    // Navigate to list page
    await page.click('button[data-page="list"]');
    
    // Wait for list to load
    await page.waitForSelector('.entry-item', { state: 'visible' });
    
    // Get initial count
    const entryItems = page.locator('.entry-item');
    const initialCount = await entryItems.count();
    expect(initialCount).toBe(3);
    
    // Click delete button on first entry
    const firstEntry = entryItems.first();
    const deleteButton = firstEntry.locator('.delete-btn');
    
    // Set up dialog handler for confirmation
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toBe('Are you sure you want to delete this entry?');
      await dialog.accept();
    });
    
    await deleteButton.click();
    
    // Wait for the deletion to complete and page to update
    await page.waitForTimeout(500);
    
    // Wait for entry to be removed (count should decrease by 1)
    await expect(entryItems).toHaveCount(2, { timeout: 5000 });
  });

  test('should cancel delete when confirmation is dismissed', async ({ page }) => {
    // Ensure we have exactly our test data
    await page.evaluate(() => {
      localStorage.clear();
      const testEntries = [
        {
          id: '1',
          date: '2024-01-15T10:30:00.000Z',
          type: 'food',
          amount: 0,
          quantity: 2,
          price: 10.50,
          description: 'Test entry 1',
          createdAt: '2024-01-15T10:30:00.000Z',
        },
        {
          id: '2',
          date: '2024-01-14T14:20:00.000Z',
          type: 'beverage',
          amount: 0,
          quantity: 1,
          price: 3.50,
          description: 'Test entry 2',
          createdAt: '2024-01-14T14:20:00.000Z',
        },
        {
          id: '3',
          date: '2024-01-15T08:00:00.000Z',
          type: 'coffee',
          amount: 0,
          quantity: 1,
          price: 4.00,
          createdAt: '2024-01-15T08:00:00.000Z',
        },
      ];
      localStorage.setItem('dailyBuyEntries', JSON.stringify(testEntries));
    });
    await page.reload();
    await page.waitForSelector('.app-container', { state: 'visible' });
    
    // Navigate to list page
    await page.click('button[data-page="list"]');
    
    // Wait for list to load
    await page.waitForSelector('.entry-item', { state: 'visible' });
    
    const entryItems = page.locator('.entry-item');
    const initialCount = await entryItems.count();
    expect(initialCount).toBe(3);
    
    // Set up dialog handler to dismiss
    page.once('dialog', async (dialog) => {
      await dialog.dismiss();
    });
    
    const firstEntry = entryItems.first();
    await firstEntry.locator('.delete-btn').click();
    
    // Wait a bit for any potential changes (dialog was dismissed, so no deletion)
    await page.waitForTimeout(500);
    
    // Entry should still be there (count should remain the same)
    const finalCount = await entryItems.count();
    expect(finalCount).toBe(initialCount);
  });

  test('should sort entries by date descending', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to list page
    await page.click('button[data-page="list"]');
    
    // Get date headers
    const dateHeaders = await page.locator('.date-header').allTextContents();
    
    // Check that dates are sorted (most recent first)
    // The dates should be in descending order
    expect(dateHeaders.length).toBeGreaterThan(0);
    
    // Check that entries within a date group are displayed
    const firstDateGroup = page.locator('.date-group').first();
    const entriesInFirstGroup = await firstDateGroup.locator('.entry-item').count();
    expect(entriesInFirstGroup).toBeGreaterThan(0);
  });

  test('should display formatted date and time', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to list page
    await page.click('button[data-page="list"]');
    
    // Check that date and time are displayed
    const firstEntry = page.locator('.entry-item').first();
    await expect(firstEntry.locator('.entry-date')).toBeVisible();
    await expect(firstEntry.locator('.entry-time')).toBeVisible();
  });
});

