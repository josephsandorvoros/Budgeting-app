"""
Seed the app with generic anonymized demo data:
    - Personal budget "My Budget"  → household income/expenses (2024 full year + 2025 full year + 2026 Jan-Apr)
    - Business budget "Side Hustle" → side hustle / freelance (2025 full year + 2026 Jan-Apr)

Run:  python backend/seed_demo.py
"""

import json, random, requests, sqlite3, sys, os
import json, random, requests, sqlite3, sys, os, uuid

from datetime import date
from pathlib import Path

API = "http://127.0.0.1:8765/api"
random.seed(42)

def get_db_path():
    data_dir = Path(os.environ.get("BUDGET_DATA_DIR", Path.home() / ".budgetapp"))
    return str(data_dir / "budget.db")

# ──────────────────────────────────────────────────────────────────────────────
# helpers
# ──────────────────────────────────────────────────────────────────────────────
_tid = 0
def tid():
    global _tid; _tid += 1; return f"tx{_tid}"

def tx(d, desc, category, group, amount, typ, sub=False, notes=""):
    return dict(id=tid(), date=str(d), description=desc, category=category,
                group=group, amount=round(amount, 2), type=typ,
                isSubscription=sub, notes=notes)

def jitter(base, pct=0.08):
    """Return base ± pct%."""
    return base * (1 + random.uniform(-pct, pct))

def day(year, month, d):
    try:
        return date(year, month, d)
    except ValueError:
        return date(year, month, 28)

