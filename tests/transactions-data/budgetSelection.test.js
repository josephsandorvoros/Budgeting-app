import test from 'node:test';
import assert from 'node:assert/strict';
import {
  budgetType,
  budgetYear,
  getBudgetYears,
  selectBudgetForPeriod,
} from '../../src/utils/budgetSelection.js';

const personal2025 = {
  name: 'Personal 2025', year: 2025, type: 'personal',
  budget: { Expenses: { Groceries: Array(12).fill(0) } },
  transactions: [{ id: 'old', date: '2025-03-04', category: 'Groceries', amount: 0 }],
};
const personal2026 = {
  name: 'Personal 2026', year: 2026, type: 'personal',
  budget: { Expenses: { Groceries: Array(12).fill(400) } },
  transactions: [{ id: 'cur', date: '2026-02-01', category: 'Groceries', amount: -25 }],
};
const business2026 = {
  name: 'Business 2026', year: 2026, type: 'business',
  budget: { Expenses: { Software: Array(12).fill(50) } },
  transactions: [],
};
const planned2027 = {
  name: 'Planned 2027', year: '2027', type: 'personal',
  budget: { Expenses: { Groceries: Array(12).fill(0) } },
  transactions: [],
};
const budgets = {
  p25: personal2025,
  p26: personal2026,
  b26: business2026,
  p27: planned2027,
};

test('normalizes budget type and year from the inspected schema', () => {
  assert.equal(budgetType(personal2026), 'personal');
  assert.equal(budgetType({ type: 'business' }), 'business');
  assert.equal(budgetType(undefined), 'personal');
  assert.equal(budgetYear(personal2026), 2026);
  assert.equal(budgetYear(planned2027), 2027);
  assert.equal(budgetYear({ year: 'not-a-year' }), null);
});

test('prefers the explicit current budget when its year and type match', () => {
  const selected = selectBudgetForPeriod({ budgets, currentId: 'p26', year: 2026, type: 'personal' });
  assert.equal(selected.id, 'p26');
  assert.equal(selected.budget, personal2026);
  assert.equal(selected.source, 'current');
});

test('selects a same-type budget by explicit budget year even with zero transactions', () => {
  const selected = selectBudgetForPeriod({ budgets, currentId: 'p26', year: 2027, type: 'personal' });
  assert.equal(selected.id, 'p27');
  assert.equal(selected.source, 'year');
  assert.deepEqual(selected.budget.transactions, []);
});

test('switches across multiple personal budgets by year without relying on transactions', () => {
  const selected = selectBudgetForPeriod({ budgets, currentId: 'p26', year: '2025', type: 'personal' });
  assert.equal(selected.id, 'p25');
});

test('keeps personal and business budgets isolated by type', () => {
  const selected = selectBudgetForPeriod({ budgets, currentId: 'p26', year: 2026, type: 'business' });
  assert.equal(selected.id, 'b26');
  assert.equal(selected.budget, business2026);
});

test('falls back to a year match when currentId is absent or stale', () => {
  assert.equal(selectBudgetForPeriod({ budgets, currentId: null, year: 2026, type: 'personal' }).id, 'p26');
  assert.equal(selectBudgetForPeriod({ budgets, currentId: 'missing', year: 2025, type: 'personal' }).id, 'p25');
});

test('returns null only when no same-type budget exists for the requested year', () => {
  assert.equal(selectBudgetForPeriod({ budgets, currentId: 'p26', year: 2030, type: 'personal' }), null);
  assert.equal(selectBudgetForPeriod({ budgets: {}, currentId: null, year: 2026, type: 'personal' }), null);
});

test('uses current budget when no year is requested', () => {
  const selected = selectBudgetForPeriod({ budgets, currentId: 'b26', type: 'business' });
  assert.equal(selected.id, 'b26');
  assert.equal(selected.source, 'current');
});

test('lists years from explicit budget years, transaction dates, and the current year', () => {
  const years = getBudgetYears({ budgets, type: 'personal', now: new Date(2026, 10, 10) });
  assert.deepEqual(years, [2027, 2026, 2025]);
  const onlyBudgets = getBudgetYears({ budgets, type: 'personal', now: new Date(2030, 0, 1), includeCurrentYear: false });
  assert.deepEqual(onlyBudgets, [2027, 2026, 2025]);
});
