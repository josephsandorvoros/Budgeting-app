import { useMemo, useState, useEffect } from 'react';

function summarizeTemplate(tpl) {
  const data = tpl?.data || {};
  const categories = data.categories || {};
  const accounts = Array.isArray(data.accounts) ? data.accounts : [];
  const bills = Array.isArray(data.bills) ? data.bills : [];

  const categoryGroups = Object.keys(categories).length;
  const categoryItems = Object.values(categories).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);

  const accountGroups = new Set(accounts.map(a => a?.subtype).filter(Boolean)).size;
  const accountItems = accounts.length;

  return {
    categoryGroups,
    categoryItems,
    accountGroups,
    accountItems,
    billItems: bills.length,
  };
}

export default function Templates({
  templates,
  currentBudget,
  onSaveCurrentAsTemplate,
  onDuplicateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onApplyTemplate,
  onApplyTemplateToCurrent,
}) {
  const [selectedId, setSelectedId] = useState('');
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [applyName, setApplyName] = useState('');
  const [applyYear, setApplyYear] = useState(String(new Date().getFullYear()));
  const [applyType, setApplyType] = useState('personal');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [keepTransactions, setKeepTransactions] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      if (!templates?.length) {
        setSelectedId('');
        return;
      }
      if (!selectedId || !templates.some(t => t.id === selectedId)) {
        setSelectedId(templates[0].id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [templates, selectedId]);

  const selected = useMemo(
    () => templates?.find(t => t.id === selectedId) || null,
    [templates, selectedId]
  );

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setApplyName(`${selected.name} Budget`);
      setApplyType(selected.type || 'personal');
      setEditName(selected.name || '');
      setEditDesc(selected.description || '');
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const stats = summarizeTemplate(selected);
  const categoryGroups = selected?.data?.categories || {};
  const accountSubtypes = useMemo(() => {
    const grouped = {};
    (selected?.data?.accounts || []).forEach(acc => {
      const key = acc.subtype || 'Other';
      if (!grouped[key]) grouped[key] = 0;
      grouped[key] += 1;
    });
    return grouped;
  }, [selected]);

  const saveCurrent = () => {
    const suggested = (saveName || '').trim() || `${currentBudget?.name || 'Current Budget'} Template`;
    onSaveCurrentAsTemplate(suggested, saveDesc);
    setSaveName('');
    setSaveDesc('');
  };

  const applyTemplate = () => {
    if (!selected) return;
    onApplyTemplate(selected.id, {
      name: applyName,
      year: Number(applyYear),
      type: applyType,
      icon: selected.icon,
    });
  };

  const saveTemplateMeta = () => {
    if (!selected || selected.builtIn) return;
    const nextName = (editName || '').trim() || selected.name;
    onUpdateTemplate(selected.id, {
      name: nextName,
      description: (editDesc || '').trim(),
    });
  };

  const applyToCurrent = () => {
    if (!selected || !currentBudget) return;
    const confirmText = `Replace structure in current budget "${currentBudget.name}" with template "${selected.name}"?`;
    if (!window.confirm(confirmText)) return;
    onApplyTemplateToCurrent(selected.id, { keepTransactions });
  };

  return (
    <div className="page tp-page">
      <div className="page-header">
        <div>
          <h1>Templates</h1>
          <div className="subtitle">Save reusable budget structures and spin up new budgets in one click.</div>
        </div>
      </div>

      <div className="tp-layout">
        <aside className="tp-sidebar">
          <div className="tp-list">
            {(templates || []).map(t => (
              <button
                key={t.id}
                className={`tp-list-item${selectedId === t.id ? ' tp-list-item-active' : ''}`}
                onClick={() => setSelectedId(t.id)}
              >
                <span className="tp-list-icon">{t.icon || '📈'}</span>
                <span className="tp-list-main">
                  <span className="tp-list-name">{t.name}</span>
                  <span className="tp-list-meta">{t.builtIn ? 'BUILT-IN' : 'CUSTOM'}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="tp-save-box">
            <div className="tp-save-title">Save Current</div>
            <input
              className="tp-input"
              placeholder="Template name"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
            />
            <input
              className="tp-input"
              placeholder="Optional description"
              value={saveDesc}
              onChange={e => setSaveDesc(e.target.value)}
            />
            <button className="tp-btn tp-btn-primary" onClick={saveCurrent} disabled={!currentBudget}>Save Current as Template</button>
          </div>
        </aside>

        <section className="tp-detail">
          {!selected ? (
            <div className="tp-empty">No templates available yet.</div>
          ) : (
            <>
              <div className="tp-detail-head">
                <div>
                  <div className="tp-title-row">
                    <h2>{selected.name}</h2>
                    {selected.builtIn && <span className="tp-chip">BUILT-IN</span>}
                  </div>
                  <p>{selected.description || 'No description yet.'}</p>
                </div>
                <div className="tp-actions">
                  <button className="tp-btn" onClick={() => onDuplicateTemplate(selected.id)}>Duplicate</button>
                  <button className="tp-btn tp-btn-danger" disabled={selected.builtIn} onClick={() => onDeleteTemplate(selected.id)}>Delete</button>
                </div>
              </div>

              {!selected.builtIn && (
                <div className="tp-edit-box">
                  <div className="tp-apply-title">Edit Template</div>
                  <div className="tp-edit-grid">
                    <input className="tp-input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Template name" />
                    <input className="tp-input" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" />
                    <button className="tp-btn" onClick={saveTemplateMeta}>Save Template Details</button>
                  </div>
                </div>
              )}

              <div className="tp-apply-box">
                <div className="tp-apply-title">Apply Template</div>
                <div className="tp-apply-grid">
                  <input className="tp-input" value={applyName} onChange={e => setApplyName(e.target.value)} placeholder="New budget name" />
                  <input className="tp-input" type="number" value={applyYear} onChange={e => setApplyYear(e.target.value)} min="2000" max="2100" />
                  <select className="tp-input" value={applyType} onChange={e => setApplyType(e.target.value)}>
                    <option value="personal">Personal</option>
                    <option value="business">Business</option>
                  </select>
                  <button className="tp-btn tp-btn-primary" onClick={applyTemplate}>Apply and Create Budget</button>
                </div>
                <div className="tp-current-row">
                  <label className="tp-check-row">
                    <input type="checkbox" checked={keepTransactions} onChange={e => setKeepTransactions(e.target.checked)} />
                    <span>Keep existing transactions when applying to current budget</span>
                  </label>
                  <button className="tp-btn" onClick={applyToCurrent} disabled={!currentBudget}>Apply to Current Budget</button>
                </div>
              </div>

              <div className="tp-panels">
                <div className="tp-panel">
                  <div className="tp-panel-head">
                    <strong>Categories</strong>
                    <span>{stats.categoryGroups} groups, {stats.categoryItems} items</span>
                  </div>
                  <div className="tp-panel-body">
                    {Object.entries(categoryGroups).map(([group, items]) => (
                      <div key={group} className="tp-row">
                        <span>{group}</span>
                        <span>{Array.isArray(items) ? items.length : 0}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="tp-panel">
                  <div className="tp-panel-head">
                    <strong>Accounts</strong>
                    <span>{stats.accountGroups} groups, {stats.accountItems} items</span>
                  </div>
                  <div className="tp-panel-body">
                    {Object.entries(accountSubtypes).map(([group, count]) => (
                      <div key={group} className="tp-row">
                        <span>{group}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="tp-panel">
                  <div className="tp-panel-head">
                    <strong>Bills</strong>
                    <span>{stats.billItems} items</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
