const { test, expect } = require('@playwright/test');
const { login, gotoPanel, readKpis, parseNum } = require('./helpers/app');

async function commercialRow(page, label) {
  return page.getByRole('row', { name: new RegExp(`^${label}`) }).first().getByRole('cell').last();
}

test.describe('Panel 8 - Executive Summary', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await gotoPanel(page, 'Executive Summary');
  });

  test('renders the narrative cards', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Executive Summary' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What is being implemented' })).toBeVisible();
    await expect(
      page.getByText(
        /A Microsoft Dynamics 365 Business Central implementation for Southern Cross Distribution Pty Ltd, covering 21 modules across 2 companies and 85 users/
      )
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Indicative timeline & effort' })).toBeVisible();
    await expect(page.getByText(/months \(\d+ weeks\), [\d,]+ hours expected \(range [\d,]+–[\d,]+ h\)/)).toBeVisible();
  });

  test('critical discovery questions preview shows at most 3 items', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Critical discovery questions' })).toBeVisible();
    const card = page.locator('div', { has: page.getByRole('heading', { name: 'Critical discovery questions' }) }).last();
    const items = card.locator('li');
    const n = await items.count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(3);
  });

  test('major risks section appears once a high-probability risk exists', async ({ page }) => {
    // defaults produce no High risks, so the card is intentionally hidden
    await expect(page.getByRole('heading', { name: 'Major risks' })).toHaveCount(0);

    await gotoPanel(page, 'Inputs');
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
    await page.locator('label', { hasText: /^Data quality$/ }).first()
      .locator('xpath=following-sibling::select[1]').selectOption('Poor');

    await gotoPanel(page, 'Executive Summary');
    await expect(page.getByRole('heading', { name: 'Major risks' })).toBeVisible();
    const card = page.locator('div', { has: page.getByRole('heading', { name: 'Major risks' }) }).last();
    const items = card.locator('li');
    expect(await items.count()).toBeGreaterThan(0);
    expect(await items.count()).toBeLessThanOrEqual(3);
  });

  test('commercial summary table matches the inputs and the KPI bar', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Commercial Summary' })).toBeVisible();
    const kpi = await readKpis(page);

    await expect(await commercialRow(page, 'Customer')).toHaveText('Southern Cross Distribution Pty Ltd');
    await expect(await commercialRow(page, 'Industry')).toHaveText('Distribution');
    await expect(await commercialRow(page, 'Users \\(total\\)')).toHaveText('85');
    await expect(await commercialRow(page, 'Companies')).toHaveText('2');
    await expect(await commercialRow(page, 'Modules in scope')).toHaveText('21 selected');
    await expect(await commercialRow(page, 'Migration source')).toHaveText('Dynamics NAV');
    await expect(await commercialRow(page, 'Integrations')).toHaveText('3');
    await expect(await commercialRow(page, 'Customization level')).toHaveText('Moderate customization');

    const effortCell = await (await commercialRow(page, 'Indicative effort')).innerText();
    expect(parseNum(effortCell)).toBe(kpi.effort);

    const durationCell = await (await commercialRow(page, 'Estimated duration')).innerText();
    expect(parseNum(durationCell)).toBeCloseTo(kpi.months, 1);

    const teamCell = await (await commercialRow(page, 'Recommended team \\(peak\\)')).innerText();
    expect(parseNum(teamCell)).toBe(kpi.team);

    const supportCell = await (await commercialRow(page, 'Post-implementation support')).innerText();
    expect(parseNum(supportCell)).toBe(kpi.support);
    expect(supportCell).toContain('Business hours');

    const confCell = await (await commercialRow(page, 'Estimate confidence')).innerText();
    expect(confCell.trim()).toBe(kpi.confidence);
  });

  test('effort range brackets the expected effort', async ({ page }) => {
    const kpi = await readKpis(page);
    const effortCell = await (await commercialRow(page, 'Indicative effort')).innerText();
    const nums = effortCell.replace(/,/g, '').match(/\d+/g).map(Number);
    const [expected, low, high] = nums;
    expect(expected).toBe(kpi.effort);
    expect(low).toBeLessThan(expected);
    expect(high).toBeGreaterThan(expected);
  });

  test('summary recalculates after editing inputs', async ({ page }) => {
    await gotoPanel(page, 'Inputs');
    await page.locator('label', { hasText: /^Customer name$/ }).first()
      .locator('xpath=following-sibling::input[1]').fill('Northwind Traders');
    await page.locator('label', { hasText: /^Total users$/ }).first()
      .locator('xpath=following-sibling::input[1]').fill('150');

    await gotoPanel(page, 'Executive Summary');
    await expect(await commercialRow(page, 'Customer')).toHaveText('Northwind Traders');
    await expect(await commercialRow(page, 'Users \\(total\\)')).toHaveText('150');
    await expect(page.getByText(/covering 21 modules across 2 companies and 150 users/)).toBeVisible();
  });
});