# ──────────────────────────────────────────────────────────────────────────────
# personal household transactions for one year
# ──────────────────────────────────────────────────────────────────────────────
def personal_year(year, months=12):
    txs = []
    for m in range(1, months + 1):
        # ── Income ───────────────────────────────────────────────────────────
        # Two bi-monthly salary deposits
        txs.append(tx(day(year,m,1),  "Employer Direct Deposit", "Primary Salary", "Income", 2494, "income"))
        txs.append(tx(day(year,m,15), "Employer Direct Deposit", "Primary Salary", "Income", 2494, "income"))
        # Quarterly commission in Mar, Jun, Sep, Dec
        if m in (3, 6, 9, 12):
            comm = jitter(1600, 0.25)
            txs.append(tx(day(year,m,20), "Commission Payment", "Commissions & Bonuses", "Income", comm, "income"))
        # Rental income
        txs.append(tx(day(year,m,3), "Rental Property Income", "Rental Income", "Income", 1840, "income"))
        # Pre-tax 401K contribution reflected as income line
        txs.append(tx(day(year,m,1), "Pretax 401K Deduction", "Pretax 401K", "Income", 647, "income"))
        # Company match
        txs.append(tx(day(year,m,1), "Employer 401K Match", "Employer 401K Match", "Income", 647, "income"))

        # ── Savings ──────────────────────────────────────────────────────────
        txs.append(tx(day(year,m,5), "Emergency Fund Transfer", "Emergency Fund", "Savings", 200, "savings", sub=True))
        txs.append(tx(day(year,m,5), "Short-Term Savings Transfer", "Short-Term Savings", "Savings", 150, "savings", sub=True))
        txs.append(tx(day(year,m,1), "401K Contribution", "401K", "Savings", 647, "savings", sub=True))
        txs.append(tx(day(year,m,10), "Roth IRA Contribution", "Roth IRA", "Savings", 500, "savings", sub=True))
        txs.append(tx(day(year,m,12), "Coinbase Buy", "Crypto", "Savings", 100, "savings"))
        txs.append(tx(day(year,m,12), "Stock Purchase", "Stocks", "Savings", 250, "savings"))

        # ── Investments ───────────────────────────────────────────────────────
        txs.append(tx(day(year,m,10), "Fidelity Brokerage Deposit", "Brokerage Account", "Investments", 500, "investment", sub=True))
        txs.append(tx(day(year,m,10), "Vanguard Index Fund Purchase", "Index Funds", "Investments", 300, "investment", sub=True))
        txs.append(tx(day(year,m,15), "Schwab Stock Buy", "Individual Stocks", "Investments", 200, "investment"))
        txs.append(tx(day(year,m,20), "Fundrise REIT Contribution", "Real Estate (REIT)", "Investments", 150, "investment", sub=True))
        txs.append(tx(day(year,m,22), "Crypto Portfolio Rebalance", "Crypto Portfolio", "Investments", 100, "investment"))

        # ── Expenses ─────────────────────────────────────────────────────────
        # Fixed recurring bills
        txs.append(tx(day(year,m,1),  "Internet Provider",          "Internet",       "Expenses", 80,              "expense", sub=True))
        txs.append(tx(day(year,m,1),  "Auto Insurance Co.",          "Auto Insurance", "Expenses", 175,             "expense", sub=True))
        txs.append(tx(day(year,m,1),  "Mobile Phone Carrier",        "Mobile Phone",   "Expenses", 80,              "expense", sub=True))
        txs.append(tx(day(year,m,15), "Credit Card 1 Payment",       "Credit Card 1",  "Expenses", 231,             "expense", sub=True))
        txs.append(tx(day(year,m,15), "Credit Card 2 Payment",       "Credit Card 2",  "Expenses", jitter(438,0.05),"expense", sub=True))
        # Utilities
        elect = jitter(95, 0.30) if m in (6,7,8,12,1) else jitter(65, 0.20)
        txs.append(tx(day(year,m,8), "City Electric Co",   "Electric Bill", "Expenses", elect,          "expense"))
        txs.append(tx(day(year,m,8), "City Water & Sewer", "Water Bill",    "Expenses", jitter(68,0.15), "expense"))
        txs.append(tx(day(year,m,8), "Gas Company",        "Natural Gas",   "Expenses", jitter(42,0.20), "expense"))
        txs.append(tx(day(year,m,8), "Comcast Cable Bundle","Utilities", "Expenses", jitter(145,0.05),"expense"))
        # Groceries (2-4 shops per month)
        shops = random.randint(2, 4)
        for s in range(shops):
            store = random.choice(["Walmart Grocery", "Kroger", "Aldi", "Costco", "Target Grocery"])
            txs.append(tx(day(year,m, min(28, 5 + s*7)), store, "Groceries", "Expenses", jitter(220, 0.25), "expense"))
        # Eating out
        outs = random.randint(3, 8)
        restaurants = ["Chipotle","McDonald's","Chili's","Domino's","Panera Bread","Olive Garden","Local Diner","DoorDash Order","Uber Eats"]
        for r in range(outs):
            txs.append(tx(day(year,m, min(28, random.randint(1,28))), random.choice(restaurants), "Dining Out", "Expenses", jitter(32, 0.50), "expense"))
        # Home Depot occasional
        if random.random() < 0.4:
            txs.append(tx(day(year,m, random.randint(5,25)), "Home Improvement Store", "Home Improvement", "Expenses", jitter(80, 0.50), "expense"))
        # Misc
        misc_items = ["Amazon Purchase","Target Run","Walmart Misc","Office Supplies","Clothing Purchase","Online Shopping"]
        for _ in range(random.randint(1, 3)):
            txs.append(tx(day(year,m, random.randint(1,28)), random.choice(misc_items), "Miscellaneous", "Expenses", jitter(55, 0.60), "expense"))
        # Occasional health
        if random.random() < 0.35:
            txs.append(tx(day(year,m, random.randint(1,28)), "Pharmacy", "Healthcare", "Expenses", jitter(45, 0.50), "expense"))
        if random.random() < 0.20:
            txs.append(tx(day(year,m, random.randint(1,28)), "Doctor Copay", "Healthcare", "Expenses", jitter(30, 0.20), "expense"))
        # Grooming
        if random.random() < 0.70:
            txs.append(tx(day(year,m, random.randint(5,25)), "Haircut & Grooming", "Personal Care", "Expenses", jitter(22, 0.20), "expense"))
        # Pets
        if random.random() < 0.50:
            txs.append(tx(day(year,m, random.randint(1,28)), "Pet Store", "Pet Care", "Expenses", jitter(55, 0.40), "expense"))
        # Auto gas
        for _ in range(random.randint(2, 4)):
            txs.append(tx(day(year,m, random.randint(1,28)), "Gas Station", "Fuel & Auto", "Expenses", jitter(48, 0.30), "expense"))
        # Games / entertainment
        if random.random() < 0.30:
            txs.append(tx(day(year,m, random.randint(1,28)), "Digital Entertainment", "Entertainment", "Expenses", jitter(25, 0.60), "expense"))

        # ── Debt ─────────────────────────────────────────────────────────────
        txs.append(tx(day(year,m,1),  "Primary Mortgage Payment",  "Primary Mortgage",     "Debt", 1461, "expense", sub=True))
        txs.append(tx(day(year,m,1),  "Rental Mortgage Payment",   "Rental Mortgage",      "Debt", 1200, "expense", sub=True))
        txs.append(tx(day(year,m,5),  "Auto Loan Payment",         "Auto Loan",            "Debt", 375,  "expense", sub=True))
        txs.append(tx(day(year,m,10), "Personal Loan 1 Payment",   "Personal Loan 1",      "Debt", 350,  "expense", sub=True))
        txs.append(tx(day(year,m,10), "Personal Loan 2 Payment",   "Personal Loan 2",      "Debt", 280,  "expense", sub=True))
        # Occasional extra card payments
        if random.random() < 0.50:
            txs.append(tx(day(year,m,20), "Credit Card 1 Extra Payment", "Credit Card 1 Payment", "Debt", jitter(280, 0.20), "expense"))
        if random.random() < 0.50:
            txs.append(tx(day(year,m,20), "Credit Card 2 Extra Payment", "Credit Card 2 Payment", "Debt", jitter(195, 0.25), "expense"))

    return txs


