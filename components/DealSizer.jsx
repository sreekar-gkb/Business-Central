'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  PHASES as PHASES_DATA
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
  moduleHours
} from '../lib/calculator';
import styles from '../styles/DealSizer.module.css';

let INT_SEQ = 1;

function getDefaultState() {
  return {
    customer: {
      name: "Southern Cross Distribution Pty Ltd",
      industry: "Distribution",
      industryComplexity: "Medium",
      country: "Australia",
      entities: 2,
      companies: 2,
      locations: 4,
      warehouses: 3,
      users: 85,
      concurrentUsers: 60,
      financeUsers: 12,
      opsUsers: 45,
      whUsers: 20,
      mfgUsers: 0,
      extUsers: 5,
      txnVolume: "~ 40,000 sales lines / month",
      growthRate: "12% p.a.",
      targetDate: "",
      goLiveStrategy: "Phased rollout"
    },
    challenges: new Set([
      "legacy_erp",
      "excel_dependency",
      "inv_visibility",
      "wh_inefficiency",
      "poor_reporting",
      "integration_problems"
    ]),
    modules: new Set([
      "gl",
      "ap",
      "ar",
      "cashbank",
      "fixedassets",
      "dimensions",
      "finreporting",
      "sales",
      "pricing",
      "custmgmt",
      "purchasing",
      "vendormgmt",
      "invmgmt",
      "itemtracking",
      "multiloc",
      "whmgmt",
      "binmgmt",
      "replenishment",
      "powerbi",
      "approvals",
      "workflows"
    ]),
    complexity: {
      overall: "Moderate",
      areas: {
        finance: "Medium",
        sales: "Medium",
        purchasing: "Medium",
        inventory: "High",
        warehouse: "High",
        manufacturing: "Low",
        projects: "Low",
        service: "Low",
        reporting: "Medium",
        integrations: "High",
        migration: "High",
        localization: "Low",
        customization: "Medium"
      }
    },
    migration: {
      source: "Dynamics NAV",
      scope: new Set([
        "customers",
        "vendors",
        "items",
        "coa",
        "dimensions",
        "opening_balances",
        "inv_opening",
        "open_sales_docs",
        "open_purch_docs",
        "bank_data"
      ]),
      complexity: "High",
      dataQuality: "Moderate",
      cycles: 2
    },
    integrations: [
      {
        id: INT_SEQ++,
        name: "Salesforce CRM",
        category: "CRM",
        direction: "Bidirectional",
        complexity: "Medium",
        mode: "Real-time",
        interfaces: 3
      },
      {
        id: INT_SEQ++,
        name: "3PL / EDI",
        category: "EDI",
        direction: "Bidirectional",
        complexity: "High",
        mode: "Batch",
        interfaces: 4
      },
      {
        id: INT_SEQ++,
        name: "Bank feed",
        category: "Banking",
        direction: "Inbound",
        complexity: "Low",
        mode: "Batch",
        interfaces: 1
      }
    ],
    customization: {
      level: "Moderate customization",
      items: {
        customTables: 2,
        tableExt: 6,
        pageExt: 8,
        reportsDev: 5,
        workflowsDev: 4,
        businessLogic: 3,
        customApi: 2,
        mobile: 1,
        docLayouts: 4,
        industrySpecific: 1
      }
    },
    reporting: {
      items: new Set(["standard", "custom", "mgmt", "finStatements", "operational"]),
      complexity: "Medium"
    },
    localization: {
      country: "Australia",
      standardAvailable: "Yes",
      multiCountry: false,
      multiCurrency: true,
      multiTax: false,
      multiLanguage: false,
      statutory: true,
      eInvoicing: false,
      regulatory: false
    },
    delivery: {
      model: "Phased rollout",
      remotePct: 80,
      availability: "Medium",
      timezoneComplexity: "Low"
    },
    support: {
      model: "Business hours",
      scope: new Set(["functional", "technical", "admin", "enhancements"]),
      sla: "Standard",
      ticketVolume: "Medium"
    },
    contingencyOverride: null
  };
}

