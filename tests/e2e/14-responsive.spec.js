const { test, expect } = require('@playwright/test');
const { login, gotoPanel, PANELS } = require('./helpers/app');

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
];

for (const vp of VIEWPORTS) {
  test.describe(`Responsive @ ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('gate and app render without horizontal page overflow', async ({ page }) => {
      await login(page);

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        overflow.scrollWidth,
        `page scrolls horizontally: ${overflow.scrollWidth}px content in ${overflow.clientWidth}px viewport`
      ).toBeLessThanOrEqual(overflow.clientWidth + 2);
    });

    test('every panel renders its heading and the nav stays reachable', async ({ page }) => {
      await login(page);
      for (const [label, heading] of PANELS) {
        await gotoPanel(page, label);
        await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      }
    });

    test('wide tables do not overflow their container', async ({ page }) => {
      await login(page);
      const offenders = [];

      for (const [label] of PANELS) {
        await gotoPanel(page, label);
        await page.waitForTimeout(120);
        const bad = await page.evaluate(() => {
          const out = [];
          document.querySelectorAll('table').forEach((t, i) => {
            const parent = t.parentElement;
            const overflowX = getComputedStyle(parent).overflowX;
            if (t.scrollWidth > parent.clientWidth + 2 && overflowX !== 'auto' && overflowX !== 'scroll') {
              out.push(`table#${i} ${t.scrollWidth}px in ${parent.clientWidth}px (parent overflow-x: ${overflowX})`);
            }
          });
          return out;
        });
        bad.forEach((b) => offenders.push(`${label}: ${b}`));
      }

      expect(offenders, `Tables overflowing their container:\n${offenders.join('\n')}`).toEqual([]);
    });

    test('KPI chips remain visible and readable', async ({ page }) => {
      await login(page);
      const chips = page.locator('div:text-is("Expected effort")').first();
      await expect(chips).toBeVisible();
      const box = await chips.boundingBox();
      expect(box.width).toBeGreaterThan(20);
      expect(box.x).toBeGreaterThanOrEqual(-1);
    });
  });
}
