import {
  MODULES,
  CFACTOR,
  MIGRATION_SCOPE,
  INT_COMPLEXITY_HOURS,
  REPORTING_ITEMS,
  CUSTOM_ITEMS,
  CUSTOM_LEVEL_BASE,
  WS_ORDER,
  WS_LABELS,
  ROLE_MAP,
  PHASES,
  PHASE_ALLOC,
  MIGRATION_SOURCES,
  AREA_KEYS
} from './constants';

export function userBandIndex(u) {
  if (u <= 10) return 0;
  if (u <= 25) return 1;
  if (u <= 75) return 2;
  if (u <= 150) return 3;
  if (u <= 300) return 4;
  return 5;
}

const BAND_ADD = [0, 0.05, 0.15, 0.3, 0.45, 0.62];

export function userBandFactor(u) {
  return 1 + BAND_ADD[userBandIndex(u)];
}

export function industryFactor(level) {
  const factors = { Low: 0.92, Medium: 1.0, High: 1.15, "Very High": 1.32 };
  return factors[level] || 1;
}

export function companiesFactor(n) {
  return 1 + Math.min(0.55, 0.18 * Math.max(0, n - 1));
}

export function round5(n) {
  return Math.round(n / 5) * 5;
}

export function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

export function fmtH(n) {
  return Math.round(n).toLocaleString('en-AU');
}

export function modulesByWs(modSet, ws) {
  return MODULES.filter((m) => modSet.has(m.id) && m.ws === ws);
}

export function moduleHours(modSet, ws) {
  return sum(modulesByWs(modSet, ws).map((m) => m.h));
}

