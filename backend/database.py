"""SQLite database layer using Python's built-in sqlite3."""
import sqlite3
import os
import uuid
import time
import json
from pathlib import Path


def get_db_path() -> str:
    data_dir = Path(os.environ.get("BUDGET_DATA_DIR", Path.home() / ".budgetapp"))
    data_dir.mkdir(parents=True, exist_ok=True)
    return str(data_dir / "budget.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def gen_id(prefix: str = "") -> str:
    return f"{prefix}{int(time.time() * 1000):x}{uuid.uuid4().hex[:4]}"


def init_database():
    with get_connection() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS app_settings (
                key   TEXT PRIMARY KEY,
                value TEXT
            );
            CREATE TABLE IF NOT EXISTS budgets (
                id   TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                year INTEGER NOT NULL,
                type TEXT NOT NULL DEFAULT 'personal',
                icon TEXT NOT NULL DEFAULT '📈'
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
        """)

        cols = [r["name"] for r in conn.execute("PRAGMA table_info(budgets)").fetchall()]
        if "icon" not in cols:
            conn.execute("ALTER TABLE budgets ADD COLUMN icon TEXT NOT NULL DEFAULT '📈'")


# ── Check / Seed ──────────────────────────────────────────────────────────────

def has_data() -> bool:
    with get_connection() as conn:
        row = conn.execute("SELECT COUNT(*) FROM budgets").fetchone()
        return row[0] > 0


def get_app_setting(key: str) -> str | None:
    with get_connection() as conn:
        row = conn.execute("SELECT value FROM app_settings WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else None


def set_app_setting(key: str, value: str):
    with get_connection() as conn:
        conn.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)", (key, value))


def get_templates() -> list[dict]:
    raw = get_app_setting("budgetTemplates")
    if not raw:
        return []
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def save_templates(templates: list[dict]):
    set_app_setting("budgetTemplates", json.dumps(templates))


def upsert_template(template: dict):
    templates = get_templates()
    incoming_id = template.get("id")
    if incoming_id:
        for i, t in enumerate(templates):
            if t.get("id") == incoming_id:
                templates[i] = template
                save_templates(templates)
                return
    templates.append(template)
    save_templates(templates)


def delete_template(template_id: str):
    templates = get_templates()
    templates = [t for t in templates if t.get("id") != template_id]
    save_templates(templates)


def reset_all_data(full_state: dict, keep_templates: bool = True):
    templates = get_templates() if keep_templates else []

    with get_connection() as conn:
        conn.execute("DELETE FROM budgets")
        conn.execute("DELETE FROM app_settings")

    if keep_templates:
        save_templates(templates)

    import_all_data(full_state)


def import_all_data(full_state: dict):
    with get_connection() as conn:
        for budget_id, budget in (full_state.get("budgets") or {}).items():
            conn.execute(
                "INSERT OR IGNORE INTO budgets (id, name, year, type, icon) VALUES (?, ?, ?, ?, ?)",
                (
                    budget_id,
                    budget.get("name", "Budget"),
                    budget.get("year", 2025),
                    budget.get("type", "personal"),
                    budget.get("icon", "💼" if budget.get("type", "personal") == "business" else "📈"),
                )
            )
            sort_order = 0
            for group, names in (budget.get("categories") or {}).items():
                for cat_name in names:
                    cat_id = gen_id("cat")
                    conn.execute(
                        "INSERT OR IGNORE INTO categories (id, budget_id, group_name, name, sort_order) VALUES (?, ?, ?, ?, ?)",
                        (cat_id, budget_id, group, cat_name, sort_order)
                    )
                    sort_order += 1
                    amounts = (budget.get("budget") or {}).get(group, {}).get(cat_name, [])
                    for m in range(12):
                        conn.execute(
                            "INSERT OR IGNORE INTO budget_amounts (budget_id, category_id, month_index, amount) VALUES (?, ?, ?, ?)",
                            (budget_id, cat_id, m, amounts[m] if m < len(amounts) else 0)
                        )

            for tx in (budget.get("transactions") or []):
                conn.execute(
                    "INSERT OR IGNORE INTO transactions (id, budget_id, date, description, category, group_name, amount, type, is_subscription, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (tx.get("id") or gen_id("tx"), budget_id, tx.get("date", ""), tx.get("description"),
                     tx.get("category"), tx.get("group") or tx.get("group_name", ""),
                     tx.get("amount", 0), tx.get("type"), 1 if (tx.get("isSubscription") or tx.get("is_subscription")) else 0,
                     tx.get("notes", ""))
                )

            acc_sort = 0
            for acc in (budget.get("accounts") or []):
                acc_id = acc.get("id") or gen_id("acc")
                conn.execute(
                    "INSERT OR IGNORE INTO accounts (id, budget_id, name, subtype, asset_class, icon, start_balance, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (acc_id, budget_id, acc.get("name", ""), acc.get("subtype"),
                     acc.get("assetClass") or acc.get("asset_class", "ASSETS"),
                     acc.get("icon", "🏦"), acc.get("startBalance") or acc.get("start_balance", 0), acc_sort)
                )
                acc_sort += 1
                balances = acc.get("monthlyBalances") or []
                for m, bal in enumerate(balances):
                    if bal is not None:
                        conn.execute(
                            "INSERT OR IGNORE INTO account_balances (account_id, month_index, balance) VALUES (?, ?, ?)",
                            (acc_id, m, bal)
                        )

            for bill in (budget.get("bills") or []):
                conn.execute(
                    "INSERT OR IGNORE INTO bills (id, budget_id, name, payee_pattern, match_type, amount_type, amount, frequency, next_due_date, day_of_month, bill_type, category, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (bill.get("id") or gen_id("bill"), budget_id, bill.get("name"), bill.get("payeePattern"),
                     bill.get("matchType"), bill.get("amountType"), bill.get("amount", 0),
                     bill.get("frequency"), bill.get("nextDueDate"), bill.get("dayOfMonth"),
                     bill.get("billType"), bill.get("category"), bill.get("accountId"))
                )

        conn.execute(
            "INSERT OR REPLACE INTO app_settings VALUES ('currentBudgetId', ?)",
            (full_state.get("currentId"),)
        )


def load_all_data() -> dict | None:
    with get_connection() as conn:
        budgets = conn.execute("SELECT * FROM budgets").fetchall()
        if not budgets:
            return None

        setting = conn.execute("SELECT value FROM app_settings WHERE key = 'currentBudgetId'").fetchone()
        current_id = setting["value"] if setting else budgets[0]["id"]
        result = {"currentId": current_id, "budgets": {}}

        for budget in budgets:
            bid = budget["id"]
            cats = conn.execute("SELECT * FROM categories WHERE budget_id = ? ORDER BY sort_order", (bid,)).fetchall()
            amounts = conn.execute("SELECT * FROM budget_amounts WHERE budget_id = ?", (bid,)).fetchall()
            cat_map = {c["id"]: c for c in cats}

            categories_obj: dict = {}
            for cat in cats:
                categories_obj.setdefault(cat["group_name"], []).append(cat["name"])

            budget_obj: dict = {}
            for amt in amounts:
                cat = cat_map.get(amt["category_id"])
                if not cat:
                    continue
                g, n = cat["group_name"], cat["name"]
                budget_obj.setdefault(g, {}).setdefault(n, [0] * 12)
                budget_obj[g][n][amt["month_index"]] = amt["amount"]

            accounts = []
            for acc in conn.execute("SELECT * FROM accounts WHERE budget_id = ? ORDER BY sort_order", (bid,)).fetchall():
                bal_rows = conn.execute("SELECT * FROM account_balances WHERE account_id = ? ORDER BY month_index", (acc["id"],)).fetchall()
                monthly = [None] * 12
                for b in bal_rows:
                    monthly[b["month_index"]] = b["balance"]
                accounts.append({
                    "id": acc["id"], "name": acc["name"], "subtype": acc["subtype"],
                    "assetClass": acc["asset_class"], "icon": acc["icon"],
                    "startBalance": acc["start_balance"], "monthlyBalances": monthly,
                })

            transactions = [
                {"id": t["id"], "date": t["date"], "description": t["description"],
                 "category": t["category"], "group": t["group_name"],
                 "amount": t["amount"], "type": t["type"],
                 "isSubscription": bool(t["is_subscription"]), "notes": t["notes"]}
                for t in conn.execute("SELECT * FROM transactions WHERE budget_id = ? ORDER BY date DESC", (bid,)).fetchall()
            ]

            bills = [
                {"id": b["id"], "name": b["name"], "payeePattern": b["payee_pattern"],
                 "matchType": b["match_type"], "amountType": b["amount_type"],
                 "amount": b["amount"], "frequency": b["frequency"],
                 "nextDueDate": b["next_due_date"], "dayOfMonth": b["day_of_month"],
                 "billType": b["bill_type"], "category": b["category"], "accountId": b["account_id"]}
                for b in conn.execute("SELECT * FROM bills WHERE budget_id = ?", (bid,)).fetchall()
            ]

            result["budgets"][bid] = {
                "name": budget["name"], "year": budget["year"], "type": budget["type"],
                "icon": budget["icon"] or ("💼" if budget["type"] == "business" else "📈"),
                "categories": categories_obj, "budget": budget_obj,
                "transactions": transactions, "accounts": accounts, "bills": bills,
            }

        return result


# ── Budget management ─────────────────────────────────────────────────────────

def set_current_budget(budget_id: str):
    with get_connection() as conn:
        conn.execute("INSERT OR REPLACE INTO app_settings VALUES ('currentBudgetId', ?)", (budget_id,))


def create_budget(budget_id: str, name: str, year: int, budget_type: str, icon: str | None, seed_state: dict | None):
    with get_connection() as conn:
        final_icon = icon or ("💼" if budget_type == "business" else "📈")
        conn.execute("INSERT INTO budgets (id, name, year, type, icon) VALUES (?, ?, ?, ?, ?)",
                     (budget_id, name, year, budget_type, final_icon))
        if seed_state:
            sort_order = 0
            for group, names in (seed_state.get("categories") or {}).items():
                for cat_name in names:
                    cat_id = gen_id("cat")
                    conn.execute(
                        "INSERT INTO categories (id, budget_id, group_name, name, sort_order) VALUES (?, ?, ?, ?, ?)",
                        (cat_id, budget_id, group, cat_name, sort_order)
                    )
                    sort_order += 1
                    amounts = (seed_state.get("budget") or {}).get(group, {}).get(cat_name, [])
                    for m in range(12):
                        conn.execute(
                            "INSERT INTO budget_amounts (budget_id, category_id, month_index, amount) VALUES (?, ?, ?, ?)",
                            (budget_id, cat_id, m, amounts[m] if m < len(amounts) else 0)
                        )
            acc_sort = 0
            for acc in (seed_state.get("accounts") or []):
                conn.execute(
                    "INSERT INTO accounts (id, budget_id, name, subtype, asset_class, icon, start_balance, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (gen_id("acc"), budget_id, acc.get("name", ""), acc.get("subtype"),
                     acc.get("assetClass", "ASSETS"), acc.get("icon", "🏦"), acc.get("startBalance", 0), acc_sort)
                )
                acc_sort += 1
            for bill in (seed_state.get("bills") or []):
                conn.execute(
                    "INSERT INTO bills (id, budget_id, name, payee_pattern, match_type, amount_type, amount, frequency, next_due_date, day_of_month, bill_type, category, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (gen_id("bill"), budget_id, bill.get("name"), bill.get("payeePattern"), bill.get("matchType"),
                     bill.get("amountType"), bill.get("amount", 0), bill.get("frequency"), bill.get("nextDueDate"),
                     bill.get("dayOfMonth"), bill.get("billType"), bill.get("category"), bill.get("accountId"))
                )
        conn.execute("INSERT OR REPLACE INTO app_settings VALUES ('currentBudgetId', ?)", (budget_id,))


def update_budget_meta(budget_id: str, name: str, year: int, icon: str | None = None):
    with get_connection() as conn:
        if icon is None:
            conn.execute("UPDATE budgets SET name = ?, year = ? WHERE id = ?", (name, year, budget_id))
        else:
            conn.execute("UPDATE budgets SET name = ?, year = ?, icon = ? WHERE id = ?", (name, year, icon, budget_id))


def delete_budget(budget_id: str) -> str | None:
    with get_connection() as conn:
        conn.execute("DELETE FROM budgets WHERE id = ?", (budget_id,))
        remaining = conn.execute("SELECT id FROM budgets").fetchall()
        if remaining:
            conn.execute("INSERT OR REPLACE INTO app_settings VALUES ('currentBudgetId', ?)", (remaining[0]["id"],))
            return remaining[0]["id"]
        return None


# ── Transactions ──────────────────────────────────────────────────────────────

def add_transaction(budget_id: str, tx: dict):
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO transactions (id, budget_id, date, description, category, group_name, amount, type, is_subscription, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (tx.get("id") or gen_id("tx"), budget_id, tx.get("date", ""), tx.get("description"),
             tx.get("category"), tx.get("group", ""), tx.get("amount", 0), tx.get("type"),
             1 if tx.get("isSubscription") else 0, tx.get("notes", ""))
        )


def update_transaction(tx_id: str, updates: dict):
    field_map = {
        "date": "date", "description": "description", "category": "category",
        "group": "group_name", "amount": "amount", "type": "type",
        "isSubscription": "is_subscription", "notes": "notes",
    }
    fields, vals = [], []
    for key, col in field_map.items():
        if key in updates:
            val = updates[key]
            if key == "isSubscription":
                val = 1 if val else 0
            fields.append(f"{col} = ?")
            vals.append(val)
    if not fields:
        return
    vals.append(tx_id)
    with get_connection() as conn:
        conn.execute(f"UPDATE transactions SET {', '.join(fields)} WHERE id = ?", vals)


def delete_transaction(tx_id: str):
    with get_connection() as conn:
        conn.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))


def import_transactions(budget_id: str, tx_array: list):
    with get_connection() as conn:
        for tx in tx_array:
            conn.execute(
                "INSERT OR IGNORE INTO transactions (id, budget_id, date, description, category, group_name, amount, type, is_subscription, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (tx.get("id") or gen_id("tx"), budget_id, tx.get("date", ""), tx.get("description"),
                 tx.get("category"), tx.get("group") or tx.get("group_name", ""),
                 tx.get("amount", 0), tx.get("type"),
                 1 if (tx.get("isSubscription") or tx.get("is_subscription")) else 0, tx.get("notes", ""))
            )


# ── Budget Amounts ────────────────────────────────────────────────────────────

def update_budget_amount(budget_id: str, group: str, category: str, month_index: int, amount: float):
    with get_connection() as conn:
        cat = conn.execute(
            "SELECT id FROM categories WHERE budget_id = ? AND group_name = ? AND name = ?",
            (budget_id, group, category)
        ).fetchone()
        if not cat:
            return
        conn.execute(
            "INSERT INTO budget_amounts (budget_id, category_id, month_index, amount) VALUES (?, ?, ?, ?) ON CONFLICT(category_id, month_index) DO UPDATE SET amount = excluded.amount",
            (budget_id, cat["id"], month_index, amount)
        )


# ── Categories ────────────────────────────────────────────────────────────────

def add_category(budget_id: str, group: str, name: str):
    with get_connection() as conn:
        row = conn.execute("SELECT MAX(sort_order) as m FROM categories WHERE budget_id = ?", (budget_id,)).fetchone()
        max_order = row["m"] or 0
        cat_id = gen_id("cat")
        conn.execute(
            "INSERT INTO categories (id, budget_id, group_name, name, sort_order) VALUES (?, ?, ?, ?, ?)",
            (cat_id, budget_id, group, name, max_order + 1)
        )
        for m in range(12):
            conn.execute(
                "INSERT INTO budget_amounts (budget_id, category_id, month_index, amount) VALUES (?, ?, ?, ?)",
                (budget_id, cat_id, m, 0)
            )


def remove_category(budget_id: str, group: str, name: str):
    with get_connection() as conn:
        cat = conn.execute(
            "SELECT id FROM categories WHERE budget_id = ? AND group_name = ? AND name = ?",
            (budget_id, group, name)
        ).fetchone()
        if cat:
            conn.execute("DELETE FROM categories WHERE id = ?", (cat["id"],))


# ── Accounts ──────────────────────────────────────────────────────────────────

def add_account(budget_id: str, acc: dict):
    with get_connection() as conn:
        row = conn.execute("SELECT MAX(sort_order) as m FROM accounts WHERE budget_id = ?", (budget_id,)).fetchone()
        max_order = row["m"] or 0
        conn.execute(
            "INSERT INTO accounts (id, budget_id, name, subtype, asset_class, icon, start_balance, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (acc.get("id") or gen_id("acc"), budget_id, acc.get("name", ""), acc.get("subtype"),
             acc.get("assetClass", "ASSETS"), acc.get("icon", "🏦"), acc.get("startBalance", 0), max_order + 1)
        )


def update_account(acc_id: str, updates: dict):
    field_map = {
        "name": "name", "subtype": "subtype", "assetClass": "asset_class",
        "icon": "icon", "startBalance": "start_balance",
    }
    fields, vals = [], []
    for key, col in field_map.items():
        if key in updates:
            fields.append(f"{col} = ?")
            vals.append(updates[key])
    if not fields:
        return
    vals.append(acc_id)
    with get_connection() as conn:
        conn.execute(f"UPDATE accounts SET {', '.join(fields)} WHERE id = ?", vals)


def update_account_balance(account_id: str, month_index: int, balance: float):
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO account_balances (account_id, month_index, balance) VALUES (?, ?, ?) ON CONFLICT(account_id, month_index) DO UPDATE SET balance = excluded.balance",
            (account_id, month_index, balance)
        )


def delete_account(acc_id: str):
    with get_connection() as conn:
        conn.execute("DELETE FROM accounts WHERE id = ?", (acc_id,))


# ── Bills ─────────────────────────────────────────────────────────────────────

def add_bill(budget_id: str, bill: dict):
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO bills (id, budget_id, name, payee_pattern, match_type, amount_type, amount, frequency, next_due_date, day_of_month, bill_type, category, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (bill.get("id") or gen_id("bill"), budget_id, bill.get("name"), bill.get("payeePattern"),
             bill.get("matchType"), bill.get("amountType"), bill.get("amount", 0), bill.get("frequency"),
             bill.get("nextDueDate"), bill.get("dayOfMonth"), bill.get("billType"),
             bill.get("category"), bill.get("accountId"))
        )


def update_bill(bill_id: str, updates: dict):
    field_map = {
        "name": "name", "payeePattern": "payee_pattern", "matchType": "match_type",
        "amountType": "amount_type", "amount": "amount", "frequency": "frequency",
        "nextDueDate": "next_due_date", "dayOfMonth": "day_of_month",
        "billType": "bill_type", "category": "category", "accountId": "account_id",
    }
    fields, vals = [], []
    for key, col in field_map.items():
        if key in updates:
            fields.append(f"{col} = ?")
            vals.append(updates[key])
    if not fields:
        return
    vals.append(bill_id)
    with get_connection() as conn:
        conn.execute(f"UPDATE bills SET {', '.join(fields)} WHERE id = ?", vals)


def delete_bill(bill_id: str):
    with get_connection() as conn:
        conn.execute("DELETE FROM bills WHERE id = ?", (bill_id,))
