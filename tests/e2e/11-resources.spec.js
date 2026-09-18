const { test, expect } = require('@playwright/test');
const { login, gotoPanel } = require('./helpers/app');

test.describe('Panel 10 - Videos & How-To resources', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await gotoPanel(page, 'Videos & How-To');
  });

  test('renders resource groups and cards', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Videos and How-To Resources' })).toBeVisible();
    await expect(page.getByText('Official Microsoft Learn pages and videos', { exact: false })).toBeVisible();

    const links = page.locator('section a[target="_blank"]');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('every link has a title, description, visible URL and safe rel attribute', async ({ page }) => {
    const links = page.locator('section a[target="_blank"]');
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const href = await link.getAttribute('href');
      expect(href).toMatch(/^https?:\/\//);
      expect(href).toMatch(/microsoft\.com|youtube\.com/);
      await expect(link).toHaveAttribute('rel', /noopener/);

      const title = await link.locator('h3').innerText();
      expect(title.trim().length).toBeGreaterThan(3);

      const desc = await link.locator('p').first().innerText();
      expect(desc.trim().length).toBeGreaterThan(10);

      // the URL is also printed inside the card
      await expect(link).toContainText(href.replace(/^https?:\/\//, '').split('/')[0]);
    }
  });

  test('group headings are present', async ({ page }) => {
    await expect(page.getByText('Official overview').first()).toBeVisible();
    const groups = await page.evaluate(() => {
      const anchors = [...document.querySelectorAll('section a[target="_blank"]')];
      const labels = new Set();
      anchors.forEach((a) => {
        let prev = a.closest('div').previousElementSibling;
        if (prev && prev.textContent.trim().length < 60) labels.add(prev.textContent.trim());
      });
      return [...labels];
    });
    expect(groups.length).toBeGreaterThanOrEqual(1);
  });

  test('all resource links resolve (no dead links)', async ({ page, request }) => {
    const hrefs = await page.locator('section a[target="_blank"]').evaluateAll((els) => els.map((e) => e.href));
    const broken = [];
    for (const href of hrefs) {
      try {
        const res = await request.get(href, { timeout: 20000, maxRedirects: 5 });
        if (res.status() >= 400) broken.push(`${href} -> ${res.status()}`);
      } catch (e) {
        broken.push(`${href} -> ${e.message.split('\n')[0]}`);
      }
    }
    expect(broken, `Broken resource links: ${broken.join(', ')}`).toEqual([]);
  });
});
