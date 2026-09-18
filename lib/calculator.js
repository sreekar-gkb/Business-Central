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
  AREA_KEYS,
  BC_LICENSES,
  PREMIUM_MODULE_IDS
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

export function needsPremium(modSet) {
  return PREMIUM_MODULE_IDS.some((id) => modSet.has(id));
}

export function licensingEngine(s) {
  const c = s.customer;
  const premium = needsPremium(s.modules);
  const finance = Math.max(0, c.financeUsers || 0);
  const ops = Math.max(0, c.opsUsers || 0);
  const wh = Math.max(0, c.whUsers || 0);
  const mfg = Math.max(0, c.mfgUsers || 0);
  const ext = Math.max(0, c.extUsers || 0);
  const totalUsers = Math.max(0, c.users || 0);
  const namedFull = finance + ops + wh + mfg;
  const fullUsers = Math.min(totalUsers, namedFull) || Math.min(totalUsers, Math.ceil(totalUsers * 0.6));
  const teamMembers = Math.max(0, totalUsers - fullUsers);
  const extAccountants = Math.min(3, ext);
  const extBeyondFree = Math.max(0, ext - 3);
  const fullLicense = premium ? BC_LICENSES[1] : BC_LICENSES[0];
  const teamLicense = BC_LICENSES[2];
  const fullCostMonthly = fullUsers * fullLicense.monthly;
  const teamCostMonthly = teamMembers * teamLicense.monthly;
  const extCostMonthly = extBeyondFree * fullLicense.monthly;
  const totalMonthly = fullCostMonthly + teamCostMonthly + extCostMonthly;
  const totalAnnual = totalMonthly * 12;
  return {
    premium, fullUsers, teamMembers, extAccountants, extBeyondFree, fullLicense, teamLicense,
    fullCostMonthly, teamCostMonthly, extCostMonthly, totalMonthly, totalAnnual, totalUsers
  };
}

export function assumptions(s) {
  const c = s.customer;
  return [
    ["A001", `Estimate covers ${c.companies} compan${c.companies === 1 ? 'y' : 'ies'} / ${c.entities} legal entit${c.entities === 1 ? 'y' : 'ies'} as specified.`, "Additional entities increase Finance, Security, Testing and Training effort.", "+10–20% per additional company"],
    ["A002", `${c.users} total users (${c.concurrentUsers || 'TBC'} concurrent) at go-live.`, "Materially higher user counts increase Security, Training and Testing effort.", "Scales with user band"],
    ["A003", `Module scope limited to the ${s.modules.size} modules currently selected.`, "Adding modules post-signoff is treated as change request.", "Directly additive per module"],
    ["A004", `Legacy data quality assumed ${s.migration.dataQuality.toLowerCase()}, sourced from ${s.migration.source}.`, "Poor/unknown data quality drives rework and additional migration cycles.", "±25–60% on Migration workstream"],
    ["A005", `${s.migration.cycles} migration cycle(s) (mock + final) included.`, "Additional cycles required if reconciliation fails UAT sign-off.", "+35% of Migration per extra cycle"],
    ["A006", `${s.integrations.length} integration(s) in scope as listed.`, "Undiscovered integrations are excluded until specified and estimated.", "Additive per integration (40–165h base)"],
    ["A007", `Customisation scope: ${s.customization.level.toLowerCase()}.`, "Scope creep into bespoke development increases AL effort and testing.", "Directly additive"],
    ["A008", `Delivery model: ${s.delivery.model}, ~${s.delivery.remotePct}% remote delivery.`, "On-site-heavy delivery increases cost and reduces schedule flexibility.", "Affects duration, not base effort"],
    ["A009", `Customer resource availability assumed ${s.delivery.availability.toLowerCase()}.`, "Low availability extends timeline and increases PM / re-planning effort.", "Extends duration 15–30%"],
    ["A010", `Localisation: ${s.localization.country}${s.localization.multiCountry ? ' + additional countries' : ''}, standard BC localisation ${s.localization.standardAvailable === 'Yes' ? 'available' : 'not confirmed'}.`, "Non-standard localisation requires bespoke statutory development.", "+15–40% on Finance/Customisation"],
    ["A011", `Reporting scope: ${[...s.reporting.items].length} report categories at ${s.reporting.complexity.toLowerCase()} complexity.`, "Additional regulatory/statutory reports add develop-and-test effort.", "Additive per report category"],
    ["A012", `Historical transaction migration limited to agreed scope (${[...s.migration.scope].length} data categories); full history not assumed unless listed.`, "Full historical migration significantly increases Migration effort.", "+30–70% on Migration if expanded"],
    ["A013", `Target go-live: ${c.targetDate || 'not yet fixed'}.`, "A fixed, compressed date may require additional concurrent resourcing.", "Affects team size, not base effort"],
    ["A014", `Support model: ${s.support.model}, ${s.support.sla} SLA, ${s.support.ticketVolume.toLowerCase()} expected ticket volume.`, "Underestimated ticket volume affects recurring cost, not the one-off estimate.", "Recurring, separate from implementation"],
    ["A015", "Customer provides a single accountable product owner and named subject-matter experts for each functional area.", "Absent SME availability drives elongated discovery and rework.", "Extends duration; PM effort +10–15%"]
  ];
}

