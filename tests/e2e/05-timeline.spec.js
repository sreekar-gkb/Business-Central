const { test, expect } = require('@playwright/test');
const { login, gotoPanel, readKpis, parseNum } = require('./helpers/app');

const PHASES = [
  'Mobilisation',
  'Discovery',
  'Solution Design',
  'Configuration',
  'Development (AL / integrations)',
  'Data Migration',
  'Integration Development',
  'Testing',
  'User Acceptance Testing',
  'Training',
  'Cutover Preparation',
  'Go-Live',
  'Hypercare',
  'Transition to Support',
];

test.describe('Panel 4 - Timeline', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await gotoPanel(page, 'Timeline');
  });

  test('renders all 14 phases with week ranges', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Delivery Timeline' })).toBeVisible();

    const weekLabels = page.locator('div').filter({ hasText: /^wk \d+–\d+$/ });
    await expect(weekLabels).toHaveCount(PHASES.length);

    for (const phase of PHASES) {
      await expect(page.getByText(phase, { exact: true }).first()).toBeVisible();
    }
  });

  test('week ranges are ordered, positive and inside the project duration', async ({ page }) => {
    const kpi = await readKpis(page);
    const weeks = Math.round(kpi.months * 4.345);

    const ranges = await page.evaluate(() =>
      [...document.querySelectorAll('div')]
        .filter((d) => /^wk \d+–\d+$/.test(d.textContent.trim()))
        .map((d) => d.textContent.trim().match(/\d+/g).map(Number))
    );

    expect(ranges.length).toBe(14);
    let prevStart = -1;
    for (const [start, end] of ranges) {
      expect(end).toBeGreaterThan(start);
      expect(start).toBeGreaterThanOrEqual(prevStart); // phases start in non-decreasing order
      expect(start).toBeLessThanOrEqual(weeks + 1);
      prevStart = start;
    }
    // last phase must finish at/near the end of the plan
    expect(ranges[ranges.length - 1][1]).toBeGreaterThanOrEqual(weeks - 2);
  });

  test('gantt bars render with plausible left offset and width', async ({ page }) => {
    const bars = await page.evaluate(() =>
      [...document.querySelectorAll('div[style*="position: absolute"]')].map((d) => ({
        left: parseFloat(d.style.left),
        width: parseFloat(d.style.width),
        background: d.style.background,
      }))
    );

    expect(bars.length).toBe(14);
    for (const b of bars) {
      expect(b.left).toBeGreaterThanOrEqual(0);
      expect(b.left).toBeLessThanOrEqual(100);
      expect(b.width).toBeGreaterThan(0);
      expect(b.left + b.width).toBeLessThanOrEqual(105);
    }
    // parallel phases are drawn in the alternate series colour
    const distinctColours = new Set(bars.map((b) => b.background));
    expect(distinctColours.size).toBe(2);
  });

  test('phase detail table lists duration, dependencies, roles and deliverables', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(14);

    await expect(page.getByRole('columnheader', { name: 'Phase' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Duration' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Dependencies' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Primary roles' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Key deliverable' })).toBeVisible();

    let durSum = 0;
    for (let i = 0; i < 14; i++) {
      const tds = rows.nth(i).locator('td');
      const dur = parseNum(await tds.nth(1).innerText());
      expect(dur).toBeGreaterThanOrEqual(1);
      durSum += dur;
      expect((await tds.nth(2).innerText()).trim()).not.toBe('');
      expect((await tds.nth(3).innerText()).trim()).not.toBe('');
      expect((await tds.nth(4).innerText()).trim()).not.toBe('');
    }
    expect(durSum).toBeGreaterThan(0);
  });

  test('duration matches the KPI bar and the axis labels', async ({ page }) => {
    const kpi = await readKpis(page);
    const weeks = Math.max(8, Math.min(64, Math.round(3 + kpi.effort / 225)));

    await expect(page.getByText(`Indicative phase plan over ${weeks} weeks`, { exact: false })).toBeVisible();
    await expect(page.getByText('Week 0')).toBeVisible();
    await expect(page.getByText(`Week ${weeks}`, { exact: true })).toBeVisible();
    expect(Math.abs(kpi.months - weeks / 4.345)).toBeLessThan(0.11);
  });

  test('timeline stretches when effort grows', async ({ page }) => {
    const before = (await readKpis(page)).months;

    await gotoPanel(page, 'Inputs');
    await page.locator('label', { hasText: /^Total users$/ }).first()
      .locator('xpath=following-sibling::input[1]').fill('400');
    await gotoPanel(page, 'Timeline');

    const after = (await readKpis(page)).months;
    expect(after).toBeGreaterThan(before);
    const weeks = Math.round(after * 4.345);
    await expect(page.getByText(`Indicative phase plan over ${weeks} weeks`, { exact: false })).toBeVisible();
  });
});