# ──────────────────────────────────────────────────────────────────────────────
# side hustle / freelance business transactions for one year
# ──────────────────────────────────────────────────────────────────────────────
def business_year(year, months=12):
    txs = []
    clients = ["TechCorp Solutions", "Apex Digital LLC", "Horizon Media", "BlueStar Consulting", "Nova Startup"]
    for m in range(1, months + 1):
        # ── Income ───────────────────────────────────────────────────────────
        # 1-3 client invoices paid each month
        inv_count = random.randint(1, 3)
        for _ in range(inv_count):
            client = random.choice(clients)
            amount = jitter(random.choice([1200, 1800, 2400, 3200]), 0.15)
            txs.append(tx(day(year,m, random.randint(5,25)), f"Invoice - {client}", "Commissions & Bonuses", "Income", amount, "income"))
        # Occasional retainer
        if random.random() < 0.60:
            txs.append(tx(day(year,m,1), "Monthly Retainer", "Primary Salary", "Income", jitter(1500, 0.05), "income"))

        # ── Savings ──────────────────────────────────────────────────────────
        txs.append(tx(day(year,m,15), "Business Savings Transfer", "Emergency Fund", "Savings", jitter(300, 0.10), "savings"))
        # Quarterly IRA contribution
        if m in (3,6,9,12):
            txs.append(tx(day(year,m,20), "SEP-IRA Contribution", "Roth IRA", "Savings", jitter(1500, 0.15), "savings"))

        # ── Investments ───────────────────────────────────────────────────────
        if random.random() < 0.70:
            txs.append(tx(day(year,m,20), "Business Investment Fund", "Brokerage Account", "Investments", jitter(400, 0.20), "investment"))

        # ── Expenses ─────────────────────────────────────────────────────────
        # Software subscriptions
        txs.append(tx(day(year,m,1), "Design Software Subscription", "Credit Card 1", "Expenses", 54.99,  "expense", sub=True))
        txs.append(tx(day(year,m,1), "Code Repository Service",      "Credit Card 1", "Expenses", 10.00,  "expense", sub=True))
        txs.append(tx(day(year,m,1), "Video Conferencing Service",   "Credit Card 1", "Expenses", 19.99,  "expense", sub=True))
        txs.append(tx(day(year,m,1), "Business Productivity Suite",  "Credit Card 1", "Expenses", 12.00,  "expense", sub=True))
        # Internet (home office share)
        txs.append(tx(day(year,m,1), "Internet - Business Use", "Internet",      "Expenses", 40, "expense", sub=True))
        # Phone
        txs.append(tx(day(year,m,1), "Phone - Business Share",  "Mobile Phone",  "Expenses", 40, "expense", sub=True))
        # Equipment / supplies (occasional)
        if random.random() < 0.25:
            txs.append(tx(day(year,m, random.randint(5,25)), "Business Supplies", "Miscellaneous", "Expenses", jitter(120, 0.50), "expense"))
        if random.random() < 0.15:
            txs.append(tx(day(year,m, random.randint(5,25)), "Office Equipment", "Miscellaneous", "Expenses", jitter(350, 0.40), "expense"))
        # Meals / client entertainment
        if random.random() < 0.60:
            txs.append(tx(day(year,m, random.randint(5,25)), "Client Lunch", "Dining Out", "Expenses", jitter(75, 0.30), "expense"))
        # Gas / travel
        for _ in range(random.randint(1, 3)):
            txs.append(tx(day(year,m, random.randint(1,28)), "Gas - Business Travel", "Fuel & Auto", "Expenses", jitter(52, 0.25), "expense"))
        # Health insurance (self-employed)
        txs.append(tx(day(year,m,1), "Health Insurance Premium", "Healthcare", "Expenses", jitter(380, 0.05), "expense", sub=True))

        # ── Debt ─────────────────────────────────────────────────────────────
        # Business credit card payment
        if random.random() < 0.80:
            txs.append(tx(day(year,m,15), "Business Credit Card Payment", "Credit Card 1 Payment", "Debt", jitter(420, 0.20), "expense"))

    return txs


