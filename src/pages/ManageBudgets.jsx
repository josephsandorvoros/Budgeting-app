import { useState } from 'react';
import IconPicker from '../components/IconPicker.jsx';
import AppIcon from '../components/AppIcon.jsx';

const BUDGET_ICON_GROUPS = {
  Finance: ['💰', '📈', '📉', '📊', '💵', '💳', '🏦', '🪙', '💼', '🧾', '💸', '💱', '💹', '📌', '🧮', '💲'],
  HomeLife: ['🏠', '🏢', '🏘️', '🛒', '🍽️', '☕', '🚗', '✈️', '🎯', '🎁', '📚', '💡', '🧺', '🧹', '🪴', '🌦️'],
  Work: ['💼', '🧰', '📁', '🗂️', '🖥️', '⚙️', '🛠️', '📌', '🏭', '📦', '📎', '🧷', '🧱', '🔧', '🪛', '🪜'],
  Lifestyle: ['🎉', '🏖️', '🧳', '🎮', '🎬', '🎵', '🏆', '⚽', '🏀', '🏋️', '🎨', '📷', '🐶', '🐱', '👶', '🧒'],
  Other: ['⭐', '🔥', '🌱', '🌍', '🧭', '🔒', '✅', '📝', '🏷️', '🛡️', '📱', '💻', '🌐', '📡', '🧪', '🧬'],
};

const BUDGET_ICONS = Array.from(new Set(Object.values(BUDGET_ICON_GROUPS).flat()));

