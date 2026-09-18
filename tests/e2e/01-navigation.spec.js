const { test, expect } = require('@playwright/test');
const { login, gotoPanel, PANELS, readKpis } = require('./helpers/app');

test.describe('Cross-cutting: gate + navigation', () => {
  test('password gate rejects wrong password and accepts correct one', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'BC Deal Sizer' })).toBeVisible();

    await page.locator('#username').fill('QA Automation');
    await page.locator('#password').fill('definitely-wrong');
    await page.getByRole('button', { name: 'View Estimate' }).click();
    await expect(page.getByText('Incorrect password')).toBeVisible();

    await page.locator('#password').fill(process.env.VIEW_PASSWORD || 'testpass123');
    await page.getByRole('button', { name: 'View Estimate' }).click();
    await expect(page.getByRole('heading', { name: 'Pre-Sales Inputs' })).toBeVisible();
    await expect(page.getByText('Logged in as:')).toBeVisible();
  });

  test('gate validates empty fields', async ({ page }) => {
    await page.goto('/');
    await page.locator('#username').fill('');
    await page.getByRole('button', { name: 'View Estimate' }).click();
    await expect(page.getByText('Please enter your name')).toBeVisible();

    await page.locator('#username').fill('QA Automation');
    await page.getByRole('button', { name: 'View Estimate' }).click();
    await expect(page.getByText('Please enter the password')).toBeVisible();
  });

  test('all 10 sidebar panels are present and navigable', async ({ page }) => {
    await login(page);

    const navButtons = page.locator('aside button');
    await expect(navButtons).toHaveCount(10);

    for (const [label, heading] of PANELS) {
      await gotoPanel(page, label);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      // KPI bar must stay mounted on every panel
      await expect(page.getByText('Expected effort').first()).toBeVisible();
    }
  });

  test('active nav item is highlighted and panels swap (only one panel rendered)', async ({ page }) => {
    await login(page);
    await gotoPanel(page, 'Dashboard');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Delivery & Estimate Dashboard');

    const activeClass = await page
      .locator('aside button', { hasText: 'Dashboard' })
      .first()
      .getAttribute('class');
    expect(activeClass).toMatch(/active/i);
  });

  test('KPI bar renders all six chips with plausible values', async ({ page }) => {
    await login(page);
    const kpi = await readKpis(page);

    expect(kpi.effort).toBeGreaterThan(0);
    expect(kpi.months).toBeGreaterThan(0);
    expect(kpi.team).toBeGreaterThanOrEqual(2);
    expect(kpi.support).toBeGreaterThan(0);
    expect(['Simple', 'Moderate', 'Complex', 'Highly Complex']).toContain(kpi.complexity);
    expect(['Low', 'Medium', 'High']).toContain(kpi.confidence);
  });

  test('logout returns to the password gate', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: /Logout/ }).click();
    await expect(page.getByRole('button', { name: 'View Estimate' })).toBeVisible();
  });

  test('no uncaught page errors while visiting every panel', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await login(page);
    for (const [label] of PANELS) {
      await gotoPanel(page, label);
      await page.waitForTimeout(150);
    }
    expect(pageErrors).toEqual([]);
  });
});
