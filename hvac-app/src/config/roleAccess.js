// // src/config/roleAccess.js

export const ROLE_ACCESS = {
  ceo: [
    "companydashboard", "dashboard", "reports", "po", "mto", "boq", "design",
    "execution", "handover", "award", "leads", "tender",
    "procurement", "finance", "staff", "logistics",
    "maintenance", "inventory", "marketplace", "support_tickets"
  ],

  director: [
    "companydashboard", "dashboard", "reports", "po", "mto", "boq", "design",
    "execution", "handover", "award", "leads", "tender",
    "procurement", "finance", "staff", "logistics",
    "maintenance", "inventory", "marketplace", "support_tickets"
  ],

  company_admin: [
    "companydashboard", "dashboard", "reports", "po", "mto", "boq", "design",
    "execution", "handover", "award", "leads", "tender",
    "procurement", "finance", "staff", "logistics",
    "maintenance", "inventory", "marketplace", "support_tickets"
  ],

  project_manager: [
    "companydashboard", "dashboard", "boq",
    "design", "execution", "handover", "mto", "reports"
  ],

  engineering_manager: [
    "companydashboard", "dashboard", "boq",
    "design", "execution", "handover", "mto", "reports"
  ],

  project_engineer: [
    "companydashboard", "dashboard", "boq",
    "design", "execution", "handover", "mto", "reports"
  ],

  designer: [
    "companydashboard", "dashboard", "award",
    "leads", "design", "boq", "mto",
    "tender", "execution", "procurement",
    "finance", "operations"
  ],

  procurement: [
    "companydashboard", "dashboard", "mto", "boq", "po"
  ],

  finance: [
    "companydashboard", "dashboard", "mto", "boq", "po"
  ],

  operations: [
    "companydashboard", "dashboard", "mto", "boq", "po"
  ],

  site_tech: [
    "companydashboard", "dashboard", "reports", "handover"
  ],

  sales_engineer: [
    "companydashboard", "dashboard", "leads", "tender", "award"
  ],

  business_dev_manager: [
    "companydashboard", "dashboard", "leads", "tender", "award"
  ],

  front_desk: [
    "companydashboard", "dashboard", "handover", "reports"
  ],

  developer: [
    "companydashboard", "dashboard", "reports", "po", "mto", "boq",
    "design", "execution", "handover", "award", "leads",
    "tender", "nimbusx", "procurement", "finance",
    "staff", "logistics", "maintenance",
    "inventory", "marketplace", "support_tickets"
  ],

  app_support: [
    "companydashboard", "dashboard",
    "support_tickets", "marketplace"
  ],

  market_agent: [
    "companydashboard", "dashboard", "marketplace"
  ],
};


// 🔥 ALL POSSIBLE PAGES
export const ALL_PAGES = [
  "companydashboard",
  "dashboard",
  "reports",
  "po",
  "mto",
  "boq",
  "design",
  "execution",
  "handover",
  "award",
  "leads",
  "tender",
  "procurement",
  "finance",
  "staff",
  "logistics",
  "maintenance",
  "inventory",
  "marketplace",
  "support_tickets",
  "operations",
  "nimbusx"
];


// 🔥 MAIN PERMISSION ENGINE
export function getUserPermissions(role, customPermissions = {}) {

  const defaults = ROLE_ACCESS[role] || [];

  // convert array to object
  const permissionsMap = {};

  ALL_PAGES.forEach(page => {
    permissionsMap[page] = defaults.includes(page);
  });

  // apply custom overrides
  Object.keys(customPermissions || {}).forEach(page => {
    permissionsMap[page] = customPermissions[page];
  });

  // convert back to array
  return Object.keys(permissionsMap).filter(
    page => permissionsMap[page]
  );
}


// Convert keys to friendly names
export function getRolesForSelector() {
  return Object.keys(ROLE_ACCESS).map(role =>
    role
      .toLowerCase()
      .split("_")
      .map(word => word[0].toUpperCase() + word.slice(1))
      .join(" ")
  );
}


// Convert friendly name back to key
export function roleNameToKey(friendlyName) {
  return friendlyName.toLowerCase().replace(/\s+/g, "_");
}

