import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_DATA, DEFAULT_ACCOUNTS, DEFAULT_BILLS } from '../data/defaults.js';

const STORAGE_KEY = 'budget_app_v6';
const IS_ELECTRON = typeof window !== 'undefined' && !!window.electronAPI;
const API_BASE = IS_ELECTRON
  ? 'http://127.0.0.1:8765/api'
  : '/api';
const DEFAULT_TEMPLATE_ID = 'tpl_builtin_comprehensive';
const YP_TEMPLATE_ID = 'tpl_builtin_young_professional';
const BIZ_TEMPLATE_ID = 'tpl_builtin_side_hustle';

async function api(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${method} ${path} → ${res.status}`);
  return res.json();
}

function withTimeout(promise, timeoutMs, label = 'request') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function newBudgetId() {
  return 'b' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

function newTemplateId() {
  return 'tpl_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

function defaultBudgetIcon(type = 'personal') {
  return type === 'business' ? '💼' : '📈';
}

function buildDefaultTemplate() {
  const now = new Date().toISOString();
  return {
    id: DEFAULT_TEMPLATE_ID,
    name: 'Comprehensive',
    description: 'Built-in default categories, budget amounts, accounts, and bills.',
    builtIn: true,
    type: 'personal',
    icon: '📈',
    createdAt: now,
    updatedAt: now,
    data: {
      categories: JSON.parse(JSON.stringify(DEFAULT_DATA.categories)),
      budget: JSON.parse(JSON.stringify(DEFAULT_DATA.budget)),
      accounts: JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS)),
      bills: JSON.parse(JSON.stringify(DEFAULT_BILLS)),
      transactions: [],
    },
  };
}

function buildYoungProfessionalTemplate() {
  const now = new Date().toISOString();
  return {
    id: YP_TEMPLATE_ID,
    name: 'Young Professional',
    description: 'Lean starter plan focused on core living costs, debt control, and long-term investing.',
    builtIn: true,
    type: 'personal',
    icon: '🚀',
    createdAt: now,
    updatedAt: now,
    data: {
      categories: {
        Income: ['Primary Salary', 'Commissions & Bonuses'],
        Expenses: ['Groceries', 'Internet', 'Mobile Phone', 'Fuel & Auto', 'Dining Out', 'Healthcare', 'Miscellaneous'],
        Savings: ['Emergency Fund', 'Roth IRA', 'Stocks'],
        Investments: ['Brokerage Account', 'Index Funds'],
        Debt: ['Auto Loan', 'Credit Card 1 Payment'],
      },
      budget: {
        Income: {
          'Primary Salary': [4200,4200,4200,4200,4200,4200,4200,4200,4200,4200,4200,4200],
          'Commissions & Bonuses': [250,250,250,250,300,300,300,250,250,250,300,350],
        },
        Expenses: {
          'Groceries': [650,650,650,650,650,650,650,650,650,650,650,650],
          'Internet': [70,70,70,70,70,70,70,70,70,70,70,70],
          'Mobile Phone': [65,65,65,65,65,65,65,65,65,65,65,65],
          'Fuel & Auto': [130,130,130,130,130,130,130,130,130,130,130,130],
          'Dining Out': [180,180,180,180,180,180,180,180,180,180,180,180],
          'Healthcare': [70,70,70,70,70,70,70,70,70,70,70,70],
          'Miscellaneous': [150,150,150,150,150,150,150,150,150,150,150,150],
        },
        Savings: {
          'Emergency Fund': [200,200,200,200,200,200,200,200,200,200,200,200],
          'Roth IRA': [300,300,300,300,300,300,300,300,300,300,300,300],
          'Stocks': [150,150,150,150,150,150,150,150,150,150,150,150],
        },
        Investments: {
          'Brokerage Account': [250,250,250,250,250,250,250,250,250,250,250,250],
          'Index Funds': [200,200,200,200,200,200,200,200,200,200,200,200],
        },
        Debt: {
          'Auto Loan': [300,300,300,300,300,300,300,300,300,300,300,300],
          'Credit Card 1 Payment': [120,120,120,120,120,120,120,120,120,120,120,120],
        },
      },
      accounts: [
        { id: 'acc1', name: 'Checking Account 1', subtype: 'Cash & Bank', assetClass: 'ASSETS', icon: '🏦', startBalance: 2200, monthlyBalances: Array(12).fill(null) },
        { id: 'acc3', name: 'High Yield Savings', subtype: 'Cash & Bank', assetClass: 'ASSETS', icon: '💰', startBalance: 5000, monthlyBalances: Array(12).fill(null) },
        { id: 'acc5', name: 'Brokerage Account', subtype: 'Investment Accounts', assetClass: 'ASSETS', icon: '📈', startBalance: 2500, monthlyBalances: Array(12).fill(null) },
        { id: 'acc16', name: 'Credit Card 1', subtype: 'Short Term Liabilities', assetClass: 'LIABILITIES', icon: '💳', startBalance: 800, monthlyBalances: Array(12).fill(null) },
      ],
      bills: [
        { id: 'bill1', name: 'Internet Service', payeePattern: 'Internet', matchType: 'Contains', amountType: 'Fixed Amount', amount: 70, frequency: 'Monthly', nextDueDate: '2026-01-01', dayOfMonth: 1, billType: 'expense', category: 'Internet', accountId: 'acc1' },
        { id: 'bill2', name: 'Mobile Phone Plan', payeePattern: 'Phone', matchType: 'Contains', amountType: 'Fixed Amount', amount: 65, frequency: 'Monthly', nextDueDate: '2026-01-01', dayOfMonth: 1, billType: 'expense', category: 'Mobile Phone', accountId: 'acc1' },
      ],
      transactions: [],
    },
  };
}

function buildSideHustleTemplate() {
  const now = new Date().toISOString();
  return {
    id: BIZ_TEMPLATE_ID,
    name: 'Side Hustle',
    description: 'Simple business template for freelance or contract work with clean expense tracking.',
    builtIn: true,
    type: 'business',
    icon: '💼',
    createdAt: now,
    updatedAt: now,
    data: {
      categories: {
        Income: ['Commissions & Bonuses', 'Primary Salary'],
        Expenses: ['Internet', 'Mobile Phone', 'Miscellaneous', 'Dining Out', 'Fuel & Auto', 'Healthcare', 'Credit Card 1'],
        Savings: ['Emergency Fund', 'Stocks'],
        Investments: ['Brokerage Account'],
        Debt: ['Credit Card 1 Payment'],
      },
      budget: {
        Income: {
          'Commissions & Bonuses': [2200,2200,2200,2200,2400,2400,2400,2200,2200,2200,2400,2600],
          'Primary Salary': [1300,1300,1300,1300,1300,1300,1300,1300,1300,1300,1300,1300],
        },
        Expenses: {
          'Internet': [40,40,40,40,40,40,40,40,40,40,40,40],
          'Mobile Phone': [40,40,40,40,40,40,40,40,40,40,40,40],
          'Miscellaneous': [180,180,180,180,180,180,180,180,180,180,180,180],
          'Dining Out': [90,90,90,90,90,90,90,90,90,90,90,90],
          'Fuel & Auto': [120,120,120,120,120,120,120,120,120,120,120,120],
          'Healthcare': [260,260,260,260,260,260,260,260,260,260,260,260],
          'Credit Card 1': [140,140,140,140,140,140,140,140,140,140,140,140],
        },
        Savings: {
          'Emergency Fund': [250,250,250,250,250,250,250,250,250,250,250,250],
          'Stocks': [180,180,180,180,180,180,180,180,180,180,180,180],
        },
        Investments: {
          'Brokerage Account': [350,350,350,350,350,350,350,350,350,350,350,350],
        },
        Debt: {
          'Credit Card 1 Payment': [300,300,300,300,300,300,300,300,300,300,300,300],
        },
      },
      accounts: [
        { id: 'accb1', name: 'Business Checking', subtype: 'Cash & Bank', assetClass: 'ASSETS', icon: '🏦', startBalance: 3000, monthlyBalances: Array(12).fill(null) },
        { id: 'accb2', name: 'Tax Holdback Savings', subtype: 'Cash & Bank', assetClass: 'ASSETS', icon: '💰', startBalance: 1500, monthlyBalances: Array(12).fill(null) },
        { id: 'accb3', name: 'Business Credit Card', subtype: 'Short Term Liabilities', assetClass: 'LIABILITIES', icon: '💳', startBalance: 600, monthlyBalances: Array(12).fill(null) },
      ],
      bills: [
        { id: 'billb1', name: 'Internet - Business Use', payeePattern: 'Internet', matchType: 'Contains', amountType: 'Fixed Amount', amount: 40, frequency: 'Monthly', nextDueDate: '2026-01-01', dayOfMonth: 1, billType: 'expense', category: 'Internet', accountId: 'accb1' },
        { id: 'billb2', name: 'Phone - Business Share', payeePattern: 'Phone', matchType: 'Contains', amountType: 'Fixed Amount', amount: 40, frequency: 'Monthly', nextDueDate: '2026-01-01', dayOfMonth: 1, billType: 'expense', category: 'Mobile Phone', accountId: 'accb1' },
      ],
      transactions: [],
    },
  };
}

function buildBuiltInTemplates() {
  return [buildDefaultTemplate(), buildYoungProfessionalTemplate(), buildSideHustleTemplate()];
}

function emptyBudgetData() {
  const categories = Object.fromEntries(
    Object.keys(DEFAULT_DATA.categories || {}).map((group) => [group, []])
  );
  const budget = Object.fromEntries(
    Object.keys(DEFAULT_DATA.budget || {}).map((group) => [group, {}])
  );

  return {
    categories,
    budget,
    transactions: [],
    accounts: [],
    bills: [],
  };
}

function blankBudget(name, year, type = 'personal') {
  const d = emptyBudgetData();
  return {
    name, year, type, icon: defaultBudgetIcon(type), ...d,
  };
}

function deepMerge(defaults, saved) {
  if (!saved) return JSON.parse(JSON.stringify(defaults));
  const result = JSON.parse(JSON.stringify(defaults));
  if (saved.categories) {
    Object.keys(saved.categories).forEach(group => { result.categories[group] = saved.categories[group]; });
  }
  if (saved.budget) {
    Object.keys(saved.budget).forEach(group => {
      if (!result.budget[group]) result.budget[group] = {};
      Object.keys(saved.budget[group]).forEach(cat => { result.budget[group][cat] = saved.budget[group][cat]; });
    });
  }
  if (saved.transactions) result.transactions = saved.transactions;
  if (saved.name !== undefined) result.name = saved.name;
  if (saved.year !== undefined) result.year = saved.year;
  return result;
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.budgets && typeof parsed.budgets === 'object') {
        Object.values(parsed.budgets).forEach(b => {
          if (!b.type) b.type = 'personal';
          if (!b.icon) b.icon = defaultBudgetIcon(b.type);
          if (!b.accounts) b.accounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
          if (!b.bills)    b.bills    = JSON.parse(JSON.stringify(DEFAULT_BILLS));
        });
        if (!Array.isArray(parsed.templates)) parsed.templates = buildBuiltInTemplates();
        if (!parsed.currentId || !parsed.budgets[parsed.currentId]) {
          parsed.currentId = Object.keys(parsed.budgets)[0] || null;
        }
        return parsed;
      }
    }
    const v5raw = localStorage.getItem('budget_app_v5');
    if (v5raw) {
      const id = newBudgetId();
      const budgetData = deepMerge(
        { name: 'My Budget', year: 2025, type: 'personal', icon: defaultBudgetIcon('personal'), ...DEFAULT_DATA },
        { name: 'My Budget', year: 2025, type: 'personal', icon: defaultBudgetIcon('personal'), ...JSON.parse(v5raw) }
      );
      return { currentId: id, budgets: { [id]: budgetData }, templates: buildBuiltInTemplates() };
    }

    return { currentId: null, budgets: {}, templates: buildBuiltInTemplates() };
  } catch {
    return {
      currentId: null,
      budgets: {},
      templates: buildBuiltInTemplates(),
    };
  }
}

function clearLegacyBudgetCache() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('budget_app_v5');
  } catch {
    // ignore local cache cleanup failures
  }
}

export function useAppData() {
  const [state, setState] = useState(() => ({ currentId: null, budgets: {}, templates: [], loading: true }));

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const hasDataTimeout = IS_ELECTRON ? 10000 : 3000;
    const loadAllTimeout = IS_ELECTRON ? 20000 : 6000;
    const templatesTimeout = IS_ELECTRON ? 10000 : 3000;

    withTimeout(api('GET', '/has-data'), hasDataTimeout, 'has-data').then(async ({ hasData }) => {
      const [data, templateData] = await Promise.all([
        hasData
          ? withTimeout(api('GET', '/load-all'), loadAllTimeout, 'load-all')
          : Promise.resolve({ currentId: null, budgets: {} }),
        withTimeout(api('GET', '/templates'), templatesTimeout, 'templates').catch(() => ({ templates: [] })),
      ]);
      let templates = Array.isArray(templateData?.templates) ? templateData.templates : [];
      const builtIns = buildBuiltInTemplates();
      builtIns.forEach((tpl) => {
        if (!templates.some(t => t?.id === tpl.id)) {
          templates = [tpl, ...templates];
          api('POST', '/templates', tpl).catch(() => {});
        }
      });
      templates = templates.sort((a, b) => {
        const aBuiltIn = a?.builtIn ? 1 : 0;
        const bBuiltIn = b?.builtIn ? 1 : 0;
        if (aBuiltIn !== bBuiltIn) return bBuiltIn - aBuiltIn;
        return String(a?.name || '').localeCompare(String(b?.name || ''));
      });
      if (!templates.length) {
        templates = builtIns;
      }
      const base = (data && typeof data === 'object' && data.budgets)
        ? data
        : { currentId: null, budgets: {} };
      setState({ ...base, templates, loading: false });
      if (IS_ELECTRON) clearLegacyBudgetCache();
    }).catch(err => {
      console.error('Backend API error during initial load', err);
      if (IS_ELECTRON) {
        setState({ currentId: null, budgets: {}, templates: buildBuiltInTemplates(), loading: false });
        return;
      }
      const local = loadLocalState();
      setState({ ...local, templates: local.templates || buildBuiltInTemplates(), loading: false });
    });
  }, []);

  // ── Persist to localStorage as offline cache ──────────────────────────────
  useEffect(() => {
    if (state.loading) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { console.error('Failed to save', e); }
  }, [state]);

  const { currentId, budgets, templates, loading } = state;
  const data = budgets[currentId] || null;

  const budgetList = Object.entries(budgets).map(([id, b]) => ({
    id, name: b.name, year: b.year, type: b.type || 'personal', icon: b.icon || defaultBudgetIcon(b.type || 'personal'),
  }));

  // ── Local state updater (always updates React state) ──────────────────────
  const mutateCurrent = useCallback((fn) => {
    setState(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.budgets[prev.currentId] = fn(next.budgets[prev.currentId]);
      return next;
    });
  }, []);

  // ── Budget management ─────────────────────────────────────────────────────
  const createBudget = useCallback((name, year, type = 'personal', icon, seedState) => {
    const id = newBudgetId();
    const finalYear = year ?? new Date().getFullYear();
    const source = seedState ? JSON.parse(JSON.stringify(seedState)) : blankBudget(name, finalYear, type);
    const finalType = source.type || type;
    const blank = {
      ...source,
      name,
      year: finalYear,
      type: finalType,
      icon: icon || source.icon || defaultBudgetIcon(finalType),
      categories: source.categories || emptyBudgetData().categories,
      budget: source.budget || emptyBudgetData().budget,
      accounts: source.accounts || [],
      bills: source.bills || [],
      transactions: source.transactions || [],
    };
    setState(prev => ({
      currentId: id,
      budgets: { ...prev.budgets, [id]: blank },
      templates: prev.templates || buildBuiltInTemplates(),
      loading: false,
    }));
    api('POST', '/budgets', { id, name, year: finalYear, type: finalType, icon: blank.icon, seedState: {
      categories: blank.categories, budget: blank.budget,
      accounts: blank.accounts, bills: blank.bills,
      transactions: blank.transactions,
    }});
  }, []);

  const switchBudget = useCallback((id) => {
    setState(prev => ({ ...prev, currentId: id }));
    api('POST', '/current-budget', { id });
  }, []);

  const renameBudget = useCallback((id, name, year, icon) => {
    setState(prev => ({
      ...prev,
      budgets: {
        ...prev.budgets,
        [id]: {
          ...prev.budgets[id],
          name,
          year: year ?? prev.budgets[id].year,
          icon: icon ?? prev.budgets[id].icon ?? defaultBudgetIcon(prev.budgets[id].type),
        },
      },
    }));
    api('PUT', `/budgets/${id}`, { name, year, icon });
  }, []);

  const duplicateBudget = useCallback((id) => {
    setState(prev => {
      const source = prev.budgets[id];
      if (!source) return prev;
      const newId = newBudgetId();
      const copy = JSON.parse(JSON.stringify(source));
      copy.name = `Copy of ${source.name}`;
      copy.icon = copy.icon || defaultBudgetIcon(copy.type);
      const next = { ...prev, budgets: { ...prev.budgets, [newId]: copy } };
      api('POST', '/budgets', { id: newId, name: copy.name, year: copy.year, type: copy.type, icon: copy.icon, seedState: {
        categories: copy.categories, budget: copy.budget,
        accounts: copy.accounts, bills: copy.bills,
        transactions: copy.transactions,
      }});
      return next;
    });
  }, []);

  const deleteBudget = useCallback((id) => {
    setState(prev => {
      const remaining = Object.fromEntries(Object.entries(prev.budgets).filter(([k]) => k !== id));
      const ids = Object.keys(remaining);
      if (ids.length === 0) {
        return { ...prev, currentId: null, budgets: remaining, loading: false };
      }
      return { ...prev, currentId: prev.currentId === id ? ids[0] : prev.currentId, budgets: remaining };
    });
    api('DELETE', `/budgets/${id}`);
  }, []);

  // ── Templates ─────────────────────────────────────────────────────────────
  const saveCurrentAsTemplate = useCallback((name, description = '') => {
    if (!data) return null;
    const now = new Date().toISOString();
    const template = {
      id: newTemplateId(),
      name: (name || '').trim() || `${data.name || 'Budget'} Template`,
      description: (description || '').trim(),
      builtIn: false,
      type: data.type || 'personal',
      icon: data.icon || defaultBudgetIcon(data.type),
      createdAt: now,
      updatedAt: now,
      data: {
        categories: JSON.parse(JSON.stringify(data.categories || DEFAULT_DATA.categories)),
        budget: JSON.parse(JSON.stringify(data.budget || DEFAULT_DATA.budget)),
        accounts: JSON.parse(JSON.stringify(data.accounts || DEFAULT_ACCOUNTS)),
        bills: JSON.parse(JSON.stringify(data.bills || DEFAULT_BILLS)),
        transactions: [],
      },
    };
    setState(prev => ({ ...prev, templates: [template, ...(prev.templates || [])] }));
    api('POST', '/templates', template).catch(() => {});
    return template;
  }, [data]);

  const duplicateTemplate = useCallback((templateId) => {
    let newTemplate = null;
    setState(prev => {
      const source = (prev.templates || []).find(t => t.id === templateId);
      if (!source) return prev;
      const now = new Date().toISOString();
      newTemplate = {
        ...JSON.parse(JSON.stringify(source)),
        id: newTemplateId(),
        name: `Copy of ${source.name}`,
        builtIn: false,
        createdAt: now,
        updatedAt: now,
      };
      return { ...prev, templates: [newTemplate, ...(prev.templates || [])] };
    });
    if (newTemplate) api('POST', '/templates', newTemplate).catch(() => {});
  }, []);

  const updateTemplate = useCallback((templateId, updates = {}) => {
    setState(prev => {
      const existing = (prev.templates || []).find(t => t.id === templateId);
      if (!existing || existing.builtIn) return prev;
      const merged = {
        ...existing,
        ...updates,
        id: templateId,
        builtIn: false,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        templates: (prev.templates || []).map(t => (t.id === templateId ? merged : t)),
      };
    });
    api('PUT', `/templates/${templateId}`, { ...updates, builtIn: false }).catch(() => {});
  }, []);

  const deleteTemplate = useCallback((templateId) => {
    setState(prev => {
      const target = (prev.templates || []).find(t => t.id === templateId);
      if (!target || target.builtIn) return prev;
      return { ...prev, templates: (prev.templates || []).filter(t => t.id !== templateId) };
    });
    api('DELETE', `/templates/${templateId}`).catch(() => {});
  }, []);

  const applyTemplate = useCallback((templateId, opts = {}) => {
    const tpl = (templates || []).find(t => t.id === templateId);
    if (!tpl) return;
    const nowYear = new Date().getFullYear();
    const type = opts.type || tpl.type || 'personal';
    const icon = opts.icon || tpl.icon || defaultBudgetIcon(type);
    const name = (opts.name || '').trim() || `${tpl.name} Budget`;
    const year = Number.isFinite(Number(opts.year)) ? Number(opts.year) : nowYear;
    const seedState = JSON.parse(JSON.stringify(tpl.data || {}));
    createBudget(name, year, type, icon, seedState);
  }, [templates, createBudget]);

  const applyTemplateToCurrent = useCallback((templateId, opts = {}) => {
    const tpl = (templates || []).find(t => t.id === templateId);
    if (!tpl || !currentId) return;
    const keepTransactions = Boolean(opts.keepTransactions);
    const templateData = JSON.parse(JSON.stringify(tpl.data || {}));

    let snapshot = null;
    setState(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const existing = next.budgets[currentId];
      if (!existing) return prev;
      next.budgets[currentId] = {
        ...existing,
        categories: templateData.categories || JSON.parse(JSON.stringify(DEFAULT_DATA.categories)),
        budget: templateData.budget || JSON.parse(JSON.stringify(DEFAULT_DATA.budget)),
        accounts: templateData.accounts || JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS)),
        bills: templateData.bills || JSON.parse(JSON.stringify(DEFAULT_BILLS)),
        transactions: keepTransactions ? (existing.transactions || []) : (templateData.transactions || []),
      };
      snapshot = { currentId: next.currentId, budgets: next.budgets };
      return next;
    });

    if (snapshot) {
      api('POST', '/import-all', snapshot).catch(() => {});
    }
  }, [templates, currentId]);

  // ── Budget amounts ────────────────────────────────────────────────────────
  const updateBudget = useCallback((group, category, monthIndex, value) => {
    mutateCurrent(b => {
      if (!b.budget[group]) b.budget[group] = {};
      if (!b.budget[group][category]) b.budget[group][category] = new Array(12).fill(0);
      b.budget[group][category][monthIndex] = value;
      return b;
    });
    api('PUT', '/budget-amounts', { budgetId: currentId, group, category, monthIndex, amount: value });
  }, [mutateCurrent, currentId]);

  // ── Transactions ──────────────────────────────────────────────────────────
  const addTransaction = useCallback((tx) => {
    const id = Date.now().toString();
    const fullTx = { ...tx, id };
    mutateCurrent(b => ({ ...b, transactions: [...b.transactions, fullTx] }));
    api('POST', '/transactions', { budgetId: currentId, tx: fullTx });
  }, [mutateCurrent, currentId]);

  const deleteTransaction = useCallback((id) => {
    mutateCurrent(b => ({ ...b, transactions: b.transactions.filter(t => t.id !== id) }));
    api('DELETE', `/transactions/${id}`);
  }, [mutateCurrent]);

  const updateTransaction = useCallback((id, updates) => {
    mutateCurrent(b => ({
      ...b, transactions: b.transactions.map(t => t.id === id ? { ...t, ...updates } : t),
    }));
    api('PUT', `/transactions/${id}`, updates);
  }, [mutateCurrent]);

  const importTransactions = useCallback((txArray) => {
    const withIds = txArray.map(tx => ({ ...tx, id: tx.id || Date.now().toString() + Math.random() }));
    mutateCurrent(b => ({ ...b, transactions: [...b.transactions, ...withIds] }));
    api('POST', '/transactions/import', { budgetId: currentId, transactions: withIds });
  }, [mutateCurrent, currentId]);

  // ── Categories ────────────────────────────────────────────────────────────
  const addCategory = useCallback((group, name) => {
    if (!name.trim()) return;
    mutateCurrent(b => {
      if (!b.categories[group].includes(name.trim())) {
        b.categories[group] = [...b.categories[group], name.trim()];
        if (!b.budget[group]) b.budget[group] = {};
        b.budget[group][name.trim()] = new Array(12).fill(0);
      }
      return b;
    });
    api('POST', '/categories', { budgetId: currentId, group, name: name.trim() });
  }, [mutateCurrent, currentId]);

  const removeCategory = useCallback((group, name) => {
    mutateCurrent(b => {
      b.categories[group] = b.categories[group].filter(c => c !== name);
      if (b.budget[group]) delete b.budget[group][name];
      return b;
    });
    api('DELETE', `/categories/${currentId}/${encodeURIComponent(group)}/${encodeURIComponent(name)}`);
  }, [mutateCurrent, currentId]);

  const renameCategory = useCallback((group, oldName, newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed || oldName === trimmed) return;

    let snapshot = null;
    setState(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const b = next.budgets[prev.currentId];
      if (!b || !b.categories[group]) return prev;

      const idx = b.categories[group].indexOf(oldName);
      if (idx === -1) return prev;

      b.categories[group][idx] = trimmed;

      if (b.budget[group] && b.budget[group][oldName]) {
        b.budget[group][trimmed] = b.budget[group][oldName];
        delete b.budget[group][oldName];
      }

      b.transactions = (b.transactions || []).map(tx =>
        tx.category === oldName ? { ...tx, category: trimmed, group } : tx
      );

      b.bills = (b.bills || []).map(bill =>
        bill.category === oldName ? { ...bill, category: trimmed } : bill
      );

      snapshot = { currentId: next.currentId, budgets: next.budgets };
      return next;
    });

    if (snapshot) {
      api('POST', '/import-all', snapshot);
    }
  }, []);

  const resetData = useCallback(() => {
    mutateCurrent(() => JSON.parse(JSON.stringify(DEFAULT_DATA)));
  }, [mutateCurrent]);

  // ── Accounts ──────────────────────────────────────────────────────────────
  const addAccount = useCallback((account) => {
    const id = 'acc' + Date.now();
    const fullAcc = { ...account, id, monthlyBalances: Array(12).fill(null) };
    mutateCurrent(b => ({ ...b, accounts: [...(b.accounts || []), fullAcc] }));
    api('POST', '/accounts', { budgetId: currentId, account: fullAcc });
  }, [mutateCurrent, currentId]);

  const updateAccount = useCallback((id, updates) => {
    mutateCurrent(b => ({
      ...b, accounts: (b.accounts || []).map(a => a.id === id ? { ...a, ...updates } : a),
    }));
    api('PUT', `/accounts/${id}`, updates);
  }, [mutateCurrent]);

  const updateAccountBalance = useCallback((accountId, monthIndex, value) => {
    mutateCurrent(b => ({
      ...b,
      accounts: (b.accounts || []).map(a => {
        if (a.id !== accountId) return a;
        const mb = [...(a.monthlyBalances || Array(12).fill(null))];
        mb[monthIndex] = value;
        return { ...a, monthlyBalances: mb };
      }),
    }));
    api('PUT', `/account-balances/${accountId}`, { monthIndex, balance: value });
  }, [mutateCurrent]);

  const updateAccountStartBalance = useCallback((accountId, value) => {
    mutateCurrent(b => ({
      ...b, accounts: (b.accounts || []).map(a => a.id === accountId ? { ...a, startBalance: value } : a),
    }));
    api('PUT', `/accounts/${accountId}`, { startBalance: value });
  }, [mutateCurrent]);

  const deleteAccount = useCallback((id) => {
    mutateCurrent(b => ({ ...b, accounts: (b.accounts || []).filter(a => a.id !== id) }));
    api('DELETE', `/accounts/${id}`);
  }, [mutateCurrent]);

  // ── Bills ─────────────────────────────────────────────────────────────────
  const addBill = useCallback((bill) => {
    const id = 'bill' + Date.now();
    const fullBill = { ...bill, id };
    mutateCurrent(b => ({ ...b, bills: [...(b.bills || []), fullBill] }));
    api('POST', '/bills', { budgetId: currentId, bill: fullBill });
  }, [mutateCurrent, currentId]);

  const updateBill = useCallback((id, updates) => {
    mutateCurrent(b => ({
      ...b, bills: (b.bills || []).map(bill => bill.id === id ? { ...bill, ...updates } : bill),
    }));
    api('PUT', `/bills/${id}`, updates);
  }, [mutateCurrent]);

  const deleteBill = useCallback((id) => {
    mutateCurrent(b => ({ ...b, bills: (b.bills || []).filter(bill => bill.id !== id) }));
    api('DELETE', `/bills/${id}`);
  }, [mutateCurrent]);

  // ── Backup / restore ─────────────────────────────────────────────────────
  const exportAllData = useCallback(() => {
    const { loading: _loading, ...snapshot } = state;
    return JSON.parse(JSON.stringify(snapshot));
  }, [state]);

  const importAllData = useCallback(async (nextState) => {
    if (!nextState || typeof nextState !== 'object') {
      throw new Error('Invalid backup file.');
    }
    if (!nextState.currentId || !nextState.budgets || typeof nextState.budgets !== 'object') {
      throw new Error('Backup is missing currentId or budgets.');
    }

    const sanitized = {
      currentId: nextState.currentId,
      budgets: nextState.budgets,
    };

    setState({ ...sanitized, loading: false });
    await api('POST', '/import-all', sanitized);
  }, []);

  const resetAllData = useCallback(async ({ keepTemplates = true } = {}) => {
    const statePayload = {
      currentId: null,
      budgets: {},
    };

    setState(prev => {
      const customTemplates = keepTemplates
        ? (prev.templates || []).filter(t => t && !t.builtIn)
        : [];
      const mergedTemplates = [...buildBuiltInTemplates(), ...customTemplates];
      return {
        currentId: null,
        budgets: {},
        templates: mergedTemplates,
        loading: false,
      };
    });

    try {
      Object.keys(localStorage).forEach((key) => {
        if (key !== STORAGE_KEY) localStorage.removeItem(key);
      });
    } catch {
      // ignore local storage cleanup failures
    }

    try {
      await api('POST', '/reset-all', { state: statePayload, keepTemplates });
    } catch {
      try {
        await api('POST', '/import-all', statePayload);
      } catch {
        // Keep local reset state when backend APIs are not reachable.
      }
    }
  }, []);

  return {
    data,
    allBudgets: budgets,
    templates,
    budgetList,
    currentId,
    loading,
    createBudget,
    switchBudget,
    renameBudget,
    deleteBudget,
    duplicateBudget,
    saveCurrentAsTemplate,
    duplicateTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
    applyTemplateToCurrent,
    updateBudget,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    importTransactions,
    addCategory,
    removeCategory,
    renameCategory,
    resetData,
    addAccount,
    updateAccount,
    updateAccountBalance,
    updateAccountStartBalance,
    deleteAccount,
    addBill,
    updateBill,
    deleteBill,
    exportAllData,
    importAllData,
    resetAllData,
  };
}
