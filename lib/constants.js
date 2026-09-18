// All constant data for BC Deal Sizer

export const INDUSTRIES = [
  "Manufacturing",
  "Distribution",
  "Wholesale",
  "Retail",
  "Professional Services",
  "Construction",
  "Engineering",
  "Automotive",
  "Food & Beverage",
  "Pharmaceuticals / Life Sciences",
  "Healthcare",
  "Non-Profit",
  "Technology",
  "Media",
  "Real Estate",
  "Other"
];

export const CHALLENGES = [
  ["legacy_erp", "Legacy ERP replacement"],
  ["excel_dependency", "Excel dependency"],
  ["fin_visibility", "Poor financial visibility"],
  ["manual_processes", "Manual processes"],
  ["dup_data_entry", "Duplicate data entry"],
  ["inv_visibility", "Poor inventory visibility"],
  ["wh_inefficiency", "Warehouse inefficiency"],
  ["purchasing_controls", "Poor purchasing controls"],
  ["sales_order_mgmt", "Poor sales order management"],
  ["mfg_planning", "Manufacturing planning problems"],
  ["workflow_approval", "Lack of workflow / approval"],
  ["poor_reporting", "Poor reporting"],
  ["realtime_info", "Lack of real-time information"],
  ["multi_company", "Multi-company complexity"],
  ["multi_country", "Multi-country operations"],
  ["localization_req", "Localization requirements"],
  ["audit_compliance", "Audit / compliance challenges"],
  ["integration_problems", "Integration problems"],
  ["legacy_support", "Legacy system support problems"],
  ["scalability", "Scalability issues"],
  ["support_costs", "High operational support costs"],
  ["data_quality", "Data quality issues"],
  ["other_challenge", "Other"]
];

