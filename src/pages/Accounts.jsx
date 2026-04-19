import { useState, useMemo } from 'react';
import { ACCOUNT_HIERARCHY } from '../data/defaults.js';

const fmtAbs = (v) => {
  if (v == null) return '—';
  return `$${Math.abs(Number(v)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtSigned = (v) => {
  if (v == null) return '—';
  const abs = Math.abs(Number(v)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? `$(${abs})` : `$${abs}`;
};

// ── Time period helpers ────────────────────────────────────────────────────
const TIME_PERIODS = [
  { label: 'All Time',      value: 'all' },
  { label: 'This Year',     value: 'this-year' },
  { label: 'This Month',    value: 'this-month' },
  { label: 'Last Month',    value: 'last-month' },
  { label: 'Last 3 Months', value: 'last-3m' },
  { label: 'Last 6 Months', value: 'last-6m' },
];

function applyPeriod(txs, period) {
  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth();
  switch (period) {
    case 'this-year':  return txs.filter(t => new Date(t.date).getFullYear() === yr);
    case 'this-month': return txs.filter(t => { const d = new Date(t.date); return d.getFullYear() === yr && d.getMonth() === mo; });
    case 'last-month': {
      const lm = mo === 0 ? 11 : mo - 1;
      const ly = mo === 0 ? yr - 1 : yr;
      return txs.filter(t => { const d = new Date(t.date); return d.getFullYear() === ly && d.getMonth() === lm; });
    }
    case 'last-3m': { const c = new Date(now); c.setMonth(c.getMonth() - 3); return txs.filter(t => new Date(t.date) >= c); }
    case 'last-6m': { const c = new Date(now); c.setMonth(c.getMonth() - 6); return txs.filter(t => new Date(t.date) >= c); }
    default: return txs;
  }
}

// ── Column definitions ─────────────────────────────────────────────────────
const ALL_COLS = [
  { id: 'date',    label: 'Date',    sortable: true },
  { id: 'payee',   label: 'Payee',   sortable: true },
  { id: 'amount',  label: 'Amount',  sortable: true },
  { id: 'balance', label: 'Balance', sortable: false },
  { id: 'category',label: 'Category',sortable: true },
  { id: 'notes',   label: 'Notes',   sortable: false },
  { id: 'status',  label: 'Status',  sortable: false },
];

function SortTh({ col, sortCol, sortDir, onSort, children, style }) {
  const active = sortCol === col;
  return (
    <th className={`tx-th${col ? ' tx-th-sortable' : ''}`} style={style} onClick={() => col && onSort(col)}>
      {children}
      {col && <span className="tx-sort-icon">{active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}</span>}
    </th>
  );
}

export default function Accounts({ data, updateTransaction }) {
  const accounts    = data.accounts || [];
  const transactions = data.transactions || [];

  // Left tree state
  const [selectedAccount, setSelectedAccount]   = useState(null);
  const [expandedGroups, setExpandedGroups]     = useState({ ASSETS: true, LIABILITIES: true });
  const [expandedSubtypes, setExpandedSubtypes] = useState({});

  // Right register filters
  const [period,     setPeriod]     = useState('all');
  const [filterCat,  setFilterCat]  = useState('');
  const [reviewed,   setReviewed]   = useState('all');
  const [search,     setSearch]     = useState('');
  const [sortCol,    setSortCol]    = useState('date');
  const [sortDir,    setSortDir]    = useState('desc');
  const [visibleCols,setVisibleCols]= useState(() => new Set(ALL_COLS.map(c => c.id)));
  const [showColPicker,setShowColPicker] = useState(false);

  const toggleGroup   = (key) => setExpandedGroups(p => ({ ...p, [key]: !p[key] }));
  const toggleSubtype = (key) => setExpandedSubtypes(p => ({ ...p, [key]: !p[key] }));

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const toggleColVis = (id) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Group accounts by hierarchy
  const grouped = {};
  Object.entries(ACCOUNT_HIERARCHY).forEach(([cls, subtypes]) => {
    grouped[cls] = {};
    subtypes.forEach(st => {
      grouped[cls][st] = accounts.filter(a => a.assetClass === cls && a.subtype === st);
    });
  });

  // All categories from transactions for filter dropdown
  const allCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category).filter(Boolean));
    return [...cats].sort();
  }, [transactions]);

  // Selected account object
  const selectedAcc = accounts.find(a => a.id === selectedAccount);

  // Build register: compute running balance then apply filters
  const fullRegister = useMemo(() => {
    if (!selectedAccount) return [];
    const acc = accounts.find(a => a.id === selectedAccount);
    if (!acc) return [];
    // Compute running balance oldest→newest
    let running = acc.startBalance || 0;
    const withBalance = [...transactions]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(tx => {
        const amt = tx.type === 'income' ? tx.amount : -tx.amount;
        running += amt;
        return { ...tx, runningBalance: running };
      });
    return withBalance.reverse(); // newest first
  }, [selectedAccount, transactions, accounts]);

  const filtered = useMemo(() => {
    let txs = applyPeriod(fullRegister, period);
    if (filterCat) txs = txs.filter(t => t.category === filterCat);
    if (reviewed === 'reviewed')   txs = txs.filter(t => !!t.reviewed);
    if (reviewed === 'unreviewed') txs = txs.filter(t => !t.reviewed);
    if (search) {
      const q = search.toLowerCase();
      txs = txs.filter(t =>
        t.description?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
      );
    }
    // Sort
    return [...txs].sort((a, b) => {
      let va, vb;
      if      (sortCol === 'date')     { va = a.date;                              vb = b.date; }
      else if (sortCol === 'payee')    { va = (a.description || '').toLowerCase(); vb = (b.description || '').toLowerCase(); }
      else if (sortCol === 'amount')   { va = a.amount;                            vb = b.amount; }
      else if (sortCol === 'category') { va = (a.category || '').toLowerCase();    vb = (b.category || '').toLowerCase(); }
      else { return 0; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [fullRegister, period, filterCat, reviewed, search, sortCol, sortDir]);

  // Group by month (preserving sort order)
  const byMonth = useMemo(() => {
    const groups = {};
    const orderedKeys = [];
    filtered.forEach(tx => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) { groups[key] = []; orderedKeys.push(key); }
      groups[key].push(tx);
    });
    return orderedKeys.map(k => [k, groups[k]]);
  }, [filtered]);

  // Footer stats
  const inflows  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const outflows = filtered.filter(t => t.type !== 'income').reduce((s, t) => s + t.amount, 0);
  const netChange = inflows - outflows;

  const toggleReviewed = (t) => updateTransaction && updateTransaction(t.id, { reviewed: !t.reviewed });

  const colCount = visibleCols.size;
  const hasActiveFilters = period !== 'all' || filterCat || reviewed !== 'all' || search;

  return (
    <div className="page acc-page">
      <div className="acc-layout">

        {/* ── Left: Account Tree ── */}
        <div className="acc-tree">
          <div className="acc-tree-header">
            <span>Accounts</span>
            <span className="acc-tree-count">{accounts.length}</span>
          </div>

          {Object.entries(ACCOUNT_HIERARCHY).map(([cls, subtypes]) => (
            <div key={cls} className="acc-tree-section">
              <div className="acc-tree-class" onClick={() => toggleGroup(cls)}>
                <span className="acc-tree-toggle">{expandedGroups[cls] ? '▾' : '▸'}</span>
                <span>{cls === 'ASSETS' ? '↗ Assets' : '↘ Liabilities'}</span>
              </div>

              {expandedGroups[cls] && subtypes.map(st => {
                const accs   = grouped[cls]?.[st] || [];
                const stKey  = `${cls}-${st}`;
                const isOpen = expandedSubtypes[stKey] !== false;
                return (
                  <div key={st} className="acc-tree-subtype-group">
                    <div className="acc-tree-subtype" onClick={() => toggleSubtype(stKey)}>
                      <span className="acc-tree-toggle">{isOpen ? '▾' : '▸'}</span>
                      <span>{st}</span>
                      <span className="acc-tree-count">{accs.length}</span>
                    </div>
                    {isOpen && accs.map(acc => (
                      <div
                        key={acc.id}
                        className={`acc-tree-item${selectedAccount === acc.id ? ' selected' : ''}`}
                        onClick={() => setSelectedAccount(acc.id === selectedAccount ? null : acc.id)}
                      >
                        <span className="acc-tree-icon">{acc.icon}</span>
                        <span className="acc-tree-name">{acc.name}</span>
                        <span className={`acc-tree-bal${cls === 'LIABILITIES' ? ' neg' : ''}`}>
                          {fmtAbs(acc.startBalance)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Right: Transaction Register ── */}
        <div className="acc-register">
          {!selectedAccount ? (
            <div className="acc-empty-state">
              <div className="acc-empty-icon">🏦</div>
              <div className="acc-empty-title">Select an Account</div>
              <div className="acc-empty-sub">Choose an account from the left to view its transaction history</div>
            </div>
          ) : (
            <>
              {/* Register header */}
              <div className="acc-reg-header">
                <div className="acc-reg-title">
                  <span className="acc-reg-icon">{selectedAcc?.icon}</span>
                  <div>
                    <h2>{selectedAcc?.name}</h2>
                    <div className="acc-reg-subtitle">{selectedAcc?.subtype} · {filtered.length} of {fullRegister.length} transactions</div>
                  </div>
                </div>
                <div className="tx-stats-bar">
                  <span className="tx-stat-item"><span className="tx-stat-lbl">IN</span> <span className="tx-stat-in">{fmtAbs(inflows)}</span></span>
                  <span className="tx-stat-item"><span className="tx-stat-lbl">OUT</span> <span className="tx-stat-out">-{fmtAbs(outflows)}</span></span>
                  <span className="tx-stat-item"><span className="tx-stat-lbl">NET</span> <span className={netChange >= 0 ? 'tx-stat-in' : 'tx-stat-out'}>{netChange >= 0 ? fmtAbs(netChange) : `-${fmtAbs(netChange)}`}</span></span>
                </div>
              </div>

              {/* Filter bar */}
              <div className="tx-filter-bar" style={{ borderTop: 'none', borderRadius: 0 }}>
                <div className="tx-filter-left">
                  <select className="tx-filter-select" value={period} onChange={e => setPeriod(e.target.value)}>
                    {TIME_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>

                  <select className="tx-filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                    <option value="">⊕ Category</option>
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <div className="tx-type-pills">
                    <button className={`tx-pill${reviewed === 'reviewed' ? ' tx-pill-active' : ''}`} onClick={() => setReviewed(r => r === 'reviewed' ? 'all' : 'reviewed')}>✓ Reviewed</button>
                    <button className={`tx-pill${reviewed === 'unreviewed' ? ' tx-pill-active' : ''}`} onClick={() => setReviewed(r => r === 'unreviewed' ? 'all' : 'unreviewed')}>Unreviewed</button>
                  </div>
                </div>

                <div className="tx-filter-right">
                  <input className="tx-search" placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} />

                  <div className="tx-col-picker-wrapper">
                    <button className="tx-col-btn" onClick={() => setShowColPicker(v => !v)}>Columns · {visibleCols.size}</button>
                    {showColPicker && (
                      <div className="tx-col-dropdown">
                        {ALL_COLS.map(c => (
                          <label key={c.id} className="tx-col-option">
                            <input type="checkbox" checked={visibleCols.has(c.id)} onChange={() => toggleColVis(c.id)} />
                            {c.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {hasActiveFilters && (
                    <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                      onClick={() => { setPeriod('all'); setFilterCat(''); setReviewed('all'); setSearch(''); }}>
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="acc-reg-body">
                <table className="tx-table" style={{ borderRadius: 0 }}>
                  <thead>
                    <tr className="tx-thead-row">
                      {visibleCols.has('date')    && <SortTh col="date"    sortCol={sortCol} sortDir={sortDir} onSort={handleSort} style={{ minWidth: 100, textAlign: 'left' }}>Date</SortTh>}
                      {visibleCols.has('payee')   && <SortTh col="payee"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort} style={{ textAlign: 'left' }}>Payee</SortTh>}
                      {visibleCols.has('amount')  && <SortTh col="amount"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} style={{ minWidth: 110, textAlign: 'right' }}>Amount</SortTh>}
                      {visibleCols.has('balance') && <th className="tx-th" style={{ minWidth: 110, textAlign: 'right' }}>Balance</th>}
                      {visibleCols.has('category')&& <SortTh col="category" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} style={{ textAlign: 'left' }}>Category</SortTh>}
                      {visibleCols.has('notes')   && <th className="tx-th" style={{ textAlign: 'left' }}>Notes</th>}
                      {visibleCols.has('status')  && <th className="tx-th" style={{ width: 64, textAlign: 'center' }}>Status</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={colCount} className="tx-empty-row">No transactions found.</td></tr>
                    )}
                    {byMonth.map(([monthKey, txs]) => {
                      const [yr, mo] = monthKey.split('-');
                      const label = new Date(parseInt(yr), parseInt(mo) - 1, 1)
                        .toLocaleString('default', { month: 'long', year: 'numeric' });
                      const mIn     = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
                      const mOut    = txs.filter(t => t.type !== 'income').reduce((s, t) => s + t.amount, 0);
                      const mNet    = mIn - mOut;
                      const starting = txs.length ? (txs[txs.length - 1].runningBalance - (txs[txs.length - 1].type === 'income' ? txs[txs.length - 1].amount : -txs[txs.length - 1].amount)) : 0;
                      const ending   = txs.length ? txs[0].runningBalance : 0;
                      return [
                        <tr key={`hdr-${monthKey}`} className="tx-month-header-row">
                          <td colSpan={colCount}>
                            <div className="tx-month-header">
                              <span className="tx-month-label">{label}</span>
                              <span className="tx-month-stats">
                                <span><span className="tx-stat-lbl">STARTING</span> <span style={{ color: 'var(--text)' }}>{fmtAbs(starting)}</span></span>
                                <span><span className="tx-stat-lbl">CHANGE</span> <span className={mNet >= 0 ? 'tx-stat-in' : 'tx-stat-out'}>{mNet >= 0 ? fmtAbs(mNet) : `-${fmtAbs(mNet)}`}</span></span>
                                <span><span className="tx-stat-lbl">ENDING</span> <span style={{ color: 'var(--text)' }}>{fmtAbs(ending)}</span></span>
                                <span className="tx-month-count">{txs.length}</span>
                              </span>
                            </div>
                          </td>
                        </tr>,
                        ...txs.map(tx => (
                          <tr key={tx.id} className="tx-row">
                            {visibleCols.has('date')    && <td className="tx-col-date">{tx.date}</td>}
                            {visibleCols.has('payee')   && <td className="tx-col-payee">{tx.description}</td>}
                            {visibleCols.has('amount')  && <td style={{ textAlign: 'right' }}>
                              <span className={tx.type === 'income' ? 'tx-amt-in' : 'tx-amt-out'}>
                                {tx.type !== 'income' ? `-${fmtAbs(tx.amount)}` : fmtAbs(tx.amount)}
                              </span>
                            </td>}
                            {visibleCols.has('balance') && <td style={{ textAlign: 'right', color: 'var(--muted)', fontWeight: 500 }}>{fmtAbs(tx.runningBalance)}</td>}
                            {visibleCols.has('category')&& <td><span className="tx-cat-badge">{tx.category}</span></td>}
                            {visibleCols.has('notes')   && <td className="tx-col-notes">{tx.notes || <span style={{ color: 'var(--muted)' }}>—</span>}</td>}
                            {visibleCols.has('status')  && <td style={{ textAlign: 'center' }}>
                              <button
                                className={`tx-reviewed-btn${tx.reviewed ? ' tx-reviewed-on' : ''}`}
                                onClick={() => toggleReviewed(tx)}
                                title={tx.reviewed ? 'Mark unreviewed' : 'Mark reviewed'}
                              >✓</button>
                            </td>}
                          </tr>
                        )),
                      ];
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="acc-reg-footer">
                <div className="acc-reg-stat">
                  <span className="acc-reg-stat-label">INFLOWS</span>
                  <span className="acc-reg-stat-val tx-stat-in">{fmtAbs(inflows)}</span>
                </div>
                <div className="acc-reg-stat">
                  <span className="acc-reg-stat-label">OUTFLOWS</span>
                  <span className="acc-reg-stat-val tx-stat-out">-{fmtAbs(outflows)}</span>
                </div>
                <div className="acc-reg-stat">
                  <span className="acc-reg-stat-label">NET CHANGE</span>
                  <span className={`acc-reg-stat-val ${netChange >= 0 ? 'tx-stat-in' : 'tx-stat-out'}`}>{netChange >= 0 ? fmtAbs(netChange) : `-${fmtAbs(netChange)}`}</span>
                </div>
                <div className="acc-reg-stat">
                  <span className="acc-reg-stat-label">SHOWN</span>
                  <span className="acc-reg-stat-val">{filtered.length} / {fullRegister.length}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
