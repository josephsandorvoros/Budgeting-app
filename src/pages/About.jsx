export default function About() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>About</h1>
          <div className="subtitle">Local-first personal and business budgeting workspace.</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 860, display: 'grid', gap: 12 }}>
        <div style={{ fontWeight: 700, color: 'var(--text)' }}>Budget Ledger</div>
        <div style={{ color: 'var(--muted)' }}>
          This app helps you plan and track budgets, transactions, recurring bills, accounts, debt payoff, and net worth across both personal and business scenarios.
        </div>
        <div style={{ color: 'var(--muted)' }}>
          New templates workflow: use built-in templates (Comprehensive, Young Professional, Side Hustle), save your current budget as a template, duplicate templates, and apply a template to either a new or existing budget.
        </div>
        <div style={{ color: 'var(--muted)' }}>
          Your data is local-first and private by default: budgets and settings are stored in a local SQLite database managed by the app backend.
        </div>
        <div style={{ color: 'var(--muted)' }}>
          Backups are available anytime from Settings → Manage Data (JSON export/import and CSV transaction import/export).
        </div>
        <div style={{ color: 'var(--muted)' }}>
          Built with React + Vite on the frontend and FastAPI + SQLite on the backend.
        </div>
      </div>
    </div>
  );
}