export const MODULES = [
  { id: "gl", label: "General Ledger", group: "Core Finance", ws: "finance", h: 40 },
  { id: "ap", label: "Accounts Payable", group: "Core Finance", ws: "finance", h: 30 },
  { id: "ar", label: "Accounts Receivable", group: "Core Finance", ws: "finance", h: 30 },
  { id: "cashbank", label: "Cash & Bank Management", group: "Core Finance", ws: "finance", h: 20 },
  { id: "fixedassets", label: "Fixed Assets", group: "Core Finance", ws: "finance", h: 25 },
  { id: "budgets", label: "Budgets", group: "Core Finance", ws: "finance", h: 15 },
  { id: "dimensions", label: "Dimensions", group: "Core Finance", ws: "finance", h: 15 },
  { id: "finreporting", label: "Financial Reporting", group: "Core Finance", ws: "finance", h: 25 },
  { id: "intercompany", label: "Intercompany", group: "Core Finance", ws: "finance", h: 30 },
  { id: "deferrals", label: "Deferrals", group: "Core Finance", ws: "finance", h: 15 },
  { id: "sales", label: "Sales", group: "Sales", ws: "sales", h: 35 },
  { id: "pricing", label: "Pricing", group: "Sales", ws: "sales", h: 15 },
  { id: "custmgmt", label: "Customer Management", group: "Sales", ws: "sales", h: 15 },
  { id: "salesreturns", label: "Sales Returns", group: "Sales", ws: "sales", h: 10 },
  { id: "salesprepay", label: "Prepayments", group: "Sales", ws: "sales", h: 10 },
  { id: "purchasing", label: "Purchasing", group: "Purchasing", ws: "purchasing", h: 35 },
  { id: "vendormgmt", label: "Vendor Management", group: "Purchasing", ws: "purchasing", h: 15 },
  { id: "purchapprovals", label: "Purchase Approvals", group: "Purchasing", ws: "purchasing", h: 12 },
  { id: "purchreturns", label: "Purchase Returns", group: "Purchasing", ws: "purchasing", h: 10 },
  { id: "purchprepay", label: "Prepayments", group: "Purchasing", ws: "purchasing", h: 10 },
  { id: "invmgmt", label: "Inventory Management", group: "Inventory", ws: "inventory", h: 30 },
  { id: "itemtracking", label: "Item Tracking", group: "Inventory", ws: "inventory", h: 18 },
  { id: "lotserial", label: "Lot / Serial Numbers", group: "Inventory", ws: "inventory", h: 18 },
  { id: "multiloc", label: "Multiple Locations", group: "Inventory", ws: "inventory", h: 15 },
  { id: "whmgmt", label: "Warehouse Management", group: "Inventory", ws: "warehouse", h: 35 },
  { id: "binmgmt", label: "Bin Management", group: "Inventory", ws: "warehouse", h: 20 },
  { id: "reservations", label: "Reservations", group: "Inventory", ws: "warehouse", h: 12 },
  { id: "replenishment", label: "Replenishment", group: "Inventory", ws: "warehouse", h: 18 },
  { id: "prodbom", label: "Production BOM", group: "Manufacturing", ws: "manufacturing", h: 30 },
  { id: "routings", label: "Routings", group: "Manufacturing", ws: "manufacturing", h: 25 },
  { id: "prodorders", label: "Production Orders", group: "Manufacturing", ws: "manufacturing", h: 30 },
  { id: "capacity", label: "Capacity", group: "Manufacturing", ws: "manufacturing", h: 20 },
  { id: "mrp", label: "MRP / Planning", group: "Manufacturing", ws: "manufacturing", h: 40 },
  { id: "mfgcosting", label: "Manufacturing Costing", group: "Manufacturing", ws: "manufacturing", h: 25 },
  { id: "shopfloor", label: "Shop Floor Processes", group: "Manufacturing", ws: "manufacturing", h: 35 },
  { id: "jobs", label: "Jobs", group: "Projects / Jobs", ws: "projects", h: 25 },
  { id: "jobplanning", label: "Job Planning", group: "Projects / Jobs", ws: "projects", h: 18 },
  { id: "projcosting", label: "Project Costing", group: "Projects / Jobs", ws: "projects", h: 20 },
  { id: "timeentry", label: "Time Entry", group: "Projects / Jobs", ws: "projects", h: 12 },
  { id: "jobbilling", label: "Job Billing", group: "Projects / Jobs", ws: "projects", h: 15 },
  { id: "svcmgmt", label: "Service Management", group: "Service", ws: "service", h: 25 },
  { id: "svcorders", label: "Service Orders", group: "Service", ws: "service", h: 18 },
  { id: "svccontracts", label: "Service Contracts", group: "Service", ws: "service", h: 18 },
  { id: "svcitems", label: "Service Items", group: "Service", ws: "service", h: 12 },
  { id: "hr", label: "Human Resources", group: "Other", ws: "customization", h: 20 },
  { id: "approvals", label: "Approvals", group: "Other", ws: "customization", h: 15 },
  { id: "workflows", label: "Workflows", group: "Other", ws: "customization", h: 20 },
  { id: "edocs", label: "Electronic Documents", group: "Other", ws: "customization", h: 15 },
  { id: "paymentauto", label: "Payment Automation", group: "Other", ws: "customization", h: 20 },
  { id: "powerbi", label: "Power BI", group: "Other", ws: "reporting", h: 25 },
  { id: "m365", label: "Microsoft 365 integration", group: "Other", ws: "reporting", h: 10 },
  { id: "powerplatform", label: "Power Platform", group: "Other", ws: "customization", h: 25 },
  { id: "other_mod", label: "Other", group: "Other", ws: "customization", h: 15 }
];

export const AREA_KEYS = [
  ["finance", "Finance"],
  ["sales", "Sales"],
  ["purchasing", "Purchasing"],
  ["inventory", "Inventory"],
  ["warehouse", "Warehouse"],
  ["manufacturing", "Manufacturing"],
  ["projects", "Projects"],
  ["service", "Service"],
  ["reporting", "Reporting"],
  ["integrations", "Integrations"],
  ["migration", "Migration"],
  ["localization", "Localization"],
  ["customization", "Customization"]
];

export const CFACTOR = { Low: 0.82, Medium: 1.0, High: 1.32, "Very High": 1.68 };

export const MIGRATION_SOURCES = [
  "Dynamics NAV",
  "Older Business Central",
  "SAP",
  "Oracle",
  "Sage",
  "QuickBooks",
  "Xero",
  "Infor",
  "Custom ERP",
  "Excel",
  "Multiple systems",
  "Other"
];

