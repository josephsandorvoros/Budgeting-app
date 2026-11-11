import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeMonthOverview } from '../../src/components/UiShellBudgetSelection.js';

const here = path.dirname(fileURLToPath(import.meta.url));

test('computeMonthOverview counts Investments in planned outflows and leftToAllocate', () => {
  const overview = computeMonthOverview({
    categories: { Income: ['Salary'], Investments: ['Index Funds'] },
    budget: {
      Income: { Salary: Array(12).fill(1000) },
      Investments: { 'Index Funds': Array(12).fill(250) },
    },
    transactions: [],
    bills: [],
    year: 2026,
    monthIndex: 10,
  });

  assert.equal(overview.incomePlan, 1000);
  assert.equal(overview.investmentsPlan, 250);
  assert.equal(overview.plannedOutflows, 250);
  assert.equal(overview.leftToAllocate, 750);
});

test('computeMonthOverview without Investments keeps the historical result', () => {
  const overview = computeMonthOverview({
    categories: { Income: ['Salary'], Expenses: ['Rent'], Savings: ['Fund'], Debt: ['Loan'] },
    budget: {
      Income: { Salary: Array(12).fill(5000) },
      Expenses: { Rent: Array(12).fill(2000) },
      Savings: { Fund: Array(12).fill(500) },
      Debt: { Loan: Array(12).fill(300) },
    },
    transactions: [],
    bills: [],
    year: 2026,
    monthIndex: 10,
  });

  assert.equal(overview.investmentsPlan, 0);
  assert.equal(overview.plannedOutflows, 2800);
  assert.equal(overview.leftToAllocate, 2200);
});

test('Dashboard subtitle uses the shared planned-outflow total', () => {
  const dashboard = readFileSync(path.resolve(here, '../../src/pages/Dashboard.jsx'), 'utf8');
  assert.match(dashboard, /monthOverview\.plannedOutflows/);
  assert.doesNotMatch(dashboard, /monthOverview\.expensePlan \+ monthOverview\.savingsPlan \+ monthOverview\.debtPlan/);
});
