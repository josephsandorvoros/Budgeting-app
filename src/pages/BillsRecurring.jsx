import { useState, useMemo } from 'react';

const FREQUENCIES = ['Daily', 'Weekly', 'Bi-Weekly', 'Monthly', 'Quarterly', 'Annually'];
const MATCH_TYPES = ['Contains', 'Exact', 'Starts With', 'Ends With'];
const AMOUNT_TYPES = ['Fixed Amount', 'Variable Amount', 'Range'];

const fmt = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v);

const EMPTY_BILL = {
  name: '', payeePattern: '', matchType: 'Contains',
  amountType: 'Fixed Amount', amount: 0, frequency: 'Monthly',
  nextDueDate: new Date().toISOString().slice(0, 10), dayOfMonth: '',
  billType: 'expense', category: '', accountId: '',
};

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  return `${diff}d`;
}

function BillModal({ bill, categories, accounts, onSave, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_BILL, ...bill });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{bill?.id ? 'Edit Bill' : 'New Bill'}</h2>
            <div className="modal-subtitle">Set up a recurring expense or income</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body modal-split">
          {/* Left form */}
          <div className="bill-form">
            <div className="form-row">
              <label>NAME</label>
              <input className="form-input" placeholder="e.g., Netflix Subscription" value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
            </div>
            <div className="form-row-2">
              <div className="form-row">
                <label>PAYEE PATTERN</label>
                <input className="form-input" placeholder="e.g., Netflix" value={form.payeePattern} onChange={e => set('payeePattern', e.target.value)} />
              </div>
              <div className="form-row">
                <label>MATCH TYPE</label>
                <select className="form-input" value={form.matchType} onChange={e => set('matchType', e.target.value)}>
                  {MATCH_TYPES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-row">
                <label>AMOUNT TYPE</label>
                <select className="form-input" value={form.amountType} onChange={e => set('amountType', e.target.value)}>
                  {AMOUNT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>AMOUNT</label>
                <div className="form-input-prefix">
                  <span>$</span>
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-row">
                <label>FREQUENCY</label>
                <select className="form-input" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                  {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>NEXT DUE DATE</label>
                <input className="form-input" type="date" value={form.nextDueDate} onChange={e => set('nextDueDate', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <label>DAY OF MONTH (OPTIONAL)</label>
              <input className="form-input" type="number" min="1" max="31" placeholder="Auto-detect from due date" value={form.dayOfMonth} onChange={e => set('dayOfMonth', e.target.value)} />
            </div>
            <div className="form-row">
              <label>TYPE</label>
              <div className="bill-type-toggle">
                <button className={`bill-type-btn${form.billType === 'expense' ? ' active-expense' : ''}`} onClick={() => set('billType', 'expense')}>
                  ↘ Expense
                </button>
                <button className={`bill-type-btn${form.billType === 'income' ? ' active-income' : ''}`} onClick={() => set('billType', 'income')}>
                  ↗ Income
                </button>
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-row">
                <label>CATEGORY</label>
                <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="">Select category...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>ACCOUNT</label>
                <select className="form-input" value={form.accountId} onChange={e => set('accountId', e.target.value)}>
                  <option value="">Select account...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Right: Transaction history preview */}
          <div className="bill-history-panel">
            <div className="bill-history-title">⏱ TRANSACTION HISTORY</div>
            <div className="bill-history-empty">
              <div className="bill-history-icon">📅</div>
              <div>Enter a payee pattern to see matching transactions</div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => { onSave(form); onClose(); }}>
            {bill?.id ? 'Save Changes' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BillsRecurring({ data, addBill, updateBill, deleteBill }) {
  const bills = data.bills || [];
  const transactions = data.transactions || [];
  const accounts = data.accounts || [];
  const [showModal, setShowModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);

  // All categories from data
  const categories = useMemo(() => {
    const cats = new Set();
    Object.values(data.categories || {}).forEach(arr => arr.forEach(c => cats.add(c)));
    return [...cats];
  }, [data.categories]);

  const expenseBills = bills.filter(b => b.billType !== 'income');
  const incomeBills  = bills.filter(b => b.billType === 'income');

  const monthlyFixed   = expenseBills.filter(b => b.frequency === 'Monthly' && b.amountType === 'Fixed Amount').reduce((s, b) => s + (b.amount || 0), 0);
  const monthlyIncome  = incomeBills.filter(b => b.frequency === 'Monthly').reduce((s, b) => s + (b.amount || 0), 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = [...bills]
    .filter(b => b.nextDueDate)
    .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate))
    .filter(b => new Date(b.nextDueDate) >= today);
  const nextBill = upcoming[0];

  const thisWeek = upcoming.filter(b => {
    const diff = (new Date(b.nextDueDate) - today) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }).length;

  // Group by category
  const byCategory = useMemo(() => {
    const groups = {};
    bills.forEach(b => {
      const cat = b.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(b);
    });
    return Object.entries(groups);
  }, [bills]);

  const handleSave = (form) => {
    if (form.id) {
      updateBill(form.id, form);
    } else {
      addBill(form);
    }
  };

  return (
    <div className="page bills-page">
      <div className="page-header">
        <div>
          <h1>Bills &amp; Recurring</h1>
          <div className="subtitle">{bills.length} Rule{bills.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="bills-header-actions">
          <button className="btn-outline bills-detect-btn" title="Scan transactions for recurring patterns">
            🔍 Detect Bills
          </button>
          <button className="btn-primary" onClick={() => { setEditingBill(null); setShowModal(true); }}>
            ＋ New Bill
          </button>
        </div>
      </div>

      {/* Stats tiles */}
      <div className="bills-stats">
        <div className="bills-stat-tile bills-stat-expense">
          <div className="bills-stat-icon">↘</div>
          <div className="bills-stat-label">MONTHLY FIXED</div>
          <div className="bills-stat-val">{fmt(monthlyFixed)}</div>
          <div className="bills-stat-sub">Recurring expenses</div>
        </div>
        <div className="bills-stat-tile bills-stat-income">
          <div className="bills-stat-icon">↗</div>
          <div className="bills-stat-label">MONTHLY INCOME</div>
          <div className="bills-stat-val">{fmt(monthlyIncome)}</div>
          <div className="bills-stat-sub">Recurring revenue</div>
        </div>
        <div className="bills-stat-tile bills-stat-next">
          <div className="bills-stat-icon">⏰</div>
          <div className="bills-stat-label">NEXT BILL</div>
          <div className="bills-stat-val">{nextBill ? fmt(nextBill.amount) : '—'}</div>
          <div className="bills-stat-sub">{nextBill ? `Due ${new Date(nextBill.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'No upcoming bills'}</div>
        </div>
        <div className="bills-stat-tile bills-stat-week">
          <div className="bills-stat-icon">📅</div>
          <div className="bills-stat-label">THIS WEEK</div>
          <div className="bills-stat-val">{thisWeek}</div>
          <div className="bills-stat-sub">Bill{thisWeek !== 1 ? 's' : ''} due soon</div>
        </div>
      </div>

      {/* Bills list by category */}
      {bills.length === 0 ? (
        <div className="bills-empty">
          <div>🔄</div>
          <div className="bills-empty-title">No recurring bills yet</div>
          <div className="bills-empty-sub">Add bills to track your recurring expenses and income</div>
          <button className="btn-primary" onClick={() => { setEditingBill(null); setShowModal(true); }}>＋ Add First Bill</button>
        </div>
      ) : (
        <div className="bills-list">
          {byCategory.map(([cat, catBills]) => {
            const catTotal = catBills.reduce((s, b) => s + (b.billType !== 'income' ? b.amount : 0), 0);
            return (
              <div key={cat} className="bills-category-group">
                <div className="bills-cat-header">
                  <span className="bills-cat-name">{cat}</span>
                  <span className="bills-cat-count">{catBills.length} bill{catBills.length !== 1 ? 's' : ''}</span>
                  <span className="bills-cat-total">{fmt(catTotal)}/mo</span>
                </div>

                {catBills.map(bill => (
                  <div key={bill.id} className={`bills-row${bill.billType === 'income' ? ' bills-row-income' : ''}`}>
                    <div className="bills-row-left">
                      <div className="bills-row-indicator" />
                      <div className="bills-row-info">
                        <span className="bills-row-name">{bill.name}</span>
                        <div className="bills-row-tags">
                          {bill.category && <span className="bills-tag bills-tag-cat">{bill.category}</span>}
                          <span className="bills-tag">{bill.frequency}</span>
                          {bill.dayOfMonth && <span className="bills-tag">{bill.dayOfMonth}{['st','nd','rd'][((bill.dayOfMonth % 10) - 1)] || 'th'} of month</span>}
                        </div>
                      </div>
                    </div>
                    <div className="bills-row-right">
                      <span className={`bills-row-amount${bill.billType === 'income' ? ' pos' : ' neg'}`}>
                        {bill.billType !== 'income' ? '-' : '+'}{fmt(bill.amount)}
                      </span>
                      {bill.nextDueDate && (
                        <span className="bills-row-due">{daysUntil(bill.nextDueDate)}</span>
                      )}
                      <div className="bills-row-actions">
                        <button className="icon-btn" onClick={() => { setEditingBill(bill); setShowModal(true); }} title="Edit">✏️</button>
                        <button className="icon-btn icon-btn-danger" onClick={() => deleteBill(bill.id)} title="Delete">🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <BillModal
          bill={editingBill}
          categories={categories}
          accounts={accounts}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingBill(null); }}
        />
      )}
    </div>
  );
}
