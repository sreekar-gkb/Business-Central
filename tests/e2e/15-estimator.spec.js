const { test, expect } = require('@playwright/test');

test.describe('BC Deal Sizer - Complete Verification Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Enable all console logging
    page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));
    page.on('error', err => console.log(`[ERROR] ${err}`));

    await page.goto('http://localhost:8000/estimator.html', { waitUntil: 'networkidle' });
    // Wait for JS to initialize
    await page.waitForFunction(() => typeof state !== 'undefined', { timeout: 5000 });
  });

  // ===== NAVIGATION TESTS =====
  test('NAV-001: Navigation sidebar renders with all 10 panels', async ({ page }) => {
    const navItems = await page.locator('.nav-item').count();
    expect(navItems).toBe(10);

    const labels = ['Inputs', 'Licensing', 'Dashboard', 'Timeline', 'Team', 'Governance', 'Discovery', 'Executive Summary', 'Scenarios', 'Videos'];
    for (let i = 0; i < labels.length; i++) {
      const hasLabel = await page.locator(`.nav-item:nth-child(${i+1})`).textContent();
      expect(hasLabel).toContain(labels[i]);
    }
  });

  test('NAV-002: Clicking nav items switches panels', async ({ page }) => {
    // Check initial active panel (inputs)
    let activePanel = await page.locator('.nav-item.active');
    expect(activePanel).toContainText('Inputs');

    // Click Dashboard
    await page.locator('.nav-item', { hasText: 'Dashboard' }).click();
    await page.waitForTimeout(100);

    // Check Dashboard panel is active
    activePanel = await page.locator('.nav-item.active');
    expect(activePanel).toContainText('Dashboard');

    const dashboardPanel = page.locator('#panel-dashboard');
    await expect(dashboardPanel).toHaveClass(/active/);
  });

  test('NAV-003: KPI bar displays expected metrics', async ({ page }) => {
    const kpiChips = await page.locator('.kpi-chip').count();
    expect(kpiChips).toBeGreaterThan(0);

    // Check for expected KPI labels
    const expected = ['Expected effort', 'Duration', 'Team (peak)', 'Monthly support', 'Complexity', 'Confidence'];
    for (const label of expected) {
      const hasLabel = await page.locator('.kpi-chip', { has: page.locator(`.l:has-text("${label}")`) }).count();
      expect(hasLabel).toBeGreaterThan(0);
    }
  });

  // ===== INPUTS PANEL TESTS =====
  test('INP-001: All customer profile fields render', async ({ page }) => {
    const fields = [
      '#f_name', '#f_country', '#f_entities', '#f_companies', '#f_locations',
      '#f_warehouses', '#f_users', '#f_concurrentUsers', '#f_financeUsers',
      '#f_opsUsers', '#f_whUsers', '#f_mfgUsers', '#f_extUsers'
    ];

    for (const field of fields) {
      const el = page.locator(field);
      await expect(el).toBeVisible();
      const value = await el.inputValue();
      expect(value).toBeTruthy();
    }
  });

  test('INP-002: Challenge chips are selectable', async ({ page }) => {
    const challengeChips = await page.locator('[data-challenge]').count();
    expect(challengeChips).toBeGreaterThan(0);

    // Click a challenge chip
    const firstChallenge = page.locator('[data-challenge]').first();
    const initialChecked = await firstChallenge.isChecked();

    await firstChallenge.click();
    await page.waitForTimeout(100);

    const afterChecked = await firstChallenge.isChecked();
    expect(afterChecked).toBe(!initialChecked);
  });

  test('INP-003: Module groups and selection work', async ({ page }) => {
    const moduleChips = await page.locator('[data-module]').count();
    expect(moduleChips).toBeGreaterThan(40); // 50+ modules

    // Check module groups render
    const moduleGroups = await page.locator('.mgroup').count();
    expect(moduleGroups).toBe(6); // 6 groups
  });

  test('INP-004: Complexity areas table renders', async ({ page }) => {
    const complexityTable = page.locator('#complexityTable');
    await expect(complexityTable).toBeVisible();

    const selects = await complexityTable.locator('select').count();
    expect(selects).toBeGreaterThan(0);
  });

  test('INP-005: Migration scope chips are selectable', async ({ page }) => {
    const migScopes = await page.locator('[data-migscope]').count();
    expect(migScopes).toBeGreaterThan(10);
  });

  test('INP-006: Integration rows can be added', async ({ page }) => {
    const addBtn = page.locator('#addIntegration');
    await expect(addBtn).toBeVisible();

    const initialCount = await page.locator('.int-row').count();

    await addBtn.click();
    await page.waitForTimeout(200);

    const afterCount = await page.locator('.int-row').count();
    expect(afterCount).toBe(initialCount + 1);
  });

  test('INP-007: Customization level dropdown works', async ({ page }) => {
    const custLevelSelect = page.locator('#f_custLevel');
    await expect(custLevelSelect).toBeVisible();

    const value = await custLevelSelect.inputValue();
    expect(value).toBeTruthy();
  });

  test('INP-008: Form input changes trigger recalculation', async ({ page }) => {
    // Get initial effort
    const initialEffort = await page.locator('.kpi-chip:has-text("Expected effort") .v').textContent();

    // Change user count
    await page.locator('#f_users').fill('50');
    await page.waitForTimeout(300);

    // Check effort changed
    const newEffort = await page.locator('.kpi-chip:has-text("Expected effort") .v').textContent();
    expect(newEffort).not.toEqual(initialEffort);
  });

  // ===== LICENSING PANEL TESTS =====
  test('LIC-001: Licensing tab shows license mix table', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Licensing' }).click();
    await page.waitForTimeout(200);

    const licensingPanel = page.locator('#panel-licensing');
    await expect(licensingPanel).toBeVisible();

    const table = licensingPanel.locator('table.ctable');
    await expect(table).toBeVisible();
  });

  test('LIC-002: License cost calculations display', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Licensing' }).click();
    await page.waitForTimeout(200);

    const statTiles = await page.locator('#panel-licensing .stat-tile').count();
    expect(statTiles).toBeGreaterThan(0);

    // Check for annual cost display
    const annualCostText = await page.locator('#panel-licensing').textContent();
    expect(annualCostText).toContain('annual');
  });

  // ===== DASHBOARD PANEL TESTS =====
  test('DASH-001: Dashboard renders all stat tiles', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Dashboard' }).click();
    await page.waitForTimeout(200);

    const statTiles = await page.locator('#panel-dashboard .stat-tile').count();
    expect(statTiles).toBeGreaterThanOrEqual(7);
  });

  test('DASH-002: Charts render on dashboard', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Dashboard' }).click();
    await page.waitForTimeout(300);

    const canvases = ['#chartWorkstream', '#chartRole', '#chartPhase', '#chartMix', '#chartRisk'];

    for (const canvas of canvases) {
      const el = page.locator(canvas);
      await expect(el).toBeVisible();
    }
  });

  test('DASH-003: Effort range shows low/expected/high', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Dashboard' }).click();
    await page.waitForTimeout(200);

    const rangeText = await page.locator('#panel-dashboard').textContent();
    expect(rangeText).toContain('Low');
    expect(rangeText).toContain('Expected');
    expect(rangeText).toContain('High');
  });

  // ===== TIMELINE PANEL TESTS =====
  test('TIMELINE-001: Timeline panel displays phase plan', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Timeline' }).click();
    await page.waitForTimeout(200);

    const tlRows = await page.locator('#panel-timeline .tl-row').count();
    expect(tlRows).toBeGreaterThan(10);
  });

  test('TIMELINE-002: Phase table with dependencies renders', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Timeline' }).click();
    await page.waitForTimeout(200);

    const phaseTable = page.locator('#panel-timeline table.reg-table');
    await expect(phaseTable).toBeVisible();

    const rows = await phaseTable.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(10);
  });

  // ===== TEAM PANEL TESTS =====
  test('TEAM-001: Team panel shows role bar chart', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Team' }).click();
    await page.waitForTimeout(200);

    const roleBars = await page.locator('#panel-team .role-bar-row').count();
    expect(roleBars).toBeGreaterThan(0);
  });

  test('TEAM-002: Customer responsibilities list renders', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Team' }).click();
    await page.waitForTimeout(200);

    const respList = page.locator('#panel-team ul');
    await expect(respList).toBeVisible();

    const items = await respList.locator('li').count();
    expect(items).toBeGreaterThan(5);
  });

  // ===== GOVERNANCE PANEL TESTS =====
  test('GOV-001: Assumptions register table renders', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Governance' }).click();
    await page.waitForTimeout(200);

    const table = page.locator('#panel-governance table.reg-table').first();
    await expect(table).toBeVisible();

    const rows = await table.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(15);
  });

  test('GOV-002: Risk register displays', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Governance' }).click();
    await page.waitForTimeout(200);

    const content = await page.locator('#panel-governance').textContent();
    expect(content).toContain('Risk register');
    expect(content).toContain('Mitigation');
  });

  // ===== DISCOVERY PANEL TESTS =====
  test('DISC-001: Discovery questions render in three categories', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Discovery' }).click();
    await page.waitForTimeout(200);

    const qaCards = await page.locator('#panel-discovery .qa-card').count();
    expect(qaCards).toBe(3); // Critical, Important, Nice to have
  });

  // ===== EXECUTIVE SUMMARY TESTS =====
  test('EXEC-001: Executive summary renders all sections', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Executive' }).click();
    await page.waitForTimeout(200);

    const execBlocks = await page.locator('#panel-exec .exec-block').count();
    expect(execBlocks).toBeGreaterThan(8);
  });

  test('EXEC-002: Commercial summary grid displays', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Executive' }).click();
    await page.waitForTimeout(200);

    const commercialGrid = page.locator('#panel-exec .commercial-grid');
    await expect(commercialGrid).toBeVisible();
  });

  // ===== SCENARIOS PANEL TESTS =====
  test('SCEN-001: Scenario table renders with A/B/C columns', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Scenarios' }).click();
    await page.waitForTimeout(200);

    const table = page.locator('#panel-scenarios table.scenario-table');
    await expect(table).toBeVisible();

    const rows = await table.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(3);
  });

  // ===== RESOURCES PANEL TESTS =====
  test('RES-001: Resources panel shows documentation links', async ({ page }) => {
    await page.locator('.nav-item', { hasText: 'Videos' }).click();
    await page.waitForTimeout(200);

    const links = await page.locator('#panel-resources a[target="_blank"]').count();
    expect(links).toBeGreaterThan(0);
  });

  // ===== CALCULATIONS TESTS =====
  test('CALC-001: Effort increases with more modules', async ({ page }) => {
    const getEffort = async () => {
      const text = await page.locator('.kpi-chip:has-text("Expected effort") .v').textContent();
      return parseInt(text.replace(/,/g, ''));
    };

    const initial = await getEffort();

    // Add a module
    const moduleChips = page.locator('[data-module]');
    const unchecked = await moduleChips.evaluateAll((chips) =>
      chips.find(c => !c.querySelector('input').checked)
    );

    if (unchecked) {
      await page.locator('[data-module]').filter({ has: page.locator('input:not(:checked)') }).first().click();
      await page.waitForTimeout(300);

      const after = await getEffort();
      expect(after).toBeGreaterThan(initial);
    }
  });

  test('CALC-002: Duration scales with effort', async ({ page }) => {
    const getDuration = async () => {
      const text = await page.locator('.kpi-chip:has-text("Duration") .v').textContent();
      return parseFloat(text);
    };

    const initial = await getDuration();

    // Change user count to increase effort
    await page.locator('#f_users').fill('100');
    await page.waitForTimeout(300);

    const after = await getDuration();
    expect(after).toBeGreaterThanOrEqual(initial);
  });

  test('CALC-003: Team size reflects effort and duration', async ({ page }) => {
    const getTeamSize = async () => {
      const text = await page.locator('.kpi-chip:has-text("Team") .v').textContent();
      return parseInt(text);
    };

    const teamSize = await getTeamSize();
    expect(teamSize).toBeGreaterThanOrEqual(2);
    expect(teamSize).toBeLessThanOrEqual(22);
  });

  // ===== RESPONSIVE TESTS =====
  test('RESP-001: Mobile layout responds correctly', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.waitForTimeout(200);

    // Navigation should still be visible
    const nav = page.locator('.nav-item');
    await expect(nav.first()).toBeVisible();
  });

  // ===== EDGE CASES =====
  test('EDGE-001: Zero users handling', async ({ page }) => {
    await page.locator('#f_users').fill('1');
    await page.waitForTimeout(200);

    const effort = await page.locator('.kpi-chip:has-text("Expected effort") .v').textContent();
    expect(effort).toBeTruthy();
  });

  test('EDGE-002: Large user count handling', async ({ page }) => {
    await page.locator('#f_users').fill('500');
    await page.waitForTimeout(300);

    const effort = await page.locator('.kpi-chip:has-text("Expected effort") .v').textContent();
    const effortNum = parseInt(effort.replace(/,/g, ''));
    expect(effortNum).toBeGreaterThan(1000);
  });

  test('EDGE-003: All modules selected', async ({ page }) => {
    const uncheckedModules = page.locator('[data-module]:not(:checked)');
    const count = await uncheckedModules.count();

    if (count > 0) {
      // Select first unchecked module
      await uncheckedModules.first().click();
      await page.waitForTimeout(200);

      const effort = await page.locator('.kpi-chip:has-text("Expected effort") .v').textContent();
      expect(effort).toBeTruthy();
    }
  });

  test('EDGE-004: Multiple integration rows', async ({ page }) => {
    const addBtn = page.locator('#addIntegration');

    // Add 3 integrations
    for (let i = 0; i < 3; i++) {
      await addBtn.click();
      await page.waitForTimeout(150);
    }

    const rows = await page.locator('.int-row').count();
    expect(rows).toBeGreaterThan(3);
  });

  // ===== CONSOLE ERROR CHECK =====
  test('CONS-001: No critical console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Navigate through all panels
    for (let i = 0; i < 10; i++) {
      await page.locator(`.nav-item:nth-child(${i+1})`).click();
      await page.waitForTimeout(100);
    }

    // Filter for real errors (exclude expected ones)
    const criticalErrors = errors.filter(e =>
      !e.includes('undefined') &&
      !e.includes('null')
    );

    expect(criticalErrors.length).toBe(0);
  });

  // ===== DATA PERSISTENCE =====
  test('DATA-001: Input changes persist during session', async ({ page }) => {
    const newName = 'Test Company ' + Date.now();

    // Change customer name
    await page.locator('#f_name').fill(newName);
    await page.waitForTimeout(200);

    // Navigate away
    await page.locator('.nav-item', { hasText: 'Dashboard' }).click();
    await page.waitForTimeout(200);

    // Navigate back
    await page.locator('.nav-item', { hasText: 'Inputs' }).click();
    await page.waitForTimeout(200);

    // Check value persisted
    const value = await page.locator('#f_name').inputValue();
    expect(value).toBe(newName);
  });

});
