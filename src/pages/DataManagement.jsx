import { useRef, useState } from 'react';

function downloadTextFile(fileName, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(v) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toTransactionsCsv(transactions = []) {
  const headers = [
    'date', 'description', 'group', 'category', 'amount', 'type', 'is_subscription', 'notes', 'reviewed', 'id',
  ];
  const lines = [headers.join(',')];
  transactions.forEach((t) => {
    const row = [
      t.date,
      t.description,
      t.group,
      t.category,
      t.amount,
      t.type,
      t.is_subscription ? 'true' : 'false',
      t.notes,
      t.reviewed ? 'true' : 'false',
      t.id,
    ].map(csvEscape).join(',');
    lines.push(row);
  });
  return lines.join('\n');
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const splitCsvLine = (line) => {
    const cols = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur);
    return cols;
  };

  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? '').trim();
    });
    return row;
  });
}

export default function DataManagement({ data, exportAllData, importAllData, importTransactions }) {
  const backupInputRef = useRef(null);
  const csvInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const handleCreateBackup = () => {
    setErr('');
    setMsg('');
    try {
      const backup = exportAllData();
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      downloadTextFile(`budget-backup-${stamp}.json`, JSON.stringify(backup, null, 2), 'application/json');
      setMsg('Backup downloaded.');
    } catch (e) {
      setErr(e.message || 'Failed to create backup.');
    }
  };

  const handleRestoreBackupFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await importAllData(parsed);
      setMsg('Backup restored successfully.');
    } catch (error) {
      setErr(error.message || 'Failed to restore backup file.');
    } finally {
      setBusy(false);
    }
  };

  const handleExportTransactionsCsv = () => {
    setErr('');
    setMsg('');
    try {
      const txs = data?.transactions || [];
      const stamp = new Date().toISOString().slice(0, 10);
      downloadTextFile(`transactions-${stamp}.csv`, toTransactionsCsv(txs), 'text/csv;charset=utf-8');
      setMsg(`Exported ${txs.length} transactions to CSV.`);
    } catch (e) {
      setErr(e.message || 'Failed to export CSV.');
    }
  };

  const handleImportTransactionsCsv = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) throw new Error('CSV does not contain data rows.');

      const txs = rows.map((r) => ({
        date: r.date || new Date().toISOString().slice(0, 10),
        description: r.description || '(imported)',
        group: r.group || 'Expenses',
        category: r.category || '',
        amount: Math.abs(parseFloat((r.amount || '0').replace(/[$,]/g, '')) || 0),
        type: (r.type || 'expense').toLowerCase(),
        is_subscription: ['true', '1', 'yes'].includes((r.is_subscription || '').toLowerCase()),
        notes: r.notes || '',
        reviewed: ['true', '1', 'yes'].includes((r.reviewed || '').toLowerCase()),
      }));

      importTransactions(txs);
      setMsg(`Imported ${txs.length} transactions from CSV.`);
    } catch (error) {
      setErr(error.message || 'Failed to import transactions CSV.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Data Management</h1>
          <div className="subtitle">Backup and restore your data in JSON or CSV format.</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 760, display: 'grid', gap: 12 }}>
        <div style={{ fontWeight: 700, color: 'var(--text)' }}>Full Backup (JSON)</div>
        <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Includes every budget, category, account, bill, and transaction.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={handleCreateBackup} disabled={busy}>Create Backup</button>
          <button className="btn-ghost" onClick={() => backupInputRef.current?.click()} disabled={busy}>Restore from File</button>
          <input ref={backupInputRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleRestoreBackupFile} />
        </div>
      </div>

      <div className="card" style={{ maxWidth: 760, display: 'grid', gap: 12 }}>
        <div style={{ fontWeight: 700, color: 'var(--text)' }}>Transactions (CSV)</div>
        <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Export current budget transactions to CSV, or import a CSV file into the current budget.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={handleExportTransactionsCsv} disabled={busy}>Export CSV</button>
          <button className="btn-ghost" onClick={() => csvInputRef.current?.click()} disabled={busy}>Import CSV</button>
          <input ref={csvInputRef} type="file" accept="text/csv,.csv" style={{ display: 'none' }} onChange={handleImportTransactionsCsv} />
        </div>
      </div>

      {(msg || err) && (
        <div className="card" style={{ maxWidth: 760 }}>
          {msg && <div className="accent" style={{ marginBottom: err ? 8 : 0 }}>{msg}</div>}
          {err && <div className="danger">{err}</div>}
        </div>
      )}
    </div>
  );
}
