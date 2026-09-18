const { test, expect } = require('@playwright/test');
const { login, gotoPanel } = require('./helpers/app');

test.describe('Panel 7 - Discovery Questions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await gotoPanel(page, 'Discovery Qs');
  });

  test('renders the three priority groups with questions', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Discovery Questions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Critical', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Important', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nice to have', exact: true })).toBeVisible();

    const items = page.locator('ul li');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(6);
    for (let i = 0; i < count; i++) {
      expect((await items.nth(i).innerText()).trim()).toMatch(/\?|None outstanding/);
    }
  });

  test('question content is generated from the current inputs', async ({ page }) => {
    // defaults: no target date + 2 companies => two critical questions
    await expect(page.getByText(/Is there a fixed go-live date driving the timeline/)).toBeVisible();
    await expect(page.getByText(/How will intercompany transactions and eliminations be handled/)).toBeVisible();
    await expect(page.getByText(/Which third-party ISV extensions/)).toBeVisible();
    await expect(page.getByText(/What training delivery model is preferred/)).toBeVisible();

    // setting a target date removes the go-live critical question
    await gotoPanel(page, 'Inputs');
    await page.locator('label', { hasText: /^Implementation target date$/ }).first()
      .locator('xpath=following-sibling::input[1]').fill('2026-07-01');
    await gotoPanel(page, 'Discovery Qs');
    await expect(page.getByText(/Is there a fixed go-live date driving the timeline/)).toHaveCount(0);
  });

  test('poor data quality adds a critical question', async ({ page }) => {
    await gotoPanel(page, 'Inputs');
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
    await page.locator('label', { hasText: /^Data quality$/ }).first()
      .locator('xpath=following-sibling::select[1]').selectOption('Unknown');

    await gotoPanel(page, 'Discovery Qs');
    await expect(page.getByText(/What is the actual data quality \/ state of the legacy system/)).toBeVisible();
  });

  test('questions are laid out in 3 columns', async ({ page }) => {
    const layout = await page.evaluate(() => {
      const heads = [...document.querySelectorAll('h4')].filter((h) =>
        ['Critical', 'Important', 'Nice to have'].includes(h.textContent.trim())
      );
      if (heads.length !== 3) return { error: `expected 3 group headings, found ${heads.length}` };
      const container = heads[0].parentElement.parentElement;
      const cs = getComputedStyle(container);
      return {
        display: cs.display,
        gridTemplateColumns: cs.gridTemplateColumns,
        containerClass: container.className,
        tops: heads.map((h) => Math.round(h.getBoundingClientRect().top)),
        lefts: heads.map((h) => Math.round(h.getBoundingClientRect().left)),
      };
    });

    expect(layout.error).toBeUndefined();
    const distinctLefts = new Set(layout.lefts).size;
    const sameRow = new Set(layout.tops).size === 1;
    expect(
      distinctLefts === 3 && sameRow,
      `Expected a 3-column layout. container display="${layout.display}", ` +
        `grid-template-columns="${layout.gridTemplateColumns}", class="${layout.containerClass}", ` +
        `heading lefts=${JSON.stringify(layout.lefts)}, tops=${JSON.stringify(layout.tops)}`
    ).toBe(true);
  });

  test('groups are colour-coded by priority', async ({ page }) => {
    const cards = await page.evaluate(() => {
      const heads = [...document.querySelectorAll('h4')].filter((h) =>
        ['Critical', 'Important', 'Nice to have'].includes(h.textContent.trim())
      );
      return heads.map((h) => {
        const card = h.parentElement;
        const cs = getComputedStyle(card);
        return {
          label: h.textContent.trim(),
          className: card.className,
          background: cs.backgroundColor,
          border: cs.borderColor,
          borderLeft: cs.borderLeftWidth,
        };
      });
    });

    const signatures = cards.map((c) => `${c.background}|${c.border}|${c.borderLeft}`);
    expect(
      new Set(signatures).size,
      `Priority cards are not visually differentiated. Cards: ${JSON.stringify(cards)}`
    ).toBe(3);
  });
});
