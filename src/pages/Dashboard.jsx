import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { MONTHS, CATEGORY_META } from '../data/defaults.js';
import UiShellIcon from '../components/UiShellIcon.jsx';
import {
  DASHBOARD_GROUPS,
  buildCategoryGroupIndex,
  resolveTypeGroup,
  resolveCategoryGroup,
  budgetYears,
  yearOptionsFor,
  defaultYearFor,
  budgetMetaForYear,
  computeMonthOverview,
  suggestNextActions,
} from '../components/UiShellBudgetSelection.js';

const SECTIONS = [
  { group: 'Income',      cssClass: 'income',      label: 'INCOME',      accent: '#4ade80', displayLabel: 'Total Income',      overLabel: 'income' },
  { group: 'Savings',     cssClass: 'savings',     label: 'SAVINGS',     accent: '#eab308', displayLabel: 'Total Savings',     overLabel: 'goal' },
  { group: 'Investments', cssClass: 'investments', label: 'INVESTMENTS', accent: '#06b6d4', displayLabel: 'Total Invested',    overLabel: 'goal' },
  { group: 'Expenses',    cssClass: 'expenses',    label: 'EXPENSES',    accent: '#ec4899', displayLabel: 'Total Expenses',    overLabel: 'budget' },
  { group: 'Debt',        cssClass: 'debt',        label: 'DEBT PAYOFF', accent: '#a855f7', displayLabel: 'Total Debt Payoff', overLabel: 'goal' },
];

