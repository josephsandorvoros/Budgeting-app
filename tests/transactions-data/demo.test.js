import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_STORAGE_KEY,
  buildDemoState,
  createDemoImportState,
  exportDemoState,
  loadDemoState,
  resetDemoState,
  resolveDemoMode,
  saveDemoState,
} from '../../src/data/demo.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => { values.set(key, String(value)); },
    removeItem: (key) => { values.delete(key); },
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() { return values.size; },
  };
}

const now = new Date(2026, 10, 10, 9, 30, 0);

test('demo activation requires the exact Vite flag and excludes Electron, including packaged Electron', () => {
  assert.equal(resolveDemoMode({ viteDemoMode: 'true', hasElectronAPI: false, protocol: 'http:' }), true);
  assert.equal(resolveDemoMode({ viteDemoMode: 'false', hasElectronAPI: false, protocol: 'http:' }), false);
  assert.equal(resolveDemoMode({ viteDemoMode: true, hasElectronAPI: false, protocol: 'http:' }), false);
  assert.equal(resolveDemoMode({ viteDemoMode: 'TRUE', hasElectronAPI: false, protocol: 'http:' }), false);
  assert.equal(resolveDemoMode({ viteDemoMode: 'true', hasElectronAPI: true, protocol: 'http:' }), false);
  assert.equal(resolveDemoMode({ viteDemoMode: 'true', hasElectronAPI: true, protocol: 'file:' }), false);
});

test('demo seed is clearly labelled and has deterministic dates relative to the injected current date', () => {
  const state = buildDemoState(now);
  assert.equal(state.isDemo, true);
  assert.match(state.demoLabel, /demo/i);
  assert.equal(state.currentId, 'demo_personal_current');
  const budgets = Object.values(state.budgets);
  assert.ok(budgets.length >= 3);
  assert.ok(budgets.every(b => b.isDemo === true && /demo/i.test(b.name)));
  assert.ok(budgets.some(b => b.year === 2026 && b.type === 'personal' && b.transactions.length > 0));
  assert.ok(budgets.some(b => b.year === 2027 && b.transactions.length === 0));
  assert.ok(budgets.some(b => b.type === 'business'));
  const current = state.budgets[state.currentId];
  assert.ok(current.transactions.some(t => t.date.startsWith('2026-11-')));
  assert.ok(current.transactions.every(t => !Number.isNaN(new Date(t.date).getTime())));
  assert.ok(current.bills.every(b => b.nextDueDate.startsWith('2026-')));
  assert.equal(buildDemoState(now).budgets[state.currentId].transactions[0].date, current.transactions[0].date);
});

test('demo load seeds only the namespaced demo key and never touches production storage', () => {
  const storage = memoryStorage({ budget_app_v6: '{"real":true}' });
  const state = loadDemoState({ storage, now });
  assert.equal(state.isDemo, true);
  assert.equal(storage.getItem('budget_app_v6'), '{"real":true}');
  assert.ok(storage.getItem(DEMO_STORAGE_KEY));
  assert.equal(storage.getItem(DEMO_STORAGE_KEY).includes('"real":true'), false);
});

test('demo load preserves saved edits instead of reseeding over them', () => {
  const storage = memoryStorage();
  const first = loadDemoState({ storage, now });
  const edited = JSON.parse(JSON.stringify(first));
  edited.budgets[edited.currentId].name = 'Demo Personal Edited';
  edited.budgets[edited.currentId].transactions.push({
    id: 'saved', date: '2026-11-10', description: 'Saved edit', amount: 1, type: 'expense',
  });
  saveDemoState(edited, storage);
  const reloaded = loadDemoState({ storage, now: new Date(2026, 11, 20) });
  assert.equal(reloaded.budgets[reloaded.currentId].name, 'Demo Personal Edited');
  assert.ok(reloaded.budgets[reloaded.currentId].transactions.some(t => t.id === 'saved'));
});

test('invalid demo storage falls back to demo seed without reading production data', () => {
  const storage = memoryStorage({ [DEMO_STORAGE_KEY]: '{broken', budget_app_v6: '{"real":true}' });
  const state = loadDemoState({ storage, now });
  assert.equal(state.isDemo, true);
  assert.equal(storage.getItem('budget_app_v6'), '{"real":true}');
  assert.doesNotThrow(() => JSON.parse(storage.getItem(DEMO_STORAGE_KEY)));
});

test('demo reset clears and reseeds only the demo namespace', () => {
  const storage = memoryStorage({ [DEMO_STORAGE_KEY]: '{"budgets":{}}', budget_app_v6: '{"real":true}' });
  const state = resetDemoState({ storage, now });
  assert.equal(state.isDemo, true);
  assert.equal(storage.getItem('budget_app_v6'), '{"real":true}');
  assert.ok(Object.keys(state.budgets).length > 0);
});

test('demo import/export stay in the demo namespace and keep the demo label', () => {
  const imported = createDemoImportState({
    currentId: 'imported',
    budgets: { imported: { name: 'Imported Demo', year: 2026, type: 'personal', budget: {}, categories: {}, transactions: [] } },
  }, { now });
  assert.equal(imported.isDemo, true);
  assert.equal(imported.currentId, 'imported');
  assert.match(imported.demoLabel, /demo/i);

  const exported = exportDemoState({ ...imported, loading: false, secret: 'x' });
  assert.equal(exported.loading, undefined);
  assert.equal(exported.isDemo, true);
  assert.throws(() => createDemoImportState({ budgets: {} }, { now }), /currentId|budgets/i);
});