# ──────────────────────────────────────────────────────────────────────────────
# Category / account / bill definitions for DB rebuild
# ──────────────────────────────────────────────────────────────────────────────
PERSONAL_CATEGORIES = {
    "Income":      ["Primary Salary","Commissions & Bonuses","Rental Income","Pretax 401K","Employer 401K Match"],
    "Savings":     ["Emergency Fund","Short-Term Savings","401K","Roth IRA","Crypto","Stocks"],
    "Investments": ["Brokerage Account","Index Funds","Individual Stocks","Real Estate (REIT)","Crypto Portfolio"],
    "Expenses":    ["Utilities","Groceries","Electric Bill","Water Bill","Natural Gas","Internet","Auto Insurance","Mobile Phone","Miscellaneous","Dining Out","Entertainment","Personal Care","Home Repairs","Pet Care","Personal Spending","Fuel & Auto","Healthcare","Credit Card 1","Credit Card 2","Home Improvement"],
    "Debt":        ["Primary Mortgage","Rental Mortgage","Auto Loan","Personal Loan 1","Personal Loan 2","Credit Card 1 Payment","Credit Card 2 Payment"],
}
PERSONAL_BUDGET = {
    "Income":      {"Primary Salary":[4987]*12,"Commissions & Bonuses":[1160,2200,1160,1160,2500,1160,1160,2200,1160,1160,2500,1603],"Rental Income":[1840]*12,"Pretax 401K":[647]*12,"Employer 401K Match":[647]*12},
    "Savings":     {"Emergency Fund":[200]*12,"Short-Term Savings":[150]*12,"401K":[647]*12,"Roth IRA":[500]*12,"Crypto":[100]*12,"Stocks":[250]*12},
    "Investments": {"Brokerage Account":[500]*12,"Index Funds":[300]*12,"Individual Stocks":[200]*12,"Real Estate (REIT)":[150]*12,"Crypto Portfolio":[100]*12},
    "Expenses":    {"Utilities":[150]*12,"Groceries":[900]*12,"Electric Bill":[80,80,80,80,80,80,120,120,120,80,80,80],"Water Bill":[75]*12,"Natural Gas":[60,60,40,40,30,30,30,30,40,40,60,60],"Internet":[80]*12,"Auto Insurance":[175]*12,"Mobile Phone":[80]*12,"Miscellaneous":[200]*12,"Dining Out":[300]*12,"Entertainment":[50]*12,"Personal Care":[60]*12,"Home Repairs":[0]*12,"Pet Care":[100]*12,"Personal Spending":[200]*12,"Fuel & Auto":[150]*12,"Healthcare":[100]*12,"Credit Card 1":[231]*12,"Credit Card 2":[438]*12,"Home Improvement":[100]*12},
    "Debt":        {"Primary Mortgage":[1461]*12,"Rental Mortgage":[1200]*12,"Auto Loan":[375]*12,"Personal Loan 1":[350]*12,"Personal Loan 2":[280]*12,"Credit Card 1 Payment":[187]*12,"Credit Card 2 Payment":[100]*12},
}
BUSINESS_CATEGORIES = {
    "Income":      ["Commissions & Bonuses","Primary Salary","Rental Income"],
    "Savings":     ["Emergency Fund","Roth IRA","Stocks"],
    "Investments": ["Brokerage Account","Index Funds"],
    "Expenses":    ["Internet","Mobile Phone","Miscellaneous","Dining Out","Fuel & Auto","Healthcare","Credit Card 1"],
    "Debt":        ["Credit Card 1 Payment"],
}
BUSINESS_BUDGET = {
    "Income":      {"Commissions & Bonuses":[2400]*12,"Primary Salary":[1500]*12,"Rental Income":[0]*12},
    "Savings":     {"Emergency Fund":[300]*12,"Roth IRA":[500]*12,"Stocks":[200]*12},
    "Investments": {"Brokerage Account":[400]*12,"Index Funds":[200]*12},
    "Expenses":    {"Internet":[40]*12,"Mobile Phone":[40]*12,"Miscellaneous":[200]*12,"Dining Out":[100]*12,"Fuel & Auto":[150]*12,"Healthcare":[380]*12,"Credit Card 1":[150]*12},
    "Debt":        {"Credit Card 1 Payment":[420]*12},
}
SEED_ACCOUNTS = [
    ("acc1",  "Checking Account 1",     "Cash & Bank",            "ASSETS",      "🏦", 4250),
    ("acc2",  "Checking Account 2",     "Cash & Bank",            "ASSETS",      "🏦", 1850),
    ("acc3",  "High Yield Savings",     "Cash & Bank",            "ASSETS",      "💰", 15000),
    ("acc4",  "Petty Cash",             "Cash & Bank",            "ASSETS",      "💵", 150),
    ("acc5",  "Brokerage Account",      "Investment Accounts",    "ASSETS",      "📈", 12500),
    ("acc6",  "Alternative Investments","Investment Accounts",    "ASSETS",      "🔷", 2100),
    ("acc7",  "Treasury Bonds",         "Investment Accounts",    "ASSETS",      "📜", 5000),
    ("acc8",  "401k (Primary)",         "Retirement Accounts",    "ASSETS",      "🥇", 85000),
    ("acc9",  "Roth IRA",               "Retirement Accounts",    "ASSETS",      "🏅", 22000),
    ("acc10", "Traditional IRA",        "Retirement Accounts",    "ASSETS",      "📋", 8500),
    ("acc11", "HSA Account",            "Retirement Accounts",    "ASSETS",      "🏥", 4200),
    ("acc12", "Primary Home Value",     "Property",               "ASSETS",      "🏠", 425000),
    ("acc13", "Vehicle 1 Value",        "Property",               "ASSETS",      "🚗", 18000),
    ("acc14", "Vehicle 2 Value",        "Property",               "ASSETS",      "🚙", 12000),
    ("acc15", "Other Real Estate",      "Property",               "ASSETS",      "🏢", 0),
    ("acc16", "Credit Card 1",          "Short Term Liabilities", "LIABILITIES", "💳", 1850),
    ("acc17", "Credit Card 2",          "Short Term Liabilities", "LIABILITIES", "💳", 420),
    ("acc18", "Personal Loan",          "Short Term Liabilities", "LIABILITIES", "💰", 0),
    ("acc19", "Primary Mortgage",       "Long Term Liabilities",  "LIABILITIES", "🏠", 334500),
]
SEED_BILLS = [
    ("bill1","Internet Service",       "Internet",    "Contains","Fixed Amount", 80,   "Monthly","2025-05-01",1, "expense","Internet",        "acc1"),
    ("bill2","Auto Insurance",         "Insurance",   "Contains","Fixed Amount", 175,  "Monthly","2025-05-01",1, "expense","Auto Insurance",   "acc1"),
    ("bill3","Mobile Phone Plan",      "Phone",       "Contains","Fixed Amount", 80,   "Monthly","2025-05-01",1, "expense","Mobile Phone",     "acc1"),
    ("bill4","Credit Card 1 Payment",  "Credit Card", "Contains","Fixed Amount", 231,  "Monthly","2025-05-15",15,"expense","Credit Card 1",    "acc1"),
    ("bill5","Credit Card 2 Payment",  "Credit Card", "Contains","Fixed Amount", 438,  "Monthly","2025-05-15",15,"expense","Credit Card 2",    "acc1"),
    ("bill6","Employment Paycheck",    "Paycheck",    "Contains","Fixed Amount", 4987, "Monthly","2025-05-01",1, "income", "Primary Salary",   "acc1"),
    ("bill7","Rental Property Income", "Rental",      "Contains","Fixed Amount", 1840, "Monthly","2025-05-01",1, "income", "Rental Income",    "acc1"),
]


