import { useState } from 'react';

const BUDGET_SUB_PAGES = [
  { id: 'dashboard',   label: 'Dashboard',        icon: '📊' },
  { id: 'annual',      label: 'Annual Budget',     icon: '📅' },
  { id: 'monthly',     label: 'Monthly View',      icon: '🗓️' },
  { id: 'expenses',    label: 'Transactions',      icon: '💳' },
  { id: 'balancesheet',label: 'Balance Sheet',     icon: '⚖️' },
  { id: 'bills',       label: 'Bills & Recurring', icon: '🔄' },
];

const SETTINGS_ITEMS = [
  { id: 'categories', label: 'Categories & Accounts', icon: '⚙️', activePages: ['categories', 'accounts'] },
  { id: 'templates', label: 'Templates', icon: '🧩' },
  { id: 'data-management', label: 'Manage Data', icon: '🗄️' },
  { id: 'whats-new', label: "What's New", icon: '🧭' },
  { id: 'about', label: 'About', icon: 'ℹ️' },
];

const FEEDBACK_EMAIL = 'support@budgetledger.app';

function NewBudgetForm({ onSubmit, onCancel }) {
  const [name, setName] = useState('');

  return (
    <div className="sidebar-new-form">
      <input
        className="sidebar-input"
        placeholder="Budget name"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSubmit(name); if (e.key === 'Escape') onCancel(); }}
        autoFocus
      />
      <div className="sidebar-new-form-row">
        <button className="sidebar-create-btn" onClick={() => onSubmit(name)}>Create</button>
        <button className="sidebar-cancel-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function BudgetGroup({ b, isActive, expanded, page, accentClass, icon, onToggle, onSwitch, setPage, collapsed }) {
  return (
    <div className="sidebar-biz-group">
      <button
        className={`sidebar-nav-item sidebar-biz-header${isActive ? ` active ${accentClass}` : ''}`}
        onClick={() => { onToggle(b.id); onSwitch(b.id); }}
        title={collapsed ? b.name : undefined}
      >
        <span className="sidebar-nav-icon">{icon}</span>
        {!collapsed && <>
          <span className="sidebar-nav-label">{b.name}</span>
          <span className="sidebar-biz-chevron">{expanded ? '▾' : '▸'}</span>
        </>}
      </button>

      {!collapsed && expanded && (
        <div className="sidebar-biz-items">
          {BUDGET_SUB_PAGES.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item sidebar-nav-sub${isActive && page === item.id ? ' active' : ''}`}
              onClick={() => { onSwitch(b.id); setPage(item.id); }}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NavBar({ page, setPage, budgetList, currentId, onSwitchBudget, onCreateBudget, onManageBudgets, onHelp }) {
  const [collapsed, setCollapsed]       = useState(false);
  const [personalOpen, setPersonalOpen] = useState(true);
  const [businessOpen, setBusinessOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedPersonal, setExpandedPersonal] = useState({});
  const [expandedBiz, setExpandedBiz]   = useState({});
  const [newFormType, setNewFormType]   = useState(null);

  const personal = budgetList.filter(b => b.type !== 'business');
  const business = budgetList.filter(b => b.type === 'business');

  const openNewForm = (type, e) => {
    e.stopPropagation();
    setNewFormType(prev => prev === type ? null : type);
  };

  const handleCreate = (name) => {
    const type = newFormType;
    onCreateBudget(name.trim() || 'Budget', undefined, type);
    setNewFormType(null);
    setPage('dashboard');
    if (type === 'business') setBusinessOpen(true);
    else setPersonalOpen(true);
  };

  const togglePersonal = (id) =>
    setExpandedPersonal(prev => ({ ...prev, [id]: !prev[id] }));

  const toggleBiz = (id) =>
    setExpandedBiz(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>

      {/* ── Brand header ── */}
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-brand">
            <div className="sidebar-logo">📒</div>
            <div className="sidebar-title">BUDGET LEDGER</div>
            <div className="sidebar-tagline">PLAN WITH CLARITY</div>
          </div>
        )}
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* ── Scrollable nav area ── */}
      <nav className="sidebar-nav">

        {/* ── PERSONAL BUDGETS ── */}
        <div className="sidebar-section">
          <div className="sidebar-section-header" onClick={() => !collapsed && setPersonalOpen(v => !v)}>
            {!collapsed && <span className="sidebar-section-label">PERSONAL BUDGETS</span>}
            {!collapsed && (
              <div className="sidebar-section-actions">
                <button className="sidebar-icon-btn" title="Manage personal budgets" onClick={e => { e.stopPropagation(); onManageBudgets(); }}>⚙</button>
                <button className="sidebar-icon-btn" title="New personal budget" onClick={e => openNewForm('personal', e)}>＋</button>
                <span className="sidebar-chevron">{personalOpen ? '▾' : '▸'}</span>
              </div>
            )}
          </div>

          {!collapsed && newFormType === 'personal' && (
            <NewBudgetForm onSubmit={handleCreate} onCancel={() => setNewFormType(null)} />
          )}

          {(collapsed || personalOpen) && personal.length === 0 && !collapsed && (
            <div className="sidebar-empty">No personal budgets yet</div>
          )}

          {(collapsed || personalOpen) && personal.map(b => (
            <BudgetGroup
              key={b.id}
              b={b}
              isActive={currentId === b.id}
              expanded={expandedPersonal[b.id]}
              page={page}
              accentClass=""
              icon={b.icon || '📈'}
              onToggle={togglePersonal}
              onSwitch={onSwitchBudget}
              setPage={setPage}
              collapsed={collapsed}
            />
          ))}
        </div>

        {/* ── DOING BUSINESS ── */}
        <div className="sidebar-section">
          <div className="sidebar-section-header" onClick={() => !collapsed && setBusinessOpen(v => !v)}>
            {!collapsed && <span className="sidebar-section-label">DOING BUSINESS</span>}
            {!collapsed && (
              <div className="sidebar-section-actions">
                <button className="sidebar-icon-btn" title="Manage business budgets" onClick={e => { e.stopPropagation(); onManageBudgets(); }}>⚙</button>
                <button className="sidebar-icon-btn" title="New business budget" onClick={e => openNewForm('business', e)}>＋</button>
                <span className="sidebar-chevron">{businessOpen ? '▾' : '▸'}</span>
              </div>
            )}
          </div>

          {!collapsed && newFormType === 'business' && (
            <NewBudgetForm onSubmit={handleCreate} onCancel={() => setNewFormType(null)} />
          )}

          {(collapsed || businessOpen) && business.length === 0 && !collapsed && (
            <div className="sidebar-empty">No business budgets yet</div>
          )}

          {(collapsed || businessOpen) && business.map(b => (
            <BudgetGroup
              key={b.id}
              b={b}
              isActive={currentId === b.id}
              expanded={expandedBiz[b.id]}
              page={page}
              accentClass="sidebar-biz-active"
              icon={b.icon || '💼'}
              onToggle={toggleBiz}
              onSwitch={onSwitchBudget}
              setPage={setPage}
              collapsed={collapsed}
            />
          ))}
        </div>

      </nav>

      {/* ── SETTINGS — pinned to bottom ── */}
      <div className="sidebar-bottom">
        <div
          className="sidebar-section-header sidebar-settings-header"
          onClick={() => !collapsed && setSettingsOpen(v => !v)}
        >
          {!collapsed && <span className="sidebar-section-label">SETTINGS</span>}
          {collapsed
            ? <span className="sidebar-nav-icon" style={{ margin: '0 auto' }}>⚙️</span>
            : <span className="sidebar-chevron">{settingsOpen ? '▾' : '▸'}</span>
          }
        </div>

        {(collapsed || settingsOpen) && SETTINGS_ITEMS.map(item => (
          <button
            key={item.id}
            className={`sidebar-nav-item${(item.activePages ? item.activePages.includes(page) : page === item.id) ? ' active' : ''}`}
            onClick={() => setPage(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
          </button>
        ))}

        {!collapsed && (
          <div className="sidebar-help-row">
            <span className="sidebar-help-btn" onClick={onHelp} style={{ cursor: 'pointer' }}>⓪ Help</span>
            <span className="sidebar-help-btn" onClick={() => window.open(`mailto:${FEEDBACK_EMAIL}?subject=Budget%20Ledger%20Feedback`, '_blank')} style={{ cursor: 'pointer' }}>✉ Feedback</span>
          </div>
        )}
      </div>

    </aside>
  );
}

