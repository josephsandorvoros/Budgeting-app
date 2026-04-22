import { useState } from 'react';
import { MONTHS, ACCOUNT_HIERARCHY } from '../data/defaults.js';
import AppIcon from '../components/AppIcon.jsx';

const fmt = (v) =>
  v == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v);

function EditableCell({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  if (editing) {
    return (
      <input
        className="bs-cell-input"
        value={draft}
        autoFocus
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { onSave(draft === '' ? null : parseFloat(draft) || 0); setEditing(false); }}
        onKeyDown={e => {
          if (e.key === 'Enter') { onSave(draft === '' ? null : parseFloat(draft) || 0); setEditing(false); }
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    );
  }
  return (
    <span
      className={`bs-cell-val${value == null ? ' bs-cell-dash' : value < 0 ? ' bs-cell-neg' : ''}`}
      onClick={() => { setDraft(value == null ? '' : String(value)); setEditing(true); }}
      title="Click to edit"
    >
      {value == null ? '—' : fmt(value)}
    </span>
  );
}

export default function BalanceSheet({ data, updateAccountBalance, updateAccountStartBalance, addAccount, deleteAccount }) {
  const accounts = data.accounts || [];
  const [collapsed, setCollapsed] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: '', subtype: 'Cash & Bank', assetClass: 'ASSETS', icon: '🏦', startBalance: 0 });

  const toggle = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  // Group accounts by assetClass > subtype
  const grouped = {};
  Object.entries(ACCOUNT_HIERARCHY).forEach(([cls, subtypes]) => {
    grouped[cls] = {};
    subtypes.forEach(st => {
      grouped[cls][st] = accounts.filter(a => a.assetClass === cls && a.subtype === st);
    });
  });

  const subtypeTotal = (cls, st, monthIdx) =>
    grouped[cls][st].reduce((sum, a) => {
      const v = monthIdx === -1 ? a.startBalance : (a.monthlyBalances?.[monthIdx] ?? null);
      return v == null ? sum : sum + v;
    }, 0);

  const classTotal = (cls, monthIdx) =>
    Object.keys(ACCOUNT_HIERARCHY[cls]).reduce
      ? ACCOUNT_HIERARCHY[cls].reduce((sum, st) => sum + subtypeTotal(cls, st, monthIdx), 0)
      : 0;

  const assetTotal = (monthIdx) => classTotal('ASSETS', monthIdx);
  const liabTotal  = (monthIdx) => classTotal('LIABILITIES', monthIdx);
  const netWorth   = (monthIdx) => assetTotal(monthIdx) - liabTotal(monthIdx);

  const allSubtypes = [...ACCOUNT_HIERARCHY.ASSETS, ...ACCOUNT_HIERARCHY.LIABILITIES];

  return (
    <div className="page bs-page">
      <div className="page-header">
        <div>
          <h1>Balance Sheet</h1>
          <div className="subtitle">{accounts.length} Accounts</div>
        </div>
        <div className="bs-header-actions">
          <button className="btn-outline" onClick={() => setShowAddModal(true)}>＋ Add Account</button>
        </div>
      </div>

      <div className="bs-table-wrap">
        <table className="bs-table">
          <thead>
            <tr>
              <th className="bs-th-account">ACCOUNT</th>
              <th className="bs-th-month">LAST DEC</th>
              {MONTHS.map(m => <th key={m} className="bs-th-month">{m.toUpperCase()}</th>)}
            </tr>
          </thead>
          <tbody>
            {Object.entries(ACCOUNT_HIERARCHY).map(([cls, subtypes]) => (
              <>
                {/* Asset/Liability class header */}
                <tr key={cls} className="bs-row-class" onClick={() => toggle(cls)}>
                  <td className="bs-td-class">
                    <span className="bs-toggle">{collapsed[cls] ? '▶' : '▼'}</span>
                    <span>{cls === 'ASSETS' ? '↗ ASSETS' : '↘ LIABILITIES'}</span>
                  </td>
                  <td className={`bs-td-total${cls === 'LIABILITIES' ? ' bs-neg' : ''}`}>
                    {fmt(classTotal(cls, -1))}
                  </td>
                  {MONTHS.map((_, mi) => {
                    const t = classTotal(cls, mi);
                    const hasData = subtypes.some(st => grouped[cls][st].some(a => a.monthlyBalances?.[mi] != null));
                    return (
                      <td key={mi} className={`bs-td-total${cls === 'LIABILITIES' ? ' bs-neg' : ''}`}>
                        {hasData ? fmt(t) : '—'}
                      </td>
                    );
                  })}
                </tr>

                {!collapsed[cls] && subtypes.map(st => {
                  const accs = grouped[cls][st];
                  return (
                    <>
                      {/* Subtype header */}
                      <tr key={`${cls}-${st}`} className="bs-row-subtype" onClick={() => toggle(`${cls}-${st}`)}>
                        <td className="bs-td-subtype">
                          <span className="bs-toggle">{collapsed[`${cls}-${st}`] ? '▶' : '▼'}</span>
                          <span>{st}</span>
                        </td>
                        <td className={`bs-td-subtotal${cls === 'LIABILITIES' ? ' bs-neg' : ''}`}>
                          {fmt(subtypeTotal(cls, st, -1))}
                        </td>
                        {MONTHS.map((_, mi) => {
                          const t = subtypeTotal(cls, st, mi);
                          const hasData = accs.some(a => a.monthlyBalances?.[mi] != null);
                          return (
                            <td key={mi} className={`bs-td-subtotal${cls === 'LIABILITIES' ? ' bs-neg' : ''}`}>
                              {hasData ? fmt(t) : '—'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Individual accounts */}
                      {!collapsed[`${cls}-${st}`] && accs.map(acc => (
                        <tr key={acc.id} className="bs-row-account">
                          <td className="bs-td-name">
                            <AppIcon value={acc.icon} fallback="🏦" className="bs-acc-icon" label="account icon" />
                            {acc.name}
                          </td>
                          <td className="bs-td-cell">
                            <EditableCell
                              value={acc.startBalance}
                              onSave={v => updateAccountStartBalance(acc.id, v)}
                            />
                          </td>
                          {MONTHS.map((_, mi) => (
                            <td key={mi} className="bs-td-cell">
                              <EditableCell
                                value={acc.monthlyBalances?.[mi] ?? null}
                                onSave={v => updateAccountBalance(acc.id, mi, v)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  );
                })}
              </>
            ))}

            {/* NET WORTH row */}
            <tr className="bs-row-networth">
              <td className="bs-td-networth">NET WORTH</td>
              <td className={`bs-td-nw-val${netWorth(-1) < 0 ? ' bs-neg' : ' bs-pos'}`}>
                {fmt(netWorth(-1))}
              </td>
              {MONTHS.map((_, mi) => {
                const hasAny = accounts.some(a => a.monthlyBalances?.[mi] != null);
                const nw = netWorth(mi);
                return (
                  <td key={mi} className={`bs-td-nw-val${nw < 0 ? ' bs-neg' : ' bs-pos'}`}>
                    {hasAny ? fmt(nw) : '—'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Account</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label>Name</label>
                <input className="form-input" value={newAcc.name} onChange={e => setNewAcc(p => ({ ...p, name: e.target.value }))} placeholder="Account name" />
              </div>
              <div className="form-row">
                <label>Class</label>
                <select className="form-input" value={newAcc.assetClass} onChange={e => setNewAcc(p => ({ ...p, assetClass: e.target.value, subtype: ACCOUNT_HIERARCHY[e.target.value][0] }))}>
                  <option value="ASSETS">Assets</option>
                  <option value="LIABILITIES">Liabilities</option>
                </select>
              </div>
              <div className="form-row">
                <label>Type</label>
                <select className="form-input" value={newAcc.subtype} onChange={e => setNewAcc(p => ({ ...p, subtype: e.target.value }))}>
                  {ACCOUNT_HIERARCHY[newAcc.assetClass].map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Starting Balance</label>
                <input className="form-input" type="number" value={newAcc.startBalance} onChange={e => setNewAcc(p => ({ ...p, startBalance: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="form-row">
                <label>Icon</label>
                <input className="form-input" value={newAcc.icon} onChange={e => setNewAcc(p => ({ ...p, icon: e.target.value }))} placeholder="Emoji icon" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => {
                if (!newAcc.name.trim()) return;
                addAccount(newAcc);
                setNewAcc({ name: '', subtype: 'Cash & Bank', assetClass: 'ASSETS', icon: '🏦', startBalance: 0 });
                setShowAddModal(false);
              }}>Add Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
