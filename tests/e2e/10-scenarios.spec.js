const { test, expect } = require('@playwright/test');
const { login, gotoPanel, readKpis, parseNum } = require('./helpers/app');

async function tableValues(page, metric) {
  const row = page.getByRole('row', { name: new RegExp(`^${metric}`) }).first();
  const cells = row.getByRole('cell');
  return [
    (await cells.nth(1).innerText()).trim(),
    (await cells.nth(2).innerText()).trim(),
    (await cells.nth(3).innerText()).trim(),
  ];
}

test.describe('Panel 9 - Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await gotoPanel(page, 'Scenarios');
  });

  test('renders the three scenario cards with descriptions', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'What-If / Scenario Analysis' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'A: Standard Implementation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'B: Enhanced Implementation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'C: Complex Transformation' })).toBeVisible();

    await expect(page.getByText(/Minimal customisation, single migration cycle/)).toBeVisible();
    await expect(page.getByText(/Current inputs as entered/)).toBeVisible();
    await expect(page.getByText(/Elevated customisation, extra migration cycle/)).toBeVisible();
  });

  test('comparison table shows effort, duration, team, complexity and risk for A/B/C', async ({ page }) => {
    for (const h of ['Metric', 'Scenario A', 'Scenario B', 'Scenario C']) {
      await expect(page.getByRole('columnheader', { name: h })).toBeVisible();
    }
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(5);

    const effort = (await tableValues(page, 'Effort \\(h\\)')).map(parseNum);
    const duration = (await tableValues(page, 'Duration')).map(parseNum);
    const team = (await tableValues(page, 'Team size')).map(parseNum);
    const complexity = await tableValues(page, 'Complexity');
    const risk = (await tableValues(page, 'Risk \\(high-prob\\)')).map(parseNum);

    // A must be the cheapest, C the most expensive
    expect(effort[0]).toBeLessThan(effort[1]);
    expect(effort[1]).toBeLessThan(effort[2]);
    expect(duration[0]).toBeLessThanOrEqual(duration[1]);
    expect(duration[1]).toBeLessThanOrEqual(duration[2]);
    expect(team[0]).toBeLessThanOrEqual(team[2]);

    complexity.forEach((c) => expect(['Low', 'Medium', 'High', 'Very High']).toContain(c));
    risk.forEach((r) => expect(r).toBeGreaterThanOrEqual(0));

    // Scenario B is the live estimate, so it must equal the KPI bar
    const kpi = await readKpis(page);
    expect(effort[1]).toBe(kpi.effort);
    expect(duration[1]).toBeCloseTo(kpi.months, 1);
    expect(team[1]).toBe(kpi.team);
  });

  test('scenario duration/team derive from effort using the documented formulas', async ({ page }) => {
    const effort = (await tableValues(page, 'Effort \\(h\\)')).map(parseNum);
    const duration = (await tableValues(page, 'Duration')).map(parseNum);
    const team = (await tableValues(page, 'Team size')).map(parseNum);

    effort.forEach((e, i) => {
      const weeks = Math.max(8, Math.min(64, Math.round(3 + e / 225)));
      expect(duration[i]).toBeCloseTo(weeks / 4.345, 1);
      expect(team[i]).toBe(Math.max(2, Math.min(22, Math.round(e / (weeks * 31)))));
    });
  });

  test('detailed comparison blocks show differing customisation, integrations and reporting', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Detailed Comparison: Scenario A vs B vs C' })).toBeVisible();

    const block = async (title) => {
      const heading = page.getByRole('heading', { name: title });
      await expect(heading).toBeVisible();
      return heading.locator('xpath=following-sibling::div[1]').locator('> div').allInnerTexts();
    };

    const cust = await block('Customization Level');
    expect(cust.length).toBe(3);
    expect(cust[0]).toContain('Minimal customization');
    expect(cust[1]).toContain('Moderate customization');
    expect(cust[2]).toContain('Significant customization');

    const ints = await block('Integrations');
    expect(ints[0]).toContain('1 integration');
    expect(ints[1]).toContain('3 integrations');
    expect(ints[2]).toContain('5 integrations');

    const rep = await block('Reporting Complexity');
    expect(rep[0]).toContain('Low');
    expect(rep[1]).toContain('Medium');
    expect(rep[2]).toContain('High');
  });

  test('scenario cards are laid out in 3 columns', async ({ page }) => {
    const layout = await page.evaluate(() => {
      const heads = ['A: Standard Implementation', 'B: Enhanced Implementation', 'C: Complex Transformation'].map((t) =>
        [...document.querySelectorAll('h3')].find((h) => h.textContent.trim() === t)
      );
      if (heads.some((h) => !h)) return { error: 'scenario headings missing' };
      const container = heads[0].parentElement.parentElement;
      const cs = getComputedStyle(container);
      return {
        display: cs.display,
        gridTemplateColumns: cs.gridTemplateColumns,
        containerClass: container.className,
        lefts: heads.map((h) => Math.round(h.getBoundingClientRect().left)),
        tops: heads.map((h) => Math.round(h.getBoundingClientRect().top)),
      };
    });

    expect(layout.error).toBeUndefined();
    expect(
      new Set(layout.lefts).size === 3 && new Set(layout.tops).size === 1,
      `Expected 3-column scenario grid. display="${layout.display}", grid-template-columns="${layout.gridTemplateColumns}", ` +
        `class="${layout.containerClass}", lefts=${JSON.stringify(layout.lefts)}, tops=${JSON.stringify(layout.tops)}`
    ).toBe(true);
  });

  test('scenarios recalculate when inputs change', async ({ page }) => {
    const before = (await tableValues(page, 'Effort \\(h\\)')).map(parseNum);

    await gotoPanel(page, 'Inputs');
    await page.locator('label', { hasText: /^Total users$/ }).first()
      .locator('xpath=following-sibling::input[1]').fill('320');
    await gotoPanel(page, 'Scenarios');

    const after = (await tableValues(page, 'Effort \\(h\\)')).map(parseNum);
    after.forEach((v, i) => expect(v).toBeGreaterThan(before[i]));
  });
});
