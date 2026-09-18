'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  INDUSTRIES,
  CHALLENGES,
  MODULES,
  MODULE_GROUPS,
  AREA_KEYS,
  MIGRATION_SOURCES,
  MIGRATION_SCOPE,
  INTEGRATION_CATEGORIES,
  REPORTING_ITEMS,
  SUPPORT_SCOPE_ITEMS,
  CUSTOM_ITEMS,
  CUSTOM_LEVEL_BASE,
  PHASES,
  ROLE_MAP,
  WS_LABELS,
  WS_ORDER,
  ROLE_RESPONSIBILITIES,
  CUSTOMER_RESPONSIBILITIES,
  EXCLUSIONS_BASE,
  PHASE_ALLOC,
  PHASES as PHASES_DATA,
  BC_LICENSES,
  RESOURCE_LINKS
} from '../lib/constants';
import {
  runEngine,
  cloneState,
  bestCaseState,
  worstCaseState,
  durationWeeks,
  peakFTE,
  timelinePlan,
  confidenceScore,
  effortByRole,
  fmtH,
  bumpArea,
  userBandFactor,
  companiesFactor,
  industryFactor,
  modulesByWs,
  moduleHours,
  needsPremium,
  licensingEngine,
  assumptions,
  risks,
  discoveryQuestions,
  recommendationText
} from '../lib/calculator';
import styles from '../styles/DealSizer.module.css';

let INT_SEQ = 1;

// A genuinely blank slate for a brand new user: no customer details, no
// modules, no challenges, no integrations, nothing pre-selected. The
// dashboard and every chart read directly off this via runEngine(state),
// so an empty state here means an empty (or near-zero) dashboard until
// the user actually fills something in - there is no separate "empty
// state" UI to keep in sync, the real calculation just has nothing to
// calculate yet.
function getDefaultState() {
  return {
    customer: {
      name: "",
      industry: "Manufacturing",
      industryComplexity: "Low",
      country: "",
      entities: 1,
      companies: 1,
      locations: 1,
      warehouses: 0,
      users: 1,
      concurrentUsers: 0,
      financeUsers: 0,
      opsUsers: 0,
      whUsers: 0,
      mfgUsers: 0,
      extUsers: 0,
      txnVolume: "",
      growthRate: "",
      targetDate: "",
      goLiveStrategy: "Phased rollout"
    },
    challenges: new Set(),
    modules: new Set(),
    complexity: {
      overall: "Simple",
      areas: {
        finance: "Low",
        sales: "Low",
        purchasing: "Low",
        inventory: "Low",
        warehouse: "Low",
        manufacturing: "Low",
        projects: "Low",
        service: "Low",
        reporting: "Low",
        integrations: "Low",
        migration: "Low",
        localization: "Low",
        customization: "Low"
      }
    },
    migration: {
      source: "Other",
      scope: new Set(),
      complexity: "Low",
      dataQuality: "Unknown",
      cycles: 1
    },
    integrations: [],
    customization: {
      level: "No customization",
      items: {
        customTables: 0,
        tableExt: 0,
        pageExt: 0,
        reportsDev: 0,
        workflowsDev: 0,
        businessLogic: 0,
        customApi: 0,
        mobile: 0,
        docLayouts: 0,
        industrySpecific: 0
      }
    },
    reporting: {
      items: new Set(),
      complexity: "Low"
    },
    localization: {
      country: "",
      standardAvailable: "Unknown",
      multiCountry: false,
      multiCurrency: false,
      multiTax: false,
      multiLanguage: false,
      statutory: false,
      eInvoicing: false,
      regulatory: false
    },
    delivery: {
      model: "Phased rollout",
      remotePct: 0,
      availability: "Unknown",
      timezoneComplexity: "Low"
    },
    support: {
      model: "Business hours",
      scope: new Set(),
      sla: "Standard",
      ticketVolume: "Low"
    },
    contingencyOverride: null
  };
}

// True until the user has actually defined scope: no modules and no
// integrations selected. Every KPI and chart is real math on top of state,
// but that math still returns fixed program-overhead hours (PM, discovery,
// architecture...) even with nothing selected, so panels check this flag
// and show a plain empty-state message instead of numbers that would
// otherwise look like a real (if small) estimate. Customer name is
// deliberately NOT part of this check - it isn't a cost driver, so typing
// a name alone must not unlock computed numbers that don't reflect any
// actual scope yet.
function isEstimateEmpty(state) {
  return state.modules.size === 0 && state.integrations.length === 0;
}

function EmptyState({ message }) {
  return (
    <div style={{
      border: '1px dashed var(--border-strong)',
      borderRadius: 'var(--radius)',
      padding: '40px 24px',
      textAlign: 'center',
      color: 'var(--text-3)',
      fontSize: '13.5px',
      background: 'var(--surface)'
    }}>
      {message || 'Fill in the Inputs tab to see this section populate automatically.'}
    </div>
  );
}

// JSONB in the database can't hold Sets, so state is round-tripped as
// plain arrays for the Set-typed fields and rebuilt into Sets on load.
const SET_PATHS = [
  ['challenges'],
  ['modules'],
  ['migration', 'scope'],
  ['reporting', 'items'],
  ['support', 'scope']
];

function serializeState(state) {
  const out = JSON.parse(JSON.stringify(state, (key, value) => (value instanceof Set ? [...value] : value)));
  return out;
}

function deserializeState(saved) {
  const out = JSON.parse(JSON.stringify(saved));
  SET_PATHS.forEach(([a, b]) => {
    if (b) {
      if (out[a] && Array.isArray(out[a][b])) out[a][b] = new Set(out[a][b]);
    } else if (Array.isArray(out[a])) {
      out[a] = new Set(out[a]);
    }
  });
  return out;
}

