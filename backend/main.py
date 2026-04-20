"""FastAPI backend for Budget App — serves API + React static files."""
import sys
import os
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

import database as db

# Determine if we're running as a PyInstaller bundle
IS_BUNDLE = getattr(sys, "frozen", False)
BASE_DIR = Path(sys._MEIPASS) if IS_BUNDLE else Path(__file__).parent
DIST_DIR = BASE_DIR.parent / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_database()
    yield


app = FastAPI(lifespan=lifespan, title="Budget App API")

# Allow Vite dev server to call the API during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── API routes ────────────────────────────────────────────────────────────────

@app.get("/api/has-data")
def has_data():
    return {"hasData": db.has_data()}


@app.post("/api/import-all")
def import_all(body: dict):
    db.import_all_data(body)
    return {"ok": True}


@app.post("/api/reset-all")
def reset_all(body: dict):
    state = body.get("state") or {}
    keep_templates = bool(body.get("keepTemplates", True))
    db.reset_all_data(state, keep_templates=keep_templates)
    return {"ok": True}


@app.get("/api/load-all")
def load_all():
    data = db.load_all_data()
    return data or {}


@app.get("/api/settings/{setting_key:path}")
def get_setting(setting_key: str):
    return {"value": db.get_app_setting(setting_key)}


@app.put("/api/settings/{setting_key:path}")
def put_setting(setting_key: str, body: dict):
    db.set_app_setting(setting_key, body.get("value"))
    return {"ok": True}


@app.post("/api/current-budget")
def set_current(body: dict):
    db.set_current_budget(body["id"])
    return {"ok": True}


@app.post("/api/budgets")
def create_budget(body: dict):
    db.create_budget(body["id"], body["name"], body["year"], body["type"], body.get("icon"), body.get("seedState"))
    return {"ok": True}


@app.put("/api/budgets/{budget_id}")
def update_budget(budget_id: str, body: dict):
    db.update_budget_meta(budget_id, body["name"], body["year"], body.get("icon"))
    return {"ok": True}


@app.delete("/api/budgets/{budget_id}")
def delete_budget(budget_id: str):
    new_id = db.delete_budget(budget_id)
    return {"newCurrentId": new_id}


@app.post("/api/transactions")
def add_transaction(body: dict):
    db.add_transaction(body["budgetId"], body["tx"])
    return {"ok": True}


@app.put("/api/transactions/{tx_id}")
def update_transaction(tx_id: str, body: dict):
    db.update_transaction(tx_id, body)
    return {"ok": True}


@app.delete("/api/transactions/{tx_id}")
def delete_transaction(tx_id: str):
    db.delete_transaction(tx_id)
    return {"ok": True}


@app.post("/api/transactions/import")
def import_transactions(body: dict):
    db.import_transactions(body["budgetId"], body["transactions"])
    return {"ok": True}


@app.put("/api/budget-amounts")
def update_budget_amount(body: dict):
    db.update_budget_amount(body["budgetId"], body["group"], body["category"], body["monthIndex"], body["amount"])
    return {"ok": True}


@app.post("/api/categories")
def add_category(body: dict):
    db.add_category(body["budgetId"], body["group"], body["name"])
    return {"ok": True}


@app.delete("/api/categories/{budget_id}/{group}/{name}")
def remove_category(budget_id: str, group: str, name: str):
    db.remove_category(budget_id, group, name)
    return {"ok": True}


@app.post("/api/accounts")
def add_account(body: dict):
    db.add_account(body["budgetId"], body["account"])
    return {"ok": True}


@app.put("/api/accounts/{acc_id}")
def update_account(acc_id: str, body: dict):
    db.update_account(acc_id, body)
    return {"ok": True}


@app.put("/api/account-balances/{acc_id}")
def update_account_balance(acc_id: str, body: dict):
    db.update_account_balance(acc_id, body["monthIndex"], body["balance"])
    return {"ok": True}


@app.delete("/api/accounts/{acc_id}")
def delete_account(acc_id: str):
    db.delete_account(acc_id)
    return {"ok": True}


@app.post("/api/bills")
def add_bill(body: dict):
    db.add_bill(body["budgetId"], body["bill"])
    return {"ok": True}


@app.put("/api/bills/{bill_id}")
def update_bill(bill_id: str, body: dict):
    db.update_bill(bill_id, body)
    return {"ok": True}


@app.delete("/api/bills/{bill_id}")
def delete_bill(bill_id: str):
    db.delete_bill(bill_id)
    return {"ok": True}


@app.get("/api/templates")
def get_templates():
    return {"templates": db.get_templates()}


@app.post("/api/templates")
def create_template(body: dict):
    db.upsert_template(body)
    return {"ok": True}


@app.put("/api/templates/{template_id}")
def update_template(template_id: str, body: dict):
    payload = dict(body or {})
    payload["id"] = template_id
    db.upsert_template(payload)
    return {"ok": True}


@app.delete("/api/templates/{template_id}")
def remove_template(template_id: str):
    db.delete_template(template_id)
    return {"ok": True}


# ── Serve React static files (production bundle) ──────────────────────────────

if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        return FileResponse(str(DIST_DIR / "index.html"))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("BUDGET_PORT", 8765))
    host = os.environ.get("BUDGET_HOST", "127.0.0.1")

    if IS_BUNDLE:
        # Open browser automatically when running as packaged app
        import threading
        import webbrowser
        threading.Timer(1.5, lambda: webbrowser.open(f"http://{host}:{port}")).start()

    uvicorn.run(app, host=host, port=port, log_level="warning")