const fmt = (n) =>
  `$${Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function computeStats(budgetData) {
  if (!budgetData?.budget) return { income: 0, expenses: 0, savings: 0, investments: 0 };
  const sum = (group) => {
    const g = budgetData.budget[group] || {};
    return Object.values(g).reduce(
      (tot, months) => tot + (Array.isArray(months) ? months.reduce((s, v) => s + (v || 0), 0) : 0),
      0
    );
  };
  return {
    income:      sum('Income'),
    expenses:    sum('Expenses'),
    savings:     sum('Savings'),
    investments: sum('Investments') || 0,
  };
}

function ProfileIcon({ type }) {
  return (
    <div className="mb-profile-icon" data-type={type}>
      {type === 'business' ? '💼' : '👤'}
    </div>
  );
}

function BudgetCard({ b, isActive, budgetData, onSwitch, onRename, onDuplicate, onDelete }) {
  const [editing, setEditing]   = useState(false);
  const [editName, setEditName] = useState(b.name);
  const [editIcon, setEditIcon] = useState(b.icon || (b.type === 'business' ? '💼' : '📈'));
  const [confirm, setConfirm]   = useState(false);
  const stats = computeStats(budgetData);

  const saveEdit = () => {
    if (editName.trim()) { onRename(b.id, editName.trim(), undefined, editIcon); }
    setEditing(false);
  };

  return (
    <div className={`mb-scenario-card${isActive ? ' mb-scenario-active' : ''}`}>
      {editing ? (
        <div className="mb-edit-row">
          <div className="mb-budget-icon-preview">
            <AppIcon value={editIcon} fallback="📈" className="mb-budget-icon-render" label="budget icon" />
          </div>
          <input
            className="mb-edit-input"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
            autoFocus
          />
          <button className="mb-save-btn" onClick={saveEdit}>Save</button>
          <button className="mb-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
          <div className="mb-icon-picker-wrap">
            <IconPicker
              value={editIcon}
              onChange={setEditIcon}
              options={BUDGET_ICONS}
              groups={BUDGET_ICON_GROUPS}
              storageKey={`budget_icon_picker_${b.id}`}
            />
          </div>
        </div>
      ) : confirm ? (
        <div className="mb-confirm-row">
          <span className="mb-confirm-label">Delete <strong>{b.name}</strong>?</span>
          <button className="mb-delete-confirm-btn" onClick={() => { onDelete(b.id); setConfirm(false); }}>
            Yes, delete
          </button>
          <button className="mb-cancel-btn" onClick={() => setConfirm(false)}>Cancel</button>
        </div>
      ) : (
        <>
          <div className="mb-scenario-left">
            <div className="mb-scenario-name"><AppIcon value={b.icon || (b.type === 'business' ? '💼' : '📈')} fallback={b.type === 'business' ? '💼' : '📈'} className="mb-budget-icon" label="budget icon" /> {b.name}</div>
            <div className="mb-scenario-meta">Modified recently</div>
          </div>

          {isActive
            ? <span className="mb-active-badge">ACTIVE</span>
            : <button className="mb-activate-btn" onClick={() => onSwitch(b.id)}>⊕ Activate</button>
          }

          <div className="mb-stats">
            <div className="mb-stat">
              <span className="mb-stat-label">INCOME</span>
              <span className="mb-stat-value mb-income">{fmt(stats.income)}</span>
            </div>
            <div className="mb-stat">
              <span className="mb-stat-label">EXPENSES</span>
              <span className="mb-stat-value mb-expense">-{fmt(stats.expenses)}</span>
            </div>
            <div className="mb-stat">
              <span className="mb-stat-label">SAVINGS</span>
              <span className="mb-stat-value mb-savings">{fmt(stats.savings)}</span>
            </div>
            {stats.investments !== 0 && (
              <div className="mb-stat">
                <span className="mb-stat-label">INVESTMENTS</span>
                <span className="mb-stat-value mb-invest">-{fmt(stats.investments)}</span>
              </div>
            )}
          </div>

          <div className="mb-card-actions">
            <button
              className="mb-action-btn"
              title="Rename"
              onClick={() => {
                setEditName(b.name);
                setEditIcon(b.icon || (b.type === 'business' ? '💼' : '📈'));
                setEditing(true);
              }}
            >✏️</button>
            <button className="mb-action-btn" title="Duplicate" onClick={() => onDuplicate(b.id)}>⧉</button>
            <button className="mb-action-btn mb-action-danger" title="Delete" onClick={() => setConfirm(true)}>🗑</button>
          </div>
        </>
      )}
    </div>
  );
}

function ProfileSection({ label, budgets, currentId, allBudgets, onSwitch, onRename, onDuplicate, onDelete }) {
  if (budgets.length === 0) return null;
  return (
    <div className="mb-profile-section">
      <div className="mb-profile-header">
        <ProfileIcon type={budgets[0]?.type} />
        <div className="mb-profile-info">
          <div className="mb-profile-name">{label}</div>
          <div className="mb-profile-type">
            {budgets[0]?.type === 'business' ? 'BUSINESS' : 'PERSONAL FINANCES'}
          </div>
        </div>
        <div className="mb-profile-count">{budgets.length} budget{budgets.length !== 1 ? 's' : ''}</div>
      </div>

      <div className="mb-scenarios-label">SCENARIOS</div>

      <div className="mb-scenarios-list">
        {budgets.map(b => (
          <BudgetCard
            key={b.id}
            b={b}
            isActive={b.id === currentId}
            budgetData={allBudgets?.[b.id]}
            onSwitch={onSwitch}
            onRename={onRename}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

export default function ManageBudgets({ budgetList, allBudgets, currentId, onSwitch, onRename, onDuplicate, onDelete }) {
  const personal = budgetList.filter(b => b.type !== 'business');
  const business = budgetList.filter(b => b.type === 'business');
  const total = budgetList.length;

  return (
    <div className="page mb-page">
      <div className="page-header">
        <div>
          <h1>Manage Budgets</h1>
          <div className="subtitle">{total} scenario{total !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <ProfileSection
        label="Personal"
        budgets={personal}
        currentId={currentId}
        allBudgets={allBudgets}
        onSwitch={onSwitch}
        onRename={onRename}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
      <ProfileSection
        label="Business"
        budgets={business}
        currentId={currentId}
        allBudgets={allBudgets}
        onSwitch={onSwitch}
        onRename={onRename}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />

      {total === 0 && (
        <div className="mb-empty">No budgets yet. Use the + buttons in the sidebar to create one.</div>
      )}
    </div>
  );
}
