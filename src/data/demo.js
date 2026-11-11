import { DEFAULT_ACCOUNTS, DEFAULT_BILLS, DEFAULT_DATA } from './defaults.js';

export const DEMO_STORAGE_KEY = 'budget_ledger_demo_v1';
export const DEMO_LABEL = 'Demo data — sample finances for exploring the app, not real money.';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function isoDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function dateInMonth(now, monthOffset, day) {
  const anchor = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const lastDay = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  return isoDate(new Date(anchor.getFullYear(), anchor.getMonth(), Math.min(day, lastDay)));
}

function dayThisMonth(now, daysAgo = 0) {
  const day = Math.max(1, now.getDate() - daysAgo);
  return isoDate(new Date(now.getFullYear(), now.getMonth(), day));
}

function months(value) {
  if (Array.isArray(value)) {
    return Array.from({ length: 12 }, (_, index) => Number(value[index] || 0));
  }
  return Array(12).fill(Number(value || 0));
}

function transactionFactory(prefix) {
  let sequence = 0;
  return (input) => {
    sequence += 1;
    return {
      id: `${prefix}_tx_${sequence}`,
      date: input.date,
      description: input.description,
      category: input.category,
      group: input.group,
      amount: Number(input.amount || 0),
      type: input.type || 'expense',
      is_subscription: Boolean(input.is_subscription),
      notes: input.notes || 'Demo sample transaction',
      reviewed: Boolean(input.reviewed),
      ...(input.fromAccountId ? { fromAccountId: input.fromAccountId } : {}),
      ...(input.toAccountId ? { toAccountId: input.toAccountId } : {}),
    };
  };
}

function personalBills(now, prefix, accountId) {
  return clone(DEFAULT_BILLS).map((bill, index) => ({
    ...bill,
    id: `${prefix}_bill_${index + 1}`,
    nextDueDate: dateInMonth(now, 0, bill.dayOfMonth || 1),
    accountId,
  }));
}

function personalAccounts() {
  return clone(DEFAULT_ACCOUNTS);
}

function personalTransactions(now, prefix, { current = true } = {}) {
  const tx = transactionFactory(prefix);
  const currentDate = (daysAgo) => dayThisMonth(now, daysAgo);
  const previousDate = (day) => dateInMonth(now, -1, day);
  const previousYearDate = (day) => dateInMonth(now, -12, day);
  const dateFor = current
    ? (daysAgo) => currentDate(daysAgo)
    : (_, day) => previousDate(day);

  return [
    tx({ date: dateFor(9, 1), description: 'Employer Direct Deposit', category: 'Primary Salary', group: 'Income', amount: 2600, type: 'income', is_subscription: true }),
    tx({ date: dateFor(1, 15), description: 'Employer Direct Deposit', category: 'Primary Salary', group: 'Income', amount: 2600, type: 'income', is_subscription: true }),
    tx({ date: dateFor(6, 3), description: 'Neighborhood Grocery', category: 'Groceries', group: 'Expenses', amount: 142.35, type: 'expense' }),
    tx({ date: dateFor(2, 17), description: 'Farmers Market', category: 'Groceries', group: 'Expenses', amount: 96.1, type: 'expense' }),
    tx({ date: dateFor(4, 8), description: 'Local Diner', category: 'Dining Out', group: 'Expenses', amount: 54.25, type: 'expense' }),
    tx({ date: dateFor(9, 1), description: 'Internet Provider', category: 'Internet', group: 'Expenses', amount: 80, type: 'expense', is_subscription: true }),
    tx({ date: dateFor(7, 5), description: 'Mobile Carrier', category: 'Mobile Phone', group: 'Expenses', amount: 70, type: 'expense', is_subscription: true }),
    tx({ date: dateFor(3, 9), description: 'Fuel Stop', category: 'Fuel & Auto', group: 'Expenses', amount: 48.75, type: 'expense' }),
    tx({ date: dateFor(5, 12), description: 'Pharmacy', category: 'Healthcare', group: 'Expenses', amount: 30, type: 'expense' }),
    tx({ date: dateFor(1, 20), description: 'Streaming Service', category: 'Entertainment', group: 'Expenses', amount: 24.99, type: 'expense', is_subscription: true }),
    tx({ date: dateFor(8, 5), description: 'Emergency Fund Transfer', category: 'Emergency Fund', group: 'Savings', amount: 300, type: 'savings', is_subscription: true }),
    tx({ date: dateFor(6, 10), description: 'Roth IRA Contribution', category: 'Roth IRA', group: 'Savings', amount: 250, type: 'savings', is_subscription: true }),
    tx({ date: dateFor(4, 10), description: 'Index Fund Purchase', category: 'Index Funds', group: 'Investments', amount: 300, type: 'savings', is_subscription: true }),
    tx({ date: dateFor(9, 15), description: 'Auto Loan Payment', category: 'Auto Loan', group: 'Debt', amount: 375, type: 'debt', is_subscription: true }),
    tx({ date: dateFor(5, 15), description: 'Credit Card Payment', category: 'Credit Card 1 Payment', group: 'Debt', amount: 120, type: 'debt', is_subscription: true }),
    ...(current ? [] : [
      tx({ date: previousYearDate(3), description: 'Neighborhood Grocery', category: 'Groceries', group: 'Expenses', amount: 131.4, type: 'expense' }),
      tx({ date: previousYearDate(10), description: 'Index Fund Purchase', category: 'Index Funds', group: 'Investments', amount: 275, type: 'savings' }),
    ]),
  ];
}

