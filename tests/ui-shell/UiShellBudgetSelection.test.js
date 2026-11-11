import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  budgetYears,
  yearOptionsFor,
  defaultYearFor,
  budgetMetaForYear,
  normalizeGroupName,
  resolveTypeGroup,
  resolveCategoryGroup,
  buildCategoryGroupIndex,
  computeMonthOverview,
  upcomingBillsForMonth,
  suggestNextActions,
} from '../../src/components/UiShellBudgetSelection.js';

const FIXTURE_CATEGORIES = {
  Income: ['Salary'],
  Expenses: ['Rent'],
  Savings: ['Fund'],
  Debt: ['Loan'],
};

const FIXTURE_BUDGET = {
  Income: { Salary: Array(12).fill(5000) },
  Expenses: { Rent: Array(12).fill(2000) },
  Savings: { Fund: Array(12).fill(500) },
  Debt: { Loan: Array(12).fill(300) },
};

const FIXTURE_TRANSACTIONS = [
  { id: 't1', date: '2026-11-03', type: 'income', category: 'Salary', amount: 2600 },
  { id: 't2', date: '2026-11-08', type: 'expense', category: 'Rent', amount: 1200 },
  { id: 't3', date: '2026-10-31', type: 'income', category: 'Salary', amount: 999 },
  { id: 't4', date: '2026-11-14', type: 'savings', category: 'Fund', amount: 200 },
];

test('budgetYears collects unique metadata years newest first', () => {
  const list = [
    { id: 'b1', year: 2025 },
    { id: 'b2', year: 2026 },
    { id: 'b3', year: 2025 },
    { id: 'b4', year: undefined },
  ];
  assert.deepEqual(budgetYears(list), [2026, 2025]);
  assert.deepEqual(budgetYears([]), []);
});

test('yearOptionsFor merges metadata years with the current year, newest first', () => {
  assert.deepEqual(yearOptionsFor([2025, 2026, 2025], 2026), [2026, 2025]);
  assert.deepEqual(yearOptionsFor([], 2026), [2026]);
  assert.deepEqual(yearOptionsFor([2027], 2026), [2027, 2026]);
});

test('defaultYearFor prefers the current budget metadata year, falling back to newest then current year', () => {
  const list = [
    { id: 'b1', year: 2025 },
    { id: 'b2', year: 2027 },
  ];
  assert.equal(defaultYearFor({ budgetList: list, currentId: 'b1', currentYear: 2026 }), 2025);
  assert.equal(defaultYearFor({ budgetList: list, currentId: 'missing', currentYear: 2026 }), 2027);
  assert.equal(defaultYearFor({ budgetList: [], currentId: null, currentYear: 2026 }), 2026);
});

test('budgetMetaForYear matches budgets by metadata year and prefers the current budget', () => {
  const list = [
    { id: 'b1', name: 'Plan A', year: 2025, type: 'personal' },
    { id: 'b2', name: 'Plan B', year: 2026, type: 'personal' },
  ];
  assert.equal(budgetMetaForYear({ budgetList: list, currentId: 'b1', year: 2025 }).id, 'b1');
  assert.equal(budgetMetaForYear({ budgetList: list, currentId: 'b1', year: 2026 }).id, 'b2');
  assert.equal(budgetMetaForYear({ budgetList: list, currentId: 'b1', year: 2030 }), null);
});

test('budgetMetaForYear retains zero-transaction budgets for their planned year', () => {
  const list = [
    { id: 'b-future', name: 'Next Year Plan', year: 2027, type: 'personal' },
  ];
  const meta = budgetMetaForYear({ budgetList: list, currentId: 'b-future', year: 2027 });
  assert.equal(meta.id, 'b-future');
  assert.equal(meta.year, 2027);
});