export const MIGRATION_SCOPE = [
  ["customers", "Customers", 20],
  ["vendors", "Vendors", 20],
  ["items", "Items", 30],
  ["contacts", "Contacts", 10],
  ["coa", "Chart of Accounts", 15],
  ["dimensions", "Dimensions", 10],
  ["opening_balances", "Opening balances", 15],
  ["inv_opening", "Inventory opening balances", 20],
  ["fixed_assets", "Fixed assets", 15],
  ["open_sales_docs", "Open sales documents", 25],
  ["open_purch_docs", "Open purchase documents", 25],
  ["historical_txn", "Historical transactions", 60],
  ["historical_inv", "Historical inventory", 45],
  ["historical_fin", "Historical financial data", 45],
  ["bank_data", "Bank data", 15],
  ["attachments", "Attachments", 20],
  ["documents", "Documents", 20],
  ["other_migration", "Other", 15]
];

export const INTEGRATION_CATEGORIES = [
  "CRM",
  "E-commerce",
  "Banking",
  "Payroll",
  "Tax",
  "Warehouse Management System",
  "Manufacturing system",
  "EDI",
  "Shipping / logistics",
  "Payment gateway",
  "Marketplace",
  "Power BI",
  "Dataverse",
  "Microsoft 365",
  "External API",
  "Legacy application",
  "Custom application"
];

export const INT_COMPLEXITY_HOURS = { Low: 40, Medium: 90, High: 165 };

export const REPORTING_ITEMS = [
  ["standard", "Standard reports", 8],
  ["custom", "Custom reports", 25],
  ["excel", "Excel reporting", 15],
  ["mgmt", "Management reporting", 20],
  ["finStatements", "Financial statements", 20],
  ["operational", "Operational reporting", 18],
  ["regulatory", "Regulatory reporting", 25]
];

export const SUPPORT_SCOPE_ITEMS = [
  ["functional", "Functional support"],
  ["technical", "Technical support"],
  ["al", "AL support"],
  ["integration", "Integration support"],
  ["reporting", "Reporting support"],
  ["data", "Data support"],
  ["admin", "Administration"],
  ["monitoring", "Monitoring"],
  ["release", "Release management"],
  ["enhancements", "Minor enhancements"]
];

export const CUSTOM_ITEMS = [
  ["customTables", "Custom tables", 16],
  ["tableExt", "Table extensions", 10],
  ["pageExt", "Page extensions", 12],
  ["reportsDev", "Reports", 20],
  ["workflowsDev", "Workflows", 14],
  ["businessLogic", "Business logic units", 18],
  ["customApi", "Custom APIs", 30],
  ["mobile", "Mobile / scanning", 60],
  ["docLayouts", "Document layouts", 8],
  ["industrySpecific", "Industry-specific functionality", 40]
];

export const CUSTOM_LEVEL_BASE = {
  "No customization": 0,
  "Minimal customization": 40,
  "Moderate customization": 120,
  "Significant customization": 280,
  "Extensive customization": 520
};

export const PHASES = [
  ["mobilization", "Mobilisation", 0, 5, false],
  ["discovery", "Discovery", 4, 10, false],
  ["design", "Solution Design", 12, 13, false],
  ["config", "Configuration", 23, 20, false],
  ["dev", "Development (AL / integrations)", 26, 20, true],
  ["migration", "Data Migration", 30, 18, true],
  ["intdev", "Integration Development", 30, 15, true],
  ["testing", "Testing", 44, 16, false],
  ["uat", "User Acceptance Testing", 57, 10, false],
  ["training", "Training", 62, 9, true],
  ["cutover", "Cutover Preparation", 68, 7, false],
  ["golive", "Go-Live", 75, 2, false],
  ["hypercare", "Hypercare", 77, 10, false],
  ["transition", "Transition to Support", 85, 6, false]
];