export function runEngine(s) {
  const c = s.customer;
  const uf = userBandFactor(c.users);
  const cof = companiesFactor(c.companies);
  const indf = industryFactor(c.industryComplexity);
  const A = s.complexity.areas;
  const af = (k) => CFACTOR[A[k]] || 1;

  const ws = {};

  ws.discovery =
    50 +
    s.modules.size * 1.3 +
    (c.companies - 1) * 12 +
    s.challenges.size * 1.6;
  ws.discovery *= indf;

  ws.finance = moduleHours(s.modules, "finance") * af("finance") * uf * cof;
  ws.sales = moduleHours(s.modules, "sales") * af("sales") * uf * cof;
  ws.purchasing =
    moduleHours(s.modules, "purchasing") * af("purchasing") * uf * cof;
  ws.inventory = moduleHours(s.modules, "inventory") * af("inventory") * uf * cof;
  ws.warehouse = moduleHours(s.modules, "warehouse") * af("warehouse") * uf * cof;
  ws.manufacturing =
    moduleHours(s.modules, "manufacturing") * af("manufacturing") * uf * cof;
  ws.projects = moduleHours(s.modules, "projects") * af("projects") * uf * cof;
  ws.service = moduleHours(s.modules, "service") * af("service") * uf * cof;

  const reportingModuleHrs = moduleHours(s.modules, "reporting");
  const reportingItemHrs = sum(
    [...s.reporting.items].map((id) => {
      const it = REPORTING_ITEMS.find((r) => r[0] === id);
      return it ? it[2] : 0;
    })
  );
  ws.reporting =
    (reportingModuleHrs + reportingItemHrs) *
    af("reporting") *
    (CFACTOR[s.reporting.complexity] || 1);

  ws.integrations = sum(
    s.integrations.map((row) => {
      let h = INT_COMPLEXITY_HOURS[row.complexity] || 90;
      h *= row.direction === "Bidirectional" ? 1.28 : row.direction === "Outbound" ? 1.08 : 1.0;
      h *= row.mode === "Real-time" ? 1.22 : 1.0;
      h *= 1 + Math.max(0, (row.interfaces || 1) - 1) * 0.18;
      return h;
    })
  ) * af("integrations");

  const custModuleHrs = moduleHours(s.modules, "customization");
  const custItemHrs = sum(
    CUSTOM_ITEMS.map(([key, label, unit]) => (s.customization.items[key] || 0) * unit)
  );
  ws.customization =
    ((CUSTOM_LEVEL_BASE[s.customization.level] || 0) +
      custModuleHrs +
      custItemHrs) *
    af("customization");

  const migEntityHrs = sum(
    [...s.migration.scope].map((id) => {
      const it = MIGRATION_SCOPE.find((m) => m[0] === id);
      return it ? it[2] : 0;
    })
  );
  const migCf = CFACTOR[s.migration.complexity] || 1;
  const migDq = {
    Excellent: 0.85,
    Good: 1.0,
    Moderate: 1.25,
    Poor: 1.6,
    Unknown: 1.42
  }[s.migration.dataQuality] || 1;
  const migCyclesF = 1 + (Math.max(1, s.migration.cycles) - 1) * 0.35;
  const migCutover = 20 + c.companies * 8;
  ws.migration = (migEntityHrs * migCf * migDq * migCyclesF + migCutover) * cof;

  ws.architecture =
    45 +
    s.integrations.length * 9 +
    Object.keys(CUSTOM_LEVEL_BASE).indexOf(s.customization.level) * 13 +
    (c.companies - 1) * 10 +
    (s.localization.multiCountry ? 20 : 0);
  ws.security = 25 + userBandIndex(c.users) * 9 + (c.companies - 1) * 8 + (c.extUsers > 0 ? 15 : 0);

  const preTest =
    ws.finance +
    ws.sales +
    ws.purchasing +
    ws.inventory +
    ws.warehouse +
    ws.manufacturing +
    ws.projects +
    ws.service +
    ws.reporting +
    ws.integrations +
    ws.customization;
  ws.testing = 0.22 * preTest;

  ws.training = 16 + Math.min(c.users, 500) * 0.34 + (c.companies - 1) * 6;
  if (s.delivery.model !== "Big Bang") ws.training *= 1.12;

  ws.deployment =
    30 +
    c.companies * 10 +
    (s.delivery.model !== "Big Bang" ? 24 : 0) +
    ws.migration * 0.05;
  ws.hypercare =
    40 +
    userBandIndex(c.users) * 9 +
    c.companies * 6 +
    (s.support.model === "24x7" ? 22 : s.support.model === "24x5" ? 12 : 0);
  ws.documentation = 0.05 * (preTest + ws.migration);

  const prePM =
    ws.discovery +
    ws.architecture +
    ws.finance +
    ws.sales +
    ws.purchasing +
    ws.inventory +
    ws.warehouse +
    ws.manufacturing +
    ws.projects +
    ws.service +
    ws.reporting +
    ws.integrations +
    ws.customization +
    ws.migration +
    ws.security +
    ws.testing +
    ws.training +
    ws.deployment +
    ws.hypercare +
    ws.documentation;
  ws.pm = 0.13 * prePM;

  const base = prePM + ws.pm;

  const contPctMap = {
    Simple: 10,
    Moderate: 15,
    Complex: 20,
    "Highly Complex": 25
  };
  const contPct =
    s.contingencyOverride != null
      ? s.contingencyOverride
      : contPctMap[s.complexity.overall] || 15;
  const contingency = base * (contPct / 100);
  const total = base + contingency;

  const supBase = { Low: 40, Medium: 80, High: 140, "Very High": 220 }[
    s.support.ticketVolume
  ] || 80;
  const supScale = 1 + userBandIndex(c.users) * 0.11;
  const supScopeAdd = Math.max(0, s.support.scope.size - 3) * 8;
  const supSla = { Standard: 1.0, "Business Critical": 1.25, Enterprise: 1.5 }[
    s.support.sla
  ] || 1;
  const supModel = {
    "Business hours": 1.0,
    "Extended business hours": 1.15,
    "24x5": 1.35,
    "24x7": 1.6
  }[s.support.model] || 1;
  const monthlySupport = (supBase * supScale + supScopeAdd) * supSla * supModel;

  return {
    ws,
    base,
    contPct,
    contingency,
    total,
    monthlySupport,
    annualSupport: monthlySupport * 12,
    uf,
    cof,
    indf
  };
}

