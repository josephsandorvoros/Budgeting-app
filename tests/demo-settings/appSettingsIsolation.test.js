import test from 'node:test';
import assert from 'node:assert/strict';

const APP_SETTINGS_MODULE = '../../src/utils/appSettings.js';
const DEMO_PREFIX = 'budget_ledger_demo_settings_v1:';
const PRODUCTION_KEY = 'category_grouping_v1';
const LEGACY_KEY = 'legacy_settings_key';

let importSequence = 0;

async function freshAppSettings(label) {
  importSequence += 1;
  return import(`${APP_SETTINGS_MODULE}?case=${label}-${importSequence}`);
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const reads = [];
  const writes = [];
  const attemptedWrites = [];
  return {
    values,
    reads,
    writes,
    attemptedWrites,
    getItem(key) {
      reads.push(key);
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      attemptedWrites.push(key);
      writes.push(key);
      values.set(key, String(value));
    },
    removeItem(key) {
      writes.push(key);
      values.delete(key);
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null;
    },
    get length() {
      return values.size;
    },
  };
}

function installBrowserGlobals(t, { storage, electron = false, protocol = 'http:' } = {}) {
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, 'window');
  const hadStorage = Object.prototype.hasOwnProperty.call(globalThis, 'localStorage');
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;

  globalThis.localStorage = storage;
  globalThis.window = {
    location: { protocol },
    ...(electron ? { electronAPI: {} } : {}),
  };

  t.after(() => {
    if (hadWindow) globalThis.window = previousWindow;
    else delete globalThis.window;
    if (hadStorage) globalThis.localStorage = previousStorage;
    else delete globalThis.localStorage;
  });
}

function setDemoFlag(t, value) {
  const env = globalThis.process.env;
  const hadFlag = Object.prototype.hasOwnProperty.call(env, 'VITE_DEMO_MODE');
  const previous = env.VITE_DEMO_MODE;
  if (value === undefined) delete env.VITE_DEMO_MODE;
  else env.VITE_DEMO_MODE = value;

  t.after(() => {
    if (hadFlag) env.VITE_DEMO_MODE = previous;
    else delete env.VITE_DEMO_MODE;
  });
}

function installFetch(t, handler) {
  const calls = [];
  const hadFetch = Object.prototype.hasOwnProperty.call(globalThis, 'fetch');
  const previousFetch = globalThis.fetch;

  globalThis.fetch = async (input, init = {}) => {
    calls.push({
      url: String(input),
      method: init.method || 'GET',
      body: init.body,
    });
    return handler(input, init, calls.length);
  };

  t.after(() => {
    if (hadFetch) globalThis.fetch = previousFetch;
    else delete globalThis.fetch;
  });

  return calls;
}

function failOnFetch(t) {
  return installFetch(t, () => {
    throw new Error('Unexpected backend request in demo mode');
  });
}

function assertNoProductionAccess(storage) {
  assert.equal(storage.reads.includes(PRODUCTION_KEY), false);
  assert.equal(storage.reads.includes(LEGACY_KEY), false);
  assert.equal(storage.writes.includes(PRODUCTION_KEY), false);
  assert.equal(storage.writes.includes(LEGACY_KEY), false);
  assert.equal(storage.attemptedWrites.includes(PRODUCTION_KEY), false);
  assert.equal(storage.attemptedWrites.includes(LEGACY_KEY), false);
}

