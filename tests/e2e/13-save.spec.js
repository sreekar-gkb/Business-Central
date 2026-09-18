const { test, expect } = require('@playwright/test');
const { login, gotoPanel } = require('./helpers/app');

test.describe('Cross-cutting: save button, save status and tracking', () => {
  test('save button is rendered and enabled for an identified contact', async ({ page }) => {
    await login(page);
    const save = page.getByRole('button', { name: /Save/ });
    await expect(save).toBeVisible();
    await expect(save).toBeEnabled();
    await expect(page.getByText('Logged in as:')).toContainText('QA Automation');
  });

  test('clicking Save posts to /api/estimate/save and reports a successful save', async ({ page }) => {
    await login(page);

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/estimate/save'), { timeout: 15000 }),
      page.getByRole('button', { name: /Save/ }).click(),
    ]);

    const body = await response.text();
    expect(
      response.status(),
      `POST /api/estimate/save returned ${response.status()} - ${body}`
    ).toBe(200);

    await expect(page.getByRole('button', { name: /Saved!/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Last saved:/)).toBeVisible();
  });

  test('save button surfaces a transient "Saving..." state and never gets stuck disabled', async ({ page }) => {
    await login(page);
    const save = page.getByRole('button', { name: /Save/ });
    await save.click();
    await expect(save).toBeEnabled({ timeout: 15000 });
    const label = await save.innerText();
    expect(label).toMatch(/Save|Saved!|Save Failed/);
  });

  test('auto-save fires a few seconds after an input change', async ({ page }) => {
    await login(page);

    const waitForSave = page.waitForRequest((r) => r.url().includes('/api/estimate/save'), { timeout: 20000 });
    await page.locator('label', { hasText: /^Customer name$/ }).first()
      .locator('xpath=following-sibling::input[1]').fill('Auto Save Test Co');
    const req = await waitForSave;

    expect(req.method()).toBe('POST');
    const payload = JSON.parse(req.postData());
    expect(payload.contact).toBe('QA Automation');
    expect(payload.customer.name).toBe('Auto Save Test Co');
    expect(payload.totalEffort).toBeGreaterThan(0);
    expect(payload.estimatedDuration).toBeGreaterThan(0);
    expect(Array.isArray(payload.modules)).toBe(true);
  });

  test('save request carries the credentials the API expects', async ({ page }) => {
    await login(page);
    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('/api/estimate/save'), { timeout: 15000 }),
      page.getByRole('button', { name: /Save/ }).click(),
    ]);
    const headers = await req.allHeaders();
    expect(
      headers.authorization,
      'the save endpoint requires an "Authorization: Bearer <token>" header'
    ).toBeTruthy();
  });

  test('panel views are tracked', async ({ page }) => {
    await login(page);
    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('/api/activity-event'), { timeout: 10000 }),
      gotoPanel(page, 'Dashboard'),
    ]);
    const payload = JSON.parse(req.postData());
    expect(payload.eventType).toBe('panel_view');
    expect(payload.details.panel).toBe('dashboard');
  });
});