export const ROLE_MAP = {
  discovery: [
    ["Solution Architect", 0.4],
    ["Project Manager", 0.3],
    ["Finance Consultant", 0.15],
    ["Supply Chain Consultant", 0.15]
  ],
  architecture: [
    ["Solution Architect", 0.8],
    ["Technical Architect", 0.2]
  ],
  pm: [["Project Manager", 1]],
  finance: [["Finance Consultant", 1]],
  sales: [["Supply Chain Consultant", 1]],
  purchasing: [["Supply Chain Consultant", 1]],
  inventory: [["Supply Chain Consultant", 1]],
  warehouse: [
    ["Supply Chain Consultant", 0.9],
    ["Technical Architect", 0.1]
  ],
  manufacturing: [["Manufacturing Consultant", 1]],
  projects: [["Service / Projects Consultant", 1]],
  service: [["Service / Projects Consultant", 1]],
  reporting: [
    ["BI / Reporting Consultant", 0.9],
    ["Technical Architect", 0.1]
  ],
  integrations: [
    ["Integration Developer", 0.85],
    ["Technical Architect", 0.15]
  ],
  customization: [
    ["AL Developer", 0.8],
    ["Technical Architect", 0.2]
  ],
  migration: [
    ["Data Migration Consultant", 0.9],
    ["AL Developer", 0.1]
  ],
  security: [
    ["Technical Architect", 0.7],
    ["AL Developer", 0.3]
  ],
  testing: [
    ["Tester", 0.85],
    ["Project Manager", 0.15]
  ],
  training: [
    ["Trainer", 0.9],
    ["Project Manager", 0.1]
  ],
  deployment: [
    ["Project Manager", 0.4],
    ["Technical Architect", 0.3],
    ["Data Migration Consultant", 0.3]
  ],
  hypercare: [
    ["Support Consultant", 0.6],
    ["Finance Consultant", 0.2],
    ["AL Developer", 0.2]
  ],
  documentation: [
    ["Project Manager", 0.5],
    ["Solution Architect", 0.5]
  ]
};

export const WS_LABELS = {
  discovery: "Discovery / Analysis",
  architecture: "Solution Architecture",
  pm: "Project Management",
  finance: "Finance",
  sales: "Sales",
  purchasing: "Purchasing",
  inventory: "Inventory",
  warehouse: "Warehouse",
  manufacturing: "Manufacturing",
  projects: "Projects",
  service: "Service",
  reporting: "Reporting",
  integrations: "Integrations",
  customization: "Customization / AL",
  migration: "Data Migration",
  security: "Security / Permissions",
  testing: "Testing",
  training: "Training",
  deployment: "Deployment / Cutover",
  hypercare: "Hypercare",
  documentation: "Documentation"
};

export const WS_ORDER = [
  "discovery",
  "architecture",
  "pm",
  "finance",
  "sales",
  "purchasing",
  "inventory",
  "warehouse",
  "manufacturing",
  "projects",
  "service",
  "reporting",
  "integrations",
  "customization",
  "migration",
  "security",
  "testing",
  "training",
  "deployment",
  "hypercare",
  "documentation"
];

export const ROLE_RESPONSIBILITIES = {
  "Project Manager":
    "Overall delivery ownership, governance, RAID log, steering committee reporting.",
  "Solution Architect":
    "End-to-end solution design, fit-gap, cross-module consistency, design authority.",
  "Finance Consultant":
    "Finance module configuration, financial reporting, fit-gap for GL/AP/AR/FA.",
  "Supply Chain Consultant":
    "Sales, purchasing, inventory and warehouse configuration and testing support.",
  "Manufacturing Consultant":
    "Production BOM, routings, capacity and shop-floor configuration.",
  "Service / Projects Consultant":
    "Jobs, service management and project costing configuration.",
  "Technical Architect":
    "Technical design authority, security model, environment strategy, code review.",
  "AL Developer":
    "Extension development, table/page extensions, business logic, custom APIs.",
  "Integration Developer":
    "Integration design, build and testing against third-party systems.",
  "Data Migration Consultant":
    "Data mapping, cleansing support, migration tooling, reconciliation.",
  "BI / Reporting Consultant": "Report and Power BI dashboard development.",
  Tester: "Test planning, system and integration test execution, defect management.",
  Trainer: "Training material development and delivery, adoption support.",
  "Support Consultant":
    "Hypercare and steady-state functional/technical support."
};

export const CUSTOMER_RESPONSIBILITIES = [
  "Nominate a single accountable product owner for the engagement.",
  "Provide named subject-matter experts for each in-scope functional area.",
  "Own data cleansing and validation ahead of each migration cycle.",
  "Execute User Acceptance Testing within agreed windows.",
  "Approve design documents, test results and cutover readiness at each stage gate.",
  "Provide integration and infrastructure/security contacts as required.",
  "Resource and attend training sessions.",
  "Make timely business decisions on open design questions.",
  "Approve final cutover and go-live."
];