function personalBudget({ id, name, year, now, current }) {
  return {
    id,
    name,
    year,
    type: 'personal',
    icon: '📈',
    isDemo: true,
    demoLabel: DEMO_LABEL,
    categories: clone(DEFAULT_DATA.categories),
    budget: clone(DEFAULT_DATA.budget),
    transactions: personalTransactions(now, id, { current }),
    accounts: personalAccounts(),
    bills: personalBills(now, id, 'acc1'),
  };
}

function businessBudget({ id, name, year, now }) {
  const tx = transactionFactory(id);
  return {
    id,
    name,
    year,
    type: 'business',
    icon: '💼',
    isDemo: true,
    demoLabel: DEMO_LABEL,
    categories: {
      Income: ['Client Payments', 'Retainer'],
      Expenses: ['Software Subscriptions', 'Contractor Payments', 'Internet'],
      Savings: ['Tax Reserve'],
      Investments: [],
      Debt: [],
    },
    budget: {
      Income: {
        'Client Payments': months([3200, 2800, 3600, 3100, 3400, 4200, 3800, 3300, 3500, 4000, 3900, 4300]),
        'Retainer': months(1500),
      },
      Expenses: {
        'Software Subscriptions': months(85),
        'Contractor Payments': months([600, 600, 900, 600, 600, 1200, 600, 600, 900, 600, 600, 1200]),
        'Internet': months(40),
      },
      Savings: {
        'Tax Reserve': months([700, 700, 800, 700, 700, 900, 800, 700, 800, 800, 800, 900]),
      },
      Investments: {},
      Debt: {},
    },
    transactions: [
      tx({ date: dayThisMonth(now, 8), description: 'Invoice — Demo Client A', category: 'Client Payments', group: 'Income', amount: 2400, type: 'income' }),
      tx({ date: dayThisMonth(now, 3), description: 'Invoice — Demo Client B', category: 'Client Payments', group: 'Income', amount: 1800, type: 'income' }),
      tx({ date: dayThisMonth(now, 7), description: 'Monthly Retainer', category: 'Retainer', group: 'Income', amount: 1500, type: 'income', is_subscription: true }),
      tx({ date: dayThisMonth(now, 6), description: 'Design Software', category: 'Software Subscriptions', group: 'Expenses', amount: 85, type: 'expense', is_subscription: true }),
      tx({ date: dayThisMonth(now, 2), description: 'Contract Editor', category: 'Contractor Payments', group: 'Expenses', amount: 600, type: 'expense' }),
      tx({ date: dateInMonth(now, -1, 20), description: 'Invoice — Demo Client A', category: 'Client Payments', group: 'Income', amount: 2200, type: 'income' }),
      tx({ date: dateInMonth(now, -1, 6), description: 'Design Software', category: 'Software Subscriptions', group: 'Expenses', amount: 85, type: 'expense', is_subscription: true }),
      tx({ date: dateInMonth(now, -1, 12), description: 'Tax Reserve Transfer', category: 'Tax Reserve', group: 'Savings', amount: 700, type: 'savings' }),
    ],
    accounts: [
      { id: `${id}_checking`, name: 'Business Checking', subtype: 'Cash & Bank', assetClass: 'ASSETS', icon: '🏦', startBalance: 6200, monthlyBalances: Array(12).fill(null) },
      { id: `${id}_tax`, name: 'Tax Reserve Savings', subtype: 'Cash & Bank', assetClass: 'ASSETS', icon: '💰', startBalance: 2400, monthlyBalances: Array(12).fill(null) },
    ],
    bills: [
      { id: `${id}_bill_software`, name: 'Design Software', payeePattern: 'Design Software', matchType: 'Contains', amountType: 'Fixed Amount', amount: 85, frequency: 'Monthly', nextDueDate: dateInMonth(now, 0, 6), dayOfMonth: 6, billType: 'expense', category: 'Software Subscriptions', accountId: `${id}_checking` },
      { id: `${id}_bill_internet`, name: 'Business Internet', payeePattern: 'Internet', matchType: 'Contains', amountType: 'Fixed Amount', amount: 40, frequency: 'Monthly', nextDueDate: dateInMonth(now, 0, 1), dayOfMonth: 1, billType: 'expense', category: 'Internet', accountId: `${id}_checking` },
    ],
  };
}