export function risks(s) {
  const R = [
    { t: "Poor / unreconciled legacy data quality delays migration sign-off.", cond: s.migration.dataQuality === 'Poor' || s.migration.dataQuality === 'Unknown', prob: "High", impact: "High", mit: "Run a data quality assessment in Discovery; budget a dedicated cleansing pass ahead of mock migration." },
    { t: "Requirements remain unclear going into Configuration.", cond: confidenceScore(s).level !== 'High', prob: "Medium", impact: "High", mit: "Time-box Discovery with formal sign-off of the Solution Design document before Configuration starts." },
    { t: "Customisation scope expands beyond standard Business Central functionality.", cond: s.customization.level === 'Significant customization' || s.customization.level === 'Extensive customization', prob: "Medium", impact: "High", mit: "Apply a fit-gap workshop; require architecture sign-off before any custom development is scheduled." },
    { t: "Integration dependencies on third-party vendors slip the schedule.", cond: s.integrations.length >= 2, prob: "Medium", impact: "Medium", mit: "Confirm third-party technical contacts and API availability during Discovery; sequence integration dev early." },
    { t: "Customer resource / SME availability constrains progress.", cond: s.delivery.availability === 'Low', prob: "High", impact: "Medium", mit: "Agree a resourcing plan and RACI with the customer sponsor before Configuration begins." },
    { t: "Compressed timeline forces parallel workstreams beyond safe capacity.", cond: !!s.customer.targetDate, prob: "Medium", impact: "Medium", mit: "Validate the target date against the phase plan in Discovery; flag conflicts immediately." },
    { t: "Localisation complexity (multi-country / multi-tax) exceeds standard BC coverage.", cond: s.localization.multiCountry || s.localization.multiTax, prob: "Medium", impact: "High", mit: "Validate standard localisation coverage per country before pricing statutory development." },
    { t: "Third-party ISV extensions conflict with target BC version or planned customisation.", cond: true, prob: "Low", impact: "Medium", mit: "Audit installed extensions during Discovery; confirm compatibility with target version." },
    { t: "Insufficient testing coverage leads to post-go-live defects.", cond: s.complexity.overall === 'Complex' || s.complexity.overall === 'Highly Complex', prob: "Medium", impact: "High", mit: "Formal test plan with traceability to requirements; independent UAT sign-off gate." },
    { t: "Scope creep via informal change requests.", cond: true, prob: "Medium", impact: "Medium", mit: "Enforce a change-control process from kick-off; log all scope changes against the assumptions register." },
    { t: "Delayed customer decisions on design options stall Configuration.", cond: true, prob: "Medium", impact: "Medium", mit: "Set decision SLAs in the project charter; escalate via steering committee if breached." },
    { t: "Migration reconciliation discrepancies found late in cutover.", cond: s.migration.cycles <= 1, prob: s.migration.cycles <= 1 ? "High" : "Low", impact: "High", mit: "Run a full mock migration with financial reconciliation at least two weeks prior to final cutover." }
  ];
  return R.map((r) => ({ ...r, prob: r.cond ? r.prob : "Low" }));
}