export const EXCLUSIONS_BASE = [
  "Microsoft licensing (Business Central, Power Platform, Power BI, Microsoft 365).",
  "Third-party ISV licensing and any associated ISV implementation effort not named in scope.",
  "Hardware, networking and on-premises infrastructure.",
  "Extensive legacy data cleansing beyond the agreed migration scope.",
  "Historical transaction migration beyond the data categories listed in the Migration Strategy.",
  "Integrations not explicitly listed in the Integration Scope.",
  "Custom functionality identified after discovery sign-off (treated as change request).",
  "Major business process re-design outside the agreed functional scope.",
  "Regulatory or statutory changes introduced after this estimate is issued.",
  "Customer-side project resourcing (product owner, SMEs, data owners, UAT testers)."
];

export const BC_LICENSES = [
  { id: "essentials", name: "Business Central Essentials", monthly: 80, desc: "Full user. Finance, sales, purchasing, inventory, project accounting and basic warehousing." },
  { id: "premium", name: "Business Central Premium", monthly: 110, desc: "Full user. Everything in Essentials plus manufacturing and service order management." },
  { id: "teammember", name: "Team Member", monthly: 8, desc: "Light user. Read access plus limited write, for example approvals, timesheets and basic data entry." },
  { id: "device", name: "Device license", monthly: 45, desc: "Shared device such as a shop floor terminal or point of sale. Not tied to one named user." },
  { id: "extaccountant", name: "External Accountant", monthly: 0, desc: "Up to 3 free per tenant for the customer's external accountant or bookkeeper, same rights as a full user minus admin tasks." },
  { id: "m365read", name: "Microsoft 365 read access", monthly: 0, desc: "Internal users on qualifying Microsoft 365 plans get free read-only access to Business Central data in Microsoft Teams, provided the tenant holds at least one Business Central license." }
];

export const PREMIUM_MODULE_IDS = [
  "prodbom", "routings", "prodorders", "capacity", "mrp", "mfgcosting", "shopfloor",
  "svcmgmt", "svcorders", "svccontracts", "svcitems"
];

export const RESOURCE_LINKS = [
  {
    group: "Official overview",
    items: [
      { title: "Welcome to Business Central", desc: "Microsoft Learn overview of what Business Central is and how it fits together.", url: "https://learn.microsoft.com/en-us/dynamics365/business-central/welcome" },
      { title: "Business Central documentation home", desc: "Full Microsoft Learn documentation set: setup, modules, admin and developer guidance.", url: "https://learn.microsoft.com/en-us/dynamics365/business-central/" },
      { title: "Licensing in Business Central", desc: "The licensing model this estimator's cost figures are based on.", url: "https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/deployment/licensing" }
    ]
  },
  {
    group: "Videos and how-to walkthroughs",
    items: [
      { title: "Business Central video library", desc: "Microsoft's own short how-to videos, organised by topic and task.", url: "https://learn.microsoft.com/en-us/dynamics365/business-central/across-videos" },
      { title: "Official Business Central YouTube channel", desc: "Product walkthroughs, under-the-hood sessions and release update videos.", url: "https://www.youtube.com/@MicrosoftDynamics365BC" },
      { title: "Getting started playlist", desc: "A guided video playlist for first-time users covering navigation and core setup.", url: "https://www.youtube.com/playlist?list=PL1FESh9FqyhST4suOdbJmA5ftQxmWzid4" }
    ]
  }
];

export const PHASE_ALLOC = {
  discovery: "discovery",
  architecture: "design",
  finance: "config",
  sales: "config",
  purchasing: "config",
  inventory: "config",
  warehouse: "config",
  manufacturing: "config",
  projects: "config",
  service: "config",
  reporting: "config",
  integrations: "intdev",
  customization: "dev",
  migration: "migration",
  security: "config",
  testing: "testing",
  training: "training",
  deployment: "cutover",
  hypercare: "hypercare",
  documentation: "transition"
};

export const MODULE_GROUPS = [...new Set(MODULES.map((m) => m.group))];