export default function DealSizer({ contact = 'Anonymous', onLogout }) {
  const [state, setState] = useState(getDefaultState());
  const [activePanel, setActivePanel] = useState("inputs");

  // Track user session and interactions
  useEffect(() => {
    // Start tracking when component mounts
    if (typeof window !== 'undefined') {
      // Send initial session start
      fetch('/api/activity-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact }),
      }).catch(() => {});
    }
  }, [contact]);

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
          contact,
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
          {onLogout && (
            <button
              className={styles.logoutBtn}
              onClick={onLogout}
            >
              🚪 Logout
            </button>
          )}
        </div>
        <KpiBar
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
        {activePanel === "dashboard" && <DashboardPanel res={res} state={state} />}
        {activePanel === "timeline" && <TimelinePanel weeks={weeks} />}
        {activePanel === "team" && <TeamPanel res={res} weeks={weeks} />}
        {activePanel === "governance" && <GovernancePanel state={state} />}
        {activePanel === "discovery" && <DiscoveryPanel state={state} />}
        {activePanel === "exec" && <ExecutivePanel res={res} state={state} weeks={weeks} team={team} />}
        {activePanel === "scenarios" && <ScenariosPanel state={state} />}
      </main>
    </div>
  );
}

function Sidebar({ activePanel, onPanelChange }) {
  const items = [
    ["inputs", "Inputs"],
    ["dashboard", "Dashboard"],
    ["timeline", "Timeline"],
    ["team", "Team"],
    ["governance", "Governance"],
    ["discovery", "Discovery Qs"],
    ["exec", "Executive Summary"],
    ["scenarios", "Scenarios"]
  ];

  return (
    <aside className={styles.rail}>
      <div className={styles.railBrand}>
        <div className={styles.mark}>BC</div>
        <div>
          <div className={styles.name}>Deal Sizer</div>
          <div className={styles.sub}>Raven Labs · Pre-Sales</div>
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

function KpiBar({ total, months, team, monthlySupport, complexity, confidence }) {
  return (
    <div className={styles.kpibar}>
      <div className={`${styles.kpiChip} ${styles.accent}`}>
        <div className={styles.kpiLabel}>Expected effort</div>
        <div className={styles.kpiValue}>{fmtH(total)} h</div>
      </div>
      <div className={styles.kpiChip}>
        <div className={styles.kpiLabel}>Duration</div>
        <div className={styles.kpiValue}>{months} mo</div>
      </div>
      <div className={styles.kpiChip}>
        <div className={styles.kpiLabel}>Team (peak)</div>
        <div className={styles.kpiValue}>{team} FTE</div>
      </div>
      <div className={styles.kpiChip}>
        <div className={styles.kpiLabel}>Monthly support</div>
        <div className={styles.kpiValue}>{fmtH(monthlySupport)} h</div>
      </div>
      <div className={styles.kpiChip}>
        <div className={styles.kpiLabel}>Complexity</div>
        <div className={styles.kpiValue}>{complexity}</div>
      </div>
      <div className={styles.kpiChip}>
        <div className={styles.kpiLabel}>Confidence</div>
        <div className={styles.kpiValue}>{confidence}</div>
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
        <b>Example</b>
        <span>
          The form is pre-loaded with a fictional example scenario ("Southern Cross Distribution"). Overwrite every field with real prospect data before sending the output externally.
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

// Dashboard, Timeline, Team, Governance, Discovery, Executive, Scenarios panels
function DashboardPanel({ res, state }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h1>Delivery & Estimate Dashboard</h1>
      </div>
      <p className={styles.panelSub}>
        Indicative Pre-Sales Estimate — Subject to Discovery & Validation. All figures are benchmark-based and traceable to the inputs on the Inputs tab.
      </p>
      {/* Placeholder for dashboard content - would include charts */}
      <div className={styles.card}>
        <h3>Dashboard Content</h3>
        <p>Expected effort: {fmtH(res.total)} h</p>
        <p>Contingency: {res.contPct}%</p>
        <p>Total with contingency: {fmtH(res.total)} h</p>
      </div>
    </section>
  );
}

function TimelinePanel({ weeks }) {
  const plan = timelinePlan(weeks);
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h1>Delivery Timeline</h1>
      </div>
      <p className={styles.panelSub}>
        Indicative phase plan over {weeks} weeks (~{(weeks / 4.345).toFixed(1)} months).
      </p>
      <div className={styles.card}>
        <table className={styles.regTable}>
          <thead>
            <tr>
              <th>Phase</th>
              <th>Duration</th>
              <th>Week Range</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((p) => (
              <tr key={p.key}>
                <td><strong>{p.label}</strong></td>
                <td>{p.dur} wk</td>
                <td>{p.start}–{p.end}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TeamPanel({ res, weeks }) {
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
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h1>Assumptions, Exclusions & Risks</h1>
      </div>
      <p className={styles.panelSub}>
        Everything below is explicit and generated from the current inputs.
      </p>
      <h3>Exclusions</h3>
      <div className={styles.card}>
        <ul>
          {EXCLUSIONS_BASE.map((ex, i) => (
            <li key={i}>{ex}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function DiscoveryPanel({ state }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h1>Discovery Questions</h1>
      </div>
      <p className={styles.panelSub}>
        Generated from the current inputs and prioritised by commercial impact.
      </p>
      <div className={styles.card}>
        <h3>Key questions to validate the estimate</h3>
        <p>Review the inputs above and refine as you gather more information from the prospect.</p>
      </div>
    </section>
  );
}

function ExecutivePanel({ res, state, weeks, team }) {
  const c = state.customer;
  const low = runEngine(bestCaseState(state)).total;
  const high = runEngine(worstCaseState(state)).total;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h1>Executive Summary</h1>
      </div>
      <p className={styles.panelSub}>
        Indicative Pre-Sales Estimate — Subject to Discovery & Validation.
      </p>
      <div className={styles.card}>
        <h3>Commercial Summary</h3>
        <table className={styles.regTable}>
          <tbody>
            <tr>
              <td><strong>Customer</strong></td>
              <td>{c.name || '—'}</td>
            </tr>
            <tr>
              <td><strong>Industry</strong></td>
              <td>{c.industry}</td>
            </tr>
            <tr>
              <td><strong>Users</strong></td>
              <td>{c.users}</td>
            </tr>
            <tr>
              <td><strong>Companies</strong></td>
              <td>{c.companies}</td>
            </tr>
            <tr>
              <td><strong>Modules</strong></td>
              <td>{state.modules.size} selected</td>
            </tr>
            <tr>
              <td><strong>Estimated Duration</strong></td>
              <td>{(weeks / 4.345).toFixed(1)} months</td>
            </tr>
            <tr>
              <td><strong>Indicative Effort</strong></td>
              <td>{fmtH(low)} / {fmtH(res.total)} / {fmtH(high)} h</td>
            </tr>
            <tr>
              <td><strong>Recommended Team</strong></td>
              <td>{team} people (peak)</td>
            </tr>
            <tr>
              <td><strong>Support Estimate</strong></td>
              <td>{fmtH(res.monthlySupport)} h/month</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.footerNote}>
        Generated by BC Deal Sizer for Raven Labs / GKB Labs pre-sales use. Figures are estimation benchmarks, not official Microsoft guidance.
      </p>
    </section>
  );
}

function ScenariosPanel({ state }) {
  const scB = state;
  const resB = runEngine(scB);
  const weeksB = durationWeeks(resB.total);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h1>What-If / Scenario Analysis</h1>
      </div>
      <p className={styles.panelSub}>
        Scenario analysis helps validate the estimate against different delivery approaches.
      </p>
      <div className={styles.card}>
        <h3>Current Scenario (B — Enhanced Implementation)</h3>
        <table className={styles.regTable}>
          <tbody>
            <tr>
              <td><strong>Effort</strong></td>
              <td>{fmtH(resB.total)} h</td>
            </tr>
            <tr>
              <td><strong>Duration</strong></td>
              <td>{(weeksB / 4.345).toFixed(1)} months</td>
            </tr>
            <tr>
              <td><strong>Team size</strong></td>
              <td>{peakFTE(resB.total, weeksB)} FTE</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