def rebuild_budget_data(cur, budget_id, categories_def, budget_def):
    cur.execute("DELETE FROM categories WHERE budget_id = ?", (budget_id,))
    sort = 0
    for group, names in categories_def.items():
        for name in names:
            cat_id = f"cat_{sort}_{uuid.uuid4().hex[:8]}"
            cur.execute("INSERT INTO categories (id, budget_id, group_name, name, sort_order) VALUES (?, ?, ?, ?, ?)",
                        (cat_id, budget_id, group, name, sort))
            amounts = budget_def.get(group, {}).get(name, [0]*12)
            for month_idx, amount in enumerate(amounts):
                cur.execute("INSERT INTO budget_amounts (budget_id, category_id, month_index, amount) VALUES (?, ?, ?, ?)",
                            (budget_id, cat_id, month_idx, amount))
            sort += 1


def rebuild_accounts(cur, budget_id):
    cur.execute("DELETE FROM accounts WHERE budget_id = ?", (budget_id,))
    for i, (acc_id, name, subtype, asset_class, icon, start_bal) in enumerate(SEED_ACCOUNTS):
        cur.execute("INSERT INTO accounts (id, budget_id, name, subtype, asset_class, icon, start_balance, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (f"{acc_id}_{budget_id}", budget_id, name, subtype, asset_class, icon, start_bal, i))


def rebuild_bills(cur, budget_id):
    cur.execute("DELETE FROM bills WHERE budget_id = ?", (budget_id,))
    for (bill_id, name, payee_pat, match_type, amount_type, amount,
         frequency, next_due, day_of_month, bill_type, category, acc_id) in SEED_BILLS:
        cur.execute("INSERT INTO bills (id, budget_id, name, payee_pattern, match_type, amount_type, amount, frequency, next_due_date, day_of_month, bill_type, category, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (f"{bill_id}_{budget_id}", budget_id, name, payee_pat, match_type, amount_type, amount,
                     frequency, next_due, day_of_month, bill_type, category, f"{acc_id}_{budget_id}"))


