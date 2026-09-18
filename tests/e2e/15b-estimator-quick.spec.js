const { test, expect } = require('@playwright/test');

test.describe('BC Estimator - Quick Smoke Tests', () => {

  test('SMOKE-001: Page loads and initializes', async ({ page }) => {
    await page.goto('http://localhost:8000/estimator.html');

    // Check main elements exist
    const app = page.locator('.app');
    await expect(app).toBeVisible();

    const rail = page.locator('.rail');
    await expect(rail).toBeVisible();
  });

  test('SMOKE-002: Navigation works', async ({ page }) => {
    await page.goto('http://localhost:8000/estimator.html');

    // Click Dashboard
    await page.click('text=Dashboard');

    // Wait for panel to show
    const dashboardPanel = page.locator('#panel-dashboard');
    await expect(dashboardPanel).toBeVisible();
  });

  test('SMOKE-003: Form fields are interactive', async ({ page }) => {
    await page.goto('http://localhost:8000/estimator.html');

    // Change a value
    await page.fill('#f_users', '50');

    // Verify it changed
    const value = await page.inputValue('#f_users');
    expect(value).toBe('50');
  });

  test('SMOKE-004: KPI metrics display', async ({ page }) => {
    await page.goto('http://localhost:8000/estimator.html');

    const kpiBar = page.locator('.kpibar');
    await expect(kpiBar).toBeVisible();

    const chips = page.locator('.kpi-chip');
    const count = await chips.count();
    expect(count).toBeGreaterThan(3);
  });

});