export function discoveryQuestions(s) {
  const crit = [], imp = [], nice = [];
  if (!s.customer.concurrentUsers) crit.push("What is the expected number of concurrent users vs. total named users?");
  if (s.migration.dataQuality === 'Unknown' || s.migration.dataQuality === 'Poor') crit.push(`What is the actual data quality / state of the legacy system(s) (${s.migration.source})? A data quality assessment should precede final pricing.`);
  if (s.integrations.length === 0 && s.challenges.has('integration_problems')) crit.push("Which systems must integrate with Business Central, and what protocols / APIs do they expose?");
  if (!s.customer.targetDate) crit.push("Is there a fixed go-live date driving the timeline, and what is it anchored to (e.g. financial year-end, contract expiry)?");
  if (s.customer.companies > 1) crit.push(`How will intercompany transactions and eliminations be handled across the ${s.customer.companies} companies / ${s.customer.entities} legal entities?`);
  if (s.localization.multiCountry && !s.localization.statutory) crit.push("What statutory reporting and e-invoicing requirements apply in each operating country?");
  if ((s.customization.level === 'Significant customization' || s.customization.level === 'Extensive customization') && Object.values(s.customization.items).reduce((a, b) => a + b, 0) === 0) crit.push("What specific custom functionality is required beyond standard Business Central, and why can't it be met with configuration?");

  if (!s.support.ticketVolume) imp.push("What is the expected support ticket volume post go-live, based on the legacy environment's history?");
  if (s.reporting.complexity === 'High' && !s.modules.has('powerbi')) imp.push("Should Power BI be scoped as part of this engagement, or is reporting/BI handled by the customer's own team?");
  if (s.migration.cycles <= 1 && (s.migration.dataQuality === 'Poor' || s.migration.dataQuality === 'Unknown')) imp.push("Given current data quality, should an additional mock migration cycle be budgeted before cutover?");
  if (["Manufacturing", "Food & Beverage", "Pharmaceuticals / Life Sciences", "Automotive"].includes(s.customer.industry) && !MODULES.some((m) => m.ws === 'manufacturing' && s.modules.has(m.id))) imp.push("Is manufacturing functionality required, or is production planning/execution managed outside Business Central?");
  if (s.customer.extUsers > 0) imp.push(`What access model is required for the ${s.customer.extUsers} external users (customer/vendor self-service, licensing type)?`);
  imp.push("Which third-party ISV extensions (if any) are already in use or planned, and have they been validated against the target BC version?");

  nice.push("What training delivery model is preferred (train-the-trainer, role-based classroom, self-paced)?");
  nice.push("What is the required retention period for historical data not migrated into Business Central?");
  nice.push("What sandbox / environment strategy is expected (number of environments, refresh cadence)?");
  nice.push("Are there change-management or communications resources on the customer side to support adoption?");
  return { crit, imp, nice };
}

export function recommendationText(s, res) {
  const c = s.customer;
  const topAreas = ["finance", "sales", "purchasing", "inventory", "warehouse", "manufacturing", "projects", "service"]
    .filter((k) => res.ws[k] > 10)
    .map((k) => WS_LABELS[k]);
  return `Based on the current inputs, a ${s.delivery.model.toLowerCase()} Business Central implementation is recommended, with ${topAreas.slice(0, 5).join(', ') || 'core Finance'} delivered during the initial phase${c.companies > 1 ? `, sequenced across the ${c.companies} companies to manage cutover risk` : ''}. ` +
    `Migration should cover the ${[...s.migration.scope].length} data categories currently agreed (master data and opening balances), with historical transactions retained in ${s.migration.source} for reference unless validated as a hard requirement. ` +
    `${s.integrations.length > 0 ? `The ${s.integrations.length} integration(s) in scope should be delivered alongside the relevant functional workstream rather than as a late-stage activity. ` : ''}` +
    `A structured UAT, cutover and hypercare period should precede transition to the proposed ${s.support.model} support model at ${s.support.sla} SLA. ` +
    `${s.customization.level === 'Significant customization' || s.customization.level === 'Extensive customization' ? 'Given the customisation level indicated, a dedicated architecture review is recommended before development is scheduled.' : 'Standard Business Central functionality should be favoured over customisation wherever the fit-gap analysis allows.'}`;
}