test('demo mode uses a distinct settings namespace with zero backend requests', async (t) => {
  const storage = memoryStorage({
    [PRODUCTION_KEY]: '{"production":true}',
    [LEGACY_KEY]: '{"legacy":true}',
  });
  installBrowserGlobals(t, { storage });
  setDemoFlag(t, 'true');
  const calls = failOnFetch(t);

  const { loadAppSetting, saveAppSetting } = await freshAppSettings('demo-namespace');

  await saveAppSetting(PRODUCTION_KEY, { grouping: 'demo' });

  assert.deepEqual(calls, []);
  assert.equal(storage.values.get(PRODUCTION_KEY), '{"production":true}');
  assert.equal(storage.values.get(LEGACY_KEY), '{"legacy":true}');
  const demoKey = `${DEMO_PREFIX}${PRODUCTION_KEY}`;
  assert.equal(storage.values.has(demoKey), true);
  assert.deepEqual(JSON.parse(storage.values.get(demoKey)), { grouping: 'demo' });

  const loaded = await loadAppSetting(PRODUCTION_KEY, null, LEGACY_KEY);

  assert.deepEqual(loaded, { grouping: 'demo' });
  assert.deepEqual(calls, []);
  assertNoProductionAccess(storage);
  assert.ok(storage.reads.every((key) => key.startsWith(DEMO_PREFIX)));
  assert.ok(storage.writes.every((key) => key.startsWith(DEMO_PREFIX)));
});

test('demo settings persist across calls and module reloads', async (t) => {
  const storage = memoryStorage();
  installBrowserGlobals(t, { storage });
  setDemoFlag(t, 'true');
  const calls = failOnFetch(t);

  const first = await freshAppSettings('reload-a');
  await first.saveAppSetting('icon_picker_favorites', ['home', 'star']);

  const second = await freshAppSettings('reload-b');
  const loaded = await second.loadAppSetting('icon_picker_favorites', []);

  assert.deepEqual(loaded, ['home', 'star']);
  assert.deepEqual(calls, []);
  assertNoProductionAccess(storage);
});

test('demo settings fall back locally when the demo namespace is empty or invalid', async (t) => {
  const storage = memoryStorage({
    [`${DEMO_PREFIX}broken`]: '{not json',
    [PRODUCTION_KEY]: '{"production":true}',
  });
  installBrowserGlobals(t, { storage });
  setDemoFlag(t, 'true');
  const calls = failOnFetch(t);
  const { loadAppSetting } = await freshAppSettings('demo-fallback');

  assert.deepEqual(await loadAppSetting('missing', { fallback: 'empty' }), { fallback: 'empty' });
  assert.deepEqual(await loadAppSetting('broken', { fallback: 'invalid' }), { fallback: 'invalid' });
  assert.deepEqual(calls, []);
  assert.equal(storage.values.get(PRODUCTION_KEY), '{"production":true}');
  assertNoProductionAccess(storage);
});

test('demo settings return fallback and never touch production when storage reads throw', async (t) => {
  const storage = memoryStorage({ [PRODUCTION_KEY]: '{"production":true}' });
  storage.getItem = (key) => {
    storage.reads.push(key);
    throw new Error('storage unavailable');
  };
  installBrowserGlobals(t, { storage });
  setDemoFlag(t, 'true');
  const calls = failOnFetch(t);
  const { loadAppSetting } = await freshAppSettings('demo-read-throws');

  assert.deepEqual(await loadAppSetting(PRODUCTION_KEY, { fallback: true }), { fallback: true });
  assert.deepEqual(calls, []);
  assert.equal(storage.values.get(PRODUCTION_KEY), '{"production":true}');
  assert.equal(storage.writes.includes(PRODUCTION_KEY), false);
  assert.equal(storage.attemptedWrites.includes(PRODUCTION_KEY), false);
});

test('demo settings reject storage write failures without backend or production fallback', async (t) => {
  const storage = memoryStorage({ [PRODUCTION_KEY]: '{"production":true}' });
  storage.setItem = (key) => {
    storage.attemptedWrites.push(key);
    throw new Error('quota exceeded');
  };
  installBrowserGlobals(t, { storage });
  setDemoFlag(t, 'true');
  const calls = failOnFetch(t);
  const { saveAppSetting } = await freshAppSettings('demo-write-throws');

  await assert.rejects(
    () => saveAppSetting(PRODUCTION_KEY, { grouping: 'demo' }),
    /Failed to save setting/,
  );

  assert.deepEqual(calls, []);
  assert.equal(storage.values.get(PRODUCTION_KEY), '{"production":true}');
  assert.ok(storage.attemptedWrites.length > 0);
  assert.ok(storage.attemptedWrites.every((key) => key.startsWith(DEMO_PREFIX)));
});

