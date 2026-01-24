import { test, expect } from '@playwright/test';

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test('should display theme toggle button', async ({ page }) => {
    await page.goto('/');
    
    const themeToggle = page.locator('#themeToggle');
    await expect(themeToggle).toBeVisible();
    await expect(themeToggle).toHaveAttribute('aria-label', 'Toggle theme');
  });

  test('should toggle theme when clicked', async ({ page }) => {
    await page.goto('/');
    
    const themeToggle = page.locator('#themeToggle');
    const htmlElement = page.locator('html');
    
    // Get initial theme
    const initialTheme = await htmlElement.getAttribute('data-theme');
    
    // Click theme toggle
    await themeToggle.click();
    
    // Theme should change
    const newTheme = await htmlElement.getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);
    
    // Click again to toggle back
    await themeToggle.click();
    
    const finalTheme = await htmlElement.getAttribute('data-theme');
    expect(finalTheme).toBe(initialTheme);
  });

  test('should update theme icon when toggled', async ({ page }) => {
    await page.goto('/');
    
    const themeIcon = page.locator('.theme-icon');
    
    // Get initial icon
    const initialIcon = await themeIcon.textContent();
    
    // Click theme toggle
    await page.locator('#themeToggle').click();
    
    // Icon should change
    const newIcon = await themeIcon.textContent();
    expect(newIcon).not.toBe(initialIcon);
    
    // Should be either 🌙 or ☀️
    expect(['🌙', '☀️']).toContain(newIcon);
  });

  test('should persist theme preference in localStorage', async ({ page }) => {
    await page.goto('/');
    
    // Toggle theme
    await page.locator('#themeToggle').click();
    
    // Get theme from localStorage
    const savedTheme = await page.evaluate(() => {
      return localStorage.getItem('theme');
    });
    
    expect(['light', 'dark']).toContain(savedTheme);
    
    // Reload page
    await page.reload();
    
    // Theme should be persisted
    const htmlElement = page.locator('html');
    const persistedTheme = await htmlElement.getAttribute('data-theme');
    expect(persistedTheme).toBe(savedTheme);
  });

  test('should respect system preference on first load', async ({ page }) => {
    // This test checks that theme defaults to system preference
    // when no saved preference exists
    
    await page.goto('/');
    
    // Clear theme from localStorage
    await page.evaluate(() => {
      localStorage.removeItem('theme');
    });
    
    // Reload to trigger default theme detection
    await page.reload();
    
    // Theme should be set (either light or dark based on system)
    const htmlElement = page.locator('html');
    const theme = await htmlElement.getAttribute('data-theme');
    expect(['light', 'dark']).toContain(theme);
  });

  test('should maintain theme across page navigation', async ({ page }) => {
    await page.goto('/');
    
    // Set theme to dark
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    
    // Navigate to list page
    await page.click('button[data-page="list"]');
    
    // Theme should still be dark
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveAttribute('data-theme', 'dark');
    
    // Navigate back to add page
    await page.click('button[data-page="add"]');
    
    // Theme should still be dark
    await expect(htmlElement).toHaveAttribute('data-theme', 'dark');
  });
});

