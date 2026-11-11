import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPeriod,
  applyTransactionCategory,
  applyTransactionType,
  getTransactionsEmptyState,
  getTransactionYears,
  sumTransactionAmounts,
  syncTransactionClassification,
  transactionMatchesPeriod,
} from '../../src/utils/transactions.js';

const now = new Date(2026, 0, 15, 12, 0, 0);
const txs = [
  { id: 'jan', date: '2026-01-05', amount: 100, category: 'Groceries', group: 'Expenses', type: 'expense' },
  { id: 'dec', date: '2025-12-20', amount: -10, category: 'Dining Out', group: 'Expenses', type: 'expense' },
  { id: 'nov', date: '2025-11-02', amount: 0, category: 'Fuel & Auto', group: 'Expenses', type: 'expense' },
  { id: 'jul', date: '2025-07-02', amount: 50, category: 'Groceries', group: 'Expenses', type: 'expense' },
  { id: 'bad', date: 'not-a-date', amount: 7, category: 'Miscellaneous', group: 'Expenses', type: 'expense' },
];

test('filters transactions by injectable current date for every period', () => {
  assert.deepEqual(applyPeriod(txs, 'this-month', now).map(t => t.id), ['jan']);
  assert.deepEqual(applyPeriod(txs, 'this-year', now).map(t => t.id), ['jan']);
  assert.deepEqual(applyPeriod(txs, 'last-month', now).map(t => t.id), ['dec']);
  assert.deepEqual(applyPeriod(txs, 'last-3m', now).map(t => t.id), ['jan', 'dec', 'nov']);
  assert.deepEqual(applyPeriod(txs, 'last-6m', now).map(t => t.id), ['jan', 'dec', 'nov']);
  assert.equal(applyPeriod(txs, 'all', now).length, txs.length);
});

test('handles January last-month rollover and explicit year/month matching', () => {
  const january = new Date(2026, 0, 15, 12, 0, 0);
  assert.deepEqual(applyPeriod(txs, 'last-month', january).map(t => t.id), ['dec']);
  assert.equal(transactionMatchesPeriod(txs[0], { year: 2026, month: 0 }), true);
  assert.equal(transactionMatchesPeriod(txs[0], { year: 2026, month: 1 }), false);
  assert.equal(transactionMatchesPeriod(txs[4], { year: 2026 }), false);
});

test('extracts transaction years and ignores invalid dates', () => {
  assert.deepEqual(getTransactionYears(txs), [2026, 2025]);
});

test('sums zero and negative transaction amounts without normalizing them away', () => {
  assert.equal(sumTransactionAmounts(txs), 147);
  assert.equal(sumTransactionAmounts([{ amount: 0 }, { amount: -42.5 }, { amount: '2.5' }]), -40);
  assert.equal(sumTransactionAmounts([]), 0);
});

test('one user-facing type synchronizes compatible group and category', () => {
  const categories = {
    Income: ['Primary Salary'],
    Expenses: ['Groceries', 'Dining Out'],
    Savings: ['Emergency Fund'],
    Investments: ['Index Funds'],
    Debt: ['Auto Loan'],
  };
  const form = { type: 'expense', group: 'Expenses', category: 'Groceries', notes: 'keep me' };
  assert.deepEqual(syncTransactionClassification({ ...form, type: 'income', categories }), {
    type: 'income', group: 'Income', category: 'Primary Salary',
  });
  const changedCategory = applyTransactionCategory({ ...form, type: 'income', group: 'Income', category: 'Primary Salary' }, 'Emergency Fund', categories);
  assert.equal(changedCategory.type, 'income');
  assert.equal(changedCategory.group, 'Income');
  assert.equal(changedCategory.category, 'Primary Salary');
});

test('transfer type preserves account ids and never forces a category', () => {
  const form = {
    type: 'expense', group: 'Expenses', category: 'Groceries',
    fromAccountId: 'acc1', toAccountId: 'acc2', is_subscription: true,
  };
  const transfer = applyTransactionType(form, 'transfer', { Expenses: ['Groceries'] });
  assert.equal(transfer.type, 'transfer');
  assert.equal(transfer.group, '');
  assert.equal(transfer.category, 'Transfer');
  assert.equal(transfer.fromAccountId, 'acc1');
  assert.equal(transfer.toAccountId, 'acc2');
  assert.equal(transfer.is_subscription, false);
});

test('unknown imported transaction types keep their compatible group and category when edited', () => {
  const categories = { Investments: ['Index Funds'], Expenses: ['Groceries'] };
  const result = syncTransactionClassification({
    type: 'investment', group: 'Investments', category: 'Index Funds', categories,
  });
  assert.deepEqual(result, { type: 'investment', group: 'Investments', category: 'Index Funds' });
});

test('empty-state helper distinguishes no transactions at all from no filter matches', () => {
  assert.equal(getTransactionsEmptyState({ totalCount: 0, filteredCount: 0, hasActiveFilters: false }).kind, 'no-transactions');
  assert.equal(getTransactionsEmptyState({ totalCount: 5, filteredCount: 0, hasActiveFilters: true }).kind, 'no-matches');
  assert.equal(getTransactionsEmptyState({ totalCount: 5, filteredCount: 0, hasActiveFilters: false }).kind, 'no-matches');
  assert.equal(getTransactionsEmptyState({ totalCount: 0, filteredCount: 0, hasActiveFilters: true }).kind, 'no-transactions');
});
