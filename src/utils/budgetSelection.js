import { getTransactionYears } from './transactions.js';

export function budgetType(budget) {
  return budget?.type === 'business' ? 'business' : 'personal';
}

export function budgetYear(budget) {
  const value = Number(budget?.year);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function budgetEntries(budgets) {
  if (!budgets || typeof budgets !== 'object') return [];
  if (Array.isArray(budgets)) {
    return budgets.filter((budget) => budget && typeof budget === 'object').map((budget) => [budget.id, budget]);
  }
  return Object.entries(budgets).filter(([, budget]) => budget && typeof budget === 'object');
}

function selection(id, budget, type, source) {
  return {
    id,
    budget,
    type,
    year: budgetYear(budget),
    source,
  };
}

export function selectBudgetForPeriod({ budgets, currentId, year, type } = {}) {
  const entries = budgetEntries(budgets);
  if (!entries.length) return null;

  const currentEntry = entries.find(([id]) => id === currentId);
  const targetType = type || (currentEntry ? budgetType(currentEntry[1]) : 'personal');
  const sameType = entries.filter(([, budget]) => budgetType(budget) === targetType);
  if (!sameType.length) return null;

  const targetYear = Number(year);
  const hasYear = Number.isFinite(targetYear) && targetYear > 0;
  const current = sameType.find(([id]) => id === currentId);

  if (current) {
    const currentYear = budgetYear(current[1]);
    if (!hasYear || currentYear === targetYear) {
      return selection(current[0], current[1], targetType, 'current');
    }
  }

  if (hasYear) {
    const yearMatch = sameType.find(([, budget]) => budgetYear(budget) === targetYear);
    if (yearMatch) return selection(yearMatch[0], yearMatch[1], targetType, 'year');
    return null;
  }

  const fallback = sameType[0];
  return selection(fallback[0], fallback[1], targetType, 'fallback');
}

export function getBudgetYears({ budgets, currentId, type, now = new Date(), includeCurrentYear = true } = {}) {
  const entries = budgetEntries(budgets);
  const currentEntry = entries.find(([id]) => id === currentId);
  const targetType = type || (currentEntry ? budgetType(currentEntry[1]) : 'personal');
  const years = new Set();

  entries.forEach(([, budget]) => {
    if (budgetType(budget) !== targetType) return;
    const year = budgetYear(budget);
    if (year !== null) years.add(year);
    getTransactionYears(budget.transactions || []).forEach((transactionYear) => years.add(transactionYear));
  });

  if (includeCurrentYear) {
    const currentYear = now instanceof Date && !Number.isNaN(now.getTime())
      ? now.getFullYear()
      : new Date().getFullYear();
    years.add(currentYear);
  }

  return Array.from(years).sort((a, b) => b - a);
}