const fmt = (n) =>
  `$${Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtShort = (v) => {
  const n = Math.abs(Number(v));
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
};
const normalizeAmount = (v) => Math.abs(Number(v) || 0);

const CHART_COLORS = ['#4ade80','#ec4899','#a855f7','#eab308','#60a5fa','#f97316','#34d399','#f43f5e','#818cf8','#fb923c'];

export default function Dashboard({ data, allBudgets = {}, budgetList = [], currentId, onSwitchBudget, setPage, setInitialMonth }) {
  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth();

  const currentBudget = useMemo(
    () => budgetList.find((b) => b.id === currentId),
    [budgetList, currentId]
  );
  const currentType = currentBudget?.type || 'personal';
  const sameTypeBudgetList = useMemo(
    () => (budgetList || []).filter((b) => (b?.type || 'personal') === currentType),
    [budgetList, currentType]
  );

  const metadataYears = useMemo(() => budgetYears(sameTypeBudgetList), [sameTypeBudgetList]);

  const fallbackYear = useMemo(
    () => defaultYearFor({ budgetList: sameTypeBudgetList, currentId, currentYear }),
    [sameTypeBudgetList, currentId, currentYear]
  );
  const [selectedYear, setSelectedYear] = useState(fallbackYear);

  const yearOptions = useMemo(
    () => yearOptionsFor(metadataYears, currentYear),
    [metadataYears, currentYear]
  );

  const selectedYearValue = yearOptions.includes(selectedYear) ? selectedYear : fallbackYear;

  const [selectedMonth, setSelectedMonth] = useState(
    selectedYearValue === currentYear ? currentMonthIndex : 0
  );

  const handleYearChange = (nextYear) => {
    const y = Number(nextYear);
    setSelectedYear(y);
    setSelectedMonth(y === currentYear ? currentMonthIndex : 0);
    const meta = budgetMetaForYear({ budgetList: sameTypeBudgetList, currentId, year: y });
    if (meta && meta.id !== currentId) onSwitchBudget(meta.id);
  };

  const activeBudgetMeta = useMemo(
    () => budgetMetaForYear({ budgetList: sameTypeBudgetList, currentId, year: selectedYearValue }),
    [sameTypeBudgetList, currentId, selectedYearValue]
  );

  const emptyData = useMemo(() => {
    const sourceCategories = data.categories || {};
    const zeroBudget = {};
    Object.entries(sourceCategories).forEach(([group, items]) => {
      zeroBudget[group] = {};
      (items || []).forEach((cat) => {
        zeroBudget[group][cat] = Array(12).fill(0);
      });
    });
    return {
      categories: sourceCategories,
      budget: zeroBudget,
      transactions: [],
      bills: [],
    };
  }, [data.categories]);

  const effectiveData = useMemo(() => {
    if (activeBudgetMeta && activeBudgetMeta.id === currentId) return data;
    return (activeBudgetMeta && allBudgets[activeBudgetMeta.id]) || emptyData;
  }, [activeBudgetMeta, currentId, data, allBudgets, emptyData]);

  const { budget, categories, transactions, bills: monthBills } = effectiveData;
  const filteredTransactions = useMemo(
    () => (transactions || []).filter((t) => new Date(t.date).getFullYear() === Number(selectedYearValue)),
    [transactions, selectedYearValue]
  );

  const categoryGroupIndex = useMemo(
    () => buildCategoryGroupIndex(categories),
    [categories]
  );

  const groupCategories = useMemo(() => {
    const map = {};
    DASHBOARD_GROUPS.forEach((group) => {
      const configured = categories[group] || [];
      map[group] = Array.from(new Set(configured.map((cat) => String(cat || '').trim()).filter(Boolean)));
    });
    return map;
  }, [categories]);

  const monthOverview = useMemo(
    () => computeMonthOverview({
      categories,
      budget,
      transactions,
      bills: monthBills,
      year: selectedYearValue,
      monthIndex: selectedMonth,
    }),
    [categories, budget, transactions, monthBills, selectedYearValue, selectedMonth]
  );

  const nextActions = useMemo(() => suggestNextActions(monthOverview), [monthOverview]);

  const goToNextAction = (target) => {
    if (target === 'monthly' && setInitialMonth) setInitialMonth(selectedMonth);
    if (setPage) setPage(target);
  };

  // Annual budget per group+cat
  const annualBudgetByCat = useMemo(() => {
    const result = {};
    DASHBOARD_GROUPS.forEach(g => {
      result[g] = {};
      (groupCategories[g] || []).forEach(cat => {
        result[g][cat] = (budget[g]?.[cat] || []).reduce((s, v) => s + (v || 0), 0);
      });
    });
    return result;
  }, [budget, groupCategories]);

  // Actual totals per group+cat (all transactions)
  const catActuals = useMemo(() => {
    const result = {};
    DASHBOARD_GROUPS.forEach(g => {
      result[g] = {};
      (groupCategories[g] || []).forEach(cat => {
        const catKey = cat.toLowerCase();
        result[g][cat] = filteredTransactions
          .filter((t) => resolveCategoryGroup(t, categoryGroupIndex) === g && String(t.category || '').trim().toLowerCase() === catKey)
          .reduce((s, t) => s + normalizeAmount(t.amount), 0);
      });
    });
    return result;
  }, [groupCategories, filteredTransactions, categoryGroupIndex]);

  // Monthly totals per group (for bar chart)
  const monthlyByGroup = useMemo(() => {
    const result = {};
    DASHBOARD_GROUPS.forEach(g => {
      result[g] = MONTHS.map((month, mIdx) => {
        const budgetTotal = (groupCategories[g] || []).reduce((s, cat) => s + (budget[g]?.[cat]?.[mIdx] || 0), 0);
        const categoryKeys = new Set((groupCategories[g] || []).map((cat) => String(cat || '').trim().toLowerCase()));
        const actualTotal = transactions
          .filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === mIdx
              && d.getFullYear() === Number(selectedYearValue)
              && resolveCategoryGroup(t, categoryGroupIndex) === g
              && categoryKeys.has(String(t.category || '').trim().toLowerCase());
          })
          .reduce((s, t) => s + normalizeAmount(t.amount), 0);
        return { month, budget: budgetTotal, actual: actualTotal };
      });
    });
    return result;
  }, [budget, categoryGroupIndex, groupCategories, transactions, selectedYearValue]);

  // Top tiles: pure transaction-type totals
  const topActualByGroup = useMemo(() => {
    const result = Object.fromEntries(DASHBOARD_GROUPS.map((group) => [group, 0]));
    filteredTransactions.forEach((tx) => {
      const group = resolveTypeGroup(tx);
      if (!group || !result[group] && result[group] !== 0) return;
      result[group] += normalizeAmount(tx.amount);
    });
    return result;
  }, [filteredTransactions]);

  const topStats = useMemo(() =>
    SECTIONS.map(sec => {
      const goal = Object.values(annualBudgetByCat[sec.group] || {}).reduce((s, v) => s + v, 0);
      const actual = topActualByGroup[sec.group] || 0;
      const pct = goal > 0 ? Math.round((actual / goal) * 100) : 0;
      const under = goal - actual;
      return { ...sec, goal, actual, pct, under };
    }),
  [annualBudgetByCat, topActualByGroup]);

  // Section stats: category-driven actuals for lower dashboard panels
  const sectionStats = useMemo(() =>
    SECTIONS.map(sec => {
      const goal = Object.values(annualBudgetByCat[sec.group] || {}).reduce((s, v) => s + v, 0);
      const actual = Object.values(catActuals[sec.group] || {}).reduce((s, v) => s + v, 0);
      const pct = goal > 0 ? Math.round((actual / goal) * 100) : 0;
      const under = goal - actual;
      return { ...sec, goal, actual, pct, under };
    }),
  [annualBudgetByCat, catActuals]);

  const topIncomeActual = topStats.find((s) => s.group === 'Income')?.actual || 0;

  // Sub-stats
  const subStats = useMemo(() => {
    const sum = (g, filter) => (categories[g] || []).filter(filter).reduce((s, c) => s + (catActuals[g]?.[c] || 0), 0);
    const incomeActive  = sum('Income',   c => CATEGORY_META.Income?.[c]?.active);
    const incomePassive = sum('Income',   c => !CATEGORY_META.Income?.[c]?.active);
    const expNeed       = sum('Expenses', c => CATEGORY_META.Expenses?.[c]?.need);
    const expWant       = sum('Expenses', c => !CATEGORY_META.Expenses?.[c]?.need);
    const expTotal      = expNeed + expWant;
    const subscriptions = filteredTransactions
      .filter(t => t.subscription || t.isSubscription)
      .reduce((s, t) => s + normalizeAmount(t.amount), 0);
    const debtHigh      = sum('Debt',    c => CATEGORY_META.Debt?.[c]?.highPriority);
    const debtLow       = sum('Debt',    c => !CATEGORY_META.Debt?.[c]?.highPriority);
    const savLong       = sum('Savings', c => CATEGORY_META.Savings?.[c]?.longTerm);
    const savShort      = sum('Savings', c => !CATEGORY_META.Savings?.[c]?.longTerm);
    const invGrowth     = sum('Investments', c => CATEGORY_META.Investments?.[c]?.growth);
    const invCrypto     = sum('Investments', c => !CATEGORY_META.Investments?.[c]?.growth);
    return { incomeActive, incomePassive, expNeed, expWant, expTotal, subscriptions, debtHigh, debtLow, savLong, savShort, invGrowth, invCrypto };
  }, [categories, catActuals, filteredTransactions]);

  // Donut data per group
  const donutData = useMemo(() => {
    const result = {};
    DASHBOARD_GROUPS.forEach(g => {
      result[g] = (groupCategories[g] || [])
        .map(cat => ({ name: cat, value: catActuals[g]?.[cat] || 0 }))
        .filter(d => d.value > 0);
    });
    return result;
  }, [groupCategories, catActuals]);

  const [annualOpen, setAnnualOpen] = useState(false);

  const renderSection = (sec, idx) => {
    const { group, cssClass, label, accent } = sec;
    const cats = groupCategories[group] || [];
    const statRow = sectionStats[idx];
    const monthlyData = monthlyByGroup[group];
    const pieData = donutData[group];

    return (
      <div key={group} className="section-block">
        <h3 className={`section-header ${cssClass}`}>{label}</h3>
        <div className="section-body">

          {/* Left: category table */}
          <div className="section-table-col">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>{group === 'Income' ? 'Goal' : 'Budget'}</th>
                  <th>Actual</th>
                  <th>Diff</th>
                </tr>
              </thead>
              <tbody>
                {cats.map(cat => {
                  const g = annualBudgetByCat[group]?.[cat] || 0;
                  const a = catActuals[group]?.[cat] || 0;
                  const d = g - a;
                  const good = group === 'Income' ? a >= g : a <= g;
                  return (
                    <tr key={cat}>
                      <td>{cat}</td>
                      <td>{fmt(g)}</td>
                      <td>{fmt(a)}</td>
                      <td style={{ color: good ? accent : '#f87171', fontWeight: 600 }}>
                        {d >= 0 ? '+' : '-'}{fmt(Math.abs(d))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td>{fmt(statRow.goal)}</td>
                  <td>{fmt(statRow.actual)}</td>
                  <td style={{ color: (group === 'Income' ? statRow.actual >= statRow.goal : statRow.actual <= statRow.goal) ? accent : '#f87171', fontWeight: 700 }}>
                    {fmt(Math.abs(statRow.under))} {statRow.under >= 0 ? 'under' : 'over'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Right: panels */}
          <div className="section-panels-stack">

            {/* Row 1: Overview + Split stats */}
            <div className="section-split-grid">
              {/* Overview */}
              <div className="overview-panel">
                <div className="section-panel-title">
                  Annual {group === 'Debt' ? 'Debt Payoff' : group} Overview
                </div>
                <div className="overview-row">
                  <span>{group === 'Income' ? 'Goal' : 'Budget'}</span>
                  <span>Actual</span>
                </div>
                <div className="overview-amounts">
                  <span style={{ color: 'var(--muted)' }}>{fmt(statRow.goal)}</span>
                  <span style={{ color: accent }}>{fmt(statRow.actual)}</span>
                </div>
                <div className="progress-bar" style={{ margin: '8px 0' }}>
                  <div className="progress-bar-fill" style={{ width: `${Math.min(statRow.pct, 100)}%`, background: accent }} />
                </div>
                <div style={{ color: accent, fontSize: '0.9rem', fontWeight: 600 }}>{statRow.goal > 0 ? `${statRow.pct}%` : '—'}</div>
                <div className="overview-big" style={{ color: accent }}>{fmt(Math.abs(statRow.under))}</div>
                <div className="overview-sub">{statRow.under >= 0 ? 'under' : 'over'} {sec.overLabel} this year</div>
              </div>

              {/* Split stats */}
              <div className="section-panel">
                {group === 'Income' && (
                  <>
                    <div className="section-panel-title">Active Income</div>
                    <div style={{ color: accent, fontSize: '1.4rem', fontWeight: 800 }}>{fmt(subStats.incomeActive)}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                      {subStats.incomeActive + subStats.incomePassive > 0
                        ? `${Math.round((subStats.incomeActive / (subStats.incomeActive + subStats.incomePassive)) * 100)}% of total income`
                        : '0% of total income'}
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <div className="section-panel-title">Passive Income</div>
                      <div style={{ color: accent, fontSize: '1.4rem', fontWeight: 800 }}>{fmt(subStats.incomePassive)}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                        {subStats.incomeActive + subStats.incomePassive > 0
                          ? `${Math.round((subStats.incomePassive / (subStats.incomeActive + subStats.incomePassive)) * 100)}% of total income`
                          : '0% of total income'}
                      </div>
                    </div>
                  </>
                )}
                {group === 'Expenses' && (
                  <>
                    <div className="section-panel-title">Spending on Subscriptions</div>
                    <div style={{ color: accent, fontSize: '1.4rem', fontWeight: 800 }}>{fmt(subStats.subscriptions)}</div>
                    <div style={{ marginTop: 12 }}>
                      <div className="section-panel-title">% of Income Spent on Expenses</div>
                      <div style={{ color: accent, fontSize: '1.1rem', fontWeight: 700 }}>
                        {topIncomeActual > 0 ? `${Math.round((statRow.actual / topIncomeActual) * 100)}%` : '—'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                      <div>
                        <div className="section-panel-title">Need</div>
                        <div style={{ color: accent, fontSize: '1rem', fontWeight: 700 }}>{fmt(subStats.expNeed)}</div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{subStats.expTotal > 0 ? Math.round((subStats.expNeed / subStats.expTotal) * 100) : 0}%</div>
                      </div>
                      <div>
                        <div className="section-panel-title">Want</div>
                        <div style={{ color: accent, fontSize: '1rem', fontWeight: 700 }}>{fmt(subStats.expWant)}</div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{subStats.expTotal > 0 ? Math.round((subStats.expWant / subStats.expTotal) * 100) : 0}%</div>
                      </div>
                    </div>
                  </>
                )}
                {group === 'Debt' && (
                  <>
                    <div className="section-panel-title">% of Income → Debt</div>
                    <div style={{ color: accent, fontSize: '1.1rem', fontWeight: 700 }}>
                      {topIncomeActual > 0 ? `${Math.round((statRow.actual / topIncomeActual) * 100)}%` : '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                      <div>
                        <div className="section-panel-title">High Priority</div>
                        <div style={{ color: accent, fontSize: '1rem', fontWeight: 700 }}>{fmt(subStats.debtHigh)}</div>
                      </div>
                      <div>
                        <div className="section-panel-title">Low Priority</div>
                        <div style={{ color: accent, fontSize: '1rem', fontWeight: 700 }}>{fmt(subStats.debtLow)}</div>
                      </div>
                    </div>
                  </>
                )}
                {group === 'Savings' && (
                  <>
                    <div className="section-panel-title">% of Income → Savings</div>
                    <div style={{ color: accent, fontSize: '1.1rem', fontWeight: 700 }}>
                      {topIncomeActual > 0 ? `${Math.round((statRow.actual / topIncomeActual) * 100)}%` : '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                      <div>
                        <div className="section-panel-title">Long Term</div>
                        <div style={{ color: accent, fontSize: '1rem', fontWeight: 700 }}>{fmt(subStats.savLong)}</div>
                      </div>
                      <div>
                        <div className="section-panel-title">Short Term</div>
                        <div style={{ color: accent, fontSize: '1rem', fontWeight: 700 }}>{fmt(subStats.savShort)}</div>
                      </div>
                    </div>
                  </>
                )}
                {group === 'Investments' && (
                  <>
                    <div className="section-panel-title">% of Income → Investments</div>
                    <div style={{ color: accent, fontSize: '1.1rem', fontWeight: 700 }}>
                      {topIncomeActual > 0 ? `${Math.round((statRow.actual / topIncomeActual) * 100)}%` : '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                      <div>
                        <div className="section-panel-title">Market / Growth</div>
                        <div style={{ color: accent, fontSize: '1rem', fontWeight: 700 }}>{fmt(subStats.invGrowth)}</div>
                      </div>
                      <div>
                        <div className="section-panel-title">Crypto</div>
                        <div style={{ color: accent, fontSize: '1rem', fontWeight: 700 }}>{fmt(subStats.invCrypto)}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Row 2: Bar chart + Donut */}
            <div className="section-chart-grid">
              {/* Bar chart: by month */}
              <div className="section-panel section-chart-first">
                <div className="section-panel-title">{group} by Month</div>
                {monthlyData.some((d) => d.budget > 0 || d.actual > 0) ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={monthlyData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={fmtShort} width={45} />
                      <Tooltip
                        contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3348', borderRadius: 6 }}
                        formatter={(v) => [fmt(v)]}
                      />
                      <Bar dataKey="budget" fill="#2d3348" name="Budget" radius={[2,2,0,0]} />
                      <Bar dataKey="actual" fill={accent} name="Actual" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">No data yet</div>
                )}
              </div>

              {/* Donut: breakdown by category */}
              <div className="section-panel">
                <div className="section-panel-title">Breakdown by Category</div>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3348', borderRadius: 6 }}
                        formatter={(v) => [fmt(v)]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">No data yet</div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page dashboard-page">
      {/* Page heading */}
      <div className="page-heading">
        <div className="page-heading-left">
          <h1>Dashboard</h1>
          <span className="page-heading-sub">
            {MONTHS[selectedMonth]} {selectedYearValue}
            {(activeBudgetMeta?.name || currentBudget?.name) ? ` · ${activeBudgetMeta?.name || currentBudget.name}` : ''}
          </span>
        </div>
        <div className="month-selector dashboard-month-selector">
          <label className="visually-hidden" htmlFor="dashboard-month-select">Month</label>
          <select
            id="dashboard-month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <label className="visually-hidden" htmlFor="dashboard-year-select">Year</label>
          <select
            id="dashboard-year-select"
            value={selectedYearValue}
            onChange={(e) => handleYearChange(e.target.value)}
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Current-month overview */}
      <div className="stat-tiles dashboard-month-tiles">
        <div className="stat-tile">
          <h3 className="stat-tile-header section-header income">INCOME</h3>
          <div className="stat-tile-body">
            <div className="stat-tile-amount" style={{ color: 'var(--income-accent)' }}>{fmt(monthOverview.incomeActual)}</div>
            <div className="stat-tile-label">Income in {MONTHS[selectedMonth]}</div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${Math.min(monthOverview.incomePct ?? 0, 100)}%`, background: 'var(--income-accent)' }} />
            </div>
            <div className="stat-tile-pct" style={{ color: 'var(--income-accent)' }}>
              {monthOverview.incomePct == null ? '—' : `${monthOverview.incomePct}% of ${fmt(monthOverview.incomePlan)} planned`}
            </div>
          </div>
        </div>

        <div className="stat-tile">
          <h3 className="stat-tile-header section-header expenses">SPENDING</h3>
          <div className="stat-tile-body">
            <div className="stat-tile-amount" style={{ color: 'var(--expense-accent)' }}>{fmt(monthOverview.expenseActual)}</div>
            <div className="stat-tile-label">Spending in {MONTHS[selectedMonth]}</div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${Math.min(monthOverview.expensePct ?? 0, 100)}%`, background: 'var(--expense-accent)' }} />
            </div>
            <div className="stat-tile-pct" style={{ color: 'var(--expense-accent)' }}>
              {monthOverview.expensePct == null
                ? '—'
                : `${monthOverview.expensePct}% of ${fmt(monthOverview.expensePlan)} planned`}
            </div>
            <div className="stat-tile-under">
              {monthOverview.expenseRemaining >= 0
                ? `${fmt(monthOverview.expenseRemaining)} left in plan`
                : `${fmt(-monthOverview.expenseRemaining)} over plan`}
            </div>
          </div>
        </div>

        <div className="stat-tile">
          <h3 className="stat-tile-header section-header savings">PLAN BALANCE</h3>
          <div className="stat-tile-body">
            <div className="stat-tile-amount" style={{ color: monthOverview.leftToAllocate >= 0 ? 'var(--savings-accent)' : 'var(--danger)' }}>
              {monthOverview.leftToAllocate < 0 ? '-' : ''}{fmt(monthOverview.leftToAllocate)}
            </div>
            <div className="stat-tile-label">{monthOverview.leftToAllocate < 0 ? 'Overallocated' : 'Left to allocate'} in {MONTHS[selectedMonth]}</div>
            <div className="stat-tile-under">
              {fmt(monthOverview.incomePlan)} income − {fmt(monthOverview.plannedOutflows)} planned outflows
            </div>
          </div>
        </div>

        <div className="stat-tile">
          <h3 className="stat-tile-header section-header debt">UPCOMING BILLS</h3>
          <div className="stat-tile-body">
            <div className="stat-tile-amount">{monthOverview.upcomingCount}</div>
            <div className="stat-tile-label">
              {monthOverview.upcomingCount === 0
                ? 'No bills due in this month'
                : `${fmt(monthOverview.upcomingTotal)} due in ${MONTHS[selectedMonth]}`}
            </div>
            {monthOverview.nearestBill && (
              <div className="stat-tile-under">
                {monthOverview.nearestBill.name} due {monthOverview.nearestBill.dueDate}
                {monthOverview.nearestBill.daysUntil === 0 ? ' (today)' : ` (in ${monthOverview.nearestBill.daysUntil} day${monthOverview.nearestBill.daysUntil !== 1 ? 's' : ''})`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Suggested next actions */}
      {nextActions.length > 0 && (
        <section className="next-actions-card" aria-labelledby="dashboard-next-actions-title">
          <h2 className="next-actions-title" id="dashboard-next-actions-title">Next steps</h2>
          <div className="next-actions-list">
            {nextActions.map((action) => (
              <button key={action.id} type="button" className="next-action-btn" onClick={() => goToNextAction(action.target)}>
                <span className="next-action-copy">
                  <span className="next-action-label">{action.label}</span>
                  {action.hint && <span className="next-action-hint">{action.hint}</span>}
                </span>
                <UiShellIcon name="FiChevronRight" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Annual details (progressive disclosure) */}
      <div className="annual-disclosure">
        <button
          type="button"
          className="annual-disclosure-btn"
          aria-expanded={annualOpen}
          aria-controls="dashboard-annual-details"
          onClick={() => setAnnualOpen(v => !v)}
        >
          <span className="annual-disclosure-label">Annual budget details for {selectedYearValue}</span>
          <UiShellIcon name="FiChevronDown" className={`annual-disclosure-chevron${annualOpen ? ' is-open' : ''}`} />
        </button>
        <div id="dashboard-annual-details" className="annual-details" hidden={!annualOpen}>
          <div className="stat-tiles">
            {topStats.map(s => (
              <div key={s.group} className="stat-tile">
                <h3 className={`stat-tile-header section-header ${s.cssClass}`}>{s.label}</h3>
                <div className="stat-tile-body">
                  <div className="stat-tile-amount" style={{ color: s.accent }}>{fmt(s.actual)}</div>
                  <div className="stat-tile-label">{s.displayLabel}</div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${Math.min(s.pct, 100)}%`, background: s.accent }} />
                  </div>
                  <div className="stat-tile-pct" style={{ color: s.accent }}>{s.goal > 0 ? `${s.pct}%` : '—'}</div>
                  <div className="stat-tile-under">{fmt(Math.abs(s.under))} {s.under >= 0 ? 'under' : 'over'} goal</div>
                </div>
              </div>
            ))}
          </div>

          {SECTIONS.map((sec, i) => renderSection(sec, i))}
        </div>
      </div>
    </div>
  );
}
