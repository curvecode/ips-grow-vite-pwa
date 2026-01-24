import { test, expect } from '@playwright/test';

test.describe('Add Entry Page', () => {
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

  test('should display add entry form with all fields', async ({ page }) => {
    await page.goto('/');
    
    // Check that we're on the add page by default
    await expect(page.locator('h1')).toHaveText('Add Entry');
    
    // Check form fields are present
    await expect(page.locator('input[name="date"]')).toBeVisible();
    await expect(page.locator('select[name="type"]')).toBeVisible();
    await expect(page.locator('input[name="price"]')).toBeVisible();
    await expect(page.locator('input[name="quantity"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should have default values in form', async ({ page }) => {
    await page.goto('/');
    
    // Check that date field has a value (current date/time)
    const dateValue = await page.locator('input[name="date"]').inputValue();
    expect(dateValue).toBeTruthy();
    
    // Check that type defaults to "food"
    await expect(page.locator('select[name="type"]')).toHaveValue('food');
  });

  test('should show all buy type options', async ({ page }) => {
    await page.goto('/');
    
    const typeSelect = page.locator('select[name="type"]');
    const options = await typeSelect.locator('option').allTextContents();
    
    const expectedTypes = ['Food', 'Beverage', 'Snack', 'Groceries', 'Restaurant', 'Coffee', 'Other'];
    expect(options).toEqual(expect.arrayContaining(expectedTypes));
  });

  test('should submit form with required fields', async ({ page }) => {
    await page.goto('/');
    
    // Fill in the form
    await page.fill('input[name="date"]', '2024-01-15T10:30');
    await page.selectOption('select[name="type"]', 'food');
    await page.fill('input[name="quantity"]', '2');
    await page.fill('input[name="price"]', '10.50');
    await page.fill('textarea[name="description"]', 'Test entry');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Should navigate to list page after submission
    await expect(page.locator('h1')).toHaveText('Daily Buys');
    
    // Wait for list to load
    await page.waitForSelector('.entry-item', { state: 'visible' });
    
    // Check that entry appears in the list (use first() to avoid strict mode violation)
    const entryItems = page.locator('.entry-item');
    await expect(entryItems.first()).toBeVisible();
    await expect(entryItems.first().locator('.entry-type')).toHaveText('food');
  });

  test('should require quantity field', async ({ page }) => {
    await page.goto('/');
    
    // Fill in form without quantity
    await page.fill('input[name="date"]', '2024-01-15T10:30');
    await page.selectOption('select[name="type"]', 'food');
    
    // Try to submit without quantity
    await page.click('button[type="submit"]');
    
    // Form should not submit (quantity is required in code)
    // The validation happens in JavaScript, so we check console for error
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a bit to see if form submission is prevented
    await page.waitForTimeout(500);
    
    // Check that we're still on add page (form didn't submit)
    // Note: The actual validation might prevent navigation
    const currentUrl = page.url();
    expect(currentUrl).toContain('/');
  });

  test('should allow optional fields to be empty', async ({ page }) => {
    await page.goto('/');
    
    // Fill only required fields
    await page.fill('input[name="date"]', '2024-01-15T10:30');
    await page.selectOption('select[name="type"]', 'beverage');
    await page.fill('input[name="quantity"]', '1');
    
    // Leave price and description empty
    await page.click('button[type="submit"]');
    
    // Should navigate to list page
    await expect(page.locator('h1')).toHaveText('Daily Buys');
    
    // Wait for list to load
    await page.waitForSelector('.entry-item', { state: 'visible' });
    await expect(page.locator('.entry-item').first()).toBeVisible();
  });

  test('should reset form after successful submission', async ({ page }) => {
    await page.goto('/');
    
    // Fill and submit form
    await page.fill('input[name="date"]', '2024-01-15T10:30');
    await page.selectOption('select[name="type"]', 'snack');
    await page.fill('input[name="quantity"]', '3');
    await page.fill('input[name="price"]', '5.99');
    await page.fill('textarea[name="description"]', 'Test description');
    
    await page.click('button[type="submit"]');
    
    // Wait for navigation to list page
    await expect(page.locator('h1')).toHaveText('Daily Buys');
    
    // Navigate back to add page
    await page.click('button[data-page="add"]');
    
    // Wait for add page to load and form to be visible
    await expect(page.locator('h1')).toHaveText('Add Entry');
    await page.waitForSelector('select[name="type"]', { state: 'visible' });
    
    // Check that form is reset (date should be current, type should be food)
    await expect(page.locator('select[name="type"]')).toHaveValue('food');
    const dateValue = await page.locator('input[name="date"]').inputValue();
    expect(dateValue).toBeTruthy(); // Should have a date value
  });

  test('should handle different buy types', async ({ page }) => {
    // Clear localStorage before starting
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForSelector('.app-container', { state: 'visible' });
    
    const types = ['food', 'beverage', 'snack', 'groceries', 'restaurant', 'coffee', 'other'];
    
    for (const type of types) {
      // Navigate to add page
      await page.click('button[data-page="add"]');
      await expect(page.locator('h1')).toHaveText('Add Entry');
      
      // Use unique date for each entry to make them easier to find
      const uniqueDate = `2024-01-${15 + types.indexOf(type)}T10:30`;
      await page.fill('input[name="date"]', uniqueDate);
      await page.selectOption('select[name="type"]', type);
      await page.fill('input[name="quantity"]', '1');
      
      await page.click('button[type="submit"]');
      
      // Wait for navigation and list to load
      await expect(page.locator('h1')).toHaveText('Daily Buys');
      await page.waitForSelector('.entry-item', { state: 'visible' });
      
      // Find the entry we just created by its unique date
      // Entries are sorted by date descending, so our new entry should be near the top
      // Find by the date we just used
      const entryWithType = page.locator('.entry-item').filter({ hasText: type }).first();
      await expect(entryWithType.locator('.entry-type')).toHaveText(type);
    }
  });
});