test('normalizeGroupName maps aliases and rejects unknown groups', () => {
  assert.equal(normalizeGroupName('Income'), 'Income');
  assert.equal(normalizeGroupName('in'), 'Income');
  assert.equal(normalizeGroupName('expense'), 'Expenses');
  assert.equal(normalizeGroupName('out'), 'Expenses');
  assert.equal(normalizeGroupName('saving'), 'Savings');
  assert.equal(normalizeGroupName('investment'), 'Investments');
  assert.equal(normalizeGroupName('debt'), 'Debt');
  assert.equal(normalizeGroupName('transfer'), null);
  assert.equal(normalizeGroupName('transfers'), null);
  assert.equal(normalizeGroupName(''), undefined);
  assert.equal(normalizeGroupName('weird'), undefined);
});

test('resolveTypeGroup follows transaction type first, then explicit group', () => {
  assert.equal(resolveTypeGroup({ type: 'income' }), 'Income');
  assert.equal(resolveTypeGroup({ type: 'expense' }), 'Expenses');
  assert.equal(resolveTypeGroup({ type: 'transfer' }), null);
  assert.equal(resolveTypeGroup({ type: 'savings' }), 'Savings');
  assert.equal(resolveTypeGroup({ group: 'debt' }), 'Debt');
  assert.equal(resolveTypeGroup({ group_name: 'investments' }), 'Investments');
  assert.equal(resolveTypeGroup({}), undefined);
});

test('resolveCategoryGroup prefers the configured category index', () => {
  const index = buildCategoryGroupIndex(FIXTURE_CATEGORIES, ['Income', 'Expenses', 'Debt', 'Savings', 'Investments']);
  assert.equal(resolveCategoryGroup({ category: 'Rent', type: 'expense' }, index), 'Expenses');
  assert.equal(resolveCategoryGroup({ category: 'salary', type: 'savings' }, index), 'Income');
  assert.equal(resolveCategoryGroup({ category: 'Fund', type: 'expense' }, index), 'Savings');
  assert.equal(resolveCategoryGroup({ type: 'income' }, index), undefined);
  assert.equal(resolveCategoryGroup({ type: 'transfer' }, index), undefined);
  assert.equal(resolveCategoryGroup({ category: 'Unknown Cat', type: 'expense' }, index), undefined);
  assert.equal(resolveCategoryGroup({ group: 'debt' }, index), 'Debt');
});

test('computeMonthOverview summarizes a single month with planned values retained', () => {
  const overview = computeMonthOverview({
    categories: FIXTURE_CATEGORIES,
    budget: FIXTURE_BUDGET,
    transactions: FIXTURE_TRANSACTIONS,
    bills: [],
    year: 2026,
    monthIndex: 10,
  });

  assert.equal(overview.incomeActual, 2600);
  assert.equal(overview.incomePlan, 5000);
  assert.equal(overview.incomePct, 52);
  assert.equal(overview.expenseActual, 1200);
  assert.equal(overview.expensePlan, 2000);
  assert.equal(overview.expensePct, 60);
  assert.equal(overview.expenseRemaining, 800);
  assert.equal(overview.savingsPlan, 500);
  assert.equal(overview.debtPlan, 300);
  assert.equal(overview.leftToAllocate, 5000 - 2000 - 500 - 300);
  assert.equal(overview.hasTransactions, true);
});

test('computeMonthOverview keeps planned values for months without transactions', () => {
  const overview = computeMonthOverview({
    categories: FIXTURE_CATEGORIES,
    budget: FIXTURE_BUDGET,
    transactions: [],
    bills: [],
    year: 2026,
    monthIndex: 3,
  });

  assert.equal(overview.hasTransactions, false);
  assert.equal(overview.incomeActual, 0);
  assert.equal(overview.incomePlan, 5000);
  assert.equal(overview.expensePlan, 2000);
  assert.equal(overview.leftToAllocate, 2200);
});