export function buildDemoTemplates(now = new Date()) {
  const stamp = now.toISOString();
  return [{
    id: 'demo_tpl_starter',
    name: 'Demo Starter Plan',
    description: 'Demo-only starter template using sample categories and budget amounts.',
    builtIn: false,
    type: 'personal',
    icon: '🧪',
    isDemo: true,
    demoLabel: DEMO_LABEL,
    createdAt: stamp,
    updatedAt: stamp,
    data: {
      categories: clone(DEFAULT_DATA.categories),
      budget: clone(DEFAULT_DATA.budget),
      accounts: clone(DEFAULT_ACCOUNTS),
      bills: clone(DEFAULT_BILLS),
      transactions: [],
    },
  }];
}

export function buildDemoState(now = new Date()) {
  const year = now.getFullYear();
  const previousYear = year - 1;
  const nextYear = year + 1;
  const current = personalBudget({
    id: 'demo_personal_current',
    name: `Demo Personal Budget — ${year}`,
    year,
    now,
    current: true,
  });
  const previous = personalBudget({
    id: 'demo_personal_previous',
    name: `Demo Personal Budget — ${previousYear}`,
    year: previousYear,
    now,
    current: false,
  });
  const planned = {
    id: 'demo_personal_planned',
    name: `Demo Planned Budget — ${nextYear}`,
    year: nextYear,
    type: 'personal',
    icon: '🎯',
    isDemo: true,
    demoLabel: DEMO_LABEL,
    categories: clone(DEFAULT_DATA.categories),
    budget: clone(DEFAULT_DATA.budget),
    transactions: [],
    accounts: personalAccounts(),
    bills: personalBills(now, 'demo_personal_planned', 'acc1'),
  };
  const business = businessBudget({
    id: 'demo_business_current',
    name: `Demo Business Budget — ${year}`,
    year,
    now,
  });

  return {
    currentId: current.id,
    budgets: {
      [current.id]: current,
      [previous.id]: previous,
      [planned.id]: planned,
      [business.id]: business,
    },
    templates: buildDemoTemplates(now),
    isDemo: true,
    demoLabel: DEMO_LABEL,
  };
}

function getDefaultStorage() {
  try {
    return typeof globalThis !== 'undefined' ? globalThis.localStorage : undefined;
  } catch {
    return undefined;
  }
}

function isDemoState(value) {
  return Boolean(value) && typeof value === 'object' && value.budgets && typeof value.budgets === 'object' && !Array.isArray(value.budgets);
}

function normalizeDemoState(value, now) {
  const budgets = value.budgets;
  const currentId = value.currentId && budgets[value.currentId]
    ? value.currentId
    : (Object.keys(budgets)[0] || null);
  return {
    currentId,
    budgets,
    templates: Array.isArray(value.templates) && value.templates.length ? value.templates : buildDemoTemplates(now),
    isDemo: true,
    demoLabel: value.demoLabel || DEMO_LABEL,
  };
}

export function resolveDemoMode({ viteDemoMode, hasElectronAPI = false, protocol = '' } = {}) {
  const flagEnabled = viteDemoMode === 'true';
  const isElectron = Boolean(hasElectronAPI);
  const isFileProtocol = protocol === 'file:';
  return flagEnabled && !isElectron && !isFileProtocol;
}

export function loadDemoState({ storage = getDefaultStorage(), now = new Date() } = {}) {
  const seed = buildDemoState(now);
  if (!storage) return seed;
  try {
    const raw = storage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isDemoState(parsed)) return normalizeDemoState(parsed, now);
    }
  } catch {
    saveDemoState(seed, storage);
    return seed;
  }
  saveDemoState(seed, storage);
  return seed;
}

export function saveDemoState(state, storage = getDefaultStorage()) {
  if (!storage || !state || typeof state !== 'object') return false;
  try {
    const payload = {
      currentId: state.currentId ?? null,
      budgets: state.budgets && typeof state.budgets === 'object' ? state.budgets : {},
      templates: Array.isArray(state.templates) ? state.templates : [],
      isDemo: true,
      demoLabel: state.demoLabel || DEMO_LABEL,
    };
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function resetDemoState({ storage = getDefaultStorage(), now = new Date() } = {}) {
  if (storage) {
    try {
      storage.removeItem(DEMO_STORAGE_KEY);
    } catch {
      return buildDemoState(now);
    }
  }
  const seed = buildDemoState(now);
  saveDemoState(seed, storage);
  return seed;
}

export function exportDemoState(state = {}) {
  return {
    currentId: state.currentId ?? null,
    budgets: clone(state.budgets || {}),
    templates: clone(state.templates || []),
    isDemo: true,
    demoLabel: state.demoLabel || DEMO_LABEL,
  };
}

export function createDemoImportState(nextState, { now = new Date(), templates } = {}) {
  if (
    !nextState ||
    typeof nextState !== 'object' ||
    !nextState.currentId ||
    !nextState.budgets ||
    typeof nextState.budgets !== 'object'
  ) {
    throw new Error('Demo import requires currentId and budgets.');
  }
  return {
    currentId: nextState.currentId,
    budgets: clone(nextState.budgets),
    templates: Array.isArray(templates) ? clone(templates) : buildDemoTemplates(now),
    isDemo: true,
    demoLabel: DEMO_LABEL,
  };
}