export default function DealSizer({ contact = 'Anonymous', onLogout }) {
  const [state, setState] = useState(getDefaultState());
  const [activePanel, setActivePanel] = useState("inputs");
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const saveTimerRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Load any previously saved estimate for this browser session
  useEffect(() => {
    fetch('/api/estimate')
      .then((res) => (res.ok ? res.json() : { state: null }))
      .then((data) => {
        if (data.state) {
          setState(deserializeState(data.state));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const saveEstimate = () => {
    setSaveStatus('saving');
    return fetch('/api/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: serializeState(stateRef.current) }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Save failed');
        setSaveStatus('saved');
      })
      .catch(() => setSaveStatus('error'));
  };

  const saveNow = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveEstimate();
  };

  // Autosave the estimate to the database whenever it changes (debounced).
  // The Save button (saveNow) shares this same saveEstimate() call so both
  // paths write through the identical code path.
  useEffect(() => {
    if (!loaded) return;
    saveTimerRef.current = setTimeout(saveEstimate, 800);
    return () => clearTimeout(saveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, loaded]);

  const res = useMemo(() => runEngine(state), [state]);
  const weeks = durationWeeks(res.total);
  const months = (weeks / 4.345).toFixed(1);
  const team = peakFTE(res.total, weeks);
  const conf = confidenceScore(state);

  const trackEvent = (eventType, details = {}) => {
    if (typeof window !== 'undefined') {
      fetch('/api/activity-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          details,
        }),
      }).catch(() => {});
    }
  };

  const updateCustomer = (key, value) => {
    setState((prev) => ({
      ...prev,
      customer: { ...prev.customer, [key]: value }
    }));
    trackEvent('input_change', { section: 'customer', field: key, value: typeof value === 'string' ? value.substring(0, 50) : value });
  };

  const updateComplexity = (key, value) => {
    setState((prev) => ({
      ...prev,
      complexity: { ...prev.complexity, [key]: value }
    }));
  };

  const updateArea = (key, value) => {
    setState((prev) => ({
      ...prev,
      complexity: {
        ...prev.complexity,
        areas: { ...prev.complexity.areas, [key]: value }
      }
    }));
  };

  const toggleChallenge = (id) => {
    setState((prev) => {
      const newChallenges = new Set(prev.challenges);
      if (newChallenges.has(id)) {
        newChallenges.delete(id);
      } else {
        newChallenges.add(id);
      }
      return { ...prev, challenges: newChallenges };
    });
  };

  const toggleModule = (id) => {
    setState((prev) => {
      const newModules = new Set(prev.modules);
      if (newModules.has(id)) {
        newModules.delete(id);
      } else {
        newModules.add(id);
      }
      return { ...prev, modules: newModules };
    });
  };

  const toggleMigrationScope = (id) => {
    setState((prev) => {
      const newScope = new Set(prev.migration.scope);
      if (newScope.has(id)) {
        newScope.delete(id);
      } else {
        newScope.add(id);
      }
      return { ...prev, migration: { ...prev.migration, scope: newScope } };
    });
  };

  const updateMigration = (key, value) => {
    setState((prev) => ({
      ...prev,
      migration: { ...prev.migration, [key]: value }
    }));
  };

  const updateIntegration = (id, key, value) => {
    setState((prev) => ({
      ...prev,
      integrations: prev.integrations.map((int) =>
        int.id === id ? { ...int, [key]: value } : int
      )
    }));
  };

  const addIntegration = () => {
    setState((prev) => ({
      ...prev,
      integrations: [
        ...prev.integrations,
        {
          id: INT_SEQ++,
          name: "New integration",
          category: INTEGRATION_CATEGORIES[0],
          direction: "Outbound",
          complexity: "Medium",
          mode: "Batch",
          interfaces: 1
        }
      ]
    }));
  };

  const removeIntegration = (id) => {
    setState((prev) => ({
      ...prev,
      integrations: prev.integrations.filter((int) => int.id !== id)
    }));
  };

  const updateCustomizationItem = (key, value) => {
    setState((prev) => ({
      ...prev,
      customization: {
        ...prev.customization,
        items: { ...prev.customization.items, [key]: value }
      }
    }));
  };

  const toggleReportingItem = (id) => {
    setState((prev) => {
      const newItems = new Set(prev.reporting.items);
      if (newItems.has(id)) {
        newItems.delete(id);
      } else {
        newItems.add(id);
      }
      return { ...prev, reporting: { ...prev.reporting, items: newItems } };
    });
  };

  const toggleLocalizationFlag = (key) => {
    setState((prev) => ({
      ...prev,
      localization: {
        ...prev.localization,
        [key]: !prev.localization[key]
      }
    }));
  };

  const toggleSupportScope = (id) => {
    setState((prev) => {
      const newScope = new Set(prev.support.scope);
      if (newScope.has(id)) {
        newScope.delete(id);
      } else {
        newScope.add(id);
      }
      return { ...prev, support: { ...prev.support, scope: newScope } };
    });
  };

  const updateDelivery = (key, value) => {
    setState((prev) => ({
      ...prev,
      delivery: { ...prev.delivery, [key]: value }
    }));
  };

  const updateSupport = (key, value) => {
    setState((prev) => ({
      ...prev,
      support: { ...prev.support, [key]: value }
    }));
  };

  const updateReporting = (key, value) => {
    setState((prev) => ({
      ...prev,
      reporting: { ...prev.reporting, [key]: value }
    }));
  };

  const updateLocalization = (key, value) => {
    setState((prev) => ({
      ...prev,
      localization: { ...prev.localization, [key]: value }
    }));
  };

  if (!loaded) {
    return (
      <div className={styles.app} style={{ alignItems: 'center', justifyContent: 'center', display: 'flex', width: '100%' }}>
        <div style={{ color: 'var(--text-3)', fontSize: '13.5px' }}>Loading your estimate…</div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <Sidebar
        activePanel={activePanel}
        onPanelChange={(panel) => {
          setActivePanel(panel);
          trackEvent('panel_view', { panel });
        }}
      />
      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.userInfo}>
            👤 Logged in as: <strong>{contact}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`${styles.saveStatus} ${saveStatus === 'saved' ? styles.saved : ''} ${saveStatus === 'error' ? styles.error : ''}`}>
              {saveStatus === 'saving' && 'Saving…'}
              {saveStatus === 'saved' && '✓ Saved'}
              {saveStatus === 'error' && 'Save failed'}
            </span>
            <button
              className={styles.saveBtn}
              onClick={saveNow}
              disabled={saveStatus === 'saving'}
            >
              💾 Save
            </button>
            {onLogout && (
              <button
                className={styles.logoutBtn}
                onClick={onLogout}
              >
                🚪 Logout
              </button>
            )}
          </div>
        </div>
        <KpiBar
          empty={isEstimateEmpty(state)}
          total={res.total}
          months={months}
          team={team}
          monthlySupport={res.monthlySupport}
          complexity={state.complexity.overall}
          confidence={conf.level}
        />
        {activePanel === "inputs" && (
          <InputsPanel
            state={state}
            updateCustomer={updateCustomer}
            toggleChallenge={toggleChallenge}
            toggleModule={toggleModule}
            updateComplexity={updateComplexity}
            updateArea={updateArea}
            updateMigration={updateMigration}
            toggleMigrationScope={toggleMigrationScope}
            updateIntegration={updateIntegration}
            addIntegration={addIntegration}
            removeIntegration={removeIntegration}
            updateCustomizationItem={updateCustomizationItem}
            toggleReportingItem={toggleReportingItem}
            updateReporting={updateReporting}
            updateLocalization={updateLocalization}
            toggleLocalizationFlag={toggleLocalizationFlag}
            updateDelivery={updateDelivery}
            updateSupport={updateSupport}
            toggleSupportScope={toggleSupportScope}
          />
        )}
        {activePanel === "licensing" && <LicensingPanel state={state} />}
        {activePanel === "dashboard" && <DashboardPanel res={res} state={state} />}
        {activePanel === "timeline" && <TimelinePanel weeks={weeks} state={state} />}
        {activePanel === "team" && <TeamPanel res={res} weeks={weeks} state={state} />}
        {activePanel === "governance" && <GovernancePanel state={state} />}
        {activePanel === "discovery" && <DiscoveryPanel state={state} />}
        {activePanel === "exec" && <ExecutivePanel res={res} state={state} weeks={weeks} team={team} conf={conf} />}
        {activePanel === "scenarios" && <ScenariosPanel state={state} />}
        {activePanel === "resources" && <ResourcesPanel />}
      </main>
    </div>
  );
}

function Sidebar({ activePanel, onPanelChange }) {
  const items = [
    ["inputs", "Inputs"],
    ["licensing", "Licensing & Costs"],
    ["dashboard", "Dashboard"],
    ["timeline", "Timeline"],
    ["team", "Team"],
    ["governance", "Governance"],
    ["discovery", "Discovery Qs"],
    ["exec", "Executive Summary"],
    ["scenarios", "Scenarios"],
    ["resources", "Videos & How-To"]
  ];

  return (
    <aside className={styles.rail}>
      <div className={styles.railBrand}>
        <div className={styles.mark}>BC</div>
        <div>
          <div className={styles.name}>Raven Labs</div>
          <div className={styles.sub}>Deal Sizer · Pre-Sales</div>
        </div>
      </div>
      <nav className={styles.nav}>
        {items.map(([id, label], i) => (
          <button
            key={id}
            className={`${styles.navItem} ${activePanel === id ? styles.active : ''}`}
            onClick={() => onPanelChange(id)}
          >
            <span className={styles.num}>{i + 1}</span>
            {label}
          </button>
        ))}
      </nav>
      <div className={styles.railFoot}>
        Indicative estimate.<br />
        Subject to discovery & validation.
      </div>
    </aside>
  );
}

function KpiBar({ empty, total, months, team, monthlySupport, complexity, confidence }) {
  return (
    <div className={styles.kpibar}>
      <div className={`${styles.kpiChip} ${styles.accent}`}>
        <div className={styles.kpiLabel}>Expected effort</div>
        <div className={styles.kpiValue}>{empty ? '—' : `${fmtH(total)} h`}</div>
      </div>
      <div className={styles.kpiChip}>
        <div className={styles.kpiLabel}>Duration</div>
        <div className={styles.kpiValue}>{empty ? '—' : `${months} mo`}</div>
      </div>
      <div className={styles.kpiChip}>
        <div className={styles.kpiLabel}>Team (peak)</div>
        <div className={styles.kpiValue}>{empty ? '—' : `${team} FTE`}</div>
      </div>
      <div className={styles.kpiChip}>
        <div className={styles.kpiLabel}>Monthly support</div>
        <div className={styles.kpiValue}>{empty ? '—' : `${fmtH(monthlySupport)} h`}</div>
      </div>
      <div className={styles.kpiChip}>
        <div className={styles.kpiLabel}>Complexity</div>
        <div className={styles.kpiValue}>{empty ? '—' : complexity}</div>
      </div>
      <div className={styles.kpiChip}>
        <div className={styles.kpiLabel}>Confidence</div>
        <div className={styles.kpiValue}>{empty ? '—' : confidence}</div>
      </div>
    </div>
  );
}

