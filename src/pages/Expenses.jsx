import { useState, useMemo, useRef } from 'react';

const GROUPS = ['Income', 'Expenses', 'Savings', 'Debt'];
const TYPES  = ['income', 'expense', 'savings', 'debt'];
const GROUP_BY_TYPE = {
  income: 'Income',
  expense: 'Expenses',
  savings: 'Savings',
  debt: 'Debt',
};
const fmtAbs = (n) => `$${Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const normalizeAmount = (v) => Math.abs(Number(v) || 0);

function sortAlpha(values = []) {
  return [...values].sort((a, b) => String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' }));
}

function categoriesForType(type, categories) {
  const group = GROUP_BY_TYPE[type] || 'Expenses';
  return sortAlpha(categories[group] || []);
}

function groupedCategoryOptions(categories) {
  return GROUPS.map((group) => ({ group, items: sortAlpha(categories[group] || []) })).filter((entry) => entry.items.length > 0);
}

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

// ── CSV helpers ────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  return lines.slice(1).map(line => {
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = (cols[i] || '').replace(/^"|"$/g, ''); });
    return row;
  });
}

function pickField(row, aliases) {
  for (const a of aliases) {
    if (row[a] !== undefined && row[a] !== '') return row[a];
  }
  return '';
}

function rowToTransaction(row, categories) {
  const allCats = GROUPS.flatMap(g => categories[g] || []);
  const date        = pickField(row, ['date', 'transaction date', 'trans date', 'posted date']);
  const description = pickField(row, ['description', 'desc', 'memo', 'payee', 'name', 'merchant']);
  const rawAmount   = pickField(row, ['amount', 'debit', 'credit', 'value']);
  const amount      = Math.abs(parseFloat(rawAmount.replace(/[$,]/g, '')) || 0);
  const category    = pickField(row, ['category', 'cat']);
  const type        = pickField(row, ['type']) || 'expense';
  const notes       = pickField(row, ['notes', 'note', 'memo', 'reference']);
  const sub         = pickField(row, ['subscription', 'sub', 'recurring']);
  let group = 'Expenses';
  for (const g of GROUPS) {
    if ((categories[g] || []).includes(category)) { group = g; break; }
  }
  return {
    date: date || new Date().toISOString().slice(0, 10),
    description: description || '(imported)',
    category: category || allCats[0] || '',
    group, amount,
    type: TYPES.includes(type.toLowerCase()) ? type.toLowerCase() : 'expense',
    is_subscription: sub === 'true' || sub === '1' || sub === 'yes',
    notes,
  };
}

function emptyForm(categories) {
  const allCats = GROUPS.flatMap(g => categories[g] || []);
  return {
    date: new Date().toISOString().slice(0, 10),
    description: '',
    category: allCats[0] || '',
    group: GROUPS[0],
    amount: '',
    type: 'expense',
    is_subscription: false,
    notes: '',
  };
}

// ── Column definitions ─────────────────────────────────────────────────────
const ALL_COLS = [
  { id: 'date',     label: 'Date',     sortable: true },
  { id: 'payee',    label: 'Payee',    sortable: true },
  { id: 'category', label: 'Category', sortable: true },
  { id: 'amount',   label: 'Amount',   sortable: true },
  { id: 'type',     label: 'Type',     sortable: true },
  { id: 'notes',    label: 'Notes',    sortable: false },
  { id: 'status',   label: 'Status',   sortable: false },
];

// ── Sort helper ────────────────────────────────────────────────────────────
function sortTxs(txs, col, dir) {
  return [...txs].sort((a, b) => {
    let va, vb;
    if      (col === 'date')     { va = a.date;                              vb = b.date; }
    else if (col === 'payee')    { va = (a.description || '').toLowerCase(); vb = (b.description || '').toLowerCase(); }
    else if (col === 'amount')   { va = a.amount;                            vb = b.amount; }
    else if (col === 'category') { va = (a.category || '').toLowerCase();    vb = (b.category || '').toLowerCase(); }
    else if (col === 'type')     { va = (a.type || '').toLowerCase();        vb = (b.type || '').toLowerCase(); }
    else { return 0; }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

// ── Sortable column header ─────────────────────────────────────────────────
function SortTh({ col, sortCol, sortDir, onSort, children, style }) {
  const active = sortCol === col;
  return (
    <th className={`tx-th${col ? ' tx-th-sortable' : ''}`} style={style} onClick={() => col && onSort(col)}>
      {children}
      {col && <span className="tx-sort-icon">{active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}</span>}
    </th>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Expenses({ data, addTransaction, deleteTransaction, updateTransaction, importTransactions }) {
  const { transactions, categories } = data;
  const allCategories = useMemo(() => sortAlpha(GROUPS.flatMap(g => categories[g] || [])), [categories]);
  const groupedOptions = useMemo(() => groupedCategoryOptions(categories), [categories]);

  // Filters
  const [period,     setPeriod]     = useState('all');
  const [filterCat,  setFilterCat]  = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [reviewed,   setReviewed]   = useState('all');
  const [search,     setSearch]     = useState('');

  // Sorting
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  // Column visibility
  const [visibleCols, setVisibleCols] = useState(() => new Set(ALL_COLS.map(c => c.id)));
  const [showColPicker, setShowColPicker] = useState(false);

  // Add form
  const [form, setForm]       = useState(() => emptyForm(categories));
  const [showForm, setShowForm] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState(null);
  const [editForm,  setEditForm]  = useState(null);

  // CSV import
  const csvInputRef = useRef(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [csvError,   setCsvError]   = useState('');

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const toggleCol = (id) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Apply all filters then sort
  const filtered = useMemo(() => {
    let txs = applyPeriod(transactions, period);
    if (filterCat) txs = txs.filter(t => t.category === filterCat);
    if (typeFilter !== 'all') txs = txs.filter(t => t.type === typeFilter);
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
    return sortTxs(txs, sortCol, sortDir);
  }, [transactions, period, filterCat, typeFilter, reviewed, search, sortCol, sortDir]);

  // Group by month (for display when sorted by date)
  const byMonth = useMemo(() => {
    const groups = {};
    filtered.forEach(tx => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    // Preserve the sort order for month keys
    const orderedKeys = [];
    filtered.forEach(tx => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!orderedKeys.includes(key)) orderedKeys.push(key);
    });
    return orderedKeys.map(k => [k, groups[k]]);
  }, [filtered]);

  // Overall stats
  const totalIn  = useMemo(() => filtered.filter(t => t.type === 'income').reduce((s, t) => s + normalizeAmount(t.amount), 0), [filtered]);
  const totalOut = useMemo(() => filtered.filter(t => t.type !== 'income').reduce((s, t) => s + normalizeAmount(t.amount), 0), [filtered]);
  const totalNet = totalIn - totalOut;

  // Form handlers
  const handleGroupChange = (e) => {
    const grp = e.target.value;
    setForm(f => ({ ...f, group: grp, category: sortAlpha(categories[grp] || [])[0] || '' }));
  };

  const handleTypeChange = (nextType) => {
    const nextGroup = GROUP_BY_TYPE[nextType] || form.group;
    const nextCats = categoriesForType(nextType, categories);
    setForm((f) => ({
      ...f,
      type: nextType,
      group: nextGroup,
      category: nextCats.includes(f.category) ? f.category : (nextCats[0] || ''),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description || !form.amount || !form.date) return;
    addTransaction({ ...form, amount: normalizeAmount(form.amount) });
    setForm(emptyForm(categories));
    setShowForm(false);
  };

  const startEdit  = (t) => { setEditingId(t.id); setEditForm({ ...t }); };
  const cancelEdit = ()  => { setEditingId(null); setEditForm(null); };
  const saveEdit   = ()  => {
    if (!editForm) return;
    updateTransaction(editingId, { ...editForm, amount: normalizeAmount(editForm.amount) });
    setEditingId(null); setEditForm(null);
  };

  const toggleReviewed = (t) => updateTransaction(t.id, { reviewed: !t.reviewed });

  // CSV handlers
  const handleCSVFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setCsvError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target.result);
        if (!rows.length) { setCsvError('No data rows found in CSV.'); return; }
        setCsvPreview(rows.map(r => rowToTransaction(r, categories)));
      } catch (err) { setCsvError('Failed to parse CSV: ' + err.message); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  const handleCSVImport = () => {
    if (!csvPreview) return;
    if (importTransactions) importTransactions(csvPreview);
    else csvPreview.forEach(tx => addTransaction(tx));
    setCsvPreview(null);
  };
  const updatePreviewRow = (i, field, value) =>
    setCsvPreview(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  const removePreviewRow = (i) =>
    setCsvPreview(prev => { const n = prev.filter((_, idx) => idx !== i); return n.length ? n : null; });

  const hasActiveFilters = period !== 'all' || filterCat || typeFilter !== 'all' || reviewed !== 'all' || search;
  const colCount = visibleCols.size + 1; // +1 for actions column

  return (
    <div className="page tx-page">

      {/* ── Page header ── */}
      <div className="tx-top-bar">
        <div className="tx-top-left">
          <h1 className="tx-title">Transactions</h1>
          <span className="tx-count">{filtered.length} of {transactions.length} transactions</span>
        </div>
        <div className="tx-top-right">
          <div className="tx-stats-bar">
            <span className="tx-stat-item">
              <span className="tx-stat-lbl">IN</span>
              <span className="tx-stat-in">{fmtAbs(totalIn)}</span>
            </span>
            <span className="tx-stat-item">
              <span className="tx-stat-lbl">OUT</span>
              <span className="tx-stat-out">-{fmtAbs(totalOut)}</span>
            </span>
            <span className="tx-stat-item">
              <span className="tx-stat-lbl">NET</span>
              <span className={totalNet >= 0 ? 'tx-stat-in' : 'tx-stat-out'}>
                {totalNet >= 0 ? fmtAbs(totalNet) : `-${fmtAbs(totalNet)}`}
              </span>
            </span>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕ Cancel' : '+ Add'}
          </button>
          <button className="btn-ghost" onClick={() => csvInputRef.current?.click()}>⬆ Import CSV</button>
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleCSVFile} />
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="tx-filter-bar">
        <div className="tx-filter-left">
          <select className="tx-filter-select" value={period} onChange={e => setPeriod(e.target.value)}>
            {TIME_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          <select className="tx-filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">⊕ Category</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="tx-type-pills">
            {[['all','All'],['income','Income'],['expense','Expense'],['savings','Savings'],['debt','Debt']].map(([v, l]) => (
              <button key={v} className={`tx-pill${typeFilter === v ? ' tx-pill-active' : ''}`} onClick={() => setTypeFilter(v)}>{l}</button>
            ))}
          </div>

          <div className="tx-type-pills">
            <button className={`tx-pill${reviewed === 'reviewed' ? ' tx-pill-active' : ''}`} onClick={() => setReviewed(r => r === 'reviewed' ? 'all' : 'reviewed')}>✓ Reviewed</button>
            <button className={`tx-pill${reviewed === 'unreviewed' ? ' tx-pill-active' : ''}`} onClick={() => setReviewed(r => r === 'unreviewed' ? 'all' : 'unreviewed')}>Unreviewed</button>
          </div>
        </div>

        <div className="tx-filter-right">
          <input className="tx-search" placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} />

          <div className="tx-col-picker-wrapper">
            <button className="tx-col-btn" onClick={() => setShowColPicker(v => !v)}>
              Columns · {visibleCols.size}
            </button>
            {showColPicker && (
              <div className="tx-col-dropdown">
                {ALL_COLS.map(c => (
                  <label key={c.id} className="tx-col-option">
                    <input type="checkbox" checked={visibleCols.has(c.id)} onChange={() => toggleCol(c.id)} />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '5px 10px' }}
              onClick={() => { setPeriod('all'); setFilterCat(''); setTypeFilter('all'); setReviewed('all'); setSearch(''); }}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Add Transaction Form ── */}
      {showForm && (
        <form className="tx-form card" onSubmit={handleSubmit}>
          <h3>New Transaction</h3>
          <div className="form-grid">
            <label>Date<input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required /></label>
            <label>Payee / Description<input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Grocery run" required /></label>
            <label>Group
              <select value={form.group} onChange={handleGroupChange}>
                {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <label>Category
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {categoriesForType(form.type, categories).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>Amount ($)<input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required /></label>
            <label>Type
              <select value={form.type} onChange={e => handleTypeChange(e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={form.is_subscription} onChange={e => setForm(f => ({ ...f, is_subscription: e.target.checked }))} />
              Subscription / Recurring
            </label>
            <label className="full-width">Notes<input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" /></label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">Save Transaction</button>
          </div>
        </form>
      )}

      {/* ── CSV Error / Preview ── */}
      {csvError && (
        <div className="card" style={{ color: 'var(--danger)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          ⚠ {csvError}
          <button className="btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => setCsvError('')}>Dismiss</button>
        </div>
      )}
      {csvPreview && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="tx-csv-header">
            <span style={{ fontWeight: 700 }}>CSV Preview — {csvPreview.length} rows</span>
            <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Review before importing. Click ✕ to remove a row.</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={handleCSVImport}>Import {csvPreview.length} Transactions</button>
              <button className="btn-ghost" onClick={() => setCsvPreview(null)}>Cancel</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Date</th>
                  <th style={{ textAlign: 'left' }}>Description</th>
                  <th style={{ textAlign: 'left' }}>Category</th>
                  <th style={{ textAlign: 'left' }}>Group</th>
                  <th>Amount</th>
                  <th style={{ textAlign: 'left' }}>Type</th>
                  <th>Sub?</th>
                  <th style={{ textAlign: 'left' }}>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {csvPreview.map((row, i) => (
                  <tr key={i}>
                    <td><input type="date" value={row.date} onChange={e => updatePreviewRow(i,'date',e.target.value)} className="tx-inline-input" style={{ width: 130 }} /></td>
                    <td><input type="text"  value={row.description} onChange={e => updatePreviewRow(i,'description',e.target.value)} className="tx-inline-input" style={{ minWidth: 140 }} /></td>
                    <td>
                      <select value={row.category} onChange={e => updatePreviewRow(i,'category',e.target.value)} className="tx-inline-select">
                        {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={row.group} onChange={e => updatePreviewRow(i,'group',e.target.value)} className="tx-inline-select">
                        {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </td>
                    <td><input type="number" value={row.amount} min="0" step="0.01" onChange={e => updatePreviewRow(i,'amount',parseFloat(e.target.value)||0)} className="tx-inline-input" style={{ width: 90, textAlign: 'right' }} /></td>
                    <td>
                      <select value={row.type} onChange={e => updatePreviewRow(i,'type',e.target.value)} className="tx-inline-select">
                        {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={{ textAlign: 'center' }}><input type="checkbox" checked={!!row.is_subscription} onChange={e => updatePreviewRow(i,'is_subscription',e.target.checked)} /></td>
                    <td><input type="text" value={row.notes} onChange={e => updatePreviewRow(i,'notes',e.target.value)} className="tx-inline-input" style={{ minWidth: 100 }} /></td>
                    <td><button className="btn-danger-sm" onClick={() => removePreviewRow(i)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Transaction Table ── */}
      <div className="tx-table-wrapper">
        <table className="tx-table">
          <thead>
            <tr className="tx-thead-row">
              {visibleCols.has('date')     && <SortTh col="date"     sortCol={sortCol} sortDir={sortDir} onSort={handleSort} style={{ minWidth: 100, textAlign: 'left' }}>Date</SortTh>}
              {visibleCols.has('payee')    && <SortTh col="payee"    sortCol={sortCol} sortDir={sortDir} onSort={handleSort} style={{ textAlign: 'left' }}>Payee</SortTh>}
              {visibleCols.has('category') && <SortTh col="category" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} style={{ textAlign: 'left' }}>Category</SortTh>}
              {visibleCols.has('amount')   && <SortTh col="amount"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort} style={{ minWidth: 110, textAlign: 'right' }}>Amount</SortTh>}
              {visibleCols.has('type')     && <SortTh col="type"     sortCol={sortCol} sortDir={sortDir} onSort={handleSort} style={{ minWidth: 90, textAlign: 'left' }}>Type</SortTh>}
              {visibleCols.has('notes')    && <th className="tx-th" style={{ textAlign: 'left' }}>Notes</th>}
              {visibleCols.has('status')   && <th className="tx-th" style={{ width: 64, textAlign: 'center' }}>Status</th>}
              <th className="tx-th" style={{ width: 72 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={colCount} className="tx-empty-row">No transactions match your filters.</td></tr>
            )}
            {byMonth.map(([monthKey, txs]) => {
              const [yr, mo] = monthKey.split('-');
              const label = new Date(parseInt(yr), parseInt(mo) - 1, 1)
                .toLocaleString('default', { month: 'long', year: 'numeric' });
              const mIn  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
              const mOut = txs.filter(t => t.type !== 'income').reduce((s, t) => s + t.amount, 0);
              const mNet = mIn - mOut;
              return [
                <tr key={`hdr-${monthKey}`} className="tx-month-header-row">
                  <td colSpan={colCount}>
                    <div className="tx-month-header">
                      <span className="tx-month-label">{label}</span>
                      <span className="tx-month-stats">
                        <span><span className="tx-stat-lbl">IN</span> <span className="tx-stat-in">{fmtAbs(mIn)}</span></span>
                        <span><span className="tx-stat-lbl">OUT</span> <span className="tx-stat-out">-{fmtAbs(mOut)}</span></span>
                        <span><span className="tx-stat-lbl">NET</span> <span className={mNet >= 0 ? 'tx-stat-in' : 'tx-stat-out'}>{mNet >= 0 ? fmtAbs(mNet) : `-${fmtAbs(mNet)}`}</span></span>
                        <span className="tx-month-count">{txs.length}</span>
                      </span>
                    </div>
                  </td>
                </tr>,
                ...txs.map(t => {
                  if (editingId === t.id && editForm) {
                    return (
                      <tr key={t.id} className="tx-edit-row">
                        {visibleCols.has('date')     && <td><input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} className="tx-inline-input" style={{ width: 130 }} /></td>}
                        {visibleCols.has('payee')    && <td><input type="text"  value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="tx-inline-input" style={{ width: '100%', minWidth: 140 }} /></td>}
                        {visibleCols.has('category') && <td>
                          <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} className="tx-inline-select">
                            {groupedOptions.map(({ group, items }) => (
                              <optgroup key={group} label={group}>
                                {items.map(c => <option key={`${group}-${c}`} value={c}>{c}</option>)}
                              </optgroup>
                            ))}
                          </select>
                        </td>}
                        {visibleCols.has('amount') && <td style={{ textAlign: 'right' }}>
                          <input type="number" value={editForm.amount} min="0" step="0.01" onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} className="tx-inline-input" style={{ width: 90, textAlign: 'right' }} />
                        </td>}
                        {visibleCols.has('type') && <td>
                          <select
                            value={editForm.type}
                            onChange={e => {
                              const nextType = e.target.value;
                              const nextCats = categoriesForType(nextType, categories);
                              setEditForm(f => ({
                                ...f,
                                type: nextType,
                                group: GROUP_BY_TYPE[nextType] || f.group,
                                category: nextCats.includes(f.category) ? f.category : (nextCats[0] || ''),
                              }));
                            }}
                            className="tx-inline-select"
                          >
                            {TYPES.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                          </select>
                        </td>}
                        {visibleCols.has('notes')  && <td><input type="text" value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="tx-inline-input" style={{ width: '100%', minWidth: 100 }} /></td>}
                        {visibleCols.has('status') && <td style={{ textAlign: 'center' }}><input type="checkbox" checked={!!editForm.reviewed} onChange={e => setEditForm(f => ({ ...f, reviewed: e.target.checked }))} /></td>}
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                          <button className="btn-primary" style={{ padding: '3px 8px', fontSize: '0.78rem', marginRight: 4 }} onClick={saveEdit}>✓</button>
                          <button className="btn-ghost"   style={{ padding: '3px 8px', fontSize: '0.78rem' }} onClick={cancelEdit}>✕</button>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={t.id} className="tx-row" onDoubleClick={() => startEdit(t)}>
                      {visibleCols.has('date')     && <td className="tx-col-date">{t.date}</td>}
                      {visibleCols.has('payee')    && <td className="tx-col-payee">{t.description}</td>}
                      {visibleCols.has('category') && <td><span className="tx-cat-badge">{t.category}</span></td>}
                      {visibleCols.has('amount')   && <td style={{ textAlign: 'right' }}>
                        <span className={t.type === 'income' ? 'tx-amt-in' : 'tx-amt-out'}>
                          {t.type !== 'income' ? `-${fmtAbs(t.amount)}` : fmtAbs(t.amount)}
                        </span>
                      </td>}
                      {visibleCols.has('type')   && <td><span className={`tx-type-badge tx-type-${t.type}`}>{t.type}</span></td>}
                      {visibleCols.has('notes')  && <td className="tx-col-notes">{t.notes || <span style={{ color: 'var(--muted)' }}>—</span>}</td>}
                      {visibleCols.has('status') && <td style={{ textAlign: 'center' }}>
                        <button className={`tx-reviewed-btn${t.reviewed ? ' tx-reviewed-on' : ''}`} onClick={() => toggleReviewed(t)} title={t.reviewed ? 'Mark unreviewed' : 'Mark reviewed'}>✓</button>
                      </td>}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="tx-action-btn" title="Edit" onClick={() => startEdit(t)}>✎</button>
                        <button className="tx-action-btn tx-action-del" title="Delete" onClick={() => deleteTransaction(t.id)}>✕</button>
                      </td>
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
