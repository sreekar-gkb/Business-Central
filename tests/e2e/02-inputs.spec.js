const { test, expect } = require('@playwright/test');
const { login, gotoPanel, inputByLabel, setField, readKpis } = require('./helpers/app');

async function openAllSections(page) {
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => (d.open = true));
  });
}

test.describe('Panel 1 - Inputs', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await gotoPanel(page, 'Inputs');
  });

  test('renders header, example banner and 12 accordion sections', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Pre-Sales Inputs' })).toBeVisible();
    await expect(page.getByText('Southern Cross Distribution')).toBeVisible();

    const sections = page.locator('section details');
    await expect(sections).toHaveCount(12);

    for (const title of [
      'Customer Profile',
      'Industry',
      'Business Challenges',
      'Business Central Module Selection',
      'Implementation Complexity',
      'Migration',
      'Integrations',
      'Customization',
      'Reporting',
      'Localization',
      'Delivery Model',
      'Support',
    ]) {
      await expect(page.locator('summary', { hasText: title }).first()).toBeVisible();
    }
  });

  test('text inputs accept typed customer data', async ({ page }) => {
    const name = inputByLabel(page, 'Customer name');
    await expect(name).toHaveValue('Southern Cross Distribution Pty Ltd');
    await name.fill('Acme Global Pty Ltd');
    await expect(name).toHaveValue('Acme Global Pty Ltd');

    const country = inputByLabel(page, 'Country / region');
    await country.fill('New Zealand');
    await expect(country).toHaveValue('New Zealand');

    // value propagates to the Executive Summary
    await gotoPanel(page, 'Executive Summary');
    await expect(page.getByText('Acme Global Pty Ltd').first()).toBeVisible();
  });

  test('number inputs accept values and are typed correctly', async ({ page }) => {
    for (const [label, value] of [
      ['Legal entities', 3],
      ['Companies', 4],
      ['Locations', 6],
      ['Warehouses', 5],
      ['Total users', 120],
      ['Concurrent users (if known)', 90],
      ['Finance users', 15],
      ['Operational users', 60],
      ['Warehouse users', 25],
      ['Manufacturing users', 10],
      ['External users', 4],
    ]) {
      const el = inputByLabel(page, label);
      await expect(el).toHaveAttribute('type', 'number');
      await el.fill(String(value));
      await expect(el).toHaveValue(String(value));
    }
  });

  test('date input accepts a target date and feeds the assumptions register', async ({ page }) => {
    const date = inputByLabel(page, 'Implementation target date');
    await expect(date).toHaveAttribute('type', 'date');
    await date.fill('2026-06-30');
    await expect(date).toHaveValue('2026-06-30');

    await gotoPanel(page, 'Governance');
    await expect(page.getByText('Target go-live: 2026-06-30.')).toBeVisible();
  });

  test('select inputs change value and drive downstream text', async ({ page }) => {
    await openAllSections(page);

    const industry = inputByLabel(page, 'Industry');
    await industry.selectOption('Manufacturing');
    await expect(industry).toHaveValue('Manufacturing');

    const overall = inputByLabel(page, 'Overall complexity');
    await overall.selectOption('Complex');
    await expect(overall).toHaveValue('Complex');

    const source = inputByLabel(page, 'Source system');
    await source.selectOption('QuickBooks');
    await expect(source).toHaveValue('QuickBooks');

    const kpi = await readKpis(page);
    expect(kpi.complexity).toBe('Complex');

    await gotoPanel(page, 'Executive Summary');
    await expect(page.getByText('Manufacturing').first()).toBeVisible();
    await expect(page.getByText('QuickBooks').first()).toBeVisible();
  });

  test('challenge checkboxes toggle', async ({ page }) => {
    await openAllSections(page);
    const section = page.locator('details', { has: page.locator('summary', { hasText: 'Business Challenges' }) }).first();
    const boxes = section.locator('input[type="checkbox"]');
    const count = await boxes.count();
    expect(count).toBeGreaterThan(5);

    const first = boxes.first();
    const before = await first.isChecked();
    await first.click();
    await expect(first).toBeChecked({ checked: !before });
    await first.click();
    await expect(first).toBeChecked({ checked: before });
  });

  test('module checkboxes toggle and change the module count in the Executive Summary', async ({ page }) => {
    await openAllSections(page);
    const section = page
      .locator('details', { has: page.locator('summary', { hasText: 'Business Central Module Selection' }) })
      .first();
    const checked = section.locator('input[type="checkbox"]:checked');
    const startCount = await checked.count();
    expect(startCount).toBe(21); // default scenario selects 21 modules

    await gotoPanel(page, 'Executive Summary');
    await expect(page.getByText(`${startCount} selected`)).toBeVisible();

    await gotoPanel(page, 'Inputs');
    await openAllSections(page);
    const unchecked = section.locator('input[type="checkbox"]:not(:checked)').first();
    await unchecked.scrollIntoViewIfNeeded();
    await unchecked.click();
    await expect(checked).toHaveCount(startCount + 1);

    await gotoPanel(page, 'Executive Summary');
    await expect(page.getByText(`${startCount + 1} selected`)).toBeVisible();
  });

  test('integration rows can be added and removed', async ({ page }) => {
    await openAllSections(page);
    const section = page.locator('details', { has: page.locator('summary', { hasText: 'Integrations' }) }).first();

    await gotoPanel(page, 'Executive Summary');
    await expect(page.getByRole('row', { name: /Integrations/ }).getByRole('cell').last()).toHaveText('3');

    await gotoPanel(page, 'Inputs');
    await openAllSections(page);
    await section.getByRole('button', { name: /Add integration/i }).click();

    await gotoPanel(page, 'Executive Summary');
    await expect(page.getByRole('row', { name: /Integrations/ }).getByRole('cell').last()).toHaveText('4');
  });

  test('customization counters accept numbers', async ({ page }) => {
    await openAllSections(page);
    const section = page.locator('details', { has: page.locator('summary', { hasText: 'Customization' }) }).first();
    const numbers = section.locator('input[type="number"]');
    await expect(numbers.first()).toBeVisible();
    await numbers.first().fill('9');
    await expect(numbers.first()).toHaveValue('9');
  });

  test('localization flags toggle', async ({ page }) => {
    await openAllSections(page);
    const section = page.locator('details', { has: page.locator('summary', { hasText: 'Localization' }) }).first();
    const boxes = section.locator('input[type="checkbox"]');
    const n = await boxes.count();
    expect(n).toBeGreaterThan(3);
    const box = boxes.first();
    const before = await box.isChecked();
    await box.click();
    await expect(box).toBeChecked({ checked: !before });
  });

  test('every rendered input has an associated label (a11y / labelling check)', async ({ page }) => {
    await openAllSections(page);
    const orphans = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll('section input, section select').forEach((el) => {
        const labelled =
          el.closest('label') ||
          (el.id && document.querySelector(`label[for="${el.id}"]`)) ||
          el.getAttribute('aria-label') ||
          el.previousElementSibling?.tagName === 'LABEL';
        if (!labelled) bad.push(el.outerHTML.slice(0, 90));
      });
      return bad;
    });
    expect(orphans, `Unlabelled controls: ${orphans.join(' | ')}`).toEqual([]);
  });
});
