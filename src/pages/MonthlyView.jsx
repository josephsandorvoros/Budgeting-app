import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { MONTHS, CATEGORY_META } from '../data/defaults.js';

const GROUPS = ['Income', 'Savings', 'Investments', 'Expenses', 'Debt'];
const SECTION_META = {
  Income:      { cssClass: 'income',      label: 'INCOME',      accent: '#4ade80', overLabel: 'goal' },
  Savings:     { cssClass: 'savings',     label: 'SAVINGS',     accent: '#eab308', overLabel: 'goal' },
  Investments: { cssClass: 'investments', label: 'INVESTMENTS', accent: '#06b6d4', overLabel: 'goal' },
  Expenses:    { cssClass: 'expenses',    label: 'EXPENSES',    accent: '#ec4899', overLabel: 'budget' },
  Debt:        { cssClass: 'debt',        label: 'DEBT PAYOFF', accent: '#a855f7', overLabel: 'goal' },
};

const fmt = (n) =>
  `$${Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtShort = (v) => {
  const n = Math.abs(Number(v));
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
};

const CHART_COLORS = ['#4ade80','#ec4899','#a855f7','#eab308','#60a5fa','#f97316','#34d399','#f43f5e','#818cf8','#fb923c'];

export default function MonthlyView({ data, allBudgets = {}, initialMonth, budgetList = [], currentId, onSwitchBudget }) {
  const currentMonth = new Date().getMonth();
  const currentYear  = new Date().getFullYear();
  const currentBudget = useMemo(() => budgetList.find((b) => b.id === currentId), [budgetList, currentId]);
  const currentType = currentBudget?.type || 'personal';
  const sameTypeBudgets = useMemo(
    () => Object.entries(allBudgets || {}).filter(([, budgetData]) => (budgetData?.type || 'personal') === currentType),
    [allBudgets, currentType]
  );
  const [monthIdx, setMonthIdx] = useState(initialMonth ?? currentMonth);
  const yearsWithData = useMemo(() => {
    const years = sameTypeBudgets.flatMap(([, budgetData]) =>
      (budgetData?.transactions || [])
        .map((t) => new Date(t.date).getFullYear())
        .filter(Number.isFinite)
    );
    return Array.from(new Set(years)).sort((a, b) => b - a);
  }, [sameTypeBudgets]);
  const defaultYear = yearsWithData[0] || currentYear;
  const [year, setYear]         = useState(defaultYear);

  useEffect(() => {
    setYear(defaultYear);
  }, [defaultYear]);

  const years = useMemo(() => {
    const set = new Set([currentYear, ...yearsWithData]);
    return Array.from(set).sort((a, b) => b - a);
  }, [yearsWithData, currentYear]);
  const monthName = MONTHS[monthIdx];

  const handleYearChange = (nextYear) => {
    const y = Number(nextYear);
    setYear(y);
    const target = sameTypeBudgets
      .find(([, budgetData]) => (budgetData?.transactions || []).some((t) => new Date(t.date).getFullYear() === y))?.[0];
    if (target && target !== currentId) onSwitchBudget(target);
  };

  const activeBudgetMeta = useMemo(() => {
    if ((data.transactions || []).some((t) => new Date(t.date).getFullYear() === Number(year))) return currentBudget;
    const match = sameTypeBudgets
      .find(([, budgetData]) => (budgetData?.transactions || []).some((t) => new Date(t.date).getFullYear() === Number(year)));
    if (!match) return null;
    return budgetList.find((b) => b.id === match[0]) || null;
  }, [data.transactions, currentBudget, sameTypeBudgets, year, budgetList]);

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
  const hasSelectedBudget = !!activeBudgetMeta;

  // Actuals for selected month/year
  const catActuals = useMemo(() => {
    const result = {};
    GROUPS.forEach(g => {
      result[g] = {};
      (categories[g] || []).forEach(cat => {
        result[g][cat] = transactions
          .filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === monthIdx && d.getFullYear() === year && t.category === cat;
          })
          .reduce((s, t) => s + Number(t.amount), 0);
      });
    });
    return result;
  }, [transactions, categories, monthIdx, year]);

  // Monthly totals per group
  const groupStats = useMemo(() =>
    GROUPS.map(g => {
      const totalBudget = (categories[g] || []).reduce((s, cat) => s + (budget[g]?.[cat]?.[monthIdx] || 0), 0);
      const totalActual = Object.values(catActuals[g] || {}).reduce((s, v) => s + v, 0);
      const diff = totalBudget - totalActual;
      const pct = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;
      const good = g === 'Income' ? totalActual >= totalBudget : totalActual <= totalBudget;
      return { group: g, totalBudget, totalActual, diff, pct, good };
    }),
  [categories, budget, catActuals, monthIdx]);

  // Sub-stats for the month
  const subStats = useMemo(() => {
    const sum = (g, filter) => (categories[g] || []).filter(filter).reduce((s, c) => s + (catActuals[g]?.[c] || 0), 0);
    return {
      incomeActive:  sum('Income',   c => CATEGORY_META.Income?.[c]?.active),
      incomePassive: sum('Income',   c => !CATEGORY_META.Income?.[c]?.active),
      expNeed:       sum('Expenses', c => CATEGORY_META.Expenses?.[c]?.need),
      expWant:       sum('Expenses', c => !CATEGORY_META.Expenses?.[c]?.need),
      subscriptions: transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === monthIdx && d.getFullYear() === year && t.subscription;
      }).reduce((s, t) => s + Number(t.amount), 0),
      debtHigh: sum('Debt',    c => CATEGORY_META.Debt?.[c]?.highPriority),
      debtLow:  sum('Debt',    c => !CATEGORY_META.Debt?.[c]?.highPriority),
      savLong:  sum('Savings', c => CATEGORY_META.Savings?.[c]?.longTerm),
      savShort: sum('Savings', c => !CATEGORY_META.Savings?.[c]?.longTerm),
      invGrowth: sum('Investments', c => CATEGORY_META.Investments?.[c]?.growth),
      invCrypto: sum('Investments', c => !CATEGORY_META.Investments?.[c]?.growth),
    };
  }, [categories, catActuals, transactions, monthIdx, year]);

  const catBarData = (group) =>
    (categories[group] || []).map(cat => ({
      name: cat.length > 12 ? cat.slice(0, 11) + '…' : cat,
      budget: budget[group]?.[cat]?.[monthIdx] || 0,
      actual: catActuals[group]?.[cat] || 0,
    }));

  const donutData = (group) =>
    (categories[group] || [])
      .map(cat => ({ name: cat, value: catActuals[group]?.[cat] || 0 }))
      .filter(d => d.value > 0);

  const incomeActual = groupStats[0]?.totalActual || 0;

  return (
    <div className="page">
      {/* Page heading with inline month/year selectors */}
      <div className="page-heading">
        <div className="page-heading-left">
          <h1>Monthly Budget</h1>
          <span className="page-heading-sub">{monthName} {year}</span>
        </div>
        <div className="month-selector">
          <select value={monthIdx} onChange={e => setMonthIdx(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={e => handleYearChange(e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {!hasSelectedBudget && (
        <div className="subtitle">No {currentType} budget exists for {year}. Showing an empty monthly view.</div>
      )}

      {/* Stat tiles */}
      <div className="stat-tiles">
        {groupStats.map((gs) => {
          const meta = SECTION_META[gs.group];
          return (
            <div key={gs.group} className="stat-tile">
              <div className={`stat-tile-header section-header ${meta.cssClass}`}>{meta.label}</div>
              <div className="stat-tile-body">
                <div className="stat-tile-amount" style={{ color: meta.accent }}>{fmt(gs.totalActual)}</div>
                <div className="stat-tile-label">Total {gs.group === 'Debt' ? 'Debt Payoff' : gs.group}</div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${Math.min(gs.pct, 100)}%`, background: meta.accent }} />
                </div>
                <div className="stat-tile-pct" style={{ color: meta.accent }}>{gs.pct}%</div>
                <div className="stat-tile-under">
                  {fmt(Math.abs(gs.diff))} {gs.diff >= 0 ? 'under' : 'over'} {meta.overLabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section blocks */}
      {GROUPS.map((group, gi) => {
        const meta = SECTION_META[group];
        const cats = categories[group] || [];
        const gs = groupStats[gi];
        const barData = catBarData(group);
        const pie = donutData(group);

        return (
          <div key={group} className="section-block">
            <div className={`section-header ${meta.cssClass}`}>{meta.label}</div>
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
                      const b = budget[group]?.[cat]?.[monthIdx] || 0;
                      const a = catActuals[group]?.[cat] || 0;
                      const d = b - a;
                      const good = group === 'Income' ? a >= b : a <= b;
                      return (
                        <tr key={cat}>
                          <td>{cat}</td>
                          <td>{fmt(b)}</td>
                          <td>{fmt(a)}</td>
                          <td style={{ color: good ? meta.accent : '#f87171', fontWeight: 600 }}>
                            {d >= 0 ? '+' : '-'}{fmt(Math.abs(d))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td>{fmt(gs.totalBudget)}</td>
                      <td>{fmt(gs.totalActual)}</td>
                      <td style={{ color: gs.good ? meta.accent : '#f87171', fontWeight: 700 }}>
                        {fmt(Math.abs(gs.diff))} {gs.diff >= 0 ? 'under' : 'over'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Right panels */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Row 1: Overview + sub-stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
                  <div className="overview-panel" style={{ borderRight: '1px solid var(--border)' }}>
                    <div className="section-panel-title">Monthly {group} Overview</div>
                    <div className="overview-row">
                      <span>{group === 'Income' ? 'Goal' : 'Budget'}</span>
                      <span>Actual</span>
                    </div>
                    <div className="overview-amounts">
                      <span style={{ color: 'var(--muted)' }}>{fmt(gs.totalBudget)}</span>
                      <span style={{ color: meta.accent }}>{fmt(gs.totalActual)}</span>
                    </div>
                    <div className="progress-bar" style={{ margin: '8px 0' }}>
                      <div className="progress-bar-fill" style={{ width: `${Math.min(gs.pct, 100)}%`, background: meta.accent }} />
                    </div>
                    <div style={{ color: meta.accent, fontSize: '0.9rem', fontWeight: 600 }}>{gs.pct}%</div>
                    <div className="overview-big" style={{ color: meta.accent }}>{fmt(Math.abs(gs.diff))}</div>
                    <div className="overview-sub">{gs.diff >= 0 ? 'under' : 'over'} {meta.overLabel} this month</div>
                  </div>

                  <div className="section-panel">
                    {group === 'Income' && (
                      <>
                        <div className="section-panel-title">Active Income</div>
                        <div style={{ color: meta.accent, fontSize: '1.3rem', fontWeight: 800 }}>{fmt(subStats.incomeActive)}</div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>
                          {gs.totalActual > 0 ? `${Math.round((subStats.incomeActive / gs.totalActual) * 100)}% of total income` : ''}
                        </div>
                        <div style={{ marginTop: 10 }}>
                          <div className="section-panel-title">Passive Income</div>
                          <div style={{ color: meta.accent, fontSize: '1.3rem', fontWeight: 800 }}>{fmt(subStats.incomePassive)}</div>
                          <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>
                            {gs.totalActual > 0 ? `${Math.round((subStats.incomePassive / gs.totalActual) * 100)}% of total income` : ''}
                          </div>
                        </div>
                      </>
                    )}
                    {group === 'Expenses' && (
                      <>
                        <div className="section-panel-title">Subscriptions This Month</div>
                        <div style={{ color: meta.accent, fontSize: '1.3rem', fontWeight: 800 }}>{fmt(subStats.subscriptions)}</div>
                        <div style={{ marginTop: 10 }}>
                          <div className="section-panel-title">% of Income → Expenses</div>
                          <div style={{ color: meta.accent, fontSize: '1rem', fontWeight: 700 }}>
                            {incomeActual > 0 ? `${Math.round((gs.totalActual / incomeActual) * 100)}%` : '—'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                          <div>
                            <div className="section-panel-title">Need</div>
                            <div style={{ color: meta.accent, fontSize: '1rem', fontWeight: 700 }}>{fmt(subStats.expNeed)}</div>
                          </div>
                          <div>
                            <div className="section-panel-title">Want</div>
                            <div style={{ color: meta.accent, fontSize: '1rem', fontWeight: 700 }}>{fmt(subStats.expWant)}</div>
                          </div>
                        </div>
                      </>
                    )}
                    {group === 'Debt' && (
                      <>
                        <div className="section-panel-title">% of Income → Debt</div>
                        <div style={{ color: meta.accent, fontSize: '1rem', fontWeight: 700 }}>
                          {incomeActual > 0 ? `${Math.round((gs.totalActual / incomeActual) * 100)}%` : '—'}
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                          <div>
                            <div className="section-panel-title">High Priority</div>
                            <div style={{ color: meta.accent, fontSize: '1rem', fontWeight: 700 }}>{fmt(subStats.debtHigh)}</div>
                          </div>
                          <div>
                            <div className="section-panel-title">Low Priority</div>
                            <div style={{ color: meta.accent, fontSize: '1rem', fontWeight: 700 }}>{fmt(subStats.debtLow)}</div>
                          </div>
                        </div>
                      </>
                    )}
                    {group === 'Savings' && (
                      <>
                        <div className="section-panel-title">% of Income → Savings</div>
                        <div style={{ color: meta.accent, fontSize: '1rem', fontWeight: 700 }}>
                          {incomeActual > 0 ? `${Math.round((gs.totalActual / incomeActual) * 100)}%` : '—'}
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                          <div>
                            <div className="section-panel-title">Long Term</div>
                            <div style={{ color: meta.accent, fontSize: '1rem', fontWeight: 700 }}>{fmt(subStats.savLong)}</div>
                          </div>
                          <div>
                            <div className="section-panel-title">Short Term</div>
                            <div style={{ color: meta.accent, fontSize: '1rem', fontWeight: 700 }}>{fmt(subStats.savShort)}</div>
                          </div>
                        </div>
                      </>
                    )}
                    {group === 'Investments' && (
                      <>
                        <div className="section-panel-title">% of Income → Investments</div>
                        <div style={{ color: meta.accent, fontSize: '1rem', fontWeight: 700 }}>
                          {incomeActual > 0 ? `${Math.round((gs.totalActual / incomeActual) * 100)}%` : '—'}
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                          <div>
                            <div className="section-panel-title">Market / Growth</div>
                            <div style={{ color: meta.accent, fontSize: '1rem', fontWeight: 700 }}>{fmt(subStats.invGrowth)}</div>
                          </div>
                          <div>
                            <div className="section-panel-title">Crypto</div>
                            <div style={{ color: meta.accent, fontSize: '1rem', fontWeight: 700 }}>{fmt(subStats.invCrypto)}</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Row 2: Bar chart + Donut */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <div className="section-panel" style={{ borderRight: '1px solid var(--border)' }}>
                    <div className="section-panel-title">By Category</div>
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 60 }}>
                        <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={fmtShort} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={60} />
                        <Tooltip
                          contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3348', borderRadius: 6 }}
                          formatter={(v) => [fmt(v)]}
                        />
                        <Bar dataKey="budget" fill="#2d3348" name="Budget" radius={[0,2,2,0]} />
                        <Bar dataKey="actual" fill={meta.accent} name="Actual" radius={[0,2,2,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="section-panel">
                    <div className="section-panel-title">Breakdown</div>
                    {pie.length > 0 ? (
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie data={pie} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                            {pie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
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
      })}
    </div>
  );
}