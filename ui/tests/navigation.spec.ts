import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test('should navigate between add and list pages', async ({ page }) => {
    await page.goto('/');
    
    // Should start on add page
    await expect(page.locator('h1')).toHaveText('Add Entry');
    await expect(page.locator('button[data-page="add"]')).toHaveClass(/active/);
    
    // Navigate to list page
    await page.click('button[data-page="list"]');
    await expect(page.locator('h1')).toHaveText('Daily Buys');
    await expect(page.locator('button[data-page="list"]')).toHaveClass(/active/);
    
    // Navigate back to add page
    await page.click('button[data-page="add"]');
    await expect(page.locator('h1')).toHaveText('Add Entry');
    await expect(page.locator('button[data-page="add"]')).toHaveClass(/active/);
  });

  test('should highlight active tab', async ({ page }) => {
    await page.goto('/');
    
    // Add tab should be active initially
    const addTab = page.locator('button[data-page="add"]');
    await expect(addTab).toHaveClass(/active/);
    
    // List tab should not be active
    const listTab = page.locator('button[data-page="list"]');
    await expect(listTab).not.toHaveClass(/active/);
    
    // Click list tab
    await listTab.click();
    
    // List tab should now be active
    await expect(listTab).toHaveClass(/active/);
    await expect(addTab).not.toHaveClass(/active/);
  });

  test('should display correct icons in navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check navigation icons
    const addTab = page.locator('button[data-page="add"]');
    const listTab = page.locator('button[data-page="list"]');
    
    await expect(addTab.locator('.nav-icon')).toHaveText('➕');
    await expect(listTab.locator('.nav-icon')).toHaveText('📋');
  });

  test('should display correct labels in navigation', async ({ page }) => {
    await page.goto('/');
    
    const addTab = page.locator('button[data-page="add"]');
    const listTab = page.locator('button[data-page="list"]');
    
    await expect(addTab.locator('.nav-label')).toHaveText('Add');
    await expect(listTab.locator('.nav-label')).toHaveText('List');
  });

  test('should navigate to list page after form submission', async ({ page }) => {
    await page.goto('/');
    
    // Fill and submit form
    await page.fill('input[name="date"]', '2024-01-15T10:30');
    await page.selectOption('select[name="type"]', 'food');
    await page.fill('input[name="quantity"]', '1');
    
    await page.click('button[type="submit"]');
    
    // Should automatically navigate to list page
    await expect(page.locator('h1')).toHaveText('Daily Buys');
    await expect(page.locator('button[data-page="list"]')).toHaveClass(/active/);
  });
});

