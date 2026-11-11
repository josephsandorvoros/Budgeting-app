export const GROUPS = ['Income', 'Expenses', 'Savings', 'Debt', 'Investments'];
export const TRANSACTION_TYPES = ['income', 'expense', 'savings', 'debt', 'transfer'];
export const GROUP_BY_TYPE = {
  income: 'Income',
  expense: 'Expenses',
  savings: 'Savings',
  debt: 'Debt',
};
export const OUTFLOW_TYPES = new Set(['expense', 'savings', 'debt']);

export function sortAlpha(values = []) {
  return [...values].sort((a, b) => String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' }));
}

export function normalizeTransactionType(value, fallback = 'expense') {
  const normalized = String(value || '').trim().toLowerCase();
  return TRANSACTION_TYPES.includes(normalized) ? normalized : fallback;
}

export function parseTransactionDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value || '').trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);
    const parsed = new Date(year, month, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month ||
      parsed.getDate() !== day
    ) return null;
    return parsed;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function transactionYear(value) {
  const date = parseTransactionDate(value?.date ?? value);
  return date ? date.getFullYear() : null;
}

export function transactionMatchesPeriod(transaction, { year, month } = {}) {
  const date = parseTransactionDate(transaction?.date);
  if (!date) return false;
  if (year !== undefined && year !== null && Number(year) !== date.getFullYear()) return false;
  if (month !== undefined && month !== null && Number(month) !== date.getMonth()) return false;
  return true;
}

export function applyPeriod(transactions = [], period, now = new Date()) {
  const yr = now.getFullYear();
  const mo = now.getMonth();
  switch (period) {
    case 'this-year':
      return transactions.filter((t) => transactionMatchesPeriod(t, { year: yr }));
    case 'this-month':
      return transactions.filter((t) => transactionMatchesPeriod(t, { year: yr, month: mo }));
    case 'last-month': {
      const lm = mo === 0 ? 11 : mo - 1;
      const ly = mo === 0 ? yr - 1 : yr;
      return transactions.filter((t) => transactionMatchesPeriod(t, { year: ly, month: lm }));
    }
    case 'last-3m': {
      const cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - 3);
      return transactions.filter((t) => {
        const date = parseTransactionDate(t?.date);
        return date ? date >= cutoff : false;
      });
    }
    case 'last-6m': {
      const cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - 6);
      return transactions.filter((t) => {
        const date = parseTransactionDate(t?.date);
        return date ? date >= cutoff : false;
      });
    }
    default:
      return transactions;
  }
}

export function getTransactionYears(transactions = []) {
  const years = new Set();
  transactions.forEach((transaction) => {
    const year = transactionYear(transaction);
    if (year !== null) years.add(year);
  });
  return Array.from(years).sort((a, b) => b - a);
}

export function sumTransactionAmounts(transactions = []) {
  return transactions.reduce((sum, transaction) => sum + (Number(transaction?.amount) || 0), 0);
}

export function groupForCategory(category, categories = {}) {
  for (const group of GROUPS) {
    if ((categories[group] || []).includes(category)) return group;
  }
  return null;
}

export function categoriesForType(type, categories = {}, fallbackGroup) {
  const normalized = String(type || '').trim().toLowerCase();
  if (normalized === 'transfer') return [];
  const group = GROUP_BY_TYPE[normalized] || (GROUPS.includes(fallbackGroup) ? fallbackGroup : 'Expenses');
  return sortAlpha(categories[group] || []);
}

export function categoryOptionsForTransaction({ type, group, category, categories = {} }) {
  const normalized = String(type || '').trim().toLowerCase();
  if (normalized === 'transfer') return [];
  const targetGroup = GROUP_BY_TYPE[normalized] || (GROUPS.includes(group) ? group : 'Expenses');
  const options = sortAlpha(categories[targetGroup] || []);
  if (category && category !== 'Transfer' && !options.includes(category)) {
    options.push(category);
    options.sort((a, b) => String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' }));
  }
  return options;
}

export function groupedCategoryOptions(categories = {}) {
  return GROUPS
    .map((group) => ({ group, items: sortAlpha(categories[group] || []) }))
    .filter((entry) => entry.items.length > 0);
}

export function syncTransactionClassification({ type, group, category, categories = {} }) {
  const rawType = String(type || '').trim().toLowerCase();
  if (rawType === 'transfer') {
    return { type: 'transfer', group: '', category: 'Transfer' };
  }

  const knownType = TRANSACTION_TYPES.includes(rawType) ? rawType : null;
  if (!knownType && GROUPS.includes(group)) {
    return {
      type: rawType || 'expense',
      group,
      category: category || (categories[group] || [])[0] || '',
    };
  }

  const targetGroup = GROUP_BY_TYPE[knownType] || 'Expenses';
  const targetCategories = categories[targetGroup] || [];
  const nextCategory = category && targetCategories.includes(category)
    ? category
    : (targetCategories[0] || category || '');

  return {
    type: knownType || rawType || 'expense',
    group: targetGroup,
    category: nextCategory,
  };
}

export function applyTransactionType(form, nextType, categories = {}) {
  const classified = syncTransactionClassification({
    type: nextType,
    group: form?.group,
    category: form?.category,
    categories,
  });
  const next = { ...form, ...classified };
  if (nextType === 'transfer') next.is_subscription = false;
  return next;
}

export function applyTransactionCategory(form, nextCategory, categories = {}) {
  const classified = syncTransactionClassification({
    type: form?.type,
    group: form?.group,
    category: nextCategory,
    categories,
  });
  return { ...form, ...classified };
}

export function getTransactionsEmptyState({ totalCount = 0, filteredCount = 0, hasActiveFilters = false } = {}) {
  if (totalCount <= 0) {
    return {
      kind: 'no-transactions',
      message: 'No transactions yet. Add your first transaction or import a CSV to get started.',
      action: 'add',
    };
  }
  if (filteredCount <= 0) {
    return {
      kind: 'no-matches',
      message: hasActiveFilters
        ? 'No transactions match your filters.'
        : 'No transactions to show right now.',
      action: hasActiveFilters ? 'clear-filters' : 'add',
    };
  }
  return { kind: 'has-results', message: '', action: null };
}