test('computeMonthOverview reports null percentages instead of zero-goal status', () => {
  const overview = computeMonthOverview({
    categories: { Income: ['Salary'], Expenses: ['Rent'] },
    budget: { Income: { Salary: Array(12).fill(0) }, Expenses: { Rent: Array(12).fill(0) } },
    transactions: [],
    bills: [],
    year: 2026,
    monthIndex: 5,
  });

  assert.equal(overview.incomePlan, 0);
  assert.equal(overview.incomePct, null);
  assert.equal(overview.expensePct, null);
  assert.equal(overview.leftToAllocate, 0);
});

test('upcomingBillsForMonth lists only bills due in the selected month that are not in the past', () => {
  const bills = [
    { id: 'bill1', name: 'Internet', amount: 80, billType: 'expense', nextDueDate: '2026-11-15' },
    { id: 'bill2', name: 'Phone', amount: 65, billType: 'expense', nextDueDate: '2026-11-01' },
    { id: 'bill3', name: 'Insurance', amount: 175, billType: 'expense', nextDueDate: '2026-12-01' },
    { id: 'bill4', name: 'Paycheck', amount: 4987, billType: 'income', nextDueDate: '2026-11-20' },
    { id: 'bill5', name: 'Broken', amount: 10, billType: 'expense', nextDueDate: 'not-a-date' },
  ];
  const today = new Date(2026, 10, 10);

  const result = upcomingBillsForMonth(bills, 2026, 10, today);
  assert.deepEqual(result.bills.map((b) => b.id), ['bill1', 'bill4']);
  assert.equal(result.count, 2);
  assert.equal(result.total, 80);
  assert.equal(result.nearest.id, 'bill1');
  assert.equal(result.nearest.daysUntil, 5);
  assert.equal(result.nearest.name, 'Internet');
});

test('upcomingBillsForMonth includes every bill of a future month', () => {
  const bills = [
    { id: 'bill3', name: 'Insurance', amount: 175, billType: 'expense', nextDueDate: '2026-12-01' },
    { id: 'bill6', name: 'Rent', amount: 1500, billType: 'expense', nextDueDate: '2026-12-05' },
    { id: 'bill2', name: 'Phone', amount: 65, billType: 'expense', nextDueDate: '2026-11-01' },
  ];
  const today = new Date(2026, 10, 10);
  const result = upcomingBillsForMonth(bills, 2026, 11, today);
  assert.deepEqual(result.bills.map((b) => b.id), ['bill3', 'bill6']);
});

test('suggestNextActions proposes logging transactions when the month is empty', () => {
  const actions = suggestNextActions({ hasTransactions: false, upcomingCount: 0, expensePct: null, leftToAllocate: 0 });
  assert.equal(actions.length, 1);
  assert.equal(actions[0].id, 'log-transactions');
  assert.equal(actions[0].target, 'expenses');
});

test('suggestNextActions proposes bill review when bills are due', () => {
  const actions = suggestNextActions({
    hasTransactions: true,
    upcomingCount: 2,
    nearestBill: { name: 'Internet', dueDate: '2026-11-15' },
    expensePct: 40,
    leftToAllocate: 500,
  });
  assert.equal(actions.length, 1);
  assert.equal(actions[0].id, 'review-bills');
  assert.equal(actions[0].target, 'bills');
  assert.match(actions[0].label, /2/);
});

test('suggestNextActions flags overspending and over-allocation', () => {
  const over = suggestNextActions({ hasTransactions: true, upcomingCount: 0, expensePct: 130, leftToAllocate: 200 });
  assert.deepEqual(over.map((a) => a.id), ['review-spending']);

  const overAllocated = suggestNextActions({ hasTransactions: true, upcomingCount: 0, expensePct: 40, leftToAllocate: -120 });
  assert.deepEqual(overAllocated.map((a) => a.id), ['rebalance-plan']);

  const calm = suggestNextActions({ hasTransactions: true, upcomingCount: 0, expensePct: 40, leftToAllocate: 500 });
  assert.deepEqual(calm, []);
});