export function cloneState(s) {
  return {
    customer: { ...s.customer },
    challenges: new Set(s.challenges),
    modules: new Set(s.modules),
    complexity: {
      overall: s.complexity.overall,
      areas: { ...s.complexity.areas }
    },
    migration: { ...s.migration, scope: new Set(s.migration.scope) },
    integrations: s.integrations.map((r) => ({ ...r })),
    customization: {
      level: s.customization.level,
      items: { ...s.customization.items }
    },
    reporting: { items: new Set(s.reporting.items), complexity: s.reporting.complexity },
    localization: { ...s.localization },
    delivery: { ...s.delivery },
    support: { ...s.support, scope: new Set(s.support.scope) },
    contingencyOverride: s.contingencyOverride
  };
}

export function bumpArea(level, dir) {
  const order = ["Low", "Medium", "High", "Very High"];
  let i = order.indexOf(level);
  i = Math.max(0, Math.min(order.length - 1, i + dir));
  return order[i];
}

export function bestCaseState(s) {
  const v = cloneState(s);
  v.migration.dataQuality = "Excellent";
  v.migration.cycles = Math.max(1, s.migration.cycles - 1);
  v.delivery.availability = "High";
  Object.keys(v.complexity.areas).forEach((k) => {
    v.complexity.areas[k] = bumpArea(v.complexity.areas[k], -1);
  });
  v.contingencyOverride = Math.max(
    6,
    (v.contingencyOverride != null
      ? v.contingencyOverride
      : { Simple: 10, Moderate: 15, Complex: 20, "Highly Complex": 25 }[
          v.complexity.overall
        ] || 15) - 6
  );
  return v;
}

export function worstCaseState(s) {
  const v = cloneState(s);
  v.migration.dataQuality = "Poor";
  v.migration.cycles = s.migration.cycles + 1;
  v.delivery.availability = "Low";
  Object.keys(v.complexity.areas).forEach((k) => {
    v.complexity.areas[k] = bumpArea(v.complexity.areas[k], 1);
  });
  v.contingencyOverride =
    (v.contingencyOverride != null
      ? v.contingencyOverride
      : { Simple: 10, Moderate: 15, Complex: 20, "Highly Complex": 25 }[
          v.complexity.overall
        ] || 15) + 6;
  return v;
}

export function effortByRole(ws) {
  const roles = {};
  WS_ORDER.forEach((k) => {
    (ROLE_MAP[k] || []).forEach(([role, pct]) => {
      roles[role] = (roles[role] || 0) + ws[k] * pct;
    });
  });
  return Object.entries(roles)
    .filter(([, h]) => h > 0.5)
    .sort((a, b) => b[1] - a[1]);
}

export function durationWeeks(totalEffort) {
  return Math.max(8, Math.min(64, Math.round(3 + totalEffort / 225)));
}

export function peakFTE(totalEffort, weeks) {
  return Math.max(2, Math.min(22, Math.round(totalEffort / (weeks * 31))));
}

export function timelinePlan(weeks) {
  return PHASES.map(([key, label, sp, dp, par]) => {
    const start = Math.round((weeks * sp) / 100);
    const dur = Math.max(1, Math.round((weeks * dp) / 100));
    return { key, label, start, dur, end: start + dur, parallel: par };
  });
}

export function confidenceScore(s) {
  let known = 0;
  const total = 11;
  if (s.customer.concurrentUsers > 0) known++;
  if (s.customer.companies > 0) known++;
  if (s.modules.size > 0) known++;
  if (s.migration.dataQuality !== "Unknown") known++;
  if (s.migration.scope.size > 0) known++;
  if (
    s.integrations.length > 0 ||
    !s.challenges.has("integration_problems")
  )
    known++;
  if (
    s.customization.level !== "No customization" ||
    Object.values(s.customization.items).every((v) => v === 0)
  )
    known++;
  if (s.localization.country) known++;
  if (s.customer.targetDate) known++;
  if (s.delivery.availability !== "Unknown") known++;
  if (s.support.ticketVolume) known++;
  const pct = known / total;
  const level =
    pct >= 0.82 ? "High" : pct >= 0.55 ? "Medium" : "Low";
  return { known, total, pct, level };
}
