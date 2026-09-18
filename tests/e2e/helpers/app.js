const { expect } = require('@playwright/test');

const PASSWORD = process.env.VIEW_PASSWORD || 'testpass123';
const CONTACT = 'QA Automation';

const PANELS = [
  ['Inputs', 'Pre-Sales Inputs'],
  ['Licensing & Costs', 'Microsoft Licensing and Costs'],
  ['Dashboard', 'Delivery & Estimate Dashboard'],
  ['Timeline', 'Delivery Timeline'],
  ['Team', 'Project Team & Customer Responsibilities'],
  ['Governance', 'Assumptions, Exclusions & Risks'],
  ['Discovery Qs', 'Discovery Questions'],
  ['Executive Summary', 'Executive Summary'],
  ['Scenarios', 'What-If / Scenario Analysis'],
  ['Videos & How-To', 'Videos and How-To Resources'],
];

/** Unlock the password gate and land on the Deal Sizer app. */
async function login(page, contact = CONTACT) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'BC Deal Sizer' })).toBeVisible();
  await page.locator('#username').fill(contact);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'View Estimate' }).click();
  await expect(page.getByRole('heading', { name: 'Pre-Sales Inputs' })).toBeVisible({ timeout: 15000 });
}

/** Click a sidebar nav item by its visible label. */
async function gotoPanel(page, label) {
  await page.locator('aside button', { hasText: label }).first().click();
}

/** Read the value div that immediately follows a div whose exact text is `label`. */
function labeledValue(scope, label, index = 0) {
  return scope
    .locator(`div:text-is("${label}")`)
    .nth(index)
    .locator('xpath=following-sibling::div[1]');
}

async function readLabeledNumber(scope, label, index = 0) {
  const txt = await labeledValue(scope, label, index).innerText();
  return parseNum(txt);
}

function parseNum(text) {
  if (text == null) return NaN;
  const m = String(text).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : NaN;
}

/** Read the whole KPI bar (always the first occurrence of each label on the page). */
async function readKpis(page) {
  return {
    effort: await readLabeledNumber(page, 'Expected effort'),
    months: await readLabeledNumber(page, 'Duration'),
    team: await readLabeledNumber(page, 'Team (peak)'),
    support: await readLabeledNumber(page, 'Monthly support'),
    complexity: (await labeledValue(page, 'Complexity').innerText()).trim(),
    confidence: (await labeledValue(page, 'Confidence').innerText()).trim(),
  };
}

/** Field on the Inputs panel, located by its <label> text inside the field wrapper. */
function inputByLabel(page, labelText) {
  return page
    .locator('label', { hasText: new RegExp(`^${escapeRe(labelText)}$`) })
    .first()
    .locator('xpath=following-sibling::*[self::input or self::select][1]');
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Set a number/text input on the Inputs panel and let React recalculate. */
async function setField(page, labelText, value) {
  const el = inputByLabel(page, labelText);
  await el.scrollIntoViewIfNeeded();
  await el.fill(String(value));
  await el.blur();
}

module.exports = {
  PASSWORD,
  CONTACT,
  PANELS,
  login,
  gotoPanel,
  labeledValue,
  readLabeledNumber,
  readKpis,
  inputByLabel,
  setField,
  parseNum,
};