test('default production mode keeps backend reads and writes', async (t) => {
  const storage = memoryStorage({ [PRODUCTION_KEY]: '{"local":true}' });
  installBrowserGlobals(t, { storage });
  setDemoFlag(t, undefined);
  const calls = installFetch(t, (input, init) => {
    if ((init.method || 'GET') === 'PUT') {
      return { ok: true, json: async () => ({ value: null }) };
    }
    return { ok: true, json: async () => ({ value: JSON.stringify({ server: true }) }) };
  });
  const { loadAppSetting, saveAppSetting } = await freshAppSettings('production-server');

  assert.deepEqual(await loadAppSetting(PRODUCTION_KEY, null), { server: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].url, `/api/settings/${PRODUCTION_KEY}`);

  await saveAppSetting(PRODUCTION_KEY, { saved: true });

  assert.equal(calls.length, 2);
  assert.equal(calls[1].method, 'PUT');
  assert.equal(calls[1].url, `/api/settings/${PRODUCTION_KEY}`);
  assert.equal(calls[1].body, JSON.stringify({ value: JSON.stringify({ saved: true }) }));
  assert.equal(storage.values.get(PRODUCTION_KEY), '{"local":true}');
  assert.equal(storage.writes.some((key) => key.startsWith(DEMO_PREFIX)), false);
});

test('production mode retains legacy localStorage fallback and migration', async (t) => {
  const storage = memoryStorage({ [PRODUCTION_KEY]: '{"local":true}' });
  installBrowserGlobals(t, { storage });
  setDemoFlag(t, undefined);
  const calls = installFetch(t, () => {
    throw new Error('offline');
  });
  const { loadAppSetting, saveAppSetting } = await freshAppSettings('production-offline');

  assert.deepEqual(await loadAppSetting(PRODUCTION_KEY, null), { local: true });
  assert.deepEqual(calls.map((call) => call.method), ['GET', 'PUT']);
  assert.equal(storage.values.get(PRODUCTION_KEY), '{"local":true}');
  assert.equal(storage.writes.includes(PRODUCTION_KEY), true);

  await saveAppSetting(PRODUCTION_KEY, { local: false });

  assert.equal(storage.values.get(PRODUCTION_KEY), JSON.stringify({ local: false }));
  assert.deepEqual(calls.map((call) => call.method), ['GET', 'PUT', 'PUT']);
  assert.equal(storage.writes.some((key) => key.startsWith(DEMO_PREFIX)), false);
});

for (const scenario of [
  { label: 'packaged Electron', protocol: 'file:' },
  { label: 'Electron over http', protocol: 'http:' },
]) {
  test(`explicit demo flag does not isolate settings in ${scenario.label}`, async (t) => {
    const storage = memoryStorage({ [PRODUCTION_KEY]: '{"production":true}' });
    installBrowserGlobals(t, { storage, electron: true, protocol: scenario.protocol });
    setDemoFlag(t, 'true');
    const calls = installFetch(t, (input, init) => {
      if ((init.method || 'GET') === 'PUT') {
        return { ok: true, json: async () => ({ value: null }) };
      }
      return { ok: true, json: async () => ({ value: JSON.stringify({ server: true }) }) };
    });
    const { loadAppSetting, saveAppSetting } = await freshAppSettings(`electron-${scenario.protocol}`);

    assert.deepEqual(await loadAppSetting(PRODUCTION_KEY, null), { server: true });
    await saveAppSetting(PRODUCTION_KEY, { saved: true });

    assert.deepEqual(calls.map((call) => call.method), ['GET', 'PUT']);
    assert.ok(calls.every((call) => call.url.endsWith(`/api/settings/${PRODUCTION_KEY}`)));
    assert.equal(storage.values.get(PRODUCTION_KEY), '{"production":true}');
    assert.equal(storage.reads.some((key) => key.startsWith(DEMO_PREFIX)), false);
    assert.equal(storage.writes.some((key) => key.startsWith(DEMO_PREFIX)), false);
  });
}
