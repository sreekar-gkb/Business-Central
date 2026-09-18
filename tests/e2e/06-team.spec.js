const { test, expect } = require('@playwright/test');
const { login, gotoPanel, readKpis, parseNum } = require('./helpers/app');

test.describe('Panel 5 - Team', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await gotoPanel(page, 'Team');
  });

  test('renders both cards and the peak-team summary line', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Project Team & Customer Responsibilities' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recommended delivery team' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Customer responsibilities' })).toBeVisible();

    const kpi = await readKpis(page);
    await expect(page.getByText(`Recommended delivery team of ${kpi.team} peak FTE`, { exact: false })).toBeVisible();
  });

  test('role bars render with FTE values and proportional widths', async ({ page }) => {
    const fteTexts = await page.evaluate(() =>
      [...document.querySelectorAll('div')]
        .filter((d) => /^\d+(\.\d+)? FTE$/.test(d.textContent.trim()) && d.children.length === 0)
        .map((d) => d.textContent.trim())
    );
    expect(fteTexts.length).toBeGreaterThanOrEqual(8);

    const widths = await page.evaluate(() =>
      [...document.querySelectorAll('div[style*="width"]')]
        .map((d) => parseFloat(d.style.width))
        .filter((n) => !Number.isNaN(n))
    );
    expect(widths.length).toBe(fteTexts.length);

    // width % should equal FTE * 100 (capped at 100)
    fteTexts.forEach((t, i) => {
      const fte = parseNum(t);
      expect(fte).toBeGreaterThanOrEqual(0.1);
      expect(Math.abs(Math.min(100, fte * 100) - widths[i])).toBeLessThanOrEqual(6);
    });
  });

  test('summed role FTE is consistent with total effort / duration', async ({ page }) => {
    const kpi = await readKpis(page);
    const weeks = Math.max(8, Math.min(64, Math.round(3 + kpi.effort / 225)));

    const fteSum = (
      await page.evaluate(() =>
        [...document.querySelectorAll('div')]
          .filter((d) => /^\d+(\.\d+)? FTE$/.test(d.textContent.trim()) && d.children.length === 0)
          .map((d) => parseFloat(d.textContent))
      )
    ).reduce((a, b) => a + b, 0);

    const implied = kpi.effort / (weeks * 31);
    // averaged FTE across the project; rounding + the 0.1 floor per role inflate it slightly
    expect(fteSum).toBeGreaterThan(implied * 0.8);
    expect(fteSum).toBeLessThan(implied * 1.6);
    expect(kpi.team).toBe(Math.max(2, Math.min(22, Math.round(kpi.effort / (weeks * 31)))));
  });

  test('customer responsibilities list renders every item', async ({ page }) => {
    const card = page.locator('div', { has: page.getByRole('heading', { name: 'Customer responsibilities' }) }).last();
    const items = card.locator('ul li');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(6);
    for (let i = 0; i < count; i++) {
      await expect(items.nth(i)).not.toBeEmpty();
    }
    await expect(card.getByText('Nominate a single accountable product owner for the engagement.')).toBeVisible();
  });

  test('team sizing recalculates from inputs', async ({ page }) => {
    const before = (await readKpis(page)).team;

    await gotoPanel(page, 'Inputs');
    await page.locator('label', { hasText: /^Companies$/ }).first()
      .locator('xpath=following-sibling::input[1]').fill('6');
    await gotoPanel(page, 'Team');

    const after = (await readKpis(page)).team;
    expect(after).toBeGreaterThanOrEqual(before);
    await expect(page.getByText(`Recommended delivery team of ${after} peak FTE`, { exact: false })).toBeVisible();
  });
});
