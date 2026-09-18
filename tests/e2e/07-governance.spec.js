const { test, expect } = require('@playwright/test');
const { login, gotoPanel } = require('./helpers/app');

test.describe('Panel 6 - Governance', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await gotoPanel(page, 'Governance');
  });

  test('assumptions register renders all 15 rows with 4 populated columns', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Assumptions, Exclusions & Risks' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Assumptions register' })).toBeVisible();

    const table = page.locator('table').first();
    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(15);

    for (let i = 0; i < 15; i++) {
      const tds = rows.nth(i).locator('td');
      await expect(tds).toHaveCount(4);
      const id = `A${String(i + 1).padStart(3, '0')}`;
      await expect(tds.nth(0)).toHaveText(id);
      for (let c = 1; c < 4; c++) {
        expect((await tds.nth(c).innerText()).trim().length).toBeGreaterThan(3);
      }
    }
  });

  test('assumptions reflect the current inputs', async ({ page }) => {
    await expect(page.getByText('Estimate covers 2 companies / 2 legal entities as specified.')).toBeVisible();
    await expect(page.getByText('85 total users (60 concurrent) at go-live.')).toBeVisible();
    await expect(page.getByText('Module scope limited to the 21 modules currently selected.')).toBeVisible();
    await expect(page.getByText('3 integration(s) in scope as listed.')).toBeVisible();
    await expect(page.getByText('Target go-live: not yet fixed.')).toBeVisible();

    await gotoPanel(page, 'Inputs');
    await page.locator('label', { hasText: /^Companies$/ }).first()
      .locator('xpath=following-sibling::input[1]').fill('1');
    await gotoPanel(page, 'Governance');
    await expect(page.getByText('Estimate covers 1 company / 2 legal entities as specified.')).toBeVisible();
  });

  test('exclusions list renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Exclusions' })).toBeVisible();
    const items = page.locator('ul li');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(6);
    for (let i = 0; i < count; i++) {
      expect((await items.nth(i).innerText()).trim().length).toBeGreaterThan(5);
    }
  });

  test('risk register renders 12 risks with probability and impact', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Risk register' })).toBeVisible();
    const table = page.locator('table').last();
    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(12);

    const valid = ['Low', 'Medium', 'High'];
    for (let i = 0; i < 12; i++) {
      const tds = rows.nth(i).locator('td');
      await expect(tds).toHaveCount(4);
      expect((await tds.nth(0).innerText()).trim().length).toBeGreaterThan(10); // risk text
      expect(valid).toContain((await tds.nth(1).innerText()).trim()); // probability
      expect(valid).toContain((await tds.nth(2).innerText()).trim()); // impact
      expect((await tds.nth(3).innerText()).trim().length).toBeGreaterThan(10); // mitigation
    }
  });

  test('probability / impact pills are visually styled (colour-coded)', async ({ page }) => {
    const table = page.locator('table').last();
    const styles = await table.evaluate((t) => {
      const out = [];
      t.querySelectorAll('tbody tr td:nth-child(2) span').forEach((s) => {
        const cs = getComputedStyle(s);
        out.push({
          text: s.textContent.trim(),
          className: s.className,
          background: cs.backgroundColor,
          color: cs.color,
        });
      });
      return out;
    });

    expect(styles.length, 'probability should be rendered as a styled pill').toBe(12);
    const unstyled = styles.filter(
      (s) => s.background === 'rgba(0, 0, 0, 0)' || s.background === 'transparent'
    );
    expect(
      unstyled.length,
      `Pills without background colour (CSS classes resolved to "${styles[0] && styles[0].className}")`
    ).toBe(0);

    const byLevel = {};
    styles.forEach((s) => (byLevel[s.text] = s.background));
    expect(new Set(Object.values(byLevel)).size, 'each risk level needs a distinct colour').toBeGreaterThan(1);
  });

  test('risk probabilities react to inputs (poor data quality raises a High risk)', async ({ page }) => {
    await gotoPanel(page, 'Inputs');
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
    await page.locator('label', { hasText: /^Data quality$/ }).first()
      .locator('xpath=following-sibling::select[1]').selectOption('Poor');

    await gotoPanel(page, 'Governance');
    const row = page.locator('table').last().locator('tbody tr').first();
    await expect(row.locator('td').nth(0)).toContainText('Poor / unreconciled legacy data quality');
    await expect(row.locator('td').nth(1)).toHaveText('High');

    await gotoPanel(page, 'Dashboard');
    const high = page.locator('div:text-is("High")').first().locator('xpath=following-sibling::div[1]');
    await expect(high).not.toHaveText('0');
  });
});
