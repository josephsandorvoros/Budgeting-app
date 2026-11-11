import { parseTransactionDate, transactionMatchesPeriod } from '../utils/transactions.js';

const GROUP_ALIASES = {
  income: 'Income',
  in: 'Income',
  expense: 'Expenses',
  expenses: 'Expenses',
  out: 'Expenses',
  saving: 'Savings',
  savings: 'Savings',
  debt: 'Debt',
  investment: 'Investments',
  investments: 'Investments',
  transfer: null,
  transfers: null,
};

export const DASHBOARD_GROUPS = ['Income', 'Expenses', 'Debt', 'Savings', 'Investments'];

export function normalizeCategoryKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function normalizeGroupName(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (!key) return undefined;
  if (!(key in GROUP_ALIASES)) return undefined;
  return GROUP_ALIASES[key];
}

export function resolveTypeGroup(tx) {
  const typeBased = normalizeGroupName(tx?.type);
  if (typeBased !== undefined) return typeBased;

  const explicit = normalizeGroupName(tx?.group ?? tx?.group_name);
  if (explicit !== undefined) return explicit;

  return undefined;
}

export function resolveCategoryGroup(tx, categoryGroupIndex = {}) {
  const categoryName = normalizeCategoryKey(tx?.category);
  if (categoryName && categoryGroupIndex[categoryName]) return categoryGroupIndex[categoryName];

  const explicit = normalizeGroupName(tx?.group ?? tx?.group_name);
  if (explicit !== undefined) return explicit;

  return undefined;
}

export function buildCategoryGroupIndex(categories = {}, groups = DASHBOARD_GROUPS) {
  const map = {};
  groups.forEach((group) => {
    (categories[group] || []).forEach((cat) => {
      const key = normalizeCategoryKey(cat);
      if (key && map[key] === undefined) map[key] = group;
    });
  });
  return map;
}

export function budgetYears(budgetList = []) {
  const years = (budgetList || []).map((b) => Number(b?.year)).filter(Number.isFinite);
  return Array.from(new Set(years)).sort((a, b) => b - a);
}

export function yearOptionsFor(metadataYears = [], currentYear) {
  const years = Array.from(new Set([Number(currentYear), ...metadataYears].filter(Number.isFinite)));
  years.sort((a, b) => b - a);
  return years.length ? years : [Number(currentYear)];
}

export function defaultYearFor({ budgetList = [], currentId, currentYear }) {
  const current = (budgetList || []).find((b) => b.id === currentId);
  if (Number.isFinite(Number(current?.year))) return Number(current.year);
  const years = budgetYears(budgetList);
  return years.length ? years[0] : Number(currentYear);
}

export function budgetMetaForYear({ budgetList = [], currentId, year }) {
  const target = Number(year);
  const list = budgetList || [];
  const current = list.find((b) => b.id === currentId);
  if (current && Number(current.year) === target) return current;
  return list.find((b) => Number(b?.year) === target) || null;
}

function toStartOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatCalendarDate(value) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
}

export function upcomingBillsForMonth(bills = [], year, monthIndex, today = new Date()) {
  const targetYear = Number(year);
  const targetMonth = Number(monthIndex);
  const startOfToday = toStartOfDay(today);

  const upcoming = (bills || [])
    .map((bill) => {
      const parsed = parseTransactionDate(bill?.nextDueDate);
      return parsed ? { ...bill, dueDate: toStartOfDay(parsed) } : null;
    })
    .filter((bill) => {
      if (!bill) return false;
      const due = bill.dueDate;
      return due.getFullYear() === targetYear
        && due.getMonth() === targetMonth
        && due.getTime() >= startOfToday.getTime();
    })
    .sort((a, b) => a.dueDate - b.dueDate)
    .map((bill) => ({
      id: bill.id,
      name: bill.name,
      amount: Number(bill.amount) || 0,
      billType: bill.billType,
      nextDueDate: bill.nextDueDate,
      dueDate: formatCalendarDate(bill.dueDate),
      daysUntil: Math.round((bill.dueDate - startOfToday) / (1000 * 60 * 60 * 24)),
    }));

  return {
    bills: upcoming,
    count: upcoming.length,
    total: upcoming.reduce((sum, bill) => sum + (bill.billType === 'income' ? 0 : bill.amount), 0),
    nearest: upcoming[0] || null,
  };
}

export function computeMonthOverview({
  categories = {},
  budget = {},
  transactions = [],
  bills = [],
  year,
  monthIndex,
  today = new Date(),
}) {
  const targetYear = Number(year);
  const targetMonth = Number(monthIndex);

  const monthTransactions = (transactions || []).filter((tx) => (
    transactionMatchesPeriod(tx, { year: targetYear, month: targetMonth })
  ));

  const actualForGroup = (group) => monthTransactions
    .filter((tx) => resolveTypeGroup(tx) === group)
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);

  const planForGroup = (group) => (categories[group] || []).reduce(
    (sum, cat) => sum + (Number(budget?.[group]?.[cat]?.[targetMonth]) || 0),
    0,
  );

  const incomeActual = actualForGroup('Income');
  const expenseActual = actualForGroup('Expenses');
  const incomePlan = planForGroup('Income');
  const expensePlan = planForGroup('Expenses');
  const savingsPlan = planForGroup('Savings');
  const debtPlan = planForGroup('Debt');
  const investmentsPlan = planForGroup('Investments');
  const plannedOutflows = expensePlan + savingsPlan + debtPlan + investmentsPlan;

  const upcoming = upcomingBillsForMonth(bills, targetYear, targetMonth, today);

  return {
    year: targetYear,
    monthIndex: targetMonth,
    incomeActual,
    incomePlan,
    incomePct: incomePlan > 0 ? Math.round((incomeActual / incomePlan) * 100) : null,
    expenseActual,
    expensePlan,
    expensePct: expensePlan > 0 ? Math.round((expenseActual / expensePlan) * 100) : null,
    expenseRemaining: expensePlan - expenseActual,
    savingsPlan,
    debtPlan,
    investmentsPlan,
    plannedOutflows,
    leftToAllocate: incomePlan - plannedOutflows,
    hasTransactions: monthTransactions.length > 0,
    transactionCount: monthTransactions.length,
    upcomingBills: upcoming.bills,
    upcomingCount: upcoming.count,
    upcomingTotal: upcoming.total,
    nearestBill: upcoming.nearest,
  };
}

export function suggestNextActions(overview = {}) {
  const actions = [];

  if (!overview.hasTransactions) {
    actions.push({
      id: 'log-transactions',
      label: 'Log this month’s transactions',
      hint: 'No transactions recorded for this month yet.',
      target: 'expenses',
    });
  }

  if (overview.upcomingCount > 0) {
    actions.push({
      id: 'review-bills',
      label: `Review ${overview.upcomingCount} upcoming bill${overview.upcomingCount !== 1 ? 's' : ''}`,
      hint: overview.nearestBill
        ? `${overview.nearestBill.name} is due ${overview.nearestBill.dueDate}`
        : undefined,
      target: 'bills',
    });
  }

  if (overview.expensePct != null && overview.expensePct > 100) {
    actions.push({
      id: 'review-spending',
      label: 'Spending is over plan this month',
      hint: `Actual spending is at ${overview.expensePct}% of the plan.`,
      target: 'monthly',
    });
  }

  if (Number.isFinite(overview.leftToAllocate) && overview.leftToAllocate < 0) {
    actions.push({
      id: 'rebalance-plan',
      label: 'This month is over-allocated',
      hint: 'Planned outflows exceed planned income.',
      target: 'annual',
    });
  }

  return actions;
}
