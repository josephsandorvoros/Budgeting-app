import { useState } from 'react';
import AppIcon from './AppIcon.jsx';
import UiShellIcon from './UiShellIcon.jsx';

const BUDGET_SUB_PAGES = [
  { id: 'dashboard',    label: 'Dashboard',          icon: 'FiBarChart2' },
  { id: 'annual',       label: 'Annual Budget',      icon: 'FiCalendar' },
  { id: 'monthly',      label: 'Monthly View',      icon: 'FiGrid' },
  { id: 'expenses',     label: 'Transactions',      icon: 'FiCreditCard' },
  { id: 'balancesheet', label: 'Balance Sheet',     icon: 'FaBalanceScale' },
  { id: 'bills',        label: 'Bills & Recurring', icon: 'FiRepeat' },
];

const SETTINGS_ITEMS = [
  { id: 'categories', label: 'Categories & Accounts', icon: 'FiSettings', activePages: ['categories', 'accounts'] },
  { id: 'templates', label: 'Templates', icon: 'FiLayers' },
  { id: 'updates', label: 'Updates', icon: 'FiArrowUp' },
  { id: 'data-management', label: 'Manage Data', icon: 'FiDatabase' },
  { id: 'whats-new', label: "What's New", icon: 'FiCompass' },
  { id: 'about', label: 'About', icon: 'FiInfo' },
];

