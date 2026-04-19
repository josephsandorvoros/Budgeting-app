'use strict';

const Database = require('better-sqlite3');
const path = require('path');

let db;
let _appRef;

function getDbPath() {
  return path.join(_appRef.getPath('userData'), 'budget.db');
}

function initDatabase(app) {
  _appRef = app;
  db = new Database(getDbPath());
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id   TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      year INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'personal'
    );

    CREATE TABLE IF NOT EXISTS categories (
      id         TEXT PRIMARY KEY,
      budget_id  TEXT NOT NULL,
      group_name TEXT NOT NULL,
      name       TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS budget_amounts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      budget_id   TEXT NOT NULL,
      category_id TEXT NOT NULL,
      month_index INTEGER NOT NULL,
      amount      REAL NOT NULL DEFAULT 0,
      UNIQUE(category_id, month_index),
      FOREIGN KEY (budget_id)   REFERENCES budgets(id)    ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id              TEXT PRIMARY KEY,
      budget_id       TEXT NOT NULL,
      date            TEXT NOT NULL,
      description     TEXT,
      category        TEXT,
      group_name      TEXT,
      amount          REAL NOT NULL DEFAULT 0,
      type            TEXT,
      is_subscription INTEGER DEFAULT 0,
      notes           TEXT,
      FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id            TEXT PRIMARY KEY,
      budget_id     TEXT NOT NULL,
      name          TEXT NOT NULL,
      subtype       TEXT,
      asset_class   TEXT,
      icon          TEXT,
      start_balance REAL DEFAULT 0,
      sort_order    INTEGER DEFAULT 0,
      FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS account_balances (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id  TEXT NOT NULL,
      month_index INTEGER NOT NULL,
      balance     REAL,
      UNIQUE(account_id, month_index),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bills (
      id             TEXT PRIMARY KEY,
      budget_id      TEXT NOT NULL,
      name           TEXT,
      payee_pattern  TEXT,
      match_type     TEXT,
      amount_type    TEXT,
      amount         REAL DEFAULT 0,
      frequency      TEXT,
      next_due_date  TEXT,
      day_of_month   INTEGER,
      bill_type      TEXT,
      category       TEXT,
      account_id     TEXT,
      FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
    );
  `);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function genId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

function stmts() {
  return {
    insertBudget:        db.prepare('INSERT OR IGNORE INTO budgets (id, name, year, type) VALUES (?, ?, ?, ?)'),
    insertCategory:      db.prepare('INSERT OR IGNORE INTO categories (id, budget_id, group_name, name, sort_order) VALUES (?, ?, ?, ?, ?)'),
    insertBudgetAmount:  db.prepare('INSERT OR IGNORE INTO budget_amounts (budget_id, category_id, month_index, amount) VALUES (?, ?, ?, ?)'),
    insertTransaction:   db.prepare('INSERT OR IGNORE INTO transactions (id, budget_id, date, description, category, group_name, amount, type, is_subscription, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    insertAccount:       db.prepare('INSERT OR IGNORE INTO accounts (id, budget_id, name, subtype, asset_class, icon, start_balance, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
    insertAccountBal:    db.prepare('INSERT OR IGNORE INTO account_balances (account_id, month_index, balance) VALUES (?, ?, ?)'),
    insertBill:          db.prepare('INSERT OR IGNORE INTO bills (id, budget_id, name, payee_pattern, match_type, amount_type, amount, frequency, next_due_date, day_of_month, bill_type, category, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
  };
}

// ── Check / Seed ─────────────────────────────────────────────────────────────

function hasData() {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM budgets').get();
  return row.cnt > 0;
}

/** Called by renderer on first launch with full state object (same shape as loadAllData returns) */
function importAllData(fullState) {
  const s = stmts();
  const seedBudget = db.transaction((budgetId, budget) => {
    s.insertBudget.run(budgetId, budget.name, budget.year || 2025, budget.type || 'personal');

    let sortOrder = 0;
    for (const [group, names] of Object.entries(budget.categories || {})) {
      for (const catName of names) {
        const catId = genId('cat');
        s.insertCategory.run(catId, budgetId, group, catName, sortOrder++);
        const amounts = budget.budget?.[group]?.[catName] || [];
        for (let m = 0; m < 12; m++) {
          s.insertBudgetAmount.run(budgetId, catId, m, amounts[m] || 0);
        }
      }
    }

    for (const tx of budget.transactions || []) {
      s.insertTransaction.run(
        tx.id || genId('tx'), budgetId,
        tx.date, tx.description, tx.category,
        tx.group || tx.group_name || '',
        tx.amount, tx.type,
        (tx.isSubscription || tx.is_subscription) ? 1 : 0,
        tx.notes || ''
      );
    }

    let accSort = 0;
    for (const acc of budget.accounts || []) {
      s.insertAccount.run(
        acc.id || genId('acc'), budgetId,
        acc.name, acc.subtype,
        acc.assetClass || acc.asset_class || 'ASSETS',
        acc.icon || '🏦',
        acc.startBalance || acc.start_balance || 0,
        accSort++
      );
      const balances = acc.monthlyBalances || [];
      for (let m = 0; m < 12; m++) {
        if (balances[m] != null) {
          s.insertAccountBal.run(acc.id, m, balances[m]);
        }
      }
    }

    for (const bill of budget.bills || []) {
      s.insertBill.run(
        bill.id || genId('bill'), budgetId,
        bill.name, bill.payeePattern, bill.matchType,
        bill.amountType, bill.amount, bill.frequency,
        bill.nextDueDate, bill.dayOfMonth,
        bill.billType, bill.category, bill.accountId
      );
    }
  });

  const importAll = db.transaction((state) => {
    for (const [budgetId, budget] of Object.entries(state.budgets || {})) {
      seedBudget(budgetId, budget);
    }
    db.prepare("INSERT OR REPLACE INTO app_settings VALUES ('currentBudgetId', ?)").run(state.currentId);
  });

  importAll(fullState);
}

// ── Load All Data ─────────────────────────────────────────────────────────────

function loadAllData() {
  const budgets = db.prepare('SELECT * FROM budgets').all();
  if (budgets.length === 0) return null;

  const currentSetting = db.prepare("SELECT value FROM app_settings WHERE key = 'currentBudgetId'").get();
  const result = { currentId: currentSetting?.value || budgets[0].id, budgets: {} };

  const getCats     = db.prepare('SELECT * FROM categories WHERE budget_id = ? ORDER BY sort_order');
  const getAmounts  = db.prepare('SELECT * FROM budget_amounts WHERE budget_id = ?');
  const getTxns     = db.prepare('SELECT * FROM transactions WHERE budget_id = ? ORDER BY date DESC');
  const getAccounts = db.prepare('SELECT * FROM accounts WHERE budget_id = ? ORDER BY sort_order');
  const getBalances = db.prepare('SELECT * FROM account_balances WHERE account_id = ? ORDER BY month_index');
  const getBills    = db.prepare('SELECT * FROM bills WHERE budget_id = ?');

  for (const budget of budgets) {
    const categories = getCats.all(budget.id);
    const amounts    = getAmounts.all(budget.id);
    const catMap     = Object.fromEntries(categories.map(c => [c.id, c]));

    // Reconstruct categories: { group: [name, ...] }
    const categoriesObj = {};
    for (const cat of categories) {
      if (!categoriesObj[cat.group_name]) categoriesObj[cat.group_name] = [];
      categoriesObj[cat.group_name].push(cat.name);
    }

    // Reconstruct budget amounts: { group: { name: [12 values] } }
    const budgetObj = {};
    for (const amt of amounts) {
      const cat = catMap[amt.category_id];
      if (!cat) continue;
      if (!budgetObj[cat.group_name]) budgetObj[cat.group_name] = {};
      if (!budgetObj[cat.group_name][cat.name]) budgetObj[cat.group_name][cat.name] = Array(12).fill(0);
      budgetObj[cat.group_name][cat.name][amt.month_index] = amt.amount;
    }

    // Accounts with monthly balances
    const accounts = getAccounts.all(budget.id).map(acc => {
      const balRows = getBalances.all(acc.id);
      const monthlyBalances = Array(12).fill(null);
      for (const b of balRows) monthlyBalances[b.month_index] = b.balance;
      return {
        id: acc.id, name: acc.name, subtype: acc.subtype,
        assetClass: acc.asset_class, icon: acc.icon,
        startBalance: acc.start_balance, monthlyBalances,
      };
    });

    // Transactions
    const transactions = getTxns.all(budget.id).map(t => ({
      id: t.id, date: t.date, description: t.description,
      category: t.category, group: t.group_name,
      amount: t.amount, type: t.type,
      isSubscription: t.is_subscription === 1, notes: t.notes,
    }));

    // Bills
    const bills = getBills.all(budget.id).map(b => ({
      id: b.id, name: b.name, payeePattern: b.payee_pattern,
      matchType: b.match_type, amountType: b.amount_type,
      amount: b.amount, frequency: b.frequency,
      nextDueDate: b.next_due_date, dayOfMonth: b.day_of_month,
      billType: b.bill_type, category: b.category, accountId: b.account_id,
    }));

    result.budgets[budget.id] = {
      name: budget.name, year: budget.year, type: budget.type,
      categories: categoriesObj, budget: budgetObj,
      transactions, accounts, bills,
    };
  }

  return result;
}

// ── Budget Management ─────────────────────────────────────────────────────────

function setCurrentBudget(id) {
  db.prepare("INSERT OR REPLACE INTO app_settings VALUES ('currentBudgetId', ?)").run(id);
}

function createBudget(id, name, year, type, seedState) {
  const ins = db.transaction(() => {
    db.prepare('INSERT INTO budgets (id, name, year, type) VALUES (?, ?, ?, ?)').run(id, name, year, type);
    if (seedState) {
      // Seed with defaults passed from renderer
      const s = stmts();
      let sortOrder = 0;
      for (const [group, names] of Object.entries(seedState.categories || {})) {
        for (const catName of names) {
          const catId = genId('cat');
          s.insertCategory.run(catId, id, group, catName, sortOrder++);
          const amounts = seedState.budget?.[group]?.[catName] || [];
          for (let m = 0; m < 12; m++) {
            s.insertBudgetAmount.run(id, catId, m, amounts[m] || 0);
          }
        }
      }
      let accSort = 0;
      for (const acc of seedState.accounts || []) {
        s.insertAccount.run(genId('acc'), id, acc.name, acc.subtype,
          acc.assetClass || 'ASSETS', acc.icon || '🏦',
          acc.startBalance || 0, accSort++);
      }
      for (const bill of seedState.bills || []) {
        s.insertBill.run(genId('bill'), id, bill.name, bill.payeePattern,
          bill.matchType, bill.amountType, bill.amount, bill.frequency,
          bill.nextDueDate, bill.dayOfMonth, bill.billType, bill.category, bill.accountId);
      }
    }
    db.prepare("INSERT OR REPLACE INTO app_settings VALUES ('currentBudgetId', ?)").run(id);
  });
  ins();
}

function updateBudgetMeta(id, name, year) {
  db.prepare('UPDATE budgets SET name = ?, year = ? WHERE id = ?').run(name, year, id);
}

function deleteBudget(id) {
  db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
  const remaining = db.prepare('SELECT id FROM budgets').all();
  if (remaining.length > 0) {
    db.prepare("INSERT OR REPLACE INTO app_settings VALUES ('currentBudgetId', ?)").run(remaining[0].id);
    return remaining[0].id;
  }
  return null;
}

// ── Transactions ──────────────────────────────────────────────────────────────

function addTransaction(budgetId, tx) {
  db.prepare(
    'INSERT INTO transactions (id, budget_id, date, description, category, group_name, amount, type, is_subscription, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(tx.id, budgetId, tx.date, tx.description, tx.category,
    tx.group || '', tx.amount, tx.type,
    tx.isSubscription ? 1 : 0, tx.notes || '');
}

function updateTransaction(id, updates) {
  const fields = [];
  const vals = [];
  if (updates.date        !== undefined) { fields.push('date = ?');            vals.push(updates.date); }
  if (updates.description !== undefined) { fields.push('description = ?');     vals.push(updates.description); }
  if (updates.category    !== undefined) { fields.push('category = ?');        vals.push(updates.category); }
  if (updates.group       !== undefined) { fields.push('group_name = ?');      vals.push(updates.group); }
  if (updates.amount      !== undefined) { fields.push('amount = ?');          vals.push(updates.amount); }
  if (updates.type        !== undefined) { fields.push('type = ?');            vals.push(updates.type); }
  if (updates.isSubscription !== undefined) { fields.push('is_subscription = ?'); vals.push(updates.isSubscription ? 1 : 0); }
  if (updates.notes       !== undefined) { fields.push('notes = ?');           vals.push(updates.notes); }
  if (fields.length === 0) return;
  vals.push(id);
  db.prepare(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
}

function deleteTransaction(id) {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
}

function importTransactions(budgetId, txArray) {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO transactions (id, budget_id, date, description, category, group_name, amount, type, is_subscription, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const bulk = db.transaction((rows) => {
    for (const tx of rows) {
      ins.run(tx.id || genId('tx'), budgetId,
        tx.date, tx.description, tx.category,
        tx.group || tx.group_name || '', tx.amount, tx.type,
        (tx.isSubscription || tx.is_subscription) ? 1 : 0, tx.notes || '');
    }
  });
  bulk(txArray);
}

// ── Budget Amounts ────────────────────────────────────────────────────────────

function updateBudgetAmount(budgetId, group, category, monthIndex, amount) {
  const cat = db.prepare(
    'SELECT id FROM categories WHERE budget_id = ? AND group_name = ? AND name = ?'
  ).get(budgetId, group, category);
  if (!cat) return;
  db.prepare(
    'INSERT INTO budget_amounts (budget_id, category_id, month_index, amount) VALUES (?, ?, ?, ?) ON CONFLICT(category_id, month_index) DO UPDATE SET amount = excluded.amount'
  ).run(budgetId, cat.id, monthIndex, amount);
}

// ── Categories ────────────────────────────────────────────────────────────────

function addCategory(budgetId, group, name) {
  const catId = genId('cat');
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM categories WHERE budget_id = ?').get(budgetId);
  db.prepare('INSERT INTO categories (id, budget_id, group_name, name, sort_order) VALUES (?, ?, ?, ?, ?)').run(catId, budgetId, group, name, (maxOrder?.m || 0) + 1);
  for (let m = 0; m < 12; m++) {
    db.prepare('INSERT INTO budget_amounts (budget_id, category_id, month_index, amount) VALUES (?, ?, ?, ?)').run(budgetId, catId, m, 0);
  }
}

function removeCategory(budgetId, group, name) {
  const cat = db.prepare('SELECT id FROM categories WHERE budget_id = ? AND group_name = ? AND name = ?').get(budgetId, group, name);
  if (cat) db.prepare('DELETE FROM categories WHERE id = ?').run(cat.id);
}

// ── Accounts ──────────────────────────────────────────────────────────────────

function addAccount(budgetId, acc) {
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM accounts WHERE budget_id = ?').get(budgetId);
  db.prepare('INSERT INTO accounts (id, budget_id, name, subtype, asset_class, icon, start_balance, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    acc.id, budgetId, acc.name, acc.subtype,
    acc.assetClass || 'ASSETS', acc.icon || '🏦',
    acc.startBalance || 0, (maxOrder?.m || 0) + 1
  );
}

function updateAccount(id, updates) {
  const fields = [];
  const vals = [];
  if (updates.name         !== undefined) { fields.push('name = ?');          vals.push(updates.name); }
  if (updates.subtype      !== undefined) { fields.push('subtype = ?');       vals.push(updates.subtype); }
  if (updates.assetClass   !== undefined) { fields.push('asset_class = ?');   vals.push(updates.assetClass); }
  if (updates.icon         !== undefined) { fields.push('icon = ?');          vals.push(updates.icon); }
  if (updates.startBalance !== undefined) { fields.push('start_balance = ?'); vals.push(updates.startBalance); }
  if (fields.length === 0) return;
  vals.push(id);
  db.prepare(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
}

function updateAccountBalance(accountId, monthIndex, balance) {
  db.prepare(
    'INSERT INTO account_balances (account_id, month_index, balance) VALUES (?, ?, ?) ON CONFLICT(account_id, month_index) DO UPDATE SET balance = excluded.balance'
  ).run(accountId, monthIndex, balance);
}

function deleteAccount(id) {
  db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
}

// ── Bills ─────────────────────────────────────────────────────────────────────

function addBill(budgetId, bill) {
  db.prepare(
    'INSERT INTO bills (id, budget_id, name, payee_pattern, match_type, amount_type, amount, frequency, next_due_date, day_of_month, bill_type, category, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(bill.id, budgetId, bill.name, bill.payeePattern, bill.matchType,
    bill.amountType, bill.amount, bill.frequency, bill.nextDueDate,
    bill.dayOfMonth, bill.billType, bill.category, bill.accountId);
}

function updateBill(id, updates) {
  const fields = [];
  const vals = [];
  const map = {
    name: 'name', payeePattern: 'payee_pattern', matchType: 'match_type',
    amountType: 'amount_type', amount: 'amount', frequency: 'frequency',
    nextDueDate: 'next_due_date', dayOfMonth: 'day_of_month',
    billType: 'bill_type', category: 'category', accountId: 'account_id',
  };
  for (const [key, col] of Object.entries(map)) {
    if (updates[key] !== undefined) { fields.push(`${col} = ?`); vals.push(updates[key]); }
  }
  if (fields.length === 0) return;
  vals.push(id);
  db.prepare(`UPDATE bills SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
}

function deleteBill(id) {
  db.prepare('DELETE FROM bills WHERE id = ?').run(id);
}

module.exports = {
  initDatabase,
  hasData,
  importAllData,
  loadAllData,
  setCurrentBudget,
  createBudget,
  updateBudgetMeta,
  deleteBudget,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  importTransactions,
  updateBudgetAmount,
  addCategory,
  removeCategory,
  addAccount,
  updateAccount,
  updateAccountBalance,
  deleteAccount,
  addBill,
  updateBill,
  deleteBill,
};