# ──────────────────────────────────────────────────────────────────────────────
# main
# ──────────────────────────────────────────────────────────────────────────────
def main():
    print("Loading current state…")
    state = requests.get(f"{API}/load-all").json()

    personal_id = None
    business_id = None
    for bid, b in state["budgets"].items():
        if b.get("type", "personal") == "personal":
            personal_id = bid
        else:
            business_id = bid

    print(f"Personal budget id: {personal_id}  ({state['budgets'][personal_id]['name']})")
    print(f"Business budget id: {business_id}  ({state['budgets'][business_id]['name']})")

    # ── Personal: 2024 full + 2025 full + 2026 Jan-Apr ───────────────────────
    personal_txs = (
        personal_year(2024, 12) +
        personal_year(2025, 12) +
        personal_year(2026, 4)
    )

    # ── Business: 2025 full + 2026 Jan-Apr ───────────────────────────────────
    business_txs = (
        business_year(2025, 12) +
        business_year(2026, 4)
    )

    print(f"Personal transactions generated: {len(personal_txs)}")
    print(f"Business transactions generated: {len(business_txs)}")

    # ── Write directly to SQLite to avoid INSERT OR IGNORE merge ─────────────
    db_path = get_db_path()
    print(f"Database: {db_path}")
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        # Rename budgets
        cur.execute("UPDATE budgets SET name = ? WHERE id = ?", ("My Budget", personal_id))
        cur.execute("UPDATE budgets SET name = ? WHERE id = ?", ("Side Hustle", business_id))

        # Rebuild categories + budget amounts
        print("Rebuilding categories and budget amounts…")
        rebuild_budget_data(cur, personal_id, PERSONAL_CATEGORIES, PERSONAL_BUDGET)
        rebuild_budget_data(cur, business_id, BUSINESS_CATEGORIES, BUSINESS_BUDGET)

        # Rebuild accounts and bills for personal budget
        print("Rebuilding accounts and bills…")
        rebuild_accounts(cur, personal_id)
        rebuild_bills(cur, personal_id)

        # Replace transactions
        print("Replacing transactions…")
        cur.execute("DELETE FROM transactions WHERE budget_id = ?", (personal_id,))
        cur.execute("DELETE FROM transactions WHERE budget_id = ?", (business_id,))

        # Insert personal transactions
        for t in personal_txs:
            cur.execute(
                "INSERT INTO transactions (id, budget_id, date, description, category, group_name, amount, type, is_subscription, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (t["id"], personal_id, t["date"], t["description"], t["category"],
                 t["group"], t["amount"], t["type"], 1 if t["isSubscription"] else 0, t["notes"])
            )

        # Insert business transactions
        for t in business_txs:
            cur.execute(
                "INSERT INTO transactions (id, budget_id, date, description, category, group_name, amount, type, is_subscription, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (t["id"], business_id, t["date"], t["description"], t["category"],
                 t["group"], t["amount"], t["type"], 1 if t["isSubscription"] else 0, t["notes"])
            )

        conn.commit()
        print("Database updated successfully.")
    finally:
        conn.close()

    print("Done! Refresh the app to see the new data.")

if __name__ == "__main__":
    main()
