import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { MONTHS, CATEGORY_META } from '../data/defaults.js';

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
const DASHBOARD_GROUPS = ['Income','Expenses','Debt','Savings','Investments'];

const normalizeCategoryKey = (value) => String(value || '').trim().toLowerCase();

function normalizeGroupName(value) {
  const key = String(value || '').trim().toLowerCase();
  if (!key) return undefined;
  if (key === 'income' || key === 'in') return 'Income';
  if (key === 'expense' || key === 'expenses' || key === 'out') return 'Expenses';
  if (key === 'saving' || key === 'savings') return 'Savings';
  if (key === 'debt') return 'Debt';
  if (key === 'investment' || key === 'investments') return 'Investments';
  if (key === 'transfer' || key === 'transfers') return null;
  return undefined;
}

function resolveTypeGroup(tx) {
  const typeBased = normalizeGroupName(tx?.type);
  if (typeBased !== undefined) return typeBased;

  const explicit = normalizeGroupName(tx?.group || tx?.group_name);
  if (explicit !== undefined) return explicit;

  return undefined;
}

function resolveCategoryGroup(tx, categoryGroupIndex = {}) {
  const categoryName = normalizeCategoryKey(tx?.category);
  if (categoryName && categoryGroupIndex[categoryName]) return categoryGroupIndex[categoryName];

  const explicit = normalizeGroupName(tx?.group || tx?.group_name);
  if (explicit !== undefined) return explicit;

  return undefined;
}

export default function Dashboard({ data, allBudgets = {}, budgetList = [], currentId, onSwitchBudget }) {
  const currentYear = new Date().getFullYear();

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
    return {
      categories: sourceCategories,
      budget: zeroBudget,
      transactions: [],
    };
  }, [data.categories]);

  const effectiveData = useMemo(() => {
    if (activeBudgetMeta && activeBudgetMeta.id === currentId) return data;
    return (activeBudgetMeta && allBudgets[activeBudgetMeta.id]) || emptyData;
  }, [activeBudgetMeta, currentId, data, allBudgets, emptyData]);

  const { budget, categories, transactions } = effectiveData;
  const filteredTransactions = useMemo(
    () => (transactions || []).filter((t) => new Date(t.date).getFullYear() === Number(selectedYear)),
    [transactions, selectedYear]
  );

  const categoryGroupIndex = useMemo(() => {
    const map = {};
    DASHBOARD_GROUPS.forEach((group) => {
      (categories[group] || []).forEach((cat) => {
        const key = normalizeCategoryKey(cat);
        if (key && map[key] === undefined) map[key] = group;
      });
    });
    return map;
  }, [categories]);

  const groupCategories = useMemo(() => {
    const map = {};
    DASHBOARD_GROUPS.forEach((group) => {
      const configured = categories[group] || [];
      map[group] = Array.from(new Set(configured.map((cat) => String(cat || '').trim()).filter(Boolean)));
    });
    return map;
  }, [categories]);

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
        const catKey = normalizeCategoryKey(cat);
        result[g][cat] = filteredTransactions
          .filter((t) => resolveCategoryGroup(t, categoryGroupIndex) === g && normalizeCategoryKey(t.category) === catKey)
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
        const categoryKeys = new Set((groupCategories[g] || []).map((cat) => normalizeCategoryKey(cat)));
        const actualTotal = transactions
          .filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === mIdx
              && d.getFullYear() === Number(selectedYear)
              && resolveCategoryGroup(t, categoryGroupIndex) === g
              && categoryKeys.has(normalizeCategoryKey(t.category));
          })
          .reduce((s, t) => s + normalizeAmount(t.amount), 0);
        return { month, budget: budgetTotal, actual: actualTotal };
      });
    });
    return result;
  }, [budget, categoryGroupIndex, groupCategories, transactions, selectedYear]);

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

  const renderSection = (sec, idx) => {
    const { group, cssClass, label, accent } = sec;
    const cats = groupCategories[group] || [];
    const statRow = sectionStats[idx];
    const monthlyData = monthlyByGroup[group];
    const pieData = donutData[group];

    return (
      <div key={group} className="section-block">
        <div className={`section-header ${cssClass}`}>{label}</div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Row 1: Overview + Split stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: '1px solid var(--border)' }}>
              {/* Overview */}
              <div className="overview-panel" style={{ borderRight: '1px solid var(--border)' }}>
                <div className="section-panel-title">
                  {group === 'Income' ? 'Annual Income Overview' : group === 'Expenses' ? 'Annual Expenses Overview' : group === 'Debt' ? 'Annual Debt Payoff Overview' : 'Annual Savings Overview'}
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
                <div style={{ color: accent, fontSize: '0.9rem', fontWeight: 600 }}>{statRow.pct}%</div>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {/* Bar chart: by month */}
              <div className="section-panel" style={{ borderRight: '1px solid var(--border)' }}>
                <div className="section-panel-title">{group} by Month</div>
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
                  <div style={{ color: 'var(--muted)', fontSize: '0.82rem', padding: '20px 0' }}>No data yet</div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      {/* Page heading */}
      <div className="page-heading">
        <div className="page-heading-left">
          <h1>Annual Dashboard</h1>
          <span className="page-heading-sub">{selectedYear} Budget Overview</span>
        </div>
        <div className="month-selector">
          <select value={selectedYear} onChange={(e) => handleYearChange(e.target.value)}>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="stat-tiles">
        {topStats.map(s => (
          <div key={s.group} className="stat-tile">
            <div className={`stat-tile-header section-header ${s.cssClass}`}>{s.label}</div>
            <div className="stat-tile-body">
              <div className="stat-tile-amount" style={{ color: s.accent }}>{fmt(s.actual)}</div>
              <div className="stat-tile-label">{s.displayLabel}</div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${Math.min(s.pct, 100)}%`, background: s.accent }} />
              </div>
              <div className="stat-tile-pct" style={{ color: s.accent }}>{s.pct}%</div>
              <div className="stat-tile-under">{fmt(Math.abs(s.under))} {s.under >= 0 ? 'under' : 'over'} goal</div>
            </div>
          </div>
        ))}
      </div>

      {/* Section blocks */}
      {SECTIONS.map((sec, i) => renderSection(sec, i))}
    </div>
  );
}