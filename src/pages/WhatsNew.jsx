export default function WhatsNew() {
  const updates = [
    {
      title: 'Templates Settings',
      detail: 'Added a full templates workflow: built-in templates, save-current template creation, template duplication, custom template editing, and apply-to-current budget replacement with confirmation.',
    },
    {
      title: 'Help & Documentation Refresh',
      detail: 'Updated Help and About content to reflect templates, current data flow, and latest budget management behavior.',
    },
    {
      title: 'Manage Budgets Screen',
      detail: 'Added a dedicated page to rename, duplicate, delete, and activate budget scenarios across personal and business profiles.',
    },
    {
      title: 'Year Switching Reliability',
      detail: 'Fixed year-switch logic in dashboard views to prevent stale loading states when moving between budget years.',
    },
    {
      title: 'Data Seeding & Anonymization',
      detail: 'Demo/default budget content was refreshed with anonymized categories, accounts, bills, and transaction data suitable for fresh installs and demos.',
    },
    {
      title: 'Backup & Restore',
      detail: 'Export full JSON backups, restore from JSON, and export/import transactions as CSV from Settings → Manage Data.',
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>What's New</h1>
          <div className="subtitle">Latest improvements in your budgeting app (April 2026).</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12, maxWidth: 860 }}>
        {updates.map((u) => (
          <div key={u.title} className="card">
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{u.title}</div>
            <div style={{ color: 'var(--muted)' }}>{u.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
