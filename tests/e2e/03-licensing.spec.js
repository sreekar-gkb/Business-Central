const { test, expect } = require('@playwright/test');
const { login, gotoPanel, labeledValue, readLabeledNumber, inputByLabel, parseNum } = require('./helpers/app');

// Default scenario: users 85, finance 12, ops 45, wh 20, mfg 0, ext 5.
// namedFull = 77 -> fullUsers 77, teamMembers 8, extAccountants 3 free, extBeyondFree 2
// Essentials $80, Team Member $8  => 77*80 + 8*8 + 2*80 = 6160 + 64 + 160 = 6384 / month
const EXPECTED = { fullUsers: 77, teamMembers: 8, monthly: 6384, annual: 76608 };

test.describe('Panel 2 - Licensing & Costs', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await gotoPanel(page, 'Licensing & Costs');
  });

  test('renders heading, source note and the 5 summary tiles', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Microsoft Licensing and Costs' })).toBeVisible();
    await expect(page.getByText(/Microsoft Learn, Licensing in Business Central/)).toBeVisible();

    for (const label of ['Recommended tier', 'Full users', 'Team members', 'Est. monthly cost', 'Est. annual cost']) {
      await expect(page.locator(`div:text-is("${label}")`).first()).toBeVisible();
    }
  });

  test('calculates the default license mix correctly', async ({ page }) => {
    await expect(labeledValue(page, 'Recommended tier')).toHaveText('Essentials');
    expect(await readLabeledNumber(page, 'Full users')).toBe(EXPECTED.fullUsers);
    expect(await readLabeledNumber(page, 'Team members')).toBe(EXPECTED.teamMembers);
    expect(await readLabeledNumber(page, 'Est. monthly cost')).toBe(EXPECTED.monthly);
    expect(await readLabeledNumber(page, 'Est. annual cost')).toBe(EXPECTED.annual);
    expect(EXPECTED.annual).toBe(EXPECTED.monthly * 12);
  });

  test('license mix table rows multiply out to the monthly total', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(3); // essentials + team member + external beyond free

    let sum = 0;
    for (let i = 0; i < count; i++) {
      const cells = rows.nth(i).locator('td');
      if ((await cells.count()) !== 4) continue;
      const users = parseNum(await cells.nth(1).innerText());
      const price = parseNum(await cells.nth(2).innerText());
      const total = parseNum(await cells.nth(3).innerText());
      expect(users * price, `row ${i} users*price should equal row total`).toBe(total);
      sum += total;
    }
    expect(sum).toBe(EXPECTED.monthly);

    // table footer total matches the KPI tile
    const footTotal = parseNum(await page.locator('table tfoot td').last().innerText());
    expect(footTotal).toBe(EXPECTED.monthly);
  });

  test('cost figures update when the user count changes', async ({ page }) => {
    const before = await readLabeledNumber(page, 'Est. monthly cost');

    await gotoPanel(page, 'Inputs');
    await inputByLabel(page, 'Total users').fill('200');
    await gotoPanel(page, 'Licensing & Costs');

    // fullUsers stays capped at namedFull (77), team members grow to 123
    expect(await readLabeledNumber(page, 'Full users')).toBe(77);
    expect(await readLabeledNumber(page, 'Team members')).toBe(123);
    const after = await readLabeledNumber(page, 'Est. monthly cost');
    expect(after).toBe(77 * 80 + 123 * 8 + 2 * 80);
    expect(after).toBeGreaterThan(before);
    expect(await readLabeledNumber(page, 'Est. annual cost')).toBe(after * 12);
  });

  test('selecting a manufacturing module switches the tier to Premium and reprices full users', async ({ page }) => {
    await gotoPanel(page, 'Inputs');
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
    const section = page
      .locator('details', { has: page.locator('summary', { hasText: 'Business Central Module Selection' }) })
      .first();
    const mfg = section.locator('label', { hasText: 'Production BOM' }).locator('input[type="checkbox"]').first();
    await mfg.scrollIntoViewIfNeeded();
    if (!(await mfg.isChecked())) await mfg.click();

    await gotoPanel(page, 'Licensing & Costs');
    await expect(labeledValue(page, 'Recommended tier')).toHaveText('Premium');
    // 77 full users at $110 + 8 team at $8 + 2 external at $110
    expect(await readLabeledNumber(page, 'Est. monthly cost')).toBe(77 * 110 + 8 * 8 + 2 * 110);
    await expect(page.getByText(/require Premium \(manufacturing or service management\)/)).toBeVisible();
  });

  test('reference table lists all 5 Business Central license types', async ({ page }) => {
    const card = page.locator('div', { has: page.getByRole('heading', { name: 'All Business Central license types' }) }).last();
    const rows = card.locator('table tbody tr');
    await expect(rows).toHaveCount(5);
    for (const name of [
      'Business Central Essentials',
      'Business Central Premium',
      'Team Member',
      'Device license',
      'External Accountant',
    ]) {
      await expect(card.getByText(name, { exact: true })).toBeVisible();
    }
    await expect(card.getByText('Free (conditions apply)')).toBeVisible();
  });
});
