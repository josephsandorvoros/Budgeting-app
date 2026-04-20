import { useState } from 'react';

const SECTIONS = [
  {
    id: 'getting-started',
    icon: '🚀',
    title: 'Getting Started',
    color: '#4ade80',
    tips: [
      {
        q: 'What is a Budget?',
        a: 'A budget is a named financial scenario — for example "My Budget" or "Side Business". You can have multiple budgets, each with their own income goals, expense categories, transactions, accounts, and bills. Switch between them from the sidebar.',
      },
      {
        q: 'Personal vs Business budgets',
        a: 'When creating a budget you choose a type: Personal or Business. The year selectors on Dashboard, Annual Budget, and Monthly View only show years that belong to the same type, so your personal and business data stay separate.',
      },
      {
        q: 'Creating your first budget',
        a: 'Click the + icon next to PERSONAL BUDGETS or DOING BUSINESS in the sidebar, enter a name, pick an icon, and click Create. An empty budget is created with default income/expense categories ready to fill in.',
      },
      {
        q: 'Switching budgets',
        a: 'Click any budget name in the sidebar to make it active. The whole app — Dashboard, Transactions, Accounts, etc. — will reflect that budget\'s data.',
      },
      {
        q: 'Checking for app updates',
        a: 'Open Settings → Updates to see your installed version, check the latest release, and download the newest installer for in-place upgrades.',
      },
    ],
  },
  {
    id: 'dashboard',
    icon: '📊',
    title: 'Dashboard',
    color: '#06b6d4',
    tips: [
      {
        q: 'Annual Dashboard overview',
        a: 'The Dashboard shows a full-year summary across five groups: Income, Savings, Investments, Expenses, and Debt Payoff. Each card shows total actual vs goal and a progress bar.',
      },
      {
        q: 'Switching years',
        a: 'Use the year selector in the top-right corner. The dropdown shows the current year plus any year that has transaction data in any same-type budget. Selecting a year automatically switches to the correct budget for that year.',
      },
      {
        q: 'Income overview panel',
        a: 'The Income section includes an "Active vs Passive" breakdown on the right side. Categories tagged as passive (investments, rental, etc.) are separated automatically based on their group.',
      },
      {
        q: 'Clicking a month on the chart',
        a: 'From the bar charts you can click a month column to jump directly to that month in the Monthly View.',
      },
    ],
  },
  {
    id: 'annual-budget',
    icon: '📅',
    title: 'Annual Budget',
    color: '#a855f7',
    tips: [
      {
        q: 'Viewing vs editing',
        a: 'The Annual Budget page shows every category\'s monthly goal in a grid. Click any cell to edit that goal amount inline. Press Enter or click away to save.',
      },
      {
        q: 'Empty year',
        a: 'If you select a year with no data the grid still shows with zero values and editing is disabled. Add transactions for that year first to enable editing.',
      },
      {
        q: 'Row totals',
        a: 'Each row\'s rightmost column shows the annual total for that category. Section headers show the sum across all categories in that group.',
      },
    ],
  },
  {
    id: 'monthly-view',
    icon: '🗓️',
    title: 'Monthly View',
    color: '#eab308',
    tips: [
      {
        q: 'Navigating months',
        a: 'Use the left/right arrows at the top to move between months, or click any month directly in the month strip. The year selector lets you jump to a different year.',
      },
      {
        q: 'Budget vs actual',
        a: 'Each category row shows its monthly goal (from the Annual Budget grid) alongside the actual amount from your transactions, and a difference column coloured green when you\'re under budget.',
      },
      {
        q: 'Drill into a category',
        a: 'Click a category row to see all individual transactions that were tagged to it for that month.',
      },
    ],
  },
  {
    id: 'transactions',
    icon: '💳',
    title: 'Transactions',
    color: '#ec4899',
    tips: [
      {
        q: 'Adding a transaction',
        a: 'Click Add Transaction, fill in date, description, amount, category group, category, and optionally the account it came from. Click Save to record it.',
      },
      {
        q: 'Editing or deleting',
        a: 'Click the pencil icon on any row to edit it inline. Click the trash icon to delete it permanently.',
      },
      {
        q: 'Filtering and searching',
        a: 'Use the search bar to filter by description, or use the category and date-range dropdowns to narrow the list.',
      },
      {
        q: 'CSV import',
        a: 'Go to Settings → Manage Data → Import CSV to bulk-import transactions from a bank export. Map the columns to date, description, and amount before importing.',
      },
    ],
  },
  {
    id: 'accounts',
    icon: '🏦',
    title: 'Accounts & Balance Sheet',
    color: '#f97316',
    tips: [
      {
        q: 'Setting up accounts',
        a: 'Go to Settings → Categories & Accounts → Accounts tab to add checking, savings, credit, loan, or investment accounts. Give each a name, institution, and starting balance.',
      },
      {
        q: 'Balance Sheet view',
        a: 'The Balance Sheet page shows current balances for every account grouped by type, plus net-worth totals for assets and liabilities.',
      },
      {
        q: 'Reconciling balances',
        a: 'Click the balance figure on the Balance Sheet to manually override it with your real bank balance — useful when you haven\'t entered every small transaction.',
      },
    ],
  },
  {
    id: 'bills',
    icon: '🔁',
    title: 'Bills & Recurring',
    color: '#34d399',
    tips: [
      {
        q: 'Adding a recurring bill',
        a: 'Go to Bills & Recurring from the sidebar. Click Add Bill, enter the name, amount, due date, frequency (weekly, monthly, quarterly, annual), and the category it belongs to.',
      },
      {
        q: 'Upcoming bills',
        a: 'Bills are sorted by next due date so you can see what\'s coming up. Overdue bills are highlighted.',
      },
      {
        q: 'Marking as paid',
        a: 'When a bill is paid you can record the payment which automatically creates a matching transaction and advances the next due date.',
      },
    ],
  },
  {
    id: 'categories',
    icon: '🏷️',
    title: 'Categories',
    color: '#60a5fa',
    tips: [
      {
        q: 'Category groups',
        a: 'Categories are organised into groups: Income, Savings, Investments, Expenses, and Debt. Each group has a distinct accent colour used throughout the app.',
      },
      {
        q: 'Adding a category',
        a: 'In Settings → Categories & Accounts → Categories tab, click the + button on any group card to add a new category. Give it a name and icon.',
      },
      {
        q: 'Renaming or deleting',
        a: 'Click the pencil icon beside any category to rename it. Click the trash icon to delete it. Existing transactions that referenced a deleted category keep their data but the category will no longer appear in dropdowns.',
      },
      {
        q: 'Custom icons',
        a: 'When adding or editing a category you can pick from the full emoji library, browse by group, search by name or keyword, or upload/paste a custom icon image.',
      },
    ],
  },
  {
    id: 'data',
    icon: '💾',
    title: 'Data Management',
    color: '#fb923c',
    tips: [
      {
        q: 'Backing up your data',
        a: 'Go to Settings → Manage Data → Export JSON to download a complete backup of all budgets, transactions, categories, accounts, and bills as a single file.',
      },
      {
        q: 'Restoring from backup',
        a: 'On the same page use Import JSON to restore from a backup file. This replaces all current data, so export first if you want to keep your existing data.',
      },
      {
        q: 'CSV export',
        a: 'Export Transactions as CSV to open your data in Excel or any spreadsheet for custom analysis.',
      },
      {
        q: 'Data persistence',
        a: 'All data is saved to a local SQLite database managed by the backend. Settings and customisations (icon favourites, account groups, category layout) are also saved to the backend so they survive browser clears and reinstalls.',
      },
      {
        q: 'Reset to preview data',
        a: 'In Settings → Manage Data, use Reset All Data to restore the app to a clean preview state. You can choose to keep your custom templates or reset templates back to built-in only.',
      },
    ],
  },
  {
    id: 'templates',
    icon: '🧩',
    title: 'Templates',
    color: '#fbbf24',
    tips: [
      {
        q: 'Where do I find Templates?',
        a: 'Go to Settings → Templates. There you can browse built-in templates, save your current budget as a custom template, duplicate templates, and apply templates.',
      },
      {
        q: 'Built-in templates',
        a: 'The app includes Comprehensive, Young Professional, and Side Hustle templates. Built-in templates are read-only so you always have clean starting points.',
      },
      {
        q: 'Save Current as Template',
        a: 'Use Save Current to snapshot your active budget structure (categories, annual budget amounts, accounts, and bills) for reuse. Transactions are intentionally not copied into templates.',
      },
      {
        q: 'Apply template to current budget',
        a: 'Use Apply to Current Budget to replace the active budget structure with the selected template. You can choose whether to keep existing transactions before applying.',
      },
    ],
  },
  {
    id: 'budgets',
    icon: '⚙️',
    title: 'Managing Budgets',
    color: '#818cf8',
    tips: [
      {
        q: 'Renaming a budget',
        a: 'Go to Settings → Manage Budgets (cog icon in the sidebar) or hover a budget in the sidebar to access its context menu. Click Rename to change the display name.',
      },
      {
        q: 'Duplicating a budget',
        a: 'The Duplicate option in Manage Budgets creates a full copy of the selected budget, including transactions, categories, annual budget goals, accounts, and bills.',
      },
      {
        q: 'Deleting a budget',
        a: 'Use Delete in Manage Budgets. This permanently removes the budget and all its transactions, accounts, and bills. This cannot be undone — export a backup first if needed.',
      },
      {
        q: 'Budget icons',
        a: 'Every budget has an icon shown in the sidebar and on the Manage Budgets page. Click the icon in the edit modal to open the icon picker and choose any emoji or custom image.',
      },
    ],
  },
];

