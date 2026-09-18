const { test, expect } = require('@playwright/test');
const { login, gotoPanel, readKpis, readLabeledNumber, labeledValue, parseNum } = require('./helpers/app');

async function setNumber(page, label, value) {
  await page.locator('label', { hasText: new RegExp(`^${label}$`) }).first()
    .locator('xpath=following-sibling::input[1]').fill(String(value));
}

async function setSelect(page, label, value) {
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
  await page.locator('label', { hasText: new RegExp(`^${label}$`) }).first()
    .locator('xpath=following-sibling::select[1]').selectOption(value);
}

test.describe('Cross-cutting: recalculation across panels', () => {
  test('KPI bar updates live as inputs change (no navigation required)', async ({ page }) => {
    await login(page);
    const before = await readKpis(page);

    await setNumber(page, 'Total users', 250);
    await expect
      .poll(async () => (await readKpis(page)).effort, { timeout: 5000 })
      .toBeGreaterThan(before.effort);

    const after = await readKpis(page);
    expect(after.months).toBeGreaterThanOrEqual(before.months);
    expect(after.support).toBeGreaterThan(before.support);
  });

  test('a single input change propagates to every downstream panel', async ({ page }) => {
    await login(page);
    const before = await readKpis(page);

    await setNumber(page, 'Companies', 5);
    const after = await readKpis(page);
    expect(after.effort).toBeGreaterThan(before.effort);

    // Dashboard
    await gotoPanel(page, 'Dashboard');
    expect(await readLabeledNumber(page, 'Expected effort', 1)).toBe(after.effort);

    // Timeline
    await gotoPanel(page, 'Timeline');
    const weeks = Math.max(8, Math.min(64, Math.round(3 + after.effort / 225)));
    await expect(page.getByText(`Indicative phase plan over ${weeks} weeks`, { exact: false })).toBeVisible();

    // Team
    await gotoPanel(page, 'Team');
    await expect(page.getByText(`Recommended delivery team of ${after.team} peak FTE`, { exact: false })).toBeVisible();

    // Governance
    await gotoPanel(page, 'Governance');
    await expect(page.getByText('Estimate covers 5 companies / 2 legal entities as specified.')).toBeVisible();

    // Discovery
    await gotoPanel(page, 'Discovery Qs');
    await expect(page.getByText(/across the 5 companies \/ 2 legal entities/)).toBeVisible();

    // Executive Summary
    await gotoPanel(page, 'Executive Summary');
    await expect(page.getByText(/covering 21 modules across 5 companies/)).toBeVisible();

    // Scenarios (Scenario B mirrors the live estimate)
    await gotoPanel(page, 'Scenarios');
    const bEffort = parseNum(
      await page.getByRole('row', { name: /^Effort \(h\)/ }).getByRole('cell').nth(2).innerText()
    );
    expect(bEffort).toBe(after.effort);
  });

  test('support model changes only the monthly support KPI', async ({ page }) => {
    await login(page);
    const before = await readKpis(page);

    await setSelect(page, 'Support model', '24x7');
    const after = await readKpis(page);

    expect(after.support).toBeCloseTo(before.support * 1.6, 0);
    expect(after.effort).toBeGreaterThan(before.effort); // hypercare workstream also grows
  });

  test('contingency override flows into the dashboard', async ({ page }) => {
    await login(page);
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
    await setNumber(page, 'Contingency override %', 30);

    await gotoPanel(page, 'Dashboard');
    expect(await readLabeledNumber(page, 'Contingency')).toBe(30);

    const base = await readLabeledNumber(page, 'Base effort');
    const total = await readLabeledNumber(page, 'Expected effort', 1);
    expect(Math.abs(total - base * 1.3)).toBeLessThanOrEqual(2);
  });

  test('confidence KPI degrades when key inputs are unknown', async ({ page }) => {
    await login(page);
    expect((await readKpis(page)).confidence).toBe('High');

    await setSelect(page, 'Data quality', 'Unknown');
    await setNumber(page, 'Concurrent users (if known)', 0);
    await setSelect(page, 'Customer availability', 'Unknown');

    await expect.poll(async () => (await readKpis(page)).confidence, { timeout: 5000 }).toBe('Medium');
  });

  test('spot-check: licensing, duration, team and contingency formulas agree end-to-end', async ({ page }) => {
    await login(page);
    const kpi = await readKpis(page);

    // duration: weeks = clamp(round(3 + total/225), 8, 64); months = weeks / 4.345
    const weeks = Math.max(8, Math.min(64, Math.round(3 + kpi.effort / 225)));
    expect(kpi.months).toBeCloseTo(weeks / 4.345, 1);

    // peak FTE = clamp(round(total / (weeks * 31)), 2, 22)
    expect(kpi.team).toBe(Math.max(2, Math.min(22, Math.round(kpi.effort / (weeks * 31)))));

    // monthly support: (80 * (1 + bandIndex*0.11) + max(0, scope-3)*8) * 1.0 * 1.0
    // defaults: Medium volume (80), 85 users -> band index 3, 4 scope items -> +8
    expect(kpi.support).toBe(Math.round(80 * (1 + 3 * 0.11) + 8));

    // licensing
    await gotoPanel(page, 'Licensing & Costs');
    await expect(labeledValue(page, 'Recommended tier')).toHaveText('Essentials');
    expect(await readLabeledNumber(page, 'Est. monthly cost')).toBe(77 * 80 + 8 * 8 + 2 * 80);

    // contingency
    await gotoPanel(page, 'Dashboard');
    const base = await readLabeledNumber(page, 'Base effort');
    expect(Math.abs(kpi.effort - base * 1.15)).toBeLessThanOrEqual(2);
  });
});
