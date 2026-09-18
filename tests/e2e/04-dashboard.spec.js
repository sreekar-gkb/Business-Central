const { test, expect } = require('@playwright/test');
const { login, gotoPanel, labeledValue, readLabeledNumber, readKpis, parseNum } = require('./helpers/app');

test.describe('Panel 3 - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await gotoPanel(page, 'Dashboard');
  });

  test('renders the four stat tiles with a valid effort range', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Delivery & Estimate Dashboard' })).toBeVisible();

    // index 1 because the KPI bar also has an "Expected effort" chip
    const expected = await readLabeledNumber(page, 'Expected effort', 1);
    const contPct = await readLabeledNumber(page, 'Contingency');
    const base = await readLabeledNumber(page, 'Base effort');
    const rangeText = await labeledValue(page, 'Effort range').innerText();
    const [low, high] = rangeText.replace(/,/g, '').match(/\d+/g).map(Number);

    expect(base).toBeGreaterThan(0);
    expect(contPct).toBe(15); // default overall complexity "Moderate" => 15%
    expect(low).toBeLessThan(expected);
    expect(high).toBeGreaterThan(expected);
    expect(Math.abs(expected - base * 1.15)).toBeLessThanOrEqual(2);
  });

  test('effort by workstream bars render with non-zero widths', async ({ page }) => {
    const card = page.locator('div', { has: page.getByRole('heading', { name: 'Effort by Workstream' }) }).last();
    const rows = card.locator('div').filter({ hasText: /\d+\s*h$/ });
    const bars = await card.evaluate((el) => {
      const out = [];
      el.querySelectorAll('div[style*="width"]').forEach((d) => {
        if (d.style.width && d.style.width.endsWith('%')) out.push(parseFloat(d.style.width));
      });
      return out;
    });
    expect(bars.length).toBeGreaterThanOrEqual(8);
    for (const w of bars) {
      expect(w).toBeGreaterThan(0);
      expect(w).toBeLessThanOrEqual(100);
    }
    await expect(card.getByText('Base hours before contingency')).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('effort by role bars render for the delivery roles', async ({ page }) => {
    const card = page.locator('div', { has: page.getByRole('heading', { name: 'Effort by Role' }) }).last();
    const bars = await card.evaluate((el) =>
      [...el.querySelectorAll('div[style*="width"]')].map((d) => parseFloat(d.style.width))
    );
    expect(bars.length).toBeGreaterThanOrEqual(5);
    bars.forEach((w) => expect(w).toBeGreaterThan(0));

    for (const role of ['Solution Architect', 'Project Manager', 'Finance Consultant']) {
      await expect(card.getByText(role, { exact: true }).first()).toBeVisible();
    }
  });

  test('contingency breakdown table is internally consistent', async ({ page }) => {
    const card = page.locator('div', { has: page.getByRole('heading', { name: 'Contingency Breakdown' }) }).last();
    const cells = card.locator('table td');
    const baseVal = parseNum(await cells.nth(1).innerText());
    const contVal = parseNum(await cells.nth(3).innerText());
    const totalVal = parseNum(await cells.nth(5).innerText());

    await expect(cells.nth(2)).toContainText('Contingency (15%)');
    expect(Math.abs(baseVal + contVal - totalVal)).toBeLessThanOrEqual(1);
    expect(Math.abs(contVal - baseVal * 0.15)).toBeLessThanOrEqual(2);

    const kpi = await readKpis(page);
    expect(Math.abs(totalVal - kpi.effort)).toBeLessThanOrEqual(1);
  });

  test('risk distribution counts add up to the risk register size', async ({ page }) => {
    const card = page.locator('div', { has: page.getByRole('heading', { name: 'Risk Distribution' }) }).last();
    const low = parseNum(await labeledValue(card, 'Low').innerText());
    const medium = parseNum(await labeledValue(card, 'Medium').innerText());
    const high = parseNum(await labeledValue(card, 'High').innerText());

    expect(low + medium + high).toBe(12); // 12 risks in the register
    expect(high).toBe(0); // defaults produce no high-probability risks
    expect(medium).toBe(3);
    await expect(card.getByText(/high-probability risks identified/)).toBeVisible();

    await gotoPanel(page, 'Governance');
    await expect(page.locator('table').last().locator('tbody tr')).toHaveCount(12);
  });

  test('effort composition percentages sum to ~100%', async ({ page }) => {
    const card = page.locator('div', { has: page.getByRole('heading', { name: 'Effort Composition' }) }).last();
    const rows = card.locator('table tbody tr');
    const n = await rows.count();
    expect(n).toBeGreaterThan(8);

    let pctSum = 0;
    let hoursSum = 0;
    for (let i = 0; i < n; i++) {
      const tds = rows.nth(i).locator('td');
      hoursSum += parseNum(await tds.nth(1).innerText());
      pctSum += parseNum(await tds.nth(3).innerText());
    }
    expect(pctSum).toBeGreaterThanOrEqual(96);
    expect(pctSum).toBeLessThanOrEqual(104);

    const base = await readLabeledNumber(page, 'Base effort');
    expect(Math.abs(hoursSum - base) / base).toBeLessThan(0.03);
  });

  test('dashboard figures recalculate when inputs change', async ({ page }) => {
    const before = await readLabeledNumber(page, 'Expected effort', 1);

    await gotoPanel(page, 'Inputs');
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
    const overall = page.locator('label', { hasText: /^Overall complexity$/ }).first()
      .locator('xpath=following-sibling::select[1]');
    await overall.selectOption('Highly Complex');

    await gotoPanel(page, 'Dashboard');
    expect(await readLabeledNumber(page, 'Contingency')).toBe(25);
    const after = await readLabeledNumber(page, 'Expected effort', 1);
    expect(after).toBeGreaterThan(before);
  });
});
