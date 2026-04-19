import { Fragment, useEffect, useState, useMemo } from 'react';
import { MONTHS } from '../data/defaults.js';

const fmt = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const GROUPS = ['Income', 'Expenses', 'Savings', 'Debt'];

export default function AnnualBudget({ data, allBudgets = {}, updateBudget, budgetList = [], currentId, onSwitchBudget }) {
  const currentYear = new Date().getFullYear();
  const [editing, setEditing] = useState(null); // { group, cat, mi, rowId }
  const [editVal, setEditVal] = useState('');

  const currentBudget = useMemo(
    () => budgetList.find((b) => b.id === currentId),
    [budgetList, currentId]
  );
  const currentType = currentBudget?.type || 'personal';

  const sameTypeBudgets = useMemo(
    () => Object.entries(allBudgets || {}).filter(([, budgetData]) => (budgetData?.type || 'personal') === currentType),
    [allBudgets, currentType]
  );

  const yearsWithData = useMemo(() => {
    const years = sameTypeBudgets.flatMap(([, budgetData]) =>
      (budgetData?.transactions || [])
        .map((t) => new Date(t.date).getFullYear())
        .filter(Number.isFinite)
    );
    return Array.from(new Set(years)).sort((a, b) => b - a);
  }, [sameTypeBudgets]);

  const defaultYear = yearsWithData[0] || currentYear;
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  useEffect(() => {
    setSelectedYear(defaultYear);
  }, [defaultYear]);

  const yearOptions = useMemo(() => {
    const years = Array.from(new Set([currentYear, ...yearsWithData]));
    years.sort((a, b) => b - a);
    return years.length ? years : [selectedYear];
  }, [yearsWithData, selectedYear, currentYear]);

  const handleYearChange = (nextYear) => {
    const y = Number(nextYear);
    setSelectedYear(y);
    const target = sameTypeBudgets
      .find(([, budgetData]) => (budgetData?.transactions || []).some((t) => new Date(t.date).getFullYear() === y))?.[0];
    if (target && target !== currentId) onSwitchBudget(target);
  };

  const activeBudgetMeta = useMemo(() => {
    if ((data.transactions || []).some((t) => new Date(t.date).getFullYear() === Number(selectedYear))) return currentBudget;
    const match = sameTypeBudgets
      .find(([, budgetData]) => (budgetData?.transactions || []).some((t) => new Date(t.date).getFullYear() === Number(selectedYear)));
    if (!match) return null;
    return budgetList.find((b) => b.id === match[0]) || null;
  }, [data.transactions, currentBudget, sameTypeBudgets, selectedYear, budgetList]);

  const emptyData = useMemo(() => {
    const sourceCategories = data.categories || {};
    const zeroBudget = {};
    Object.entries(sourceCategories).forEach(([group, items]) => {
      zeroBudget[group] = {};
      (items || []).forEach((cat) => {
        zeroBudget[group][cat] = Array(12).fill(0);
      });
    });
    return { categories: sourceCategories, budget: zeroBudget };
  }, [data.categories]);

  const effectiveData = useMemo(() => {
    if (activeBudgetMeta && activeBudgetMeta.id === currentId) return data;
    return (activeBudgetMeta && allBudgets[activeBudgetMeta.id]) || emptyData;
  }, [activeBudgetMeta, currentId, data, allBudgets, emptyData]);

  const { budget, categories } = effectiveData;
  const canEdit = activeBudgetMeta?.id === currentId;

  const monthlyTotals = useMemo(() => {
    return MONTHS.map((_, mi) => {
      const income   = Object.values(budget.Income   || {}).reduce((s, a) => s + (a[mi] || 0), 0);
      const expenses = Object.values(budget.Expenses || {}).reduce((s, a) => s + (a[mi] || 0), 0);
      const savings  = Object.values(budget.Savings  || {}).reduce((s, a) => s + (a[mi] || 0), 0);
      const debt     = Object.values(budget.Debt     || {}).reduce((s, a) => s + (a[mi] || 0), 0);
      return { income, expenses, savings, debt, left: income - expenses - savings - debt };
    });
  }, [budget]);

  const annualTotal = (group, cat) =>
    (budget[group]?.[cat] || []).reduce((s, v) => s + v, 0);

  const groupAnnual = (group) =>
    Object.values(budget[group] || {}).reduce((s, arr) => s + arr.reduce((a, b) => a + b, 0), 0);

  const startEdit = (group, cat, mi, val, rowId) => {
    setEditing({ group, cat, mi, rowId });
    setEditVal(String(val));
  };

  const commitEdit = () => {
    if (!editing || !canEdit) return;
    const cleaned = String(editVal).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned) || 0;
    updateBudget(editing.group, editing.cat, editing.mi, num);
    setEditing(null);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(null);
  };

  const leftAnnual = MONTHS.reduce((s, _, mi) => s + monthlyTotals[mi].left, 0);

  return (
    <div className="page">
      <div className="page-heading">
        <div className="page-heading-left">
          <h1>Annual Budget</h1>
          <span className="page-heading-sub">{selectedYear}</span>
        </div>
        <div className="month-selector">
          <select value={selectedYear} onChange={(e) => handleYearChange(e.target.value)}>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <p className="subtitle">
        {canEdit ? 'Click any cell to edit. Changes are saved automatically.' : `No ${currentType} budget exists for ${selectedYear}. Showing an empty annual view.`}
      </p>

      <div className="table-wrapper">
        <table className="data-table budget-table">
          <thead>
            <tr>
              <th className="cat-col">Category</th>
              {MONTHS.map(m => <th key={m}>{m}</th>)}
              <th>Annual</th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.map(group => (
              <Fragment key={group}>
                <tr className="group-header">
                  <td colSpan={14}>{group}</td>
                </tr>
                {Array.from(new Set(categories[group] || [])).map((cat, ci) => {
                  const rowId = `${group}:${cat}:${ci}`;
                  return (
                  <tr key={rowId}>
                    <td className="cat-name">{cat}</td>
                    {MONTHS.map((_, mi) => {
                      const val = budget[group]?.[cat]?.[mi] ?? 0;
                      const isEditing = editing?.rowId === rowId && editing?.mi === mi;
                      return (
                        <td key={mi} className={`editable-cell${canEdit ? '' : ' editable-cell-disabled'}`}>
                          {isEditing ? (
                            <input
                              className="cell-input"
                              autoFocus
                              value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={handleKey}
                            />
                          ) : (
                            <button
                              type="button"
                              className="cell-display-btn"
                              disabled={!canEdit}
                              onClick={() => startEdit(group, cat, mi, val, rowId)}
                            >
                              {fmt(val)}
                            </button>
                          )}
                        </td>
                      );
                    })}
                    <td className="annual-total">{fmt(annualTotal(group, cat))}</td>
                  </tr>
                )})}
                <tr key={`${group}-total`} className="group-total">
                  <td>Total {group}</td>
                  {MONTHS.map((_, mi) => (
                    <td key={mi}>
                      {fmt(Object.values(budget[group] || {}).reduce((s, a) => s + (a[mi] || 0), 0))}
                    </td>
                  ))}
                  <td>{fmt(groupAnnual(group))}</td>
                </tr>
              </Fragment>
            ))}

            {/* Left to Allocate row */}
            <tr className="left-row">
              <td>Left to Allocate</td>
              {MONTHS.map((_, mi) => (
                <td key={mi} className={monthlyTotals[mi].left >= 0 ? 'accent' : 'danger'}>
                  {fmt(monthlyTotals[mi].left)}
                </td>
              ))}
              <td className={leftAnnual >= 0 ? 'accent' : 'danger'}>{fmt(leftAnnual)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