export default function Help() {
  const [openSection, setOpenSection] = useState('getting-started');
  const [openTip, setOpenTip] = useState(null);

  const active = SECTIONS.find((s) => s.id === openSection) || SECTIONS[0];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Help &amp; Tips</h1>
          <div className="subtitle">Everything you need to get the most out of your budget app.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Left nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => { setOpenSection(s.id); setOpenTip(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                background: openSection === s.id ? 'var(--bg-card)' : 'transparent',
                color: openSection === s.id ? 'var(--text)' : 'var(--muted)',
                fontWeight: openSection === s.id ? 700 : 400,
                fontSize: 14,
                textAlign: 'left',
                borderLeft: openSection === s.id ? `3px solid ${s.color}` : '3px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 17 }}>{s.icon}</span>
              {s.title}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div>
          <div className="card" style={{ marginBottom: 0, paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <span style={{
                fontSize: 30, width: 52, height: 52, borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${active.color}22`,
              }}>{active.icon}</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{active.title}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{active.tips.length} tips</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {active.tips.map((tip, i) => {
                const isOpen = openTip === i;
                return (
                  <div
                    key={i}
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${isOpen ? active.color + '66' : 'var(--border)'}`,
                      overflow: 'hidden',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <button
                      onClick={() => setOpenTip(isOpen ? null : i)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 12, padding: '13px 16px',
                        background: isOpen ? `${active.color}11` : 'var(--bg-card)',
                        border: 'none', cursor: 'pointer',
                        color: 'var(--text)', fontWeight: 600, fontSize: 14,
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: 6,
                          background: `${active.color}33`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, color: active.color, flexShrink: 0,
                        }}>{i + 1}</span>
                        {tip.q}
                      </span>
                      <span style={{ color: active.color, fontSize: 18, lineHeight: 1 }}>{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && (
                      <div style={{
                        padding: '12px 16px 14px 48px',
                        color: 'var(--muted)', fontSize: 14, lineHeight: 1.65,
                        background: 'var(--bg-card)',
                        borderTop: `1px solid ${active.color}33`,
                      }}>
                        {tip.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 28 }}>💡</span>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Quick tip</div>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>
            Set your Annual Budget goals first, then add transactions throughout the year — the Dashboard and Monthly View will automatically calculate how you&apos;re tracking against each goal.
          </div>
        </div>
      </div>
    </div>
  );
}