const FEEDBACK_EMAIL = 'support.budgetledger.app@hybridcloudhq.com';

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
        type="button"
        className={`sidebar-nav-item sidebar-biz-header${isActive ? ` active ${accentClass}` : ''}`}
        onClick={() => { onToggle(b.id); onSwitch(b.id); }}
        title={collapsed ? b.name : undefined}
        aria-label={collapsed ? `Switch to ${b.name}` : undefined}
        aria-expanded={!collapsed ? (expanded ? 'true' : 'false') : undefined}
      >
        <AppIcon value={icon} className="sidebar-nav-icon" label={`${b.name} budget icon`} />
        {!collapsed && <>
          <span className="sidebar-nav-label">{b.name}</span>
          <span className="sidebar-biz-chevron" aria-hidden="true">
            {expanded ? <UiShellIcon name="FiChevronDown" /> : <UiShellIcon name="FiChevronRight" />}
          </span>
        </>}
      </button>

      {!collapsed && expanded && (
        <div className="sidebar-biz-items" role="group" aria-label={`${b.name} destinations`}>
          {BUDGET_SUB_PAGES.map(item => {
            const active = isActive && page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-item sidebar-nav-sub${active ? ' active' : ''}`}
                onClick={() => { onSwitch(b.id); setPage(item.id); }}
                aria-current={active ? 'page' : undefined}
              >
                <span className="sidebar-nav-icon" aria-hidden="true"><UiShellIcon name={item.icon} /></span>
                <span className="sidebar-nav-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {collapsed && isActive && (
        <div className="sidebar-collapsed-destinations" role="group" aria-label={`${b.name} destinations`}>
          {BUDGET_SUB_PAGES.map(item => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-item sidebar-nav-sub sidebar-nav-collapsed-sub${active ? ' active' : ''}`}
                onClick={() => { onSwitch(b.id); setPage(item.id); }}
                title={item.label}
                aria-label={`${item.label} — ${b.name}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="sidebar-nav-icon" aria-hidden="true"><UiShellIcon name={item.icon} /></span>
              </button>
            );
          })}
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
    <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`} aria-label="Primary navigation">

      {/* ── Brand header ── */}
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-brand">
            <div className="sidebar-logo" aria-hidden="true"><UiShellIcon name="FiBookOpen" /></div>
            <div className="sidebar-title">BUDGET LEDGER</div>
            <div className="sidebar-tagline">PLAN WITH CLARITY</div>
          </div>
        )}
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={collapsed ? 'false' : 'true'}
        >
          <UiShellIcon name={collapsed ? 'FiChevronRight' : 'FiChevronLeft'} className="sidebar-collapse-icon" />
        </button>
      </div>

      {/* ── Scrollable nav area ── */}
      <nav className="sidebar-nav">

        {/* ── PERSONAL BUDGETS ── */}
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <button
              type="button"
              className="sidebar-section-toggle"
              onClick={() => !collapsed && setPersonalOpen(v => !v)}
              aria-expanded={!collapsed ? (personalOpen ? 'true' : 'false') : undefined}
            >
              {!collapsed
                ? <span className="sidebar-section-label">PERSONAL BUDGETS</span>
                : <span className="visually-hidden">Personal budgets</span>}
            </button>
            {!collapsed && (
              <span className="sidebar-section-actions">
                <button type="button" className="sidebar-icon-btn" title="Manage personal budgets" aria-label="Manage personal budgets" onClick={e => { e.stopPropagation(); onManageBudgets(); }}>
                  <UiShellIcon name="FiSettings" />
                </button>
                <button type="button" className="sidebar-icon-btn" title="New personal budget" aria-label="New personal budget" onClick={e => openNewForm('personal', e)}>
                  <UiShellIcon name="FiPlus" />
                </button>
                <span className="sidebar-chevron" aria-hidden="true">
                  {personalOpen ? <UiShellIcon name="FiChevronDown" /> : <UiShellIcon name="FiChevronRight" />}
                </span>
              </span>
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
          <div className="sidebar-section-header">
            <button
              type="button"
              className="sidebar-section-toggle"
              onClick={() => !collapsed && setBusinessOpen(v => !v)}
              aria-expanded={!collapsed ? (businessOpen ? 'true' : 'false') : undefined}
            >
              {!collapsed
                ? <span className="sidebar-section-label">DOING BUSINESS</span>
                : <span className="visually-hidden">Business budgets</span>}
            </button>
            {!collapsed && (
              <span className="sidebar-section-actions">
                <button type="button" className="sidebar-icon-btn" title="Manage business budgets" aria-label="Manage business budgets" onClick={e => { e.stopPropagation(); onManageBudgets(); }}>
                  <UiShellIcon name="FiSettings" />
                </button>
                <button type="button" className="sidebar-icon-btn" title="New business budget" aria-label="New business budget" onClick={e => openNewForm('business', e)}>
                  <UiShellIcon name="FiPlus" />
                </button>
                <span className="sidebar-chevron" aria-hidden="true">
                  {businessOpen ? <UiShellIcon name="FiChevronDown" /> : <UiShellIcon name="FiChevronRight" />}
                </span>
              </span>
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
        <button
          type="button"
          className="sidebar-section-header sidebar-settings-header"
          onClick={() => !collapsed && setSettingsOpen(v => !v)}
          aria-expanded={!collapsed ? (settingsOpen ? 'true' : 'false') : undefined}
          aria-label={collapsed ? 'Settings' : undefined}
        >
          {!collapsed && <span className="sidebar-section-label">SETTINGS</span>}
          {collapsed
            ? <span className="sidebar-nav-icon sidebar-settings-collapsed-icon" aria-hidden="true"><UiShellIcon name="FiSettings" /></span>
            : <span className="sidebar-chevron" aria-hidden="true">{settingsOpen ? <UiShellIcon name="FiChevronDown" /> : <UiShellIcon name="FiChevronRight" />}</span>}
        </button>

        {(collapsed || settingsOpen) && SETTINGS_ITEMS.map(item => {
          const active = item.activePages ? item.activePages.includes(page) : page === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-nav-item${active ? ' active' : ''}`}
              onClick={() => setPage(item.id)}
              title={collapsed ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
            >
              <span className="sidebar-nav-icon" aria-hidden="true"><UiShellIcon name={item.icon} /></span>
              {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
            </button>
          );
        })}

        {!collapsed && (
          <div className="sidebar-help-row">
            <button type="button" className="sidebar-help-btn" onClick={onHelp}>
              <UiShellIcon name="FiHelpCircle" /> Help
            </button>
            <button type="button" className="sidebar-help-btn" onClick={() => window.open(`mailto:${FEEDBACK_EMAIL}?subject=Budget%20Ledger%20Feedback`, '_blank')}>
              <UiShellIcon name="FiMail" /> Feedback
            </button>
          </div>
        )}
      </div>

    </aside>
  );
}
