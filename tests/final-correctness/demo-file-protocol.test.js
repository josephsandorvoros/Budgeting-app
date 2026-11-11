import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDemoMode } from '../../src/data/demo.js';

const APP_SETTINGS_MODULE = '../../src/utils/appSettings.js';
const DEMO_SETTINGS_PREFIX = 'budget_ledger_demo_settings_v1:';

let importSequence = 0;

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  return {
    values,
    writes,
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => {
      writes.push(key);
      values.set(key, String(value));
    },
    removeItem: (key) => {
      writes.push(key);
      values.delete(key);
    },
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() { return values.size; },
  };
}

async function freshAppSettings(label) {
  importSequence += 1;
  return import(`${APP_SETTINGS_MODULE}?file-case=${label}-${importSequence}`);
}

test('resolveDemoMode rejects file: even when the Electron bridge is missing', () => {
  assert.equal(resolveDemoMode({ viteDemoMode: 'true', hasElectronAPI: false, protocol: 'file:' }), false);
  assert.equal(resolveDemoMode({ viteDemoMode: 'true', hasElectronAPI: false, protocol: 'http:' }), true);
  assert.equal(resolveDemoMode({ viteDemoMode: 'true', hasElectronAPI: true, protocol: 'file:' }), false);
});

test('settings stay on the production path for file: without electronAPI', async (t) => {
  const storage = memoryStorage();
  const calls = [];
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, 'window');
  const hadStorage = Object.prototype.hasOwnProperty.call(globalThis, 'localStorage');
  const hadFetch = Object.prototype.hasOwnProperty.call(globalThis, 'fetch');
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  const previousFetch = globalThis.fetch;
  const env = globalThis.process.env;
  const hadFlag = Object.prototype.hasOwnProperty.call(env, 'VITE_DEMO_MODE');
  const previousFlag = env.VITE_DEMO_MODE;

  globalThis.localStorage = storage;
  globalThis.window = { location: { protocol: 'file:' } };
  globalThis.fetch = async (input, init = {}) => {
    calls.push({ url: String(input), method: init.method || 'GET' });
    return { ok: true, json: async () => ({ value: null }) };
  };
  env.VITE_DEMO_MODE = 'true';

  t.after(() => {
    if (hadWindow) globalThis.window = previousWindow;
    else delete globalThis.window;
    if (hadStorage) globalThis.localStorage = previousStorage;
    else delete globalThis.localStorage;
    if (hadFetch) globalThis.fetch = previousFetch;
    else delete globalThis.fetch;
    if (hadFlag) env.VITE_DEMO_MODE = previousFlag;
    else delete env.VITE_DEMO_MODE;
  });

  const { saveAppSetting } = await freshAppSettings('no-bridge-file');
  await saveAppSetting('category_grouping_v1', { grouping: 'production' });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'PUT');
  assert.equal(calls[0].url, '/api/settings/category_grouping_v1');
  assert.equal(storage.writes.some((key) => key.startsWith(DEMO_SETTINGS_PREFIX)), false);
  assert.equal(storage.writes.includes('category_grouping_v1'), false);
});