// InputsPanel component (I'll create a simplified version here due to space)
function InputsPanel({
  state,
  updateCustomer,
  toggleChallenge,
  toggleModule,
  updateComplexity,
  updateArea,
  updateMigration,
  toggleMigrationScope,
  updateIntegration,
  addIntegration,
  removeIntegration,
  updateCustomizationItem,
  toggleReportingItem,
  updateReporting,
  updateLocalization,
  toggleLocalizationFlag,
  updateDelivery,
  updateSupport,
  toggleSupportScope
}) {
  const c = state.customer;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h1>Pre-Sales Inputs</h1>
      </div>
      <p className={styles.panelSub}>
        Configure the prospect profile below — every output tab recalculates instantly.
      </p>

      <div className={styles.exampleBanner}>
        <b>Start here</b>
        <span>
          This estimate starts blank. Fill in the customer profile and select modules below — every KPI, chart and tab updates automatically as you go.
        </span>
      </div>

      {/* Customer Profile */}
      <details className={styles.acc} open>
        <summary className={styles.accSummary}>
          <span className={styles.badgeNum}>1</span>
          Customer Profile
          <span className={styles.chevron}>›</span>
        </summary>
        <div className={styles.accBody}>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label>Customer name</label>
              <input
                type="text"
                value={c.name}
                onChange={(e) => updateCustomer("name", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label>Country / region</label>
              <input
                type="text"
                value={c.country}
                onChange={(e) => updateCustomer("country", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label>Legal entities</label>
              <input
                type="number"
                min="1"
                value={c.entities}
                onChange={(e) => updateCustomer("entities", parseInt(e.target.value) || 1)}
              />
            </div>
            <div className={styles.field}>
              <label>Companies</label>
              <input
                type="number"
                min="1"
                value={c.companies}
                onChange={(e) => updateCustomer("companies", parseInt(e.target.value) || 1)}
              />
            </div>
            <div className={styles.field}>
              <label>Locations</label>
              <input
                type="number"
                min="1"
                value={c.locations}
                onChange={(e) => updateCustomer("locations", parseInt(e.target.value) || 1)}
              />
            </div>
            <div className={styles.field}>
              <label>Warehouses</label>
              <input
                type="number"
                min="0"
                value={c.warehouses}
                onChange={(e) => updateCustomer("warehouses", parseInt(e.target.value) || 0)}
              />
            </div>
            <div className={styles.field}>
              <label>Total users</label>
              <input
                type="number"
                min="1"
                value={c.users}
                onChange={(e) => updateCustomer("users", parseInt(e.target.value) || 1)}
              />
            </div>
            <div className={styles.field}>
              <label>Concurrent users (if known)</label>
              <input
                type="number"
                min="0"
                value={c.concurrentUsers}
                onChange={(e) => updateCustomer("concurrentUsers", parseInt(e.target.value) || 0)}
              />
            </div>
            <div className={styles.field}>
              <label>Finance users</label>
              <input
                type="number"
                min="0"
                value={c.financeUsers}
                onChange={(e) => updateCustomer("financeUsers", parseInt(e.target.value) || 0)}
              />
            </div>
            <div className={styles.field}>
              <label>Operational users</label>
              <input
                type="number"
                min="0"
                value={c.opsUsers}
                onChange={(e) => updateCustomer("opsUsers", parseInt(e.target.value) || 0)}
              />
            </div>
            <div className={styles.field}>
              <label>Warehouse users</label>
              <input
                type="number"
                min="0"
                value={c.whUsers}
                onChange={(e) => updateCustomer("whUsers", parseInt(e.target.value) || 0)}
              />
            </div>
            <div className={styles.field}>
              <label>Manufacturing users</label>
              <input
                type="number"
                min="0"
                value={c.mfgUsers}
                onChange={(e) => updateCustomer("mfgUsers", parseInt(e.target.value) || 0)}
              />
            </div>
            <div className={styles.field}>
              <label>External users</label>
              <input
                type="number"
                min="0"
                value={c.extUsers}
                onChange={(e) => updateCustomer("extUsers", parseInt(e.target.value) || 0)}
              />
            </div>
            <div className={styles.field}>
              <label>Expected annual transaction volume</label>
              <input
                type="text"
                value={c.txnVolume}
                onChange={(e) => updateCustomer("txnVolume", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label>Expected growth rate</label>
              <input
                type="text"
                value={c.growthRate}
                onChange={(e) => updateCustomer("growthRate", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label>Implementation target date</label>
              <input
                type="date"
                value={c.targetDate}
                onChange={(e) => updateCustomer("targetDate", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label>Preferred go-live strategy</label>
              <select
                value={c.goLiveStrategy}
                onChange={(e) => updateCustomer("goLiveStrategy", e.target.value)}
              >
                {["Big Bang", "Phased rollout", "Pilot + rollout", "Country-by-country", "Company-by-company", "Module-by-module"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </details>

      {/* Industry */}
      <details className={styles.acc} open>
        <summary className={styles.accSummary}>
          <span className={styles.badgeNum}>2</span>
          Industry
          <span className={styles.chevron}>›</span>
        </summary>
        <div className={styles.accBody}>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label>Industry</label>
              <select
                value={c.industry}
                onChange={(e) => updateCustomer("industry", e.target.value)}
              >
                {INDUSTRIES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Industry complexity</label>
              <select
                value={c.industryComplexity}
                onChange={(e) => updateCustomer("industryComplexity", e.target.value)}
              >
                {["Low", "Medium", "High", "Very High"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </details>

      {/* Challenges */}
      <details className={styles.acc}>
        <summary className={styles.accSummary}>
          <span className={styles.badgeNum}>3</span>
          Business Challenges
          <span className={styles.chevron}>›</span>
        </summary>
        <div className={styles.accBody}>
          <div className={styles.chipGroup}>
            {CHALLENGES.map(([id, label]) => (
              <label key={id} className={`${styles.chip} ${state.challenges.has(id) ? styles.checked : ''}`}>
                <input
                  type="checkbox"
                  checked={state.challenges.has(id)}
                  onChange={() => toggleChallenge(id)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </details>

      {/* Modules */}
      <details className={styles.acc}>
        <summary className={styles.accSummary}>
          <span className={styles.badgeNum}>4</span>
          Business Central Module Selection
          <span className={styles.chevron}>›</span>
        </summary>
        <div className={styles.accBody}>
          <div className={styles.mgrid}>
            {MODULE_GROUPS.map((group) => (
              <div key={group} className={styles.mgroup}>
                <h4>{group}</h4>
                <div className={styles.chipGroup}>
                  {MODULES.filter((m) => m.group === group).map((m) => (
                    <label
                      key={m.id}
                      className={`${styles.chip} ${state.modules.has(m.id) ? styles.checked : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={state.modules.has(m.id)}
                        onChange={() => toggleModule(m.id)}
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </details>

      {/* Complexity */}
      <details className={styles.acc}>
        <summary className={styles.accSummary}>
          <span className={styles.badgeNum}>5</span>
          Implementation Complexity
          <span className={styles.chevron}>›</span>
        </summary>
        <div className={styles.accBody}>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label>Overall complexity</label>
              <select
                value={state.complexity.overall}
                onChange={(e) => updateComplexity("overall", e.target.value)}
              >
                {["Simple", "Moderate", "Complex", "Highly Complex"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Contingency override %</label>
              <input
                type="number"
                min="0"
                max="60"
                value={state.contingencyOverride ?? ""}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    contingencyOverride: e.target.value === "" ? null : parseInt(e.target.value)
                  }))
                }
                placeholder="auto"
              />
            </div>
          </div>
          <table className={styles.ctable}>
            <thead>
              <tr>
                <th>Area</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {AREA_KEYS.map(([k, label]) => (
                <tr key={k}>
                  <td className={styles.rowlabel}>{label}</td>
                  <td>
                    <select
                      value={state.complexity.areas[k]}
                      onChange={(e) => updateArea(k, e.target.value)}
                    >
                      {["Low", "Medium", "High", "Very High"].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Migration */}
      <details className={styles.acc}>
        <summary className={styles.accSummary}>
          <span className={styles.badgeNum}>6</span>
          Migration
          <span className={styles.chevron}>›</span>
        </summary>
        <div className={styles.accBody}>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label>Source system</label>
              <select
                value={state.migration.source}
                onChange={(e) => updateMigration("source", e.target.value)}
              >
                {MIGRATION_SOURCES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Migration complexity</label>
              <select
                value={state.migration.complexity}
                onChange={(e) => updateMigration("complexity", e.target.value)}
              >
                {["Low", "Medium", "High", "Very High"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Data quality</label>
              <select
                value={state.migration.dataQuality}
                onChange={(e) => updateMigration("dataQuality", e.target.value)}
              >
                {["Excellent", "Good", "Moderate", "Poor", "Unknown"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Migration cycles</label>
              <select
                value={String(state.migration.cycles)}
                onChange={(e) => updateMigration("cycles", e.target.value === "4+" ? 4 : parseInt(e.target.value))}
              >
                {[1, 2, 3, 4].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.sectionLabel}>Migration scope</div>
          <div className={styles.chipGroup}>
            {MIGRATION_SCOPE.map(([id, label]) => (
              <label
                key={id}
                className={`${styles.chip} ${state.migration.scope.has(id) ? styles.checked : ''}`}
              >
                <input
                  type="checkbox"
                  checked={state.migration.scope.has(id)}
                  onChange={() => toggleMigrationScope(id)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </details>

      {/* Integrations */}
      <details className={styles.acc}>
        <summary className={styles.accSummary}>
          <span className={styles.badgeNum}>7</span>
          Integrations
          <span className={styles.chevron}>›</span>
        </summary>
        <div className={styles.accBody}>
          {state.integrations.length === 0 ? (
            <p style={{ color: "var(--text-3)", fontSize: "12.5px", margin: 0 }}>No integrations added.</p>
          ) : (
            state.integrations.map((row) => (
              <div key={row.id} className={styles.intRow}>
                <div className={styles.rowTop}>
                  <strong>{row.name || "Untitled integration"}</strong>
                  <button
                    className={`${styles.btn} ${styles.ghost}`}
                    onClick={() => removeIntegration(row.id)}
                  >
                    Remove
                  </button>
                </div>
                <div className={styles.intGrid}>
                  <div className={styles.field}>
                    <label>Name</label>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateIntegration(row.id, "name", e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Category</label>
                    <select
                      value={row.category}
                      onChange={(e) => updateIntegration(row.id, "category", e.target.value)}
                    >
                      {INTEGRATION_CATEGORIES.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Direction</label>
                    <select
                      value={row.direction}
                      onChange={(e) => updateIntegration(row.id, "direction", e.target.value)}
                    >
                      {["Inbound", "Outbound", "Bidirectional"].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Complexity</label>
                    <select
                      value={row.complexity}
                      onChange={(e) => updateIntegration(row.id, "complexity", e.target.value)}
                    >
                      {["Low", "Medium", "High"].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Mode</label>
                    <select
                      value={row.mode}
                      onChange={(e) => updateIntegration(row.id, "mode", e.target.value)}
                    >
                      {["Real-time", "Batch"].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label># interfaces</label>
                    <input
                      type="number"
                      min="1"
                      value={row.interfaces}
                      onChange={(e) => updateIntegration(row.id, "interfaces", parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
          <button className={`${styles.btn} ${styles.sm}`} onClick={addIntegration} style={{ marginTop: "6px" }}>
            + Add integration
          </button>
        </div>
      </details>

      {/* Customization */}
      <details className={styles.acc}>
        <summary className={styles.accSummary}>
          <span className={styles.badgeNum}>8</span>
          Customization
          <span className={styles.chevron}>›</span>
        </summary>
        <div className={styles.accBody}>
          <div className={styles.fieldGrid}>
            <div className={styles.field} style={{ gridColumn: "1 / -1", maxWidth: "320px" }}>
              <label>Customization level</label>
              <select
                value={state.customization.level}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    customization: { ...prev.customization, level: e.target.value }
                  }))
                }
              >
                {Object.keys(CUSTOM_LEVEL_BASE).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.sectionLabel}>Estimated items</div>
          <div className={styles.fieldGrid}>
            {CUSTOM_ITEMS.map(([key, label]) => (
              <div key={key} className={styles.field}>
                <label>{label}</label>
                <input
                  type="number"
                  min="0"
                  value={state.customization.items[key]}
                  onChange={(e) => updateCustomizationItem(key, parseInt(e.target.value) || 0)}
                />
              </div>
            ))}
          </div>
        </div>
      </details>

      {/* Reporting */}
      <details className={styles.acc}>
        <summary className={styles.accSummary}>
          <span className={styles.badgeNum}>9</span>
          Reporting
          <span className={styles.chevron}>›</span>
        </summary>
        <div className={styles.accBody}>
          <div className={styles.chipGroup}>
            {REPORTING_ITEMS.map(([id, label]) => (
              <label
                key={id}
                className={`${styles.chip} ${state.reporting.items.has(id) ? styles.checked : ''}`}
              >
                <input
                  type="checkbox"
                  checked={state.reporting.items.has(id)}
                  onChange={() => toggleReportingItem(id)}
                />
                {label}
              </label>
            ))}
          </div>
          <div className={styles.fieldGrid} style={{ marginTop: "14px", maxWidth: "260px" }}>
            <div className={styles.field}>
              <label>Reporting complexity</label>
              <select
                value={state.reporting.complexity}
                onChange={(e) => updateReporting("complexity", e.target.value)}
              >
                {["Low", "Medium", "High"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </details>

      {/* Localization */}
      <details className={styles.acc}>
        <summary className={styles.accSummary}>
          <span className={styles.badgeNum}>10</span>
          Localization
          <span className={styles.chevron}>›</span>
        </summary>
        <div className={styles.accBody}>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label>Country</label>
              <input
                type="text"
                value={state.localization.country}
                onChange={(e) => updateLocalization("country", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label>Standard localisation available?</label>
              <select
                value={state.localization.standardAvailable}
                onChange={(e) => updateLocalization("standardAvailable", e.target.value)}
              >
                {["Yes", "No", "Unknown"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.sectionLabel}>&nbsp;</div>
          <div className={styles.chipGroup}>
            {[
              ["multiCountry", "Multiple countries"],
              ["multiCurrency", "Multiple currencies"],
              ["multiTax", "Multiple tax regimes"],
              ["multiLanguage", "Multiple languages"],
              ["statutory", "Statutory reporting"],
              ["eInvoicing", "Local e-invoicing"],
              ["regulatory", "Other regulatory requirements"]
            ].map(([key, label]) => (
              <label
                key={key}
                className={`${styles.chip} ${state.localization[key] ? styles.checked : ''}`}
              >
                <input
                  type="checkbox"
                  checked={state.localization[key]}
                  onChange={() => toggleLocalizationFlag(key)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </details>

      {/* Delivery Model */}
      <details className={styles.acc}>
        <summary className={styles.accSummary}>
          <span className={styles.badgeNum}>11</span>
          Delivery Model
          <span className={styles.chevron}>›</span>
        </summary>
        <div className={styles.accBody}>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label>Delivery model</label>
              <select
                value={state.delivery.model}
                onChange={(e) => updateDelivery("model", e.target.value)}
              >
                {["Big Bang", "Phased rollout", "Pilot + rollout", "Country-by-country", "Company-by-company", "Module-by-module"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Remote delivery %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={state.delivery.remotePct}
                onChange={(e) => updateDelivery("remotePct", parseInt(e.target.value) || 0)}
              />
            </div>
            <div className={styles.field}>
              <label>Customer availability</label>
              <select
                value={state.delivery.availability}
                onChange={(e) => updateDelivery("availability", e.target.value)}
              >
                {["High", "Medium", "Low", "Unknown"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Time-zone complexity</label>
              <select
                value={state.delivery.timezoneComplexity}
                onChange={(e) => updateDelivery("timezoneComplexity", e.target.value)}
              >
                {["Low", "Medium", "High"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </details>

      {/* Support */}
      <details className={styles.acc}>
        <summary className={styles.accSummary}>
          <span className={styles.badgeNum}>12</span>
          Support
          <span className={styles.chevron}>›</span>
        </summary>
        <div className={styles.accBody}>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label>Support model</label>
              <select
                value={state.support.model}
                onChange={(e) => updateSupport("model", e.target.value)}
              >
                {["Business hours", "Extended business hours", "24x5", "24x7"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>SLA</label>
              <select
                value={state.support.sla}
                onChange={(e) => updateSupport("sla", e.target.value)}
              >
                {["Standard", "Business Critical", "Enterprise"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Expected ticket volume</label>
              <select
                value={state.support.ticketVolume}
                onChange={(e) => updateSupport("ticketVolume", e.target.value)}
              >
                {["Low", "Medium", "High", "Very High"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.sectionLabel}>Support scope</div>
          <div className={styles.chipGroup}>
            {SUPPORT_SCOPE_ITEMS.map(([id, label]) => (
              <label
                key={id}
                className={`${styles.chip} ${state.support.scope.has(id) ? styles.checked : ''}`}
              >
                <input
                  type="checkbox"
                  checked={state.support.scope.has(id)}
                  onChange={() => toggleSupportScope(id)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}

// ============================= CHART HELPERS =============================
const CHART_COLORS = {
  series1: '#2a78d6', series2: '#eb6834', series3: '#1baf7a', series4: '#eda100',
  series5: '#e87ba4', series6: '#008300', series7: '#4a3aa7', series8: '#e34948',
  good: '#0ca30c', warning: '#fab219', critical: '#d03b3b',
  ink2: '#52514e', grid: '#e1e0d9', axis: '#c3c2b7'
};

function useChart(canvasRef, buildConfig, deps) {
  const chartRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    if (chartRef.current) {
      // Update the existing instance in place instead of destroying and
      // recreating it - destroy+recreate replays the "grow from zero" entry
      // animation on every keystroke and cancels it mid-flight on the next
      // change, which is why the charts looked static/snapped rather than
      // animated. chart.js's own update() call animates the transition
      // between the old values and the new ones.
      const config = buildConfig();
      chartRef.current.data = config.data;
      if (config.options) chartRef.current.options = config.options;
      chartRef.current.update();
      return undefined;
    }
    import('chart.js/auto').then(({ default: Chart }) => {
      if (cancelled || !canvasRef.current) return;
      chartRef.current = new Chart(canvasRef.current.getContext('2d'), buildConfig());
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => () => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
  }, []);
}

function HBarChart({ labels, data, color, unit }) {
  const canvasRef = useRef(null);
  useChart(canvasRef, () => ({
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: color, borderRadius: 4, barThickness: 16, maxBarThickness: 18 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${fmtH(c.parsed.x)} ${unit}` } } },
      scales: {
        x: { beginAtZero: true, grid: { color: CHART_COLORS.grid }, ticks: { color: CHART_COLORS.ink2 } },
        y: { grid: { display: false }, ticks: { color: CHART_COLORS.ink2 } }
      }
    }
  }), [JSON.stringify(labels), JSON.stringify(data)]);
  return <canvas ref={canvasRef}></canvas>;
}

function VBarChart({ labels, data, colors, unit }) {
  const canvasRef = useRef(null);
  useChart(canvasRef, () => ({
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 5, maxBarThickness: 64 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${fmtH(c.parsed.y)} ${unit}` } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: CHART_COLORS.ink2 } },
        y: { beginAtZero: true, grid: { color: CHART_COLORS.grid }, ticks: { color: CHART_COLORS.ink2 } }
      }
    }
  }), [JSON.stringify(labels), JSON.stringify(data)]);
  return <canvas ref={canvasRef}></canvas>;
}

function DonutChart({ labels, data, colors }) {
  const canvasRef = useRef(null);
  useChart(canvasRef, () => ({
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#fff', borderWidth: 2 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: {
        legend: { position: 'bottom', labels: { color: CHART_COLORS.ink2, boxWidth: 10, padding: 14 } },
        tooltip: { callbacks: { label: (c) => ` ${c.label}: ${fmtH(c.parsed)} h` } }
      }
    }
  }), [JSON.stringify(labels), JSON.stringify(data)]);
  return <canvas ref={canvasRef}></canvas>;
}

function TableToggle({ headers, rows }) {
  return (
    <details style={{ marginTop: '8px' }}>
      <summary style={{ cursor: 'pointer', fontSize: '11.5px', color: 'var(--brand)', fontWeight: 600, listStyle: 'none' }}>
        Show data table
      </summary>
      <table className={styles.ctable}>
        <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </details>
  );
}

// ============================= LICENSING PANEL =============================
function LicensingPanel({ state }) {
  if (isEstimateEmpty(state)) {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHead}><h1>Microsoft Licensing and Costs</h1></div>
        <p className={styles.panelSub}>Estimated Business Central license mix and recurring cost, based on the customer profile and modules you select.</p>
        <EmptyState message="Enter total users and select modules on the Inputs tab to see the recommended license mix and cost." />
      </section>
    );
  }

  const lic = licensingEngine(state);
  const rows = [
    [lic.fullLicense.name, lic.fullUsers, lic.fullLicense.monthly, lic.fullCostMonthly],
    [lic.teamLicense.name, lic.teamMembers, lic.teamLicense.monthly, lic.teamCostMonthly]
  ];
  if (lic.extBeyondFree > 0) rows.push([`${lic.fullLicense.name} (external accountant beyond free allowance)`, lic.extBeyondFree, lic.fullLicense.monthly, lic.extCostMonthly]);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h1>Microsoft Licensing and Costs</h1>
      </div>
      <p className={styles.panelSub}>
        Estimated Business Central license mix and recurring cost for the current user count and module scope, based on the Microsoft Dynamics 365 Business Central licensing model.
      </p>
      <div className={styles.exampleBanner}>
        <b>Source</b>
        <span>
          License types and rules are from Microsoft Learn, Licensing in Business Central (learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/deployment/licensing) and the published Dynamics 365 Licensing Guide. Prices shown are Microsoft US list price per user per month, billed annually. This is a planning estimate, not a quote. Confirm local CSP or partner pricing and currency before quoting the customer.
        </span>
      </div>

      <div className={styles.statRow}>
        <div className={`${styles.statTile} ${styles.accent}`}><div className="l">Recommended tier</div><div className="v">{lic.premium ? 'Premium' : 'Essentials'}</div></div>
        <div className={styles.statTile}><div className="l">Full users</div><div className="v">{lic.fullUsers}</div></div>
        <div className={styles.statTile}><div className="l">Team members</div><div className="v">{lic.teamMembers}</div></div>
        <div className={styles.statTile}><div className="l">Est. monthly cost</div><div className={`v ${styles.mono}`}>${lic.totalMonthly.toLocaleString('en-AU')}</div></div>
        <div className={`${styles.statTile} ${styles.accent}`}><div className="l">Est. annual cost</div><div className={`v ${styles.mono}`}>${lic.totalAnnual.toLocaleString('en-AU')}</div></div>
      </div>

      <div className={styles.card}>
        <h3>Recommended license mix</h3>
        <table className={styles.ctable}>
          <thead><tr><th>License</th><th>Users</th><th>List price / month</th><th>Monthly total</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className={styles.rowlabel}>{r[0]}</td>
                <td>{r[1]}</td>
                <td className={styles.mono}>${r[2]}</td>
                <td className={styles.mono}>${r[3].toLocaleString('en-AU')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className={styles.rowlabel}>Total</td>
              <td>{lic.fullUsers + lic.teamMembers + lic.extBeyondFree}</td>
              <td></td>
              <td className={styles.mono} style={{ fontWeight: 600 }}>${lic.totalMonthly.toLocaleString('en-AU')}</td>
            </tr>
          </tfoot>
        </table>
        <p style={{ color: 'var(--text-2)', fontSize: '12.5px', marginTop: '10px' }}>
          {lic.premium
            ? 'One or more selected modules require Premium (manufacturing or service management), so every full user is priced at the Premium rate.'
            : 'No manufacturing or service management modules are currently selected, so full users are priced at the Essentials rate.'}
          {lic.extAccountants > 0 && ` Up to 3 External Accountant licenses are free per tenant. Currently allowing for ${lic.extAccountants} free external accountant seat${lic.extAccountants === 1 ? '' : 's'}.`}
        </p>
      </div>

      <div className={styles.card}>
        <h3>All Business Central license types</h3>
        <table className={styles.ctable}>
          <thead><tr><th>License type</th><th>List price / month</th><th>What it covers</th></tr></thead>
          <tbody>
            {BC_LICENSES.map((l) => (
              <tr key={l.id}>
                <td className={styles.rowlabel}>{l.name}</td>
                <td className={styles.mono}>{l.monthly === 0 ? 'Free (conditions apply)' : `$${l.monthly}`}</td>
                <td>{l.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={styles.footerNote}>
        License figures are indicative and cover Business Central subscription cost only. They exclude implementation, customization, data migration, integration build, training and support, which are estimated separately on the Dashboard and Executive Summary tabs.
      </p>
    </section>
  );
}

// ============================= DASHBOARD PANEL =============================
function DashboardPanel({ res, state }) {
  if (isEstimateEmpty(state)) {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHead}><h1>Delivery & Estimate Dashboard</h1></div>
        <p className={styles.panelSub}>Indicative Pre-Sales Estimate. Subject to Discovery and Validation.</p>
        <EmptyState message="No estimate yet. Go to the Inputs tab, enter the customer profile and select modules — every chart here will populate automatically." />
      </section>
    );
  }

  const weeks = durationWeeks(res.total);
  const months = (weeks / 4.345).toFixed(1);
  const team = peakFTE(res.total, weeks);
  const conf = confidenceScore(state);
  const low = runEngine(bestCaseState(state)).total;
  const high = runEngine(worstCaseState(state)).total;

  const wsEntries = WS_ORDER.map((k) => [WS_LABELS[k], res.ws[k]]).filter(([, v]) => v > 0.5).sort((a, b) => b[1] - a[1]);
  const roleEntries = effortByRole(res.ws);

  const phaseHours = {};
  PHASES.forEach((p) => { phaseHours[p[0]] = 0; });
  WS_ORDER.forEach((k) => {
    if (k === 'pm') return;
    const target = PHASE_ALLOC[k];
    if (target != null) phaseHours[target] = (phaseHours[target] || 0) + res.ws[k];
  });
  const pmSplit = res.ws.pm / 4;
  ['mobilization', 'discovery', 'design', 'config'].forEach((p) => { phaseHours[p] = (phaseHours[p] || 0) + pmSplit; });
  const phaseEntries = PHASES.map((p) => [p[1], phaseHours[p[0]] || 0]).filter(([, v]) => v > 0.5);

  const implHours = res.total - res.ws.migration;
  const mixLabels = ['Implementation (one-off h)', 'Migration (one-off h)', 'Support (h / year)'];
  const mixData = [Math.round(implHours), Math.round(res.ws.migration), Math.round(res.annualSupport)];

  const rk = risks(state);
  const counts = { Low: 0, Medium: 0, High: 0 };
  rk.forEach((r) => { counts[r.prob] = (counts[r.prob] || 0) + 1; });

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h1>Delivery & Estimate Dashboard</h1>
      </div>
      <p className={styles.panelSub}>
        Indicative Pre-Sales Estimate. Subject to Discovery and Validation. All figures are benchmark-based and traceable to the inputs on the Inputs tab.
      </p>

      <div className={styles.statRow}>
        <div className={`${styles.statTile} ${styles.accent}`}><div className="l">Expected effort</div><div className="v">{fmtH(res.total)}<small> h</small></div></div>
        <div className={styles.statTile}><div className="l">Effort range</div><div className="v" style={{ fontSize: '17px' }}>{fmtH(low)}–{fmtH(high)}<small> h</small></div></div>
        <div className={styles.statTile}><div className="l">Duration</div><div className="v">{months}<small> mo</small></div></div>
        <div className={styles.statTile}><div className="l">Team (peak)</div><div className="v">{team}<small> FTE</small></div></div>
        <div className={styles.statTile}><div className="l">Monthly support</div><div className="v">{fmtH(res.monthlySupport)}<small> h/mo</small></div></div>
        <div className={styles.statTile}><div className="l">Complexity</div><div className="v" style={{ fontSize: '17px' }}>{state.complexity.overall}</div></div>
        <div className={styles.statTile}>
          <div className="l">Estimate confidence</div>
          <div className="v" style={{ fontSize: '17px' }}>
            <span className={`${styles.pill} ${styles.dot} ${conf.level === 'High' ? styles.good : conf.level === 'Medium' ? styles.warning : styles.critical}`}>{conf.level}</span>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3>Implementation Effort Range</h3>
        <div style={{ display: 'flex', gap: '26px', flexWrap: 'wrap', fontFamily: 'var(--font-mono)' }}>
          <div><div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase' }}>Low</div><div style={{ fontSize: '19px', fontWeight: 600 }}>{fmtH(low)} h</div></div>
          <div><div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase' }}>Expected</div><div style={{ fontSize: '19px', fontWeight: 600, color: 'var(--brand)' }}>{fmtH(res.total)} h</div></div>
          <div><div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase' }}>High</div><div style={{ fontSize: '19px', fontWeight: 600 }}>{fmtH(high)} h</div></div>
        </div>
        <p style={{ color: 'var(--text-3)', fontSize: '11.5px', marginTop: '10px' }}>
          Low = best case (excellent data quality, one fewer migration cycle, complexity stepped down one band, high customer availability). High = conservative case (poor data quality, one extra migration cycle, complexity stepped up one band, low availability).
        </p>
      </div>

      <div className={styles.grid2}>
        <div className={styles.chartCard}>
          <h3>Effort by Workstream</h3><div className="cap">Base hours, before contingency</div>
          <div className={styles.chartWrap} style={{ height: Math.max(260, wsEntries.length * 22) + 'px' }}>
            <HBarChart labels={wsEntries.map((e) => e[0])} data={wsEntries.map((e) => Math.round(e[1]))} color={CHART_COLORS.series1} unit="h" />
          </div>
          <TableToggle headers={['Workstream', 'Hours']} rows={wsEntries.map(([l, v]) => [l, fmtH(v)])} />
        </div>
        <div className={styles.chartCard}>
          <h3>Effort by Role</h3><div className="cap">Base hours allocated across delivery roles</div>
          <div className={styles.chartWrap} style={{ height: Math.max(260, roleEntries.length * 24) + 'px' }}>
            <HBarChart labels={roleEntries.map((e) => e[0])} data={roleEntries.map((e) => Math.round(e[1]))} color={CHART_COLORS.series7} unit="h" />
          </div>
          <TableToggle headers={['Role', 'Hours']} rows={roleEntries.map(([l, v]) => [l, fmtH(v)])} />
        </div>
      </div>
      <div className={styles.grid2}>
        <div className={styles.chartCard}>
          <h3>Effort by Phase</h3><div className="cap">Functional & technical hours mapped to delivery phase</div>
          <div className={styles.chartWrap} style={{ height: '260px' }}>
            <VBarChart labels={phaseEntries.map((e) => e[0])} data={phaseEntries.map((e) => Math.round(e[1]))} colors={CHART_COLORS.series3} unit="h" />
          </div>
          <TableToggle headers={['Phase', 'Hours']} rows={phaseEntries.map(([l, v]) => [l, fmtH(v)])} />
        </div>
        <div className={styles.chartCard}>
          <h3>Implementation vs Migration vs Support</h3><div className="cap">Different units: implementation & migration are one-off hours, support is hours/year</div>
          <div className={styles.chartWrap} style={{ height: '260px' }}>
            <DonutChart labels={mixLabels} data={mixData} colors={[CHART_COLORS.series1, CHART_COLORS.series2, CHART_COLORS.series3]} />
          </div>
          <TableToggle headers={['Category', 'Hours']} rows={mixLabels.map((l, i) => [l, fmtH(mixData[i])])} />
        </div>
      </div>
      <div className={styles.chartCard} style={{ maxWidth: '560px' }}>
        <h3>Risk Distribution</h3><div className="cap">Count of register risks by current probability rating</div>
        <div className={styles.chartWrap} style={{ height: '220px' }}>
          <VBarChart labels={['Low', 'Medium', 'High']} data={[counts.Low, counts.Medium, counts.High]} colors={[CHART_COLORS.good, CHART_COLORS.warning, CHART_COLORS.critical]} unit="risks" />
        </div>
        <TableToggle headers={['Probability', 'Count of risks']} rows={[['Low', counts.Low], ['Medium', counts.Medium], ['High', counts.High]]} />
      </div>

      <details className={styles.acc}>
        <summary className={styles.accSummary}><span className={styles.badgeNum}>i</span>Methodology & traceability<span className={styles.chevron}>›</span></summary>
        <div className={styles.accBody}>
          <div style={{ background: 'var(--surface-2)', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius)', padding: '14px 16px', fontSize: '12.5px', color: 'var(--text-2)', marginTop: '6px' }}>
            Every workstream is calculated as <code>Base Effort × Scope Factor × Complexity Factor × Data/Integration Factor × Deployment Factor</code>.
            Base effort comes from selected modules, migration data categories, integration rows and customisation counts (estimation benchmarks, not official Microsoft figures).
            Complexity factors: Low ×0.82, Medium ×1.00, High ×1.32, Very High ×1.68. Contingency ({res.contPct}% here) is layered on top of the summed workstreams, never hidden inside them.
          </div>
        </div>
      </details>
    </section>
  );
}

// ============================= TIMELINE PANEL =============================
const PHASE_META = {
  mobilization: { dep: "Contract signature", roles: "PM", deliverable: "Kick-off, environment provisioning, project charter" },
  discovery: { dep: "Mobilisation", roles: "SA, PM, Functional Consultants", deliverable: "Current-state review, fit-gap" },
  design: { dep: "Discovery sign-off", roles: "SA, Functional Consultants", deliverable: "Solution Design Document" },
  config: { dep: "Design sign-off", roles: "Functional Consultants", deliverable: "Configured environment" },
  dev: { dep: "Design sign-off (parallel to Configuration)", roles: "AL Developer, Technical Architect", deliverable: "Extensions & customisations built" },
  migration: { dep: "Design sign-off (parallel to Configuration)", roles: "Data Migration Consultant", deliverable: "Mapped, cleansed, staged data" },
  intdev: { dep: "Design sign-off (parallel to Configuration)", roles: "Integration Developer", deliverable: "Integrations built & unit tested" },
  testing: { dep: "Configuration, Development, Migration", roles: "Tester, Functional Consultants", deliverable: "System & integration test results" },
  uat: { dep: "Testing complete", roles: "Customer SMEs, PM", deliverable: "UAT sign-off" },
  training: { dep: "UAT (parallel to Cutover Prep)", roles: "Trainer", deliverable: "Trained end users" },
  cutover: { dep: "UAT sign-off", roles: "PM, Data Migration Consultant", deliverable: "Cutover runbook rehearsed" },
  golive: { dep: "Cutover Preparation", roles: "Full delivery team", deliverable: "Live in production" },
  hypercare: { dep: "Go-Live", roles: "Support Consultant, Functional Consultants", deliverable: "Stabilised operation" },
  transition: { dep: "Hypercare", roles: "Support Consultant, PM", deliverable: "Handover to support model" }
};

function TimelinePanel({ weeks, state }) {
  if (isEstimateEmpty(state)) {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHead}><h1>Delivery Timeline</h1></div>
        <p className={styles.panelSub}>Indicative phase plan based on the current scope.</p>
        <EmptyState message="No timeline yet. Enter the customer profile and select modules on the Inputs tab to generate a phase plan." />
      </section>
    );
  }

  const plan = timelinePlan(weeks);
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h1>Delivery Timeline</h1>
      </div>
      <p className={styles.panelSub}>
        Indicative phase plan over {weeks} weeks (~{(weeks / 4.345).toFixed(1)} months). Bars in <span style={{ color: CHART_COLORS.series3, fontWeight: 600 }}>green</span> run in parallel with the phase above rather than adding sequentially.
      </p>
      <div className={styles.card}>
        <div className={styles.timeline}>
          {plan.map((p) => (
            <div key={p.key} className={styles.tlRow}>
              <div className={styles.tlLabel}>{p.label}<span className={styles.wk}>wk {p.start}–{p.end}</span></div>
              <div className={styles.tlTrack}>
                <div
                  className={`${styles.tlBar} ${p.parallel ? styles.parallel : ''}`}
                  style={{ left: `${(p.start / weeks * 100).toFixed(1)}%`, width: `${Math.max(2, (p.dur / weeks * 100)).toFixed(1)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.tlAxis}>
          <div></div>
          <div className={styles.ax}><span>Week 0</span><span>Week {Math.round(weeks / 2)}</span><span>Week {weeks}</span></div>
        </div>
      </div>
      <table className={styles.regTable} style={{ marginTop: '20px' }}>
        <thead><tr><th>Phase</th><th>Duration</th><th>Dependencies</th><th>Primary roles</th><th>Key deliverable</th></tr></thead>
        <tbody>
          {plan.map((p) => (
            <tr key={p.key}>
              <td><strong>{p.label}</strong></td>
              <td className={styles.mono}>{p.dur} wk</td>
              <td>{PHASE_META[p.key]?.dep}</td>
              <td>{PHASE_META[p.key]?.roles}</td>
              <td>{PHASE_META[p.key]?.deliverable}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function TeamPanel({ res, weeks, state }) {
  if (isEstimateEmpty(state)) {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHead}><h1>Project Team & Customer Responsibilities</h1></div>
        <p className={styles.panelSub}>Recommended delivery team, sized to the current scope.</p>
        <EmptyState message="No team recommendation yet. Select modules on the Inputs tab to see the recommended delivery team and roles." />
      </section>
    );
  }

  const roleEntries = effortByRole(res.ws);
  const team = peakFTE(res.total, weeks);
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h1>Project Team & Customer Responsibilities</h1>
      </div>
      <p className={styles.panelSub}>
        Recommended delivery team of {team} peak FTE across {roleEntries.length} roles.
      </p>
      <div className={styles.card}>
        <h3>Recommended delivery team</h3>
        {roleEntries.map(([role, hrs]) => {
          const fte = Math.max(0.1, hrs / (weeks * 31));
          return (
            <div key={role} className={styles.roleBarRow}>
              <div>{role}</div>
              <div className={styles.roleBarTrack}>
                <div className={styles.roleBarFill} style={{ width: `${Math.min(100, fte * 100)}%` }}></div>
              </div>
              <div className={styles.mono}>{fte.toFixed(1)} FTE</div>
            </div>
          );
        })}
      </div>
      <div className={styles.card} style={{ marginTop: "20px" }}>
        <h3>Customer responsibilities</h3>
        <ul>
          {CUSTOMER_RESPONSIBILITIES.map((resp, i) => (
            <li key={i}>{resp}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function GovernancePanel({ state }) {
  if (isEstimateEmpty(state)) {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHead}><h1>Assumptions, Exclusions & Risks</h1></div>
        <p className={styles.panelSub}>Generated from the current inputs.</p>
        <EmptyState message="No assumptions or risks yet. These are generated from your inputs — start filling in the Inputs tab." />
      </section>
    );
  }

  const asmp = assumptions(state);
  const rk = risks(state);
  const probClass = (p) => (p === 'High' ? styles.critical : p === 'Medium' ? styles.warning : styles.good);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h1>Assumptions, Exclusions & Risks</h1>
      </div>
      <p className={styles.panelSub}>
        Everything below is explicit and generated from the current inputs. Nothing is buried in narrative text.
      </p>

      <h3 style={{ fontSize: '14px', margin: '4px 0 10px' }}>Assumptions register</h3>
      <div className={styles.card}>
        <table className={styles.regTable}>
          <thead><tr><th style={{ width: '50px' }}>ID</th><th>Assumption</th><th>Impact if incorrect</th><th>Estimate impact</th></tr></thead>
          <tbody>
            {asmp.map(([id, a, imp, est]) => (
              <tr key={id}>
                <td className={styles.mono}>{id}</td>
                <td>{a}</td>
                <td>{imp}</td>
                <td className={styles.mono}>{est}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontSize: '14px', margin: '20px 0 10px' }}>Exclusions</h3>
      <div className={styles.card}>
        <ul>
          {EXCLUSIONS_BASE.map((ex, i) => (
            <li key={i}>{ex}</li>
          ))}
        </ul>
      </div>

      <h3 style={{ fontSize: '14px', margin: '20px 0 10px' }}>Risk register</h3>
      <div className={styles.card}>
        <table className={styles.regTable}>
          <thead><tr><th>Risk</th><th>Probability</th><th>Impact</th><th>Mitigation</th></tr></thead>
          <tbody>
            {rk.map((r, i) => (
              <tr key={i}>
                <td>{r.t}</td>
                <td><span className={`${styles.pill} ${probClass(r.prob)}`}>{r.prob}</span></td>
                <td><span className={`${styles.pill} ${probClass(r.impact)}`}>{r.impact}</span></td>
                <td>{r.mit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DiscoveryPanel({ state }) {
  if (isEstimateEmpty(state)) {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHead}><h1>Discovery Questions</h1></div>
        <p className={styles.panelSub}>Generated from the current inputs and prioritised by commercial impact.</p>
        <EmptyState message="No discovery questions yet. Start filling in the Inputs tab and the most commercially important questions will appear here." />
      </section>
    );
  }

  const q = discoveryQuestions(state);
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h1>Discovery Questions</h1>
      </div>
      <p className={styles.panelSub}>
        Generated from the current inputs and prioritised by commercial impact. Answering the Critical items first is most likely to move the estimate.
      </p>
      <div className={styles.qaCol}>
        <div className={`${styles.qaCard} ${styles.crit}`}>
          <h4>Critical</h4>
          <ul>{q.crit.length ? q.crit.map((x, i) => <li key={i}>{x}</li>) : <li>None outstanding for the current inputs.</li>}</ul>
        </div>
        <div className={`${styles.qaCard} ${styles.imp}`}>
          <h4>Important</h4>
          <ul>{q.imp.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
        <div className={`${styles.qaCard} ${styles.nice}`}>
          <h4>Nice to have</h4>
          <ul>{q.nice.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

function ExecutivePanel({ res, state, weeks, team, conf }) {
  if (isEstimateEmpty(state)) {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHead}><h1>Executive Summary</h1></div>
        <p className={styles.panelSub}>Indicative Pre-Sales Estimate. Subject to Discovery and Validation.</p>
        <EmptyState message="No executive summary yet. Fill in the Inputs tab and this narrative will be generated automatically from your data." />
      </section>
    );
  }

  const c = state.customer;
  const low = runEngine(bestCaseState(state)).total;
  const high = runEngine(worstCaseState(state)).total;
  const months = (weeks / 4.345).toFixed(1);
  const drivers = WS_ORDER.filter((k) => !['pm', 'documentation', 'discovery'].includes(k))
    .map((k) => [WS_LABELS[k], res.ws[k]])
    .sort((a, b) => b[1] - a[1]).slice(0, 6).map((d) => d[0]);
  const modLabels = [...state.modules].map((id) => MODULES.find((m) => m.id === id)?.label).filter(Boolean);
  const asmp = assumptions(state);
  const rk = risks(state);
  const confChecks = [
    ["Concurrent users known", c.concurrentUsers > 0],
    ["Company count known", c.companies > 0],
    ["Module selection made", state.modules.size > 0],
    ["Migration data quality known", state.migration.dataQuality !== 'Unknown'],
    ["Migration scope defined", state.migration.scope.size > 0],
    ["Integration scope defined", state.integrations.length > 0 || !state.challenges.has('integration_problems')],
    ["Customisation scope indicated", true],
    ["Localisation confirmed", !!state.localization.country],
    ["Target go-live known", !!c.targetDate],
    ["Customer availability known", state.delivery.availability !== 'Unknown'],
    ["Support ticket volume estimated", !!state.support.ticketVolume]
  ];

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h1>Executive Summary</h1>
      </div>
      <p className={styles.panelSub}>
        Indicative Pre-Sales Estimate. Subject to Discovery and Validation.
      </p>

      <div className={styles.execBlock}><h3>What is being implemented</h3><p>A Microsoft Dynamics 365 Business Central implementation for {c.name || 'the prospect'}, covering {modLabels.length} modules across {c.companies} compan{c.companies === 1 ? 'y' : 'ies'} and {c.users} users, delivered as a {state.delivery.model.toLowerCase()}.</p></div>
      <div className={styles.execBlock}><h3>Why the solution is required</h3><p>{[...state.challenges].map((id) => CHALLENGES.find((x) => x[0] === id)?.[1]).filter(Boolean).join(', ') || 'To be confirmed with the prospect during Discovery.'}</p></div>
      <div className={styles.execBlock}><h3>Business Central scope</h3><p>{modLabels.slice(0, 14).join(', ')}{modLabels.length > 14 ? `, and ${modLabels.length - 14} more` : ''}.</p></div>
      <div className={styles.execBlock}><h3>Migration scope</h3><p>Source: {state.migration.source}. Data categories: {[...state.migration.scope].map((id) => MIGRATION_SCOPE.find((m) => m[0] === id)?.[1]).filter(Boolean).join(', ') || 'to be confirmed'}. Complexity: {state.migration.complexity}, data quality: {state.migration.dataQuality}, {state.migration.cycles} migration cycle(s).</p></div>
      <div className={styles.execBlock}><h3>Integration scope</h3><p>{state.integrations.length ? state.integrations.map((r) => `${r.name} (${r.category}, ${r.direction}, ${r.complexity})`).join('; ') : 'No integrations currently in scope.'}</p></div>
      <div className={styles.execBlock}><h3>Delivery approach</h3><p>{recommendationText(state, res)}</p></div>
      <div className={styles.execBlock}><h3>Indicative timeline & effort</h3><p>~{months} months ({weeks} weeks), {fmtH(res.total)} hours expected (range {fmtH(low)}–{fmtH(high)} h), delivered by a peak team of {team} FTE.</p></div>
      <div className={styles.execBlock}><h3>Major assumptions</h3><p>{asmp.slice(0, 4).map((a) => a[1]).join(' ')}</p></div>
      <div className={styles.execBlock}><h3>Major risks</h3><p>{rk.filter((r) => r.prob === 'High').map((r) => r.t).join(' ') || 'No high-probability risks flagged against the current inputs.'}</p></div>
      <div className={styles.execBlock}><h3>Support approach</h3><p>{state.support.model} coverage at {state.support.sla} SLA, {fmtH(res.monthlySupport)} hours/month indicative ({fmtH(res.annualSupport)} h/year), following a structured hypercare handover.</p></div>

      <h3 style={{ fontSize: '15px', margin: '26px 0 4px' }}>Commercial Summary</h3>
      <div className={styles.card}>
        <div className={styles.commercialGrid}>
          <div className={styles.cgItem}><div className="l">Customer</div><div className="v">{c.name || 'Not specified'}</div></div>
          <div className={styles.cgItem}><div className="l">Industry</div><div className="v">{c.industry}</div></div>
          <div className={styles.cgItem}><div className="l">Users</div><div className="v">{c.users}</div></div>
          <div className={styles.cgItem}><div className="l">Companies</div><div className="v">{c.companies}</div></div>
          <div className={styles.cgItem}><div className="l">Modules</div><div className="v">{modLabels.length} selected</div></div>
          <div className={styles.cgItem}><div className="l">Implementation complexity</div><div className="v">{state.complexity.overall}</div></div>
          <div className={styles.cgItem}><div className="l">Migration complexity</div><div className="v">{state.migration.complexity}</div></div>
          <div className={styles.cgItem}><div className="l">Integration complexity</div><div className="v">{state.complexity.areas.integrations}</div></div>
          <div className={styles.cgItem}><div className="l">Estimated duration</div><div className="v">{months} months</div></div>
          <div className={styles.cgItem}><div className="l">Indicative effort</div><div className={`v ${styles.mono}`}>{fmtH(low)} / {fmtH(res.total)} / {fmtH(high)} h</div></div>
          <div className={styles.cgItem}><div className="l">Recommended team</div><div className="v">{team} people (peak)</div></div>
          <div className={styles.cgItem}><div className="l">Support estimate</div><div className="v">{fmtH(res.monthlySupport)} h/month</div></div>
          <div className={styles.cgItem}><div className="l">Estimate confidence</div><div className="v">{conf.level}</div></div>
        </div>
        <div className={styles.sectionLabel}>Primary effort drivers</div>
        <div className={styles.chipGroup}>{drivers.map((d) => <span key={d} className={styles.chip} style={{ cursor: 'default' }}>{d}</span>)}</div>
      </div>

      <h3 style={{ fontSize: '15px', margin: '26px 0 4px' }}>Estimate Confidence: {conf.level} ({conf.known}/{conf.total} known)</h3>
      <div className={styles.card}>
        <div className={styles.chipGroup}>
          {confChecks.map(([label, ok]) => (
            <span key={label} className={`${styles.pill} ${styles.dot} ${ok ? styles.good : styles.warning}`}>{label}</span>
          ))}
        </div>
        <p style={{ color: 'var(--text-2)', fontSize: '12.5px', marginTop: '12px' }}>
          {conf.level === 'High' ? 'Most major cost drivers are known, so this estimate can support a scoped proposal with limited caveats.' :
            conf.level === 'Medium' ? 'Several major variables remain unconfirmed, so treat this as directional and prioritise the Critical discovery questions before quoting firmly.' :
              'Significant discovery is still required, so this estimate should be positioned internally only, not shared as a firm figure.'}
        </p>
      </div>
      <p className={styles.footerNote}>
        Generated by BC Deal Sizer for Raven Labs / GKB Labs pre-sales use. Figures are estimation benchmarks, not official Microsoft guidance, and are not a binding quote.
      </p>
    </section>
  );
}

function scenarioVariant(state, tier) {
  const v = cloneState(state);
  if (tier === 'A') {
    v.customization.level = 'Minimal customization';
    v.migration.cycles = 1;
    v.reporting.complexity = 'Low';
    v.integrations = state.integrations.slice(0, 1);
    Object.keys(v.complexity.areas).forEach((k) => {
      if (v.complexity.areas[k] === 'High' || v.complexity.areas[k] === 'Very High') v.complexity.areas[k] = 'Medium';
    });
  } else if (tier === 'B') {
    if (v.customization.level === 'No customization') v.customization.level = 'Moderate customization';
  } else if (tier === 'C') {
    const order = Object.keys(CUSTOM_LEVEL_BASE);
    let i = order.indexOf(v.customization.level);
    i = Math.min(order.length - 1, i + 1);
    v.customization.level = order[i];
    v.migration.cycles = state.migration.cycles + 1;
    v.reporting.complexity = 'High';
    v.integrations = state.integrations.concat([
      { id: 9001, name: 'Additional system A', category: 'Custom application', direction: 'Bidirectional', complexity: 'High', mode: 'Real-time', interfaces: 2 },
      { id: 9002, name: 'Additional system B', category: 'Legacy application', direction: 'Bidirectional', complexity: 'Medium', mode: 'Batch', interfaces: 2 }
    ]);
    Object.keys(v.complexity.areas).forEach((k) => { v.complexity.areas[k] = bumpArea(v.complexity.areas[k], 1); });
  }
  return v;
}

function qualitativeComplexity(total) {
  return total < 900 ? 'Low' : total < 1800 ? 'Medium' : total < 3200 ? 'High' : 'Very High';
}

function ScenariosPanel({ state }) {
  if (isEstimateEmpty(state)) {
    return (
      <section className={styles.panel}>
        <div className={styles.panelHead}><h1>What-If / Scenario Analysis</h1></div>
        <p className={styles.panelSub}>Three deployment postures built on your customer profile and module scope.</p>
        <EmptyState message="No scenarios yet. Fill in the Inputs tab first — scenarios are built on top of your actual profile and module scope." />
      </section>
    );
  }

  const scA = scenarioVariant(state, 'A');
  const scB = scenarioVariant(state, 'B');
  const scC = scenarioVariant(state, 'C');
  const resA = runEngine(scA), resB = runEngine(scB), resC = runEngine(scC);
  const rows = [
    ['Effort (h)', fmtH(resA.total), fmtH(resB.total), fmtH(resC.total)],
    ['Duration', (durationWeeks(resA.total) / 4.345).toFixed(1) + ' mo', (durationWeeks(resB.total) / 4.345).toFixed(1) + ' mo', (durationWeeks(resC.total) / 4.345).toFixed(1) + ' mo'],
    ['Team size', peakFTE(resA.total, durationWeeks(resA.total)) + ' FTE', peakFTE(resB.total, durationWeeks(resB.total)) + ' FTE', peakFTE(resC.total, durationWeeks(resC.total)) + ' FTE'],
    ['Complexity', qualitativeComplexity(resA.total), qualitativeComplexity(resB.total), qualitativeComplexity(resC.total)],
    ['Risk (high-probability risks)', risks(scA).filter((r) => r.prob === 'High').length, risks(scB).filter((r) => r.prob === 'High').length, risks(scC).filter((r) => r.prob === 'High').length]
  ];

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h1>What-If / Scenario Analysis</h1>
      </div>
      <p className={styles.panelSub}>
        Three deployment postures built on the same customer profile and module scope you've entered, varying customisation, integration and migration intensity.
      </p>
      <div className={styles.grid3}>
        <div className={styles.card}><h3 style={{ fontSize: '13.5px' }}>A: Standard Implementation</h3><p style={{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '6px' }}>Minimal customisation, single migration cycle, low reporting complexity, core integrations only.</p></div>
        <div className={styles.card}><h3 style={{ fontSize: '13.5px' }}>B: Enhanced Implementation</h3><p style={{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '6px' }}>Current inputs as entered, plus additional reporting, integrations and workflow as scoped.</p></div>
        <div className={styles.card}><h3 style={{ fontSize: '13.5px' }}>C: Complex Transformation</h3><p style={{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '6px' }}>Elevated customisation, extra migration cycle, high reporting complexity, two additional integrations.</p></div>
      </div>
      <table className={styles.scenarioTable}>
        <thead><tr><th>Metric</th><th>Scenario A</th><th>Scenario B</th><th>Scenario C</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="metric">{r[0]}</td>
              <td className="num">{r[1]}</td>
              <td className="num">{r[2]}</td>
              <td className="num">{r[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.footerNote}>Scenarios are generated automatically from your current profile. They are a sensitivity check, not independent proposals.</p>
    </section>
  );
}

function ResourcesPanel() {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h1>Videos and How-To Resources</h1>
      </div>
      <p className={styles.panelSub}>
        Official Microsoft Learn pages and videos for the prospect or delivery team to explore how Business Central works and how to use it, before or after go-live.
      </p>
      {RESOURCE_LINKS.map((g) => (
        <div key={g.group}>
          <div className={styles.sectionLabel}>{g.group}</div>
          <div className={styles.grid2} style={{ marginBottom: '20px' }}>
            {g.items.map((it) => (
              <a key={it.url} href={it.url} target="_blank" rel="noopener noreferrer" className={`${styles.card} ${styles.resourceCard}`}>
                <h3>{it.title}</h3>
                <p>{it.desc}</p>
                <p className={`url ${styles.mono}`}>{it.url}</p>
              </a>
            ))}
          </div>
        </div>
      ))}
      <p className={styles.footerNote}>Links point to Microsoft Learn and Microsoft's official Business Central channels. Content on those pages belongs to Microsoft and may change over time.</p>
    </section>
  );
}
